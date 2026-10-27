import { useEffect, useMemo, useState } from 'react';
import type { QueryValue, RouteInfo } from '@/types/api';
import { useSite } from '../SiteContext';
import { ApiRequestBuilder } from './ApiRequestBuilder';
import { ResourceTable } from './ResourceTable';
import { ResourceCardGrid } from './ResourceCard';
import { JsonViewer } from './JsonViewer';
import { Pagination } from './Pagination';
import { MediaBrowser } from './MediaBrowser';
import { sanitizeWordPressHtml } from '@/security/sanitize';
import { downloadTextFile } from '@/export/exporter';
import { postToMarkdown } from '@/export/markdownExporter';
import { sanitizeFilename } from '@/export/filename';
import { buildUrl } from '@/utils/urls';
import { redactAuthHeader } from '@/api/authentication';
import type { RouteTreeNode } from '@/api/routes';
import type { WordPressPost } from '@/types/wordpress';

type ViewMode = 'table' | 'card' | 'json';

export interface RouteExplorerProps {
  node: RouteTreeNode;
  onNavigateUrl: (url: string) => void;
}

function isPostLike(item: Record<string, unknown>): item is Record<string, unknown> & WordPressPost {
  return typeof item.title === 'object' && item.title !== null && 'rendered' in (item.title as object);
}

