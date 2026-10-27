import type { QueryValue } from '@/types/api';
import type { WordPressClient } from '@/api/wordpressClient';

export interface ExportProgress {
  resource: string;
  pagesFetched: number;
  totalPages?: number;
  objectsDownloaded: number;
  failures: number;
}

export interface FetchAllPagesOptions {
  concurrency?: number;
  pageSize?: number;
  signal?: AbortSignal;
  onProgress?: (progress: ExportProgress) => void;
}

/**
 * Follows every page of a REST collection with bounded concurrency (default 4), reporting
 * progress as it goes. Never requests more than one "wave" of `concurrency` pages at a time,
 * so a site is never hammered with thousands of simultaneous requests.
 */
export async function fetchAllPages<T>(
  client: WordPressClient,
  route: string,
  baseParams: Record<string, QueryValue> = {},
  options: FetchAllPagesOptions = {},
): Promise<{ items: T[]; failures: number }> {
  const concurrency = options.concurrency ?? 4;
  const perPage = options.pageSize ?? 50;

  const first = await client.getCollection<T>(route, { ...baseParams, page: 1, per_page: perPage });
  const totalPages = first.totalPages ?? 1;
  const results: T[][] = [first.items];
  let pagesFetched = 1;
  let failures = 0;

  options.onProgress?.({ resource: route, pagesFetched, totalPages, objectsDownloaded: first.items.length, failures });

  const remainingPages = Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => i + 2);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < remainingPages.length) {
      if (options.signal?.aborted) return;
      const page = remainingPages[cursor];
      cursor += 1;
      try {
        const response = await client.getCollection<T>(route, { ...baseParams, page, per_page: perPage });
        results[page - 1] = response.items;
      } catch {
        failures += 1;
      }
      pagesFetched += 1;
      options.onProgress?.({
        resource: route,
        pagesFetched,
        totalPages,
        objectsDownloaded: results.reduce((sum, arr) => sum + (arr?.length ?? 0), 0),
        failures,
      });
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, remainingPages.length) }, worker));

  return { items: results.flat().filter(Boolean), failures };
}

export function toNdjson(items: unknown[]): string {
  return items.map((item) => JSON.stringify(item)).join('\n');
}

/** Triggers a file download for in-memory content via browser.downloads, without touching disk paths outside the download dir. */
export async function downloadTextFile(filename: string, content: string, mimeType = 'application/json'): Promise<number> {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  try {
    return await browser.downloads.download({ url, filename, saveAs: false });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
}

export async function downloadBlob(filename: string, blob: Blob): Promise<number> {
  const url = URL.createObjectURL(blob);
  try {
    return await browser.downloads.download({ url, filename, saveAs: false });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
}
