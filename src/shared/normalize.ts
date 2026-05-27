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
    const schema = JSON.parse(schemaText) as {
      properties?: Record<string, { type?: string | string[]; default?: unknown }>;
      required?: unknown;
    };
    const properties = schema.properties ?? {};
    const args = Object.fromEntries(Object.keys(properties).map((key) => [key, defaultForProp(properties[key]!)]));

    return JSON.stringify(args, null, 2);
  } catch {
    return '{}';
  }
}

function defaultForProp(prop: { type?: string | string[]; default?: unknown }): unknown {
  if (prop.default !== undefined) {
    return prop.default;
  }

  const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;
  switch (type) {
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      return {};
    case 'null':
      return null;
    default:
      return '';
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
