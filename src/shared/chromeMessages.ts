import type { ContentRequest, RuntimeRequest, RuntimeResponse } from './types';

export async function sendRuntimeRequest<T>(request: RuntimeRequest): Promise<T> {
  const response = (await chrome.runtime.sendMessage(request)) as RuntimeResponse | undefined;
  if (!response) {
    throw new Error('No extension response.');
  }

  if (!response.ok) {
    throw new Error(response.error);
  }

  return response.data as T;
}

export async function sendContentRequest<T>(tabId: number, request: ContentRequest): Promise<T> {
  const response = (await chrome.tabs.sendMessage(tabId, request)) as RuntimeResponse | undefined;
  if (!response) {
    throw new Error('No page response.');
  }

  if (!response.ok) {
    throw new Error(response.error);
  }

  return response.data as T;
}
