import type { PageRequest, PageResponse, ToolExecutionResult, ToolSnapshot } from '../src/shared/types';

declare global {
  interface Navigator {
    modelContext?: {
      listTools?: () => Promise<unknown> | unknown;
      callTool?: (params: { name: string; arguments?: Record<string, unknown> }) => Promise<unknown>;
      addEventListener?: (type: string, callback: () => void) => void;
    };
    modelContextTesting?: {
      listTools?: () => Promise<unknown>;
      executeTool?: (name: string, serializedArgs: string) => Promise<unknown>;
      getCrossDocumentScriptToolResult?: () => Promise<unknown>;
      registerToolsChangedCallback?: (callback: () => void) => void;
      addEventListener?: (type: string, callback: () => void) => void;
    };
  }
}

export default defineUnlistedScript(() => {
  const source = 'webmcp-inspector-page';
  const target = 'webmcp-inspector-content';

  window.addEventListener('message', async (event: MessageEvent<PageRequest>) => {
    if (event.source !== window || event.data?.id === undefined) {
      return;
    }

    const request = event.data;
    if (request.type !== 'WEBMCP_PAGE_LIST_TOOLS' && request.type !== 'WEBMCP_PAGE_EXECUTE_TOOL') {
      return;
    }

    const response = await handleRequest(request);
    window.postMessage({ ...response, source, target }, '*');
  });

  registerToolChangeListener();

  async function handleRequest(request: PageRequest): Promise<PageResponse> {
    try {
      const api = getWebMcpApi();

      if (!api) {
        return {
          id: request.id,
          ok: true,
          data: {
            status: 'unsupported',
            tools: [],
            origin: location.origin,
          } satisfies ToolSnapshot,
        };
      }

      if (request.type === 'WEBMCP_PAGE_LIST_TOOLS') {
        return {
          id: request.id,
          ok: true,
          data: {
            status: 'ready',
            tools: (await api.listTools()) as never,
            origin: location.origin,
          } satisfies ToolSnapshot,
        };
      }

      const value = await api.executeTool(request.originalName, request.args);
      const crossDocumentResult = api.getCrossDocumentScriptToolResult
        ? await api.getCrossDocumentScriptToolResult().catch(() => undefined)
        : undefined;

      return {
        id: request.id,
        ok: true,
        data: { value, crossDocumentResult } satisfies ToolExecutionResult,
      };
    } catch (error) {
      console.error('[WebMCP Lens]', error);
      return {
        id: request.id,
        ok: false,
        error: error instanceof Error ? error.message : 'WebMCP request failed.',
      };
    }
  }

  function registerToolChangeListener(): void {
    const api = navigator.modelContextTesting ?? navigator.modelContext;
    const notify = () => window.postMessage({ source, target, type: 'WEBMCP_PAGE_TOOLS_CHANGED' }, '*');

    if (hasToolsChangedCallback(api)) {
      api.registerToolsChangedCallback(notify);
      return;
    }

    api?.addEventListener?.('toolchange', notify);
    api?.addEventListener?.('toolschanged', notify);
  }

  function getWebMcpApi():
    | {
        listTools: () => Promise<unknown> | unknown;
        executeTool: (name: string, args: unknown) => Promise<unknown>;
        getCrossDocumentScriptToolResult?: () => Promise<unknown>;
      }
    | null {
    const testing = navigator.modelContextTesting;
    if (testing?.listTools && testing.executeTool) {
      const api = {
        listTools: testing.listTools.bind(testing),
        executeTool: (name: string, args: unknown) => testing.executeTool?.(name, JSON.stringify(args)) ?? Promise.reject(),
      };

      return testing.getCrossDocumentScriptToolResult
        ? { ...api, getCrossDocumentScriptToolResult: testing.getCrossDocumentScriptToolResult.bind(testing) }
        : api;
    }

    const modelContext = navigator.modelContext;
    if (modelContext?.listTools && modelContext.callTool) {
      return {
        listTools: modelContext.listTools.bind(modelContext),
        executeTool: (name, args) =>
          modelContext.callTool?.({
            name,
            arguments: toToolArguments(args),
          }) ?? Promise.reject(),
      };
    }

    return null;
  }

  function toToolArguments(args: unknown): Record<string, unknown> {
    if (args && typeof args === 'object' && !Array.isArray(args)) {
      return args as Record<string, unknown>;
    }

    return {};
  }

  function hasToolsChangedCallback(
    api: Navigator['modelContextTesting'] | Navigator['modelContext'] | undefined,
  ): api is NonNullable<Navigator['modelContextTesting']> & {
    registerToolsChangedCallback: (callback: () => void) => void;
  } {
    return (
      typeof api === 'object' &&
      api !== null &&
      'registerToolsChangedCallback' in api &&
      typeof api.registerToolsChangedCallback === 'function'
    );
  }
});
