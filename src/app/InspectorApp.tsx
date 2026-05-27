import { Check, Copy, Play, RefreshCcw, RotateCcw, Save, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { DisplayTool, TargetScope, ToolOverride } from '../shared/types';
import { useInspector } from './useInspector';
import './styles.css';

interface InspectorAppProps {
  target: TargetScope;
  variant: 'sidepanel' | 'devtools';
}

export function InspectorApp({ target, variant }: InspectorAppProps) {
  const inspector = useInspector(target);
  const editable = variant === 'devtools';
  const surface = variant === 'devtools' ? 'DevTools' : 'Side Panel';

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{surface}</p>
          <h1>WebMCP Lens</h1>
        </div>
        <button className="iconButton" type="button" title="Refresh" onClick={inspector.refresh}>
          <RefreshCcw size={16} />
        </button>
      </header>

      <section className="status">
        <span className={`dot ${inspector.status}`} />
        <span>{statusText(inspector)}</span>
      </section>

      {inspector.error ? (
        <section className="notice">
          <X size={14} />
          <span>{inspector.error}</span>
        </section>
      ) : null}

      <section className="workspace">
        <ToolRail
          tools={inspector.tools}
          selectedOriginalName={inspector.selectedTool?.originalName ?? ''}
          onSelect={inspector.selectTool}
          loading={inspector.loading}
        />

        <section className="detail">
          {inspector.selectedTool ? (
            <>
              <ToolHeader
                editable={editable}
                tool={inspector.selectedTool}
                onReset={inspector.resetOverride}
                onResetAll={inspector.resetAllOverrides}
                onSave={inspector.saveOverride}
              />

              <label className="field">
                <span>Arguments</span>
                <textarea
                  className="codeInput short"
                  spellCheck={false}
                  placeholder={'{\n  "key": "value"\n}'}
                  value={inspector.argsText}
                  onChange={(event) => inspector.setArgsText(event.target.value)}
                />
              </label>

              <div className="actions">
                <button className="primaryButton" type="button" onClick={inspector.execute} disabled={inspector.executing}>
                  <Play size={15} />
                  {inspector.executing ? 'Running' : 'Run'}
                </button>
                <CopyButton text={inspector.resultText || inspector.selectedTool.inputSchema} />
              </div>

              <label className="field grow">
                <span>Result</span>
                <pre className="result">{inspector.resultText || 'No result.'}</pre>
              </label>
            </>
          ) : (
            <div className="empty">
              {inspector.loading ? (
                <span className="spinner" />
              ) : inspector.status === 'unsupported' ? (
                'No WebMCP API on this page.'
              ) : (
                'No tools found.'
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function ToolRail({
  selectedOriginalName,
  tools,
  onSelect,
  loading,
}: {
  selectedOriginalName: string;
  tools: DisplayTool[];
  onSelect: (tool: DisplayTool) => void;
  loading: boolean;
}) {
  const [search, setSearch] = useState('');
  const filtered = search ? tools.filter((t) => t.name.toLowerCase().includes(search.toLowerCase())) : tools;

  return (
    <nav className="rail" aria-label="Tools">
      <div className="railHeader">
        <input
          className="railSearch"
          type="search"
          placeholder="Filter…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Filter tools"
        />
        <span className="railCount">{loading ? '…' : tools.length}</span>
      </div>
      <div className="railItems">
        {filtered.length === 0 && !loading ? (
          <div className="railEmpty">{tools.length === 0 ? 'No tools.' : 'No match.'}</div>
        ) : (
          filtered.map((tool) => (
            <button
              className={tool.originalName === selectedOriginalName ? 'toolItem selected' : 'toolItem'}
              key={tool.originalName}
              type="button"
              onClick={() => onSelect(tool)}
              title={tool.description || tool.name}
            >
              <span>{tool.name}</span>
              {tool.description && <p className="toolDesc">{tool.description}</p>}
              {tool.hasOverride ? <i>override</i> : null}
            </button>
          ))
        )}
      </div>
    </nav>
  );
}

function ToolHeader({
  editable,
  tool,
  onReset,
  onResetAll,
  onSave,
}: {
  editable: boolean;
  tool: DisplayTool;
  onReset: (originalName: string) => Promise<void>;
  onResetAll: () => Promise<void>;
  onSave: (originalName: string, override: ToolOverride) => Promise<void>;
}) {
  const [draft, setDraft] = useState<ToolOverride>({});
  const schemaIsValid = useMemo(() => isJson(draft.inputSchema ?? tool.inputSchema), [draft.inputSchema, tool.inputSchema]);

  useEffect(() => {
    setDraft({
      name: tool.override?.name ?? tool.name,
      description: tool.override?.description ?? tool.description,
      inputSchema: tool.override?.inputSchema ?? tool.inputSchema,
    });
  }, [tool]);

  if (!editable) {
    return (
      <section className="toolHeader">
        {tool.originalName !== tool.name && <p className="originalName">{tool.originalName}</p>}
        <h2>{tool.name}</h2>
        {tool.description && <p className="toolDescription">{tool.description}</p>}
        <details className="schemaDetails">
          <summary>Input schema</summary>
          <pre className="schema">{tool.inputSchema}</pre>
        </details>
      </section>
    );
  }

  return (
    <section className="toolHeader">
      <div className="split">
        <div>
          <p className="originalName">original: {tool.originalName}</p>
          <h2>{tool.name}</h2>
        </div>
        <div className="miniActions">
          <button className="ghostButton" type="button" onClick={() => onReset(tool.originalName)}>
            <RotateCcw size={14} />
            Reset
          </button>
          <button className="ghostButton" type="button" onClick={onResetAll}>
            <RotateCcw size={14} />
            Reset All
          </button>
        </div>
      </div>

      <label className="field">
        <span>Name</span>
        <input value={draft.name ?? ''} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      </label>
      <label className="field">
        <span>Description</span>
        <textarea
          className="plainInput"
          value={draft.description ?? ''}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
        />
      </label>
      <label className="field">
        <span>Input schema</span>
        <textarea
          className="codeInput"
          spellCheck={false}
          value={draft.inputSchema ?? ''}
          onChange={(event) => setDraft({ ...draft, inputSchema: event.target.value })}
        />
      </label>

      <div className="actions">
        <button
          className="primaryButton"
          type="button"
          disabled={!schemaIsValid}
          onClick={() => onSave(tool.originalName, draft)}
        >
          <Save size={15} />
          Save
        </button>
        <span className={schemaIsValid ? 'okText' : 'badText'}>{schemaIsValid ? 'schema ok' : 'schema JSON'}</span>
      </div>
    </section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className="ghostButton"
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 900);
      }}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
      Copy
    </button>
  );
}

function isJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function statusText(inspector: ReturnType<typeof useInspector>): string {
  if (inspector.loading) {
    return 'Scanning tab';
  }

  if (inspector.status === 'unsupported') {
    return 'WebMCP unavailable';
  }

  if (inspector.status === 'error') {
    return 'Bridge error';
  }

  return `${inspector.tools.length} tool${inspector.tools.length === 1 ? '' : 's'} · ${inspector.origin || 'page'}`;
}
