import type { DisplayTool, ToolDefinition, ToolOverride } from './types';

interface RawTool {
  name?: unknown;
  description?: unknown;
  inputSchema?: unknown;
  schema?: unknown;
  stream?: unknown;
}

export function normalizeTools(rawTools: unknown): ToolDefinition[] {
  if (!Array.isArray(rawTools)) {
    return [];
  }

  return rawTools
    .map(normalizeTool)
    .filter((tool): tool is ToolDefinition => tool !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function normalizeTool(raw: unknown): ToolDefinition | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const tool = raw as RawTool;
  const name = stringifyField(tool.name).trim();
  if (!name) {
    return null;
  }

  return {
    name,
    description: stringifyField(tool.description),
    inputSchema: stringifySchema(tool.inputSchema ?? tool.schema),
    stream: Boolean(tool.stream),
  };
}

export function applyOverrides(
  tools: ToolDefinition[],
  overrides: Record<string, ToolOverride>,
): DisplayTool[] {
  return tools.map((tool) => {
    const override = cleanOverride(overrides[tool.name]);

    return {
      ...tool,
      ...override,
      originalName: tool.name,
      override,
      hasOverride: Object.keys(override).length > 0,
    };
  });
}

export function cleanOverride(override: ToolOverride | undefined): ToolOverride {
  const cleaned: ToolOverride = {};

  if (override?.name?.trim()) {
    cleaned.name = override.name.trim();
  }

  if (override?.description !== undefined) {
    cleaned.description = override.description;
  }

  if (override?.inputSchema?.trim()) {
    cleaned.inputSchema = override.inputSchema;
  }

  return cleaned;
}

export function makeDefaultArgs(schemaText: string): string {
  try {
    const schema = JSON.parse(schemaText) as { properties?: Record<string, unknown>; required?: unknown };
    const properties = schema.properties ?? {};
    const args = Object.fromEntries(Object.keys(properties).map((key) => [key, '']));

    return JSON.stringify(args, null, 2);
  } catch {
    return '{}';
  }
}

function stringifyField(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function stringifySchema(value: unknown): string {
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  if (value && typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  return '{}';
}
