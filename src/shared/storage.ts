import type { ToolOverride } from './types';
import { cleanOverride } from './normalize';

const KEY = 'webmcp:overrides';

type OverrideStore = Record<string, Record<string, ToolOverride>>;

export async function getOverrides(origin: string): Promise<Record<string, ToolOverride>> {
  const store = await readStore();
  return store[origin] ?? {};
}

export async function setOverride(
  origin: string,
  originalName: string,
  override: ToolOverride,
): Promise<void> {
  const store = await readStore();
  const originStore = { ...(store[origin] ?? {}) };
  const cleaned = cleanOverride(override);

  if (Object.keys(cleaned).length === 0) {
    delete originStore[originalName];
  } else {
    originStore[originalName] = cleaned;
  }

  store[origin] = originStore;
  await chrome.storage.local.set({ [KEY]: store });
}

export async function clearOverride(origin: string, originalName: string): Promise<void> {
  const store = await readStore();
  const originStore = { ...(store[origin] ?? {}) };
  delete originStore[originalName];
  store[origin] = originStore;
  await chrome.storage.local.set({ [KEY]: store });
}

export async function clearOverrides(origin: string): Promise<void> {
  const store = await readStore();
  delete store[origin];
  await chrome.storage.local.set({ [KEY]: store });
}

async function readStore(): Promise<OverrideStore> {
  const result = await chrome.storage.local.get(KEY);
  const value = result[KEY];
  return value && typeof value === 'object' ? (value as OverrideStore) : {};
}
