import { useEffect, useState } from 'react';
import { useSite } from '../SiteContext';
import { Pagination } from './Pagination';
import { downloadMediaBatch } from '@/export/mediaDownloader';
import { fetchAllPages } from '@/export/exporter';
import { formatBytes, formatDate } from '@/utils/format';
import type { WordPressMedia } from '@/types/wordpress';

const MIME_FILTERS = [
  { label: 'All types', value: '' },
  { label: 'Images', value: 'image' },
  { label: 'Video', value: 'video' },
  { label: 'Audio', value: 'audio' },
  { label: 'Documents', value: 'application' },
];

export function MediaBrowser() {
  const { client, origin } = useSite();
  const [items, setItems] = useState<WordPressMedia[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState<number>();
  const [total, setTotal] = useState<number>();
  const [search, setSearch] = useState('');
  const [mimeFilter, setMimeFilter] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client
      .getCollection<WordPressMedia>('wp/v2/media', {
        page,
        per_page: pageSize,
        search: search || undefined,
        media_type: mimeFilter || undefined,
      })
      .then((response) => {
        if (cancelled) return;
        setItems(response.items);
        setTotalPages(response.totalPages);
        setTotal(response.total);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, page, pageSize, search, mimeFilter]);

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function downloadCurrentPage() {
    setDownloading(true);
    await downloadMediaBatch(items, { siteFolder: origin.replace(/^https?:\/\//, '') });
    setDownloading(false);
  }

  async function downloadSelected() {
    setDownloading(true);
    await downloadMediaBatch(
      items.filter((item) => selected.has(item.id)),
      { siteFolder: origin.replace(/^https?:\/\//, '') },
    );
    setDownloading(false);
  }

  async function downloadAll() {
    setDownloading(true);
    const { items: all } = await fetchAllPages<WordPressMedia>(
      client,
      'wp/v2/media',
      { search: search || undefined, media_type: mimeFilter || undefined },
      { pageSize: 50 },
    );
    await downloadMediaBatch(all, { siteFolder: origin.replace(/^https?:\/\//, '') });
    setDownloading(false);
  }

  return (
    <div className="media-browser">
      <div className="media-toolbar">
        <input
          placeholder="Search media…"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <select
          value={mimeFilter}
          onChange={(e) => {
            setPage(1);
            setMimeFilter(e.target.value);
          }}
        >
          {MIME_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <button onClick={downloadSelected} disabled={selected.size === 0 || downloading}>
          Download selected ({selected.size})
        </button>
        <button onClick={downloadCurrentPage} disabled={downloading || items.length === 0}>
          Download current page
        </button>
        <button onClick={downloadAll} disabled={downloading}>
          Download all
        </button>
      </div>

      {loading ? (
        <p className="empty-state">Loading media…</p>
      ) : (
        <div className="media-grid">
          {items.map((item) => (
            <label key={item.id} className="media-item">
              <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} />
              {item.media_type === 'image' ? (
                <img src={item.media_details?.sizes?.thumbnail?.source_url ?? item.source_url} alt="" loading="lazy" />
              ) : (
                <div className="media-placeholder">{item.mime_type}</div>
              )}
              <div className="media-meta">
                <strong>{item.title.rendered || item.source_url.split('/').pop()}</strong>
                <span>{item.mime_type}</span>
                {item.media_details?.width && (
                  <span>
                    {item.media_details.width}×{item.media_details.height}
                  </span>
                )}
                {item.media_details?.filesize && <span>{formatBytes(item.media_details.filesize)}</span>}
                <span>{formatDate(item.date)}</span>
                {item.post && <span>Parent: #{item.post}</span>}
              </div>
            </label>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
