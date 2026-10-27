import { describe, expect, it } from 'vitest';
import { detectFromDom } from '@/detection/detectFromDom';

describe('detectFromDom', () => {
  it('finds the api.w.org link and generator meta tag', () => {
    document.head.innerHTML = `
      <link rel="https://api.w.org/" href="https://example.com/wp-json/" />
      <meta name="generator" content="WordPress 6.5" />
    `;
    document.title = 'Example Site';

    const result = detectFromDom();
    expect(result.apiRootFromLink).toBe('https://example.com/wp-json/');
    expect(result.generator).toBe('WordPress 6.5');
    expect(result.pageTitle).toBe('Example Site');
  });

  it('detects wp-content/wp-includes signals in markup even without a link tag', () => {
    document.head.innerHTML = '';
    document.body.innerHTML = '<img src="/wp-content/uploads/photo.jpg" /><script src="/wp-includes/js/jquery.js"></script>';

    const result = detectFromDom();
    expect(result.apiRootFromLink).toBeUndefined();
    expect(result.hasWpContentPaths).toBe(true);
    expect(result.hasWpIncludesPaths).toBe(true);
  });

  it('reports no signals for a non-WordPress page', () => {
    document.head.innerHTML = '';
    document.body.innerHTML = '<div>Hello world</div>';

    const result = detectFromDom();
    expect(result.apiRootFromLink).toBeUndefined();
    expect(result.hasWpContentPaths).toBe(false);
    expect(result.hasWpIncludesPaths).toBe(false);
    expect(result.hasWpJsonPreload).toBe(false);
  });
});
