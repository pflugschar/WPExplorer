import JSZip from 'jszip';

export interface ZipEntry {
  path: string;
  content: string | Blob;
}

/** Builds a ZIP blob from a flat list of {path, content} entries (paths may include folders). */
export async function buildZip(entries: ZipEntry[]): Promise<Blob> {
  const zip = new JSZip();
  for (const entry of entries) {
    zip.file(entry.path, entry.content);
  }
  return zip.generateAsync({ type: 'blob' });
}
