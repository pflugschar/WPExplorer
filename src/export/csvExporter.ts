function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Flattens an array of records into a CSV string using the union of keys as columns. */
export function toCsv(records: Record<string, unknown>[]): string {
  if (records.length === 0) return '';
  const columns = Array.from(records.reduce((set, record) => {
    Object.keys(record).forEach((key) => set.add(key));
    return set;
  }, new Set<string>()));

  const header = columns.map(csvEscape).join(',');
  const rows = records.map((record) => columns.map((col) => csvEscape(record[col])).join(','));
  return [header, ...rows].join('\n');
}
