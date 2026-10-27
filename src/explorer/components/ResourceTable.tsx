function getDisplayTitle(item: Record<string, unknown>): string {
  const title = item.title as { rendered?: string } | string | undefined;
  if (typeof title === 'object' && title?.rendered) return title.rendered.replace(/<[^>]+>/g, '');
  if (typeof title === 'string') return title;
  if (typeof item.name === 'string') return item.name;
  if (typeof item.slug === 'string') return item.slug;
  return `#${String(item.id ?? '')}`;
}

const PRIORITY_COLUMNS = ['id', 'title', 'name', 'slug', 'status', 'date', 'modified', 'author', 'type', 'link'];

function pickColumns(items: Record<string, unknown>[]): string[] {
  if (items.length === 0) return [];
  const keys = new Set(Object.keys(items[0]));
  const ordered = PRIORITY_COLUMNS.filter((k) => keys.has(k));
  return ordered.length > 0 ? ordered : Array.from(keys).slice(0, 6);
}

function formatCell(item: Record<string, unknown>, column: string): string {
  const value = item[column];
  if (column === 'title' && value && typeof value === 'object') {
    return getDisplayTitle(item);
  }
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return Array.isArray(value) ? `[${value.length}]` : '{…}';
  return String(value);
}

export interface ResourceTableProps {
  items: Record<string, unknown>[];
  onSelect: (item: Record<string, unknown>) => void;
}

export function ResourceTable({ items, onSelect }: ResourceTableProps) {
  const columns = pickColumns(items);

  if (items.length === 0) {
    return <p className="empty-state">No items found for the current filters.</p>;
  }

  return (
    <table className="resource-table">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col}>{col}</th>
          ))}
          <th></th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={String(item.id ?? i)}>
            {columns.map((col) => (
              <td key={col}>{formatCell(item, col)}</td>
            ))}
            <td>
              <button onClick={() => onSelect(item)}>View</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export { getDisplayTitle };
