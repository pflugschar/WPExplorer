import { useMemo, useState } from 'react';
import { useSite } from '../SiteContext';
import { fetchAllPages, toNdjson, downloadTextFile, downloadBlob, type ExportProgress } from '@/export/exporter';
import { toCsv } from '@/export/csvExporter';
import { postToMarkdown } from '@/export/markdownExporter';
import { buildZip, type ZipEntry } from '@/export/zipExporter';
import { sanitizeFilename } from '@/export/filename';
import { ProgressDialog } from './ProgressDialog';
import type { WordPressPost } from '@/types/wordpress';

type ExportFormat = 'json' | 'ndjson' | 'csv' | 'zip';

export interface ExportDialogProps {
  onClose: () => void;
}

export function ExportDialog({ onClose }: ExportDialogProps) {
  const { client, routeTree, origin } = useSite();

  const availableResources = useMemo(
    () => [...routeTree.core, ...routeTree.customPostTypes, ...routeTree.woocommerce.flatMap((g) => g.children ?? [])],
    [routeTree],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set(availableResources.slice(0, 3).map((r) => r.id)));
  const [format, setFormat] = useState<ExportFormat>('json');
  const [includeMarkdown, setIncludeMarkdown] = useState(true);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState<ExportProgress>({ resource: '', pagesFetched: 0, objectsDownloaded: 0, failures: 0 });
  const [controller, setController] = useState<AbortController | undefined>();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function startExport() {
    const abortController = new AbortController();
    setController(abortController);
    setRunning(true);
    setDone(false);

    const manifest: { site: string; apiRoot: string; exportedAt: string; resources: Record<string, number>; errors: string[] } = {
      site: origin,
      apiRoot: client.apiRoot,
      exportedAt: new Date().toISOString(),
      resources: {},
      errors: [],
    };
    const zipEntries: ZipEntry[] = [];

    const targets = availableResources.filter((r) => selected.has(r.id) && r.route);

    for (const target of targets) {
      if (abortController.signal.aborted) break;
      const route = target.route!.replace(/^\//, '');
      try {
        const { items, failures } = await fetchAllPages<Record<string, unknown>>(
          client,
          route,
          {},
          { signal: abortController.signal, onProgress: (p) => setProgress({ ...p, resource: target.label }) },
        );
        manifest.resources[target.label] = items.length;
        if (failures > 0) manifest.errors.push(`${target.label}: ${failures} page(s) failed to download`);

        const safeName = sanitizeFilename(target.label.toLowerCase());
        if (format === 'zip') {
          zipEntries.push({ path: `${safeName}/${safeName}.json`, content: JSON.stringify(items, null, 2) });
          if (includeMarkdown && (route === 'wp/v2/posts' || route === 'wp/v2/pages')) {
            for (const item of items as unknown as WordPressPost[]) {
              zipEntries.push({ path: `${safeName}/${item.slug || item.id}.md`, content: postToMarkdown(item) });
            }
          }
        } else if (format === 'ndjson') {
          await downloadTextFile(`${origin.replace(/^https?:\/\//, '')}/${safeName}.ndjson`, toNdjson(items), 'application/x-ndjson');
        } else if (format === 'csv') {
          await downloadTextFile(`${origin.replace(/^https?:\/\//, '')}/${safeName}.csv`, toCsv(items), 'text/csv');
        } else {
          await downloadTextFile(`${origin.replace(/^https?:\/\//, '')}/${safeName}.json`, JSON.stringify(items, null, 2));
        }
      } catch (error) {
        manifest.errors.push(`${target.label}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (format === 'zip') {
      zipEntries.push({ path: 'export-manifest.json', content: JSON.stringify(manifest, null, 2) });
      const blob = await buildZip(zipEntries);
      await downloadBlob(`${origin.replace(/^https?:\/\//, '')}/export.zip`, blob);
    } else {
      await downloadTextFile(`${origin.replace(/^https?:\/\//, '')}/export-manifest.json`, JSON.stringify(manifest, null, 2));
    }

    setRunning(false);
    setDone(true);
  }

  if (running || done) {
    return (
      <ProgressDialog
        title="Export Site Content"
        current={progress.resource}
        pagesFetched={progress.pagesFetched}
        totalPages={progress.totalPages}
        objectsDownloaded={progress.objectsDownloaded}
        failures={progress.failures}
        done={done}
        onCancel={() => controller?.abort()}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Export Site Content</h2>
        <p className="hint">Select the resources to export. Pages are fetched with bounded concurrency (4 at a time).</p>
        <div className="export-resource-list">
          {availableResources.map((resource) => (
            <label key={resource.id} className="export-resource">
              <input type="checkbox" checked={selected.has(resource.id)} onChange={() => toggle(resource.id)} />
              {resource.label}
            </label>
          ))}
        </div>

        <div className="form">
          <label>
            Format
            <select value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)}>
              <option value="json">JSON (one file per resource)</option>
              <option value="ndjson">NDJSON</option>
              <option value="csv">CSV</option>
              <option value="zip">ZIP bundle</option>
            </select>
          </label>
          {format === 'zip' && (
            <label className="request-field-checkbox">
              <input type="checkbox" checked={includeMarkdown} onChange={(e) => setIncludeMarkdown(e.target.checked)} />
              <span>Include Markdown for posts/pages</span>
            </label>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={startExport} disabled={selected.size === 0}>
            Start Export
          </button>
        </div>
      </div>
    </div>
  );
}