export function RouteExplorer({ node, onNavigateUrl }: RouteExplorerProps) {
  const { client, auth } = useSite();
  const route = node.route?.replace(/^\//, '') ?? '';
  const [routeInfo, setRouteInfo] = useState<RouteInfo>();
  const [params, setParams] = useState<Record<string, QueryValue>>({ page: 1, per_page: 10 });
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState<number>();
  const [totalPages, setTotalPages] = useState<number>();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [selected, setSelected] = useState<Record<string, unknown>>();
  const [detailMode, setDetailMode] = useState<'api' | 'preview'>('api');
  const [lastDurationMs, setLastDurationMs] = useState<number>();

  useEffect(() => {
    setParams({ page: 1, per_page: 10 });
    setSelected(undefined);
    client.getRouteInfo(node.route ?? '').then(setRouteInfo).catch(() => setRouteInfo(undefined));
  }, [node, client]);

  useEffect(() => {
    if (!route) return;
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    const started = performance.now();
    client
      .getCollection<Record<string, unknown>>(route, params)
      .then((response) => {
        if (cancelled) return;
        setItems(response.items);
        setTotal(response.total);
        setTotalPages(response.totalPages);
        setLastDurationMs(performance.now() - started);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, route, params]);

  const requestUrl = useMemo(() => buildUrl(client.apiRoot, route, params), [client, route, params]);

  function copyAsCurl() {
    const headers = redactAuthHeader(auth?.buildHeaders(requestUrl) ?? {});
    const headerFlags = Object.entries(headers)
      .map(([k, v]) => ` -H "${k}: ${v}"`)
      .join('');
    void navigator.clipboard.writeText(`curl "${requestUrl}"${headerFlags}`);
  }

  function copyAsFetch() {
    const headers = redactAuthHeader(auth?.buildHeaders(requestUrl) ?? {});
    void navigator.clipboard.writeText(
      `fetch(${JSON.stringify(requestUrl)}, { headers: ${JSON.stringify(headers)} }).then(r => r.json())`,
    );
  }

  function copyApiUrl() {
    void navigator.clipboard.writeText(requestUrl);
  }

  if (route === 'wp/v2/media') {
    return <MediaBrowser />;
  }

  return (
    <div className="route-explorer">
      <div className="route-explorer-header">
        <h1>{node.label}</h1>
        <code>{route}</code>
      </div>

      <ApiRequestBuilder route={routeInfo} params={params} onChange={(p) => setParams({ ...p, page: 1 })} />

      <div className="route-explorer-toolbar">
        <div className="view-mode-switch">
          {(['table', 'card', 'json'] as ViewMode[]).map((mode) => (
            <button key={mode} className={viewMode === mode ? 'active' : ''} onClick={() => setViewMode(mode)}>
              {mode}
            </button>
          ))}
        </div>
        <div className="copy-actions">
          <button onClick={copyAsCurl}>Copy as cURL</button>
          <button onClick={copyAsFetch}>Copy as fetch</button>
          <button onClick={copyApiUrl}>Copy API URL</button>
          <button
            onClick={() => downloadTextFile(`${sanitizeFilename(route.replace(/\//g, '-'))}.json`, JSON.stringify(items, null, 2))}
          >
            Download page (JSON)
          </button>
        </div>
      </div>

      {lastDurationMs !== undefined && (
        <p className="request-meta">
          {items.length} item(s) · {Math.round(lastDurationMs)} ms
        </p>
      )}

      {error && <p className="error">Request failed: {error}</p>}
      {loading && <p className="empty-state">Loading…</p>}

      {!loading && !error && (
        <>
          {viewMode === 'table' && <ResourceTable items={items} onSelect={setSelected} />}
          {viewMode === 'card' && <ResourceCardGrid items={items} onSelect={setSelected} />}
          {viewMode === 'json' && <JsonViewer data={items} onNavigateUrl={onNavigateUrl} />}
        </>
      )}

      <Pagination
        page={Number(params.page) || 1}
        totalPages={totalPages}
        total={total}
        pageSize={Number(params.per_page) || 10}
        onPageChange={(page) => setParams((p) => ({ ...p, page }))}
        onPageSizeChange={(per_page) => setParams((p) => ({ ...p, per_page, page: 1 }))}
      />

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(undefined)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-tabs">
              <button className={detailMode === 'api' ? 'active' : ''} onClick={() => setDetailMode('api')}>
                API data
              </button>
              <button className={detailMode === 'preview' ? 'active' : ''} onClick={() => setDetailMode('preview')}>
                Preview
              </button>
              <button
                onClick={() => {
                  const link = (selected as { link?: string }).link;
                  if (link) window.open(link, '_blank', 'noopener,noreferrer');
                }}
              >
                Open Website
              </button>
              {isPostLike(selected) && (
                <button
                  onClick={() =>
                    downloadTextFile(
                      `${sanitizeFilename(selected.slug || String(selected.id))}.md`,
                      postToMarkdown(selected as unknown as WordPressPost),
                      'text/markdown',
                    )
                  }
                >
                  Download Markdown
                </button>
              )}
              <button
                onClick={() =>
                  downloadTextFile(`${sanitizeFilename(String(selected.slug ?? selected.id))}.json`, JSON.stringify(selected, null, 2))
                }
              >
                Download JSON
              </button>
              <button onClick={() => setSelected(undefined)}>Close</button>
            </div>

            {detailMode === 'api' ? (
              <JsonViewer data={selected} onNavigateUrl={onNavigateUrl} />
            ) : (
              <PreviewPane item={selected} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewPane({ item }: { item: Record<string, unknown> }) {
  const title = (item.title as { rendered?: string } | undefined)?.rendered ?? (item.name as string | undefined) ?? '';
  const content = (item.content as { rendered?: string } | undefined)?.rendered;
  const excerpt = (item.excerpt as { rendered?: string } | undefined)?.rendered;
  const image = (item as { source_url?: string }).source_url;

  return (
    <div className="preview-pane">
      {image && <img src={image} alt="" />}
      <h2 dangerouslySetInnerHTML={{ __html: sanitizeWordPressHtml(title) }} />
      {excerpt && <div className="excerpt" dangerouslySetInnerHTML={{ __html: sanitizeWordPressHtml(excerpt) }} />}
      {content && <div className="content" dangerouslySetInnerHTML={{ __html: sanitizeWordPressHtml(content) }} />}
    </div>
  );
}
