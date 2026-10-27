import { getDisplayTitle } from './ResourceTable';

function getImageUrl(item: Record<string, unknown>): string | undefined {
  const media = item as { source_url?: string; images?: { src: string }[]; media_details?: { sizes?: Record<string, { source_url: string }> } };
  if (media.media_details?.sizes?.thumbnail?.source_url) return media.media_details.sizes.thumbnail.source_url;
  if (media.source_url) return media.source_url;
  if (media.images?.[0]?.src) return media.images[0].src;
  return undefined;
}

function getExcerpt(item: Record<string, unknown>): string | undefined {
  const excerpt = item.excerpt as { rendered?: string } | undefined;
  if (excerpt?.rendered) return excerpt.rendered.replace(/<[^>]+>/g, '').trim();
  if (typeof item.short_description === 'string') return item.short_description.replace(/<[^>]+>/g, '').trim();
  if (typeof item.description === 'string') return item.description.replace(/<[^>]+>/g, '').trim();
  return undefined;
}

export interface ResourceCardProps {
  items: Record<string, unknown>[];
  onSelect: (item: Record<string, unknown>) => void;
}

export function ResourceCardGrid({ items, onSelect }: ResourceCardProps) {
  if (items.length === 0) {
    return <p className="empty-state">No items found for the current filters.</p>;
  }

  return (
    <div className="resource-card-grid">
      {items.map((item, i) => {
        const image = getImageUrl(item);
        const excerpt = getExcerpt(item);
        return (
          <button className="resource-card" key={String(item.id ?? i)} onClick={() => onSelect(item)}>
            {image && <img src={image} alt="" loading="lazy" />}
            <div className="resource-card-body">
              <strong>{getDisplayTitle(item)}</strong>
              {excerpt && <p>{excerpt.slice(0, 140)}</p>}
              {typeof item.status === 'string' && <span className="badge">{item.status}</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
