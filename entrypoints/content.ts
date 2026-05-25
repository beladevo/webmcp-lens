import { normalizeTools } from '../src/shared/normalize';
import type { ContentRequest, PageRequest, PageResponse, RuntimeResponse } from '../src/shared/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    injectPageBridge();

    chrome.runtime.onMessage.addListener(
      (request: unknown, _sender, sendResponse: (response: RuntimeResponse) => void) => {
        if (!isContentRequest(request)) {
          return false;
        }

        handleContentRequest(request).then(sendResponse);
        return true;
      },
    );

    window.addEventListener('message', (event) => {
      if (event.source === window && event.data?.type === 'WEBMCP_PAGE_TOOLS_CHANGED') {
        chrome.runtime.sendMessage({ type: 'WEBMCP_TOOLS_CHANGED' }).catch(() => undefined);
      }
    });
  },
});

function isContentRequest(request: unknown): request is ContentRequest {
  if (!request || typeof request !== 'object') {
    return false;
  }

  const type = (request as { type?: unknown }).type;
  return type === 'WEBMCP_LIST_TOOLS' || type === 'WEBMCP_EXECUTE_TOOL';
}

async function handleContentRequest(request: ContentRequest): Promise<RuntimeResponse> {
  try {
    if (request.type === 'WEBMCP_LIST_TOOLS') {
      const snapshot = await sendPageRequest({
        id: crypto.randomUUID(),
        type: 'WEBMCP_PAGE_LIST_TOOLS',
      });

      if (snapshot.ok && 'tools' in snapshot.data) {
        snapshot.data.tools = normalizeTools(snapshot.data.tools);
      }

      return snapshot;
    }

    return await sendPageRequest({
      id: crypto.randomUUID(),
      type: 'WEBMCP_PAGE_EXECUTE_TOOL',
      originalName: request.originalName,
      args: request.args,
    });
  } catch (error) {
    console.error('[WebMCP Lens]', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Could not reach the page.',
    };
  }
}

function sendPageRequest(request: PageRequest): Promise<RuntimeResponse> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      resolve({ ok: false, error: 'WebMCP did not respond.' });
    }, 3000);

    function onMessage(event: MessageEvent<PageResponse & { source?: string; target?: string }>): void {
      if (
        event.source !== window ||
        event.data?.source !== 'webmcp-inspector-page' ||
        event.data.target !== 'webmcp-inspector-content' ||
        event.data.id !== request.id
      ) {
        return;
      }

      window.clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
      resolve(event.data);
    }

    window.addEventListener('message', onMessage);
    window.postMessage(request, '*');
  });
}

function injectPageBridge(): void {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('/page-bridge.js');
  script.async = false;
  script.onload = () => script.remove();
  (document.documentElement || document.head).append(script);
}
