import { describePage } from '@/api/pagination';

export interface PaginationProps {
  page: number;
  totalPages?: number;
  total?: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

export function Pagination({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange }: PaginationProps) {
  const canGoPrev = page > 1;
  const canGoNext = !totalPages || page < totalPages;

  return (
    <div className="pagination">
      <span className="pagination-label">{describePage(page, totalPages, total)}</span>
      <div className="pagination-controls">
        <button disabled={!canGoPrev} onClick={() => onPageChange(1)}>
          « First
        </button>
        <button disabled={!canGoPrev} onClick={() => onPageChange(page - 1)}>
          ‹ Prev
        </button>
        <input
          type="number"
          min={1}
          max={totalPages ?? undefined}
          value={page}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isFinite(next) && next >= 1) onPageChange(next);
          }}
        />
        <button disabled={!canGoNext} onClick={() => onPageChange(page + 1)}>
          Next ›
        </button>
        <button disabled={!totalPages || page >= totalPages} onClick={() => onPageChange(totalPages ?? page)}>
          Last »
        </button>
        <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
