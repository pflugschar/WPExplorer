import { useMemo, useState } from 'react';
import { isSafeHttpUrl } from '@/security/origins';

export interface JsonViewerProps {
  data: unknown;
  onNavigateUrl?: (url: string) => void;
}

function isUrlLike(value: string): boolean {
  return /^https?:\/\//i.test(value) && isSafeHttpUrl(value);
}

function copyToClipboard(value: string): void {
  void navigator.clipboard.writeText(value);
}

function nodeContainsQuery(value: unknown, query: string): boolean {
  if (!query) return false;
  const lower = query.toLowerCase();
  if (value === null || value === undefined) return false;
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(
      ([key, val]) => key.toLowerCase().includes(lower) || nodeContainsQuery(val, query),
    );
  }
  return String(value).toLowerCase().includes(lower);
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function JsonNode({
  label,
  value,
  path,
  query,
  onNavigateUrl,
  depth,
}: {
  label: string;
  value: unknown;
  path: string;
  query: string;
  onNavigateUrl?: (url: string) => void;
  depth: number;
}) {
  const isContainer = value !== null && typeof value === 'object';
  const forceExpand = query.length > 0 && nodeContainsQuery(value, query);
  const [expanded, setExpanded] = useState(depth < 1);
  const isExpanded = forceExpand || expanded;

  if (!isContainer) {
    const isString = typeof value === 'string';
    const valueStr = isString ? value : JSON.stringify(value);
    return (
      <div className="json-row" style={{ paddingLeft: depth * 16 }}>
        <span className="json-key">
          <Highlight text={label} query={query} />:
        </span>{' '}
        {isString && isUrlLike(value) ? (
          <button
            className="json-link"
            onClick={() => onNavigateUrl?.(value)}
            title="Open this resource in the explorer"
          >
            <Highlight text={valueStr} query={query} />
          </button>
        ) : (
          <span className={`json-value json-${typeof value}`}>
            <Highlight text={String(valueStr)} query={query} />
          </span>
        )}
        <button className="json-copy" onClick={() => copyToClipboard(String(valueStr))} title="Copy value">
          ⧉
        </button>
      </div>
    );
  }

  const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v] as const) : Object.entries(value);
  const typeLabel = Array.isArray(value) ? `Array(${entries.length})` : `Object(${entries.length})`;

  return (
    <div>
      <div className="json-row" style={{ paddingLeft: depth * 16 }}>
        <button className="json-toggle" onClick={() => setExpanded((e) => !e)}>
          {isExpanded ? '▾' : '▸'}
        </button>
        <span className="json-key">
          <Highlight text={label} query={query} />
        </span>{' '}
        <span className="json-type">{typeLabel}</span>
        <button className="json-copy" onClick={() => copyToClipboard(JSON.stringify(value, null, 2))} title="Copy object">
          ⧉
        </button>
      </div>
      {isExpanded &&
        entries.map(([key, val]) => (
          <JsonNode
            key={`${path}.${key}`}
            label={key}
            value={val}
            path={`${path}.${key}`}
            query={query}
            onNavigateUrl={onNavigateUrl}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

export function JsonViewer({ data, onNavigateUrl }: JsonViewerProps) {
  const [query, setQuery] = useState('');
  const json = useMemo(() => JSON.stringify(data, null, 2), [data]);

  return (
    <div className="json-viewer">
      <div className="json-toolbar">
        <input
          className="json-search"
          placeholder="Search inside JSON…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button onClick={() => copyToClipboard(json)}>Copy response</button>
      </div>
      <div className="json-tree">
        <JsonNode label="root" value={data} path="root" query={query} onNavigateUrl={onNavigateUrl} depth={0} />
      </div>
    </div>
  );
}
