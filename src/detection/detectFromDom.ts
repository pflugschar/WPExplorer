/**
 * DOM-based WordPress signals, gathered by injecting `detectFromDom` into the active tab via
 * `browser.scripting.executeScript`. This function MUST remain self-contained (no imports, no
 * references to outer closures) because it is serialized and re-executed in the page context.
 */
export interface DomDetectionSignals {
  apiRootFromLink?: string;
  restRouteAlternate?: string;
  generator?: string;
  hasWpContentPaths: boolean;
  hasWpIncludesPaths: boolean;
  hasWpJsonPreload: boolean;
  pageTitle: string;
}

export function detectFromDom(): DomDetectionSignals {
  const apiLink = document.querySelector('link[rel="https://api.w.org/"]');
  const apiRootFromLink = apiLink?.getAttribute('href') ?? undefined;

  const alternateLink = document.querySelector('link[rel="alternate"][type="application/json"]');
  const restRouteAlternate = alternateLink?.getAttribute('href') ?? undefined;

  const generatorMeta = document.querySelector('meta[name="generator"]');
  const generator = generatorMeta?.getAttribute('content') ?? undefined;

  const html = document.documentElement.outerHTML;
  const hasWpContentPaths = /\/wp-content\//.test(html);
  const hasWpIncludesPaths = /\/wp-includes\//.test(html);
  const hasWpJsonPreload = /\/wp-json\//.test(html);

  return {
    apiRootFromLink,
    restRouteAlternate,
    generator,
    hasWpContentPaths,
    hasWpIncludesPaths,
    hasWpJsonPreload,
    pageTitle: document.title,
  };
}
