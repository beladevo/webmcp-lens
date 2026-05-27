import { sendContentRequest } from '../src/shared/chromeMessages';
import type {
  ContentRequest,
  RuntimeEvent,
  RuntimeRequest,
  RuntimeResponse,
  ToolExecutionResult,
  ToolSnapshot,
} from '../src/shared/types';

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  });

  chrome.runtime.onMessage.addListener(
    (request: unknown, sender, sendResponse: (response: RuntimeResponse) => void) => {
      if (isToolChangeEvent(request)) {
        const tabId = getSenderTabId(sender);
        broadcast(makeEvent('WEBMCP_TOOLS_CHANGED', tabId, getSenderTabUrl(sender)));
        if (tabId !== undefined) {
          updateBadge(tabId);
        }
        return false;
      }

      if (!isRuntimeRequest(request)) {
        return false;
      }

      handleRequest(request).then(sendResponse);
      return true;
    },
  );

  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId).catch(() => undefined);
    broadcast(makeEvent('WEBMCP_ACTIVE_TAB_CHANGED', activeInfo.tabId, tab?.url));
    updateBadge(activeInfo.tabId);
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading' || changeInfo.status === 'complete' || changeInfo.url) {
      broadcast(makeEvent('WEBMCP_TAB_UPDATED', tabId, changeInfo.url ?? tab.url));
    }
    if (changeInfo.status === 'complete') {
      updateBadge(tabId);
    }
  });
});

function isRuntimeRequest(request: unknown): request is RuntimeRequest {
  if (!request || typeof request !== 'object') {
    return false;
  }

  const type = (request as { type?: unknown }).type;
  return type === 'WEBMCP_GET_SNAPSHOT' || type === 'WEBMCP_EXECUTE_TOOL';
}

function isToolChangeEvent(request: unknown): request is RuntimeEvent {
  return Boolean(
    request &&
      typeof request === 'object' &&
      (request as { type?: unknown }).type === 'WEBMCP_TOOLS_CHANGED' &&
      (request as { source?: unknown }).source !== 'background',
  );
}

function broadcast(event: RuntimeEvent): void {
  chrome.runtime.sendMessage({ ...event, source: 'background' }).catch(() => undefined);
}

function makeEvent(type: RuntimeEvent['type'], tabId?: number, url?: string): RuntimeEvent {
  return {
    type,
    ...(tabId === undefined ? {} : { tabId }),
    ...(url === undefined ? {} : { url }),
  } as RuntimeEvent;
}

function getSenderTabId(sender: unknown): number | undefined {
  const tabId = (sender as { tab?: { id?: unknown } }).tab?.id;
  return typeof tabId === 'number' ? tabId : undefined;
}

function getSenderTabUrl(sender: unknown): string | undefined {
  const url = (sender as { tab?: { url?: unknown } }).tab?.url;
  return typeof url === 'string' ? url : undefined;
}

async function handleRequest(request: RuntimeRequest): Promise<RuntimeResponse> {
  try {
    const tabId = await resolveTabId(request);

    if (request.type === 'WEBMCP_GET_SNAPSHOT') {
      const snapshot = await sendContentRequestWithInjection<ToolSnapshot>(tabId, { type: 'WEBMCP_LIST_TOOLS' });
      return { ok: true, data: snapshot };
    }

    const result = await sendContentRequestWithInjection<ToolExecutionResult>(tabId, {
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

async function sendContentRequestWithInjection<T>(tabId: number, request: ContentRequest): Promise<T> {
  try {
    return await sendContentRequest<T>(tabId, request);
  } catch (error) {
    if (!isMissingContentScriptError(error)) {
      throw error;
    }

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['/content-scripts/content.js'],
    });

    return await sendContentRequest<T>(tabId, request);
  }
}

function isMissingContentScriptError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('Receiving end does not exist');
}

async function resolveTabId(request: RuntimeRequest): Promise<number> {
  if (request.target.kind === 'tab') {
    await assertInspectableTab(request.target.tabId);
    return request.target.tabId;
  }

  const tab = await findInspectableActiveTab();
  if (tab?.id === undefined) {
    throw new Error('Open an http/https tab to inspect.');
  }

  return tab.id;
}

async function findInspectableActiveTab(): Promise<{ id?: number; url?: string } | undefined> {
  const queryOrder = [
    { active: true, currentWindow: true },
    { active: true, lastFocusedWindow: true },
    { lastFocusedWindow: true },
    {},
  ];

  for (const queryInfo of queryOrder) {
    const tabs = await chrome.tabs.query(queryInfo);
    const inspectable = tabs.find((tab) => tab.active && isInspectableUrl(tab.url)) ?? tabs.find((tab) => isInspectableUrl(tab.url));

    if (inspectable) {
      return inspectable;
    }
  }

  return undefined;
}

async function assertInspectableTab(tabId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId);
  if (!isInspectableUrl(tab.url)) {
    throw new Error('Cannot inspect this browser page.');
  }
}

function isInspectableUrl(url: string | undefined): boolean {
  return url?.startsWith('http://') === true || url?.startsWith('https://') === true;
}

async function updateBadge(tabId: number): Promise<void> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!isInspectableUrl(tab.url)) {
      await chrome.action.setBadgeText({ tabId, text: '' });
      return;
    }

    const snapshot = await sendContentRequestWithInjection<ToolSnapshot>(tabId, { type: 'WEBMCP_LIST_TOOLS' });
    const count = snapshot.tools.length;
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#1a73e8' });
    await chrome.action.setBadgeText({ tabId, text: count > 0 ? String(count) : '' });
  } catch {
    chrome.action.setBadgeText({ tabId, text: '' }).catch(() => undefined);
  }
}
