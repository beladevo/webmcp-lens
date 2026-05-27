export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: string;
  stream: boolean;
}

export interface ToolOverride {
  name?: string;
  description?: string;
  inputSchema?: string;
}

export interface DisplayTool extends ToolDefinition {
  originalName: string;
  override?: ToolOverride;
  hasOverride: boolean;
}

export interface ToolExecutionResult {
  value: unknown;
  crossDocumentResult?: unknown;
}

export type WebMcpStatus = 'ready' | 'unsupported' | 'error';

export interface ToolSnapshot {
  status: WebMcpStatus;
  tools: ToolDefinition[];
  origin: string;
  error?: string;
}

export type TargetScope =
  | { kind: 'active-tab' }
  | { kind: 'tab'; tabId: number };

export type RuntimeRequest =
  | { type: 'WEBMCP_GET_SNAPSHOT'; target: TargetScope }
  | {
      type: 'WEBMCP_EXECUTE_TOOL';
      target: TargetScope;
      originalName: string;
      args: JsonValue;
    };

export type RuntimeEvent =
  | { type: 'WEBMCP_ACTIVE_TAB_CHANGED'; source?: 'background'; tabId?: number; url?: string }
  | { type: 'WEBMCP_TAB_UPDATED'; source?: 'background'; tabId: number; url?: string }
  | { type: 'WEBMCP_TOOLS_CHANGED'; source?: 'background'; tabId?: number; url?: string };

export type RuntimeResponse =
  | { ok: true; data: ToolSnapshot | ToolExecutionResult }
  | { ok: false; error: string };

export type ContentRequest =
  | { type: 'WEBMCP_LIST_TOOLS' }
  | { type: 'WEBMCP_EXECUTE_TOOL'; originalName: string; args: JsonValue };

export type PageRequest =
  | { id: string; type: 'WEBMCP_PAGE_LIST_TOOLS' }
  | {
      id: string;
      type: 'WEBMCP_PAGE_EXECUTE_TOOL';
      originalName: string;
      args: JsonValue;
    };

export type PageResponse =
  | { id: string; ok: true; data: ToolSnapshot | ToolExecutionResult }
  | { id: string; ok: false; error: string };
