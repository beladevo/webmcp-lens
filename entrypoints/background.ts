import { sendContentRequest } from '../src/shared/chromeMessages';
import type { RuntimeRequest, RuntimeResponse, ToolExecutionResult, ToolSnapshot } from '../src/shared/types';

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  });

  chrome.runtime.onMessage.addListener(
    (request: unknown, _sender, sendResponse: (response: RuntimeResponse) => void) => {
      if (!isRuntimeRequest(request)) {
        return false;
      }

      handleRequest(request).then(sendResponse);
      return true;
    },
  );
});

function isRuntimeRequest(request: unknown): request is RuntimeRequest {
  if (!request || typeof request !== 'object') {
    return false;
  }

  const type = (request as { type?: unknown }).type;
  return type === 'WEBMCP_GET_SNAPSHOT' || type === 'WEBMCP_EXECUTE_TOOL';
}

async function handleRequest(request: RuntimeRequest): Promise<RuntimeResponse> {
  try {
    const tabId = await resolveTabId(request);

    if (request.type === 'WEBMCP_GET_SNAPSHOT') {
      const snapshot = await sendContentRequest<ToolSnapshot>(tabId, { type: 'WEBMCP_LIST_TOOLS' });
      return { ok: true, data: snapshot };
    }

    const result = await sendContentRequest<ToolExecutionResult>(tabId, {
      type: 'WEBMCP_EXECUTE_TOOL',
      originalName: request.originalName,
      args: request.args,
    });

    return { ok: true, data: result };
  } catch (error) {
    console.error('[WebMCP Lens]', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Extension request failed.',
    };
  }
}

async function resolveTabId(request: RuntimeRequest): Promise<number> {
  if (request.target.kind === 'tab') {
    return request.target.tabId;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) {
    throw new Error('No active tab.');
  }

  return tab.id;
}
