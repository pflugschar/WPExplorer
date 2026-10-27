// eslint-disable-next-line no-control-regex
const ILLEGAL_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;
const RESERVED_NAMES = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;

/** Sanitizes a string for safe use as a file/folder name across platforms. */
export function sanitizeFilename(name: string, fallback = 'file'): string {
  let cleaned = name.replace(ILLEGAL_CHARS, '_').trim().replace(/\.+$/, '').slice(0, 180);
  if (!cleaned || RESERVED_NAMES.test(cleaned)) cleaned = fallback;
  return cleaned;
}

/** Appends a numeric suffix to avoid collisions within a set of already-used names. */
export function dedupeFilename(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dotIndex = name.lastIndexOf('.');
  const base = dotIndex > 0 ? name.slice(0, dotIndex) : name;
  const ext = dotIndex > 0 ? name.slice(dotIndex) : '';
  let counter = 2;
  let candidate = `${base}-${counter}${ext}`;
  while (used.has(candidate)) {
    counter += 1;
    candidate = `${base}-${counter}${ext}`;
  }
  used.add(candidate);
  return candidate;
}

export function safeRelativeDownloadPath(...segments: string[]): string {
  return segments
    .map((segment) => sanitizeFilename(segment))
    .join('/')
    .replace(/^\/+/, '');
}
