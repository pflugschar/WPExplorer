import { describe, expect, it } from 'vitest';
import { sanitizeFilename, dedupeFilename } from '@/export/filename';

describe('sanitizeFilename', () => {
  it('replaces illegal filesystem characters', () => {
    expect(sanitizeFilename('post: "hello"/world?.md')).toBe('post_ _hello__world_.md');
  });

  it('falls back for reserved Windows device names', () => {
    expect(sanitizeFilename('CON')).toBe('file');
    expect(sanitizeFilename('con', 'fallback')).toBe('fallback');
  });

  it('trims trailing dots', () => {
    expect(sanitizeFilename('trailing...')).toBe('trailing');
  });
});

describe('dedupeFilename', () => {
  it('returns the original name when unused', () => {
    const used = new Set<string>();
    expect(dedupeFilename('post.json', used)).toBe('post.json');
  });

  it('appends a numeric suffix on collision', () => {
    const used = new Set(['post.json']);
    expect(dedupeFilename('post.json', used)).toBe('post-2.json');
  });

  it('keeps incrementing until a free name is found', () => {
    const used = new Set(['post.json', 'post-2.json', 'post-3.json']);
    expect(dedupeFilename('post.json', used)).toBe('post-4.json');
  });
});
