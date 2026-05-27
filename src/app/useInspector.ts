import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyOverrides, makeDefaultArgs } from '../shared/normalize';
import { sendRuntimeRequest } from '../shared/chromeMessages';
import { clearOverride, clearOverrides, getOverrides, setOverride } from '../shared/storage';
import type {
  DisplayTool,
  JsonValue,
  RuntimeEvent,
  TargetScope,
  ToolExecutionResult,
  ToolOverride,
  ToolSnapshot,
} from '../shared/types';

interface InspectorState {
  argsText: string;
  error: string;
  executing: boolean;
  loading: boolean;
  origin: string;
  resultText: string;
  selectedOriginalName: string;
  status: ToolSnapshot['status'];
  tools: DisplayTool[];
}

const initialState: InspectorState = {
  argsText: '{}',
  error: '',
  executing: false,
  loading: true,
  origin: '',
  resultText: '',
  selectedOriginalName: '',
  status: 'unsupported',
  tools: [],
};

export function useInspector(target: TargetScope) {
  const [state, setState] = useState<InspectorState>(initialState);
  const selectedNameRef = useRef('');
  selectedNameRef.current = state.selectedOriginalName;

  const selectedTool = useMemo(
    () => state.tools.find((tool) => tool.originalName === state.selectedOriginalName) ?? state.tools[0],
    [state.selectedOriginalName, state.tools],
  );

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));

    try {
      const snapshot = await sendRuntimeRequest<ToolSnapshot>({
        type: 'WEBMCP_GET_SNAPSHOT',
        target,
      });
      const overrides = await getOverrides(snapshot.origin);
      const tools = applyOverrides(snapshot.tools, overrides);
      const currentName = selectedNameRef.current;
      const selected = tools.find((tool) => tool.originalName === currentName) ?? tools[0];
      const toolChanged = selected?.originalName !== currentName;

      setState((current) => ({
        ...current,
        loading: false,
        status: snapshot.status,
        tools,
        origin: snapshot.origin,
        error: snapshot.error ?? '',
        selectedOriginalName: selected?.originalName ?? '',
        ...(toolChanged && selected ? { argsText: makeDefaultArgs(selected.inputSchema) } : {}),
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Could not inspect tab.',
      }));
    }
  }, [target]);

  const selectTool = useCallback((tool: DisplayTool) => {
    setState((current) => ({
      ...current,
      selectedOriginalName: tool.originalName,
      argsText: makeDefaultArgs(tool.inputSchema),
      resultText: '',
      error: '',
    }));
  }, []);

  const execute = useCallback(async () => {
    if (!selectedTool) {
      return;
    }

    let args: JsonValue;
    try {
      args = JSON.parse(state.argsText) as JsonValue;
    } catch {
      setState((current) => ({ ...current, error: 'Args must be valid JSON.' }));
      return;
    }

    const originalName = selectedTool.originalName;

    setState((current) => ({ ...current, executing: true, error: '', resultText: '' }));

    try {
      const result = await sendRuntimeRequest<ToolExecutionResult>({
        type: 'WEBMCP_EXECUTE_TOOL',
        target,
        originalName,
        args,
      });

      setState((current) => ({
        ...current,
        executing: false,
        resultText: JSON.stringify(result, null, 2),
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        executing: false,
        error: error instanceof Error ? error.message : 'Tool failed.',
      }));
    }
  }, [selectedTool, state.argsText, target]);

  const saveOverride = useCallback(
    async (originalName: string, override: ToolOverride) => {
      if (!state.origin) {
        return;
      }

      await setOverride(state.origin, originalName, override);
      await refresh();
    },
    [refresh, state.origin],
  );

  const resetOverride = useCallback(
    async (originalName: string) => {
      if (!state.origin) {
        return;
      }

      await clearOverride(state.origin, originalName);
      await refresh();
    },
    [refresh, state.origin],
  );

  const resetAllOverrides = useCallback(async () => {
    if (!state.origin) {
      return;
    }

    await clearOverrides(state.origin);
    await refresh();
  }, [refresh, state.origin]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    function onRuntimeMessage(message: unknown): void {
      if (!isRefreshEventForTarget(message, target)) {
        return;
      }

      refresh();
    }

    chrome.runtime.onMessage.addListener(onRuntimeMessage);
    return () => chrome.runtime.onMessage.removeListener(onRuntimeMessage);
  }, [refresh, target]);

  return {
    ...state,
    selectedTool,
    setArgsText: (argsText: string) => setState((current) => ({ ...current, argsText })),
    execute,
    refresh,
    resetAllOverrides,
    resetOverride,
    saveOverride,
    selectTool,
  };
}

function isRefreshEventForTarget(message: unknown, target: TargetScope): message is RuntimeEvent {
  if (!message || typeof message !== 'object') {
    return false;
  }

  const event = message as RuntimeEvent;
  if (
    event.type !== 'WEBMCP_ACTIVE_TAB_CHANGED' &&
    event.type !== 'WEBMCP_TAB_UPDATED' &&
    event.type !== 'WEBMCP_TOOLS_CHANGED'
  ) {
    return false;
  }

  if (target.kind === 'active-tab') {
    return event.type === 'WEBMCP_ACTIVE_TAB_CHANGED' || event.type === 'WEBMCP_TAB_UPDATED' || event.type === 'WEBMCP_TOOLS_CHANGED';
  }

  return event.tabId === target.tabId;
}
