import type { WordPressMedia } from '@/types/wordpress';
import { isSafeHttpUrl } from '@/security/origins';
import { safeRelativeDownloadPath, sanitizeFilename } from './filename';

export interface MediaDownloadOptions {
  siteFolder: string;
  onProgress?: (completed: number, total: number) => void;
}

function folderForMedia(media: WordPressMedia): string[] {
  const date = new Date(media.date);
  if (Number.isNaN(date.getTime())) return ['media'];
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return ['media', year, month];
}

/** Downloads a single media item via browser.downloads, refusing unsafe/non-http(s) source URLs. */
export async function downloadMediaItem(media: WordPressMedia, options: MediaDownloadOptions): Promise<number> {
  if (!isSafeHttpUrl(media.source_url)) {
    throw new Error(`Refusing to download unsafe media URL: ${media.source_url}`);
  }
  const filenameFromUrl = media.source_url.split('/').pop() ?? `media-${media.id}`;
  const filename = sanitizeFilename(filenameFromUrl, `media-${media.id}`);
  const relativePath = safeRelativeDownloadPath(options.siteFolder, ...folderForMedia(media), filename);

  return browser.downloads.download({
    url: media.source_url,
    filename: relativePath,
    saveAs: false,
  });
}

export async function downloadMediaBatch(
  items: WordPressMedia[],
  options: MediaDownloadOptions,
  signal?: AbortSignal,
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;
  for (let i = 0; i < items.length; i += 1) {
    if (signal?.aborted) break;
    try {
      await downloadMediaItem(items[i], options);
      succeeded += 1;
    } catch {
      failed += 1;
    }
    options.onProgress?.(i + 1, items.length);
  }
  return { succeeded, failed };
}
