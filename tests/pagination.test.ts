import { describe, expect, it } from 'vitest';
import { parsePaginationHeaders, describePage } from '@/api/pagination';

describe('parsePaginationHeaders', () => {
  it('reads X-WP-Total and X-WP-TotalPages', () => {
    const headers = new Headers({ 'X-WP-Total': '1327', 'X-WP-TotalPages': '14' });
    expect(parsePaginationHeaders(headers)).toEqual({ total: 1327, totalPages: 14 });
  });

  it('returns undefined when headers are missing', () => {
    expect(parsePaginationHeaders(new Headers())).toEqual({ total: undefined, totalPages: undefined });
  });
});

describe('describePage', () => {
  it('formats a friendly page description', () => {
    expect(describePage(2, 14, 1327)).toBe('Page 2 of 14 — 1,327 items');
  });

  it('handles missing totals gracefully', () => {
    expect(describePage(1)).toBe('Page 1');
  });
});
