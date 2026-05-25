import type { PageRequest, PageResponse, ToolExecutionResult, ToolSnapshot } from '../src/shared/types';

declare global {
  interface Navigator {
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
      const api = navigator.modelContextTesting;

      if (!api?.listTools || !api.executeTool) {
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

      const value = await api.executeTool(request.originalName, JSON.stringify(request.args));
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
    const api = navigator.modelContextTesting;
    const notify = () => window.postMessage({ source, target, type: 'WEBMCP_PAGE_TOOLS_CHANGED' }, '*');

    if (api?.registerToolsChangedCallback) {
      api.registerToolsChangedCallback(notify);
      return;
    }

    api?.addEventListener?.('toolchange', notify);
  }
});
