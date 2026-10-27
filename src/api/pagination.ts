export interface PaginationInfo {
  total?: number;
  totalPages?: number;
}

/** Reads WordPress's `X-WP-Total` / `X-WP-TotalPages` collection headers. */
export function parsePaginationHeaders(headers: Headers): PaginationInfo {
  const total = headers.get('x-wp-total');
  const totalPages = headers.get('x-wp-totalpages');
  return {
    total: total !== null ? Number(total) : undefined,
    totalPages: totalPages !== null ? Number(totalPages) : undefined,
  };
}

export function describePage(page: number, totalPages?: number, total?: number): string {
  const pageDescription = totalPages ? `Page ${page} of ${totalPages}` : `Page ${page}`;
  const totalDescription = total !== undefined ? ` — ${new Intl.NumberFormat('en-US').format(total)} items` : '';
  return `${pageDescription}${totalDescription}`;
}
