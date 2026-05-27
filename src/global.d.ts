declare const chrome: {
  action: {
    setBadgeText(details: { text: string; tabId?: number }): Promise<void>;
    setBadgeBackgroundColor(details: { color: string; tabId?: number }): Promise<void>;
  };
  devtools: {
    inspectedWindow: {
      tabId: number;
    };
    panels: {
      create(title: string, iconPath: string, pagePath: string, callback?: (panel: unknown) => void): void;
    };
  };
  runtime: {
    getURL(path: string): string;
    onInstalled: {
      addListener(callback: () => void): void;
    };
    onMessage: {
      addListener(
        callback: (request: unknown, sender: unknown, sendResponse: (response: unknown) => void) => boolean | void,
      ): void;
      removeListener(callback: (request: unknown, sender: unknown, sendResponse: (response: unknown) => void) => void): void;
    };
    sendMessage(message: unknown): Promise<unknown>;
  };
  sidePanel: {
    setPanelBehavior(options: { openPanelOnActionClick: boolean }): Promise<void>;
  };
  scripting: {
    executeScript(options: { target: { tabId: number }; files: string[] }): Promise<unknown[]>;
  };
  storage: {
    local: {
      get(key: string): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
  };
  tabs: {
    get(tabId: number): Promise<{ id?: number; url?: string; active?: boolean }>;
    query(queryInfo: {
      active?: boolean;
      currentWindow?: boolean;
      lastFocusedWindow?: boolean;
    }): Promise<Array<{ id?: number; url?: string; active?: boolean }>>;
    sendMessage(tabId: number, message: unknown): Promise<unknown>;
    onActivated: {
      addListener(callback: (activeInfo: { tabId: number; windowId: number }) => void): void;
    };
    onUpdated: {
      addListener(
        callback: (
          tabId: number,
          changeInfo: { status?: 'loading' | 'complete'; url?: string },
          tab: { id?: number; url?: string; active?: boolean },
        ) => void,
      ): void;
    };
  };
};
