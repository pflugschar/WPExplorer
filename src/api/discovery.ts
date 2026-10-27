import type { DetectionMethod, WordPressApiIndex, WordPressDetectionResult } from '@/types/api';
import type { DomDetectionSignals } from '@/detection/detectFromDom';
import { detectApiRootFromHeaders } from '@/detection/detectFromHeaders';
import { detectFromApiIndex } from '@/detection/detectFromApi';
import { safeFetch } from '@/utils/fetch';
import { normalizeOrigin, isSameOrigin } from '@/security/origins';
import { joinPath } from '@/utils/urls';

export interface DiscoveryResult {
  detection: WordPressDetectionResult;
  apiIndex?: WordPressApiIndex;
}

function extractVersionFromGenerator(generator?: string): string | undefined {
  if (!generator) return undefined;
  const match = generator.match(/WordPress\s+([\d.]+)/i);
  return match?.[1];
}

function dedupe(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v)));
}

/**
 * Combines DOM signals, HTTP Link-header discovery and REST index validation into a single
 * confidence-scored detection result, then picks the best working API root.
 */
export async function discoverWordPress(
  origin: string,
  domSignals?: DomDetectionSignals,
  signal?: AbortSignal,
): Promise<DiscoveryResult> {
  const normalizedOrigin = normalizeOrigin(origin) ?? origin;
  const methods: DetectionMethod[] = [];

  let headerApiRoot: string | undefined;
  try {
    const homepage = await safeFetch(normalizedOrigin, { signal, timeoutMs: 10000 });
    headerApiRoot = detectApiRootFromHeaders(homepage);
    methods.push({
      name: 'link-header',
      matched: !!headerApiRoot,
      weight: 0.3,
      detail: headerApiRoot ? `Found via Link header: ${headerApiRoot}` : 'No api.w.org Link header present',
    });
  } catch {
    methods.push({ name: 'link-header', matched: false, weight: 0.3, detail: 'Homepage request failed' });
  }

  if (domSignals?.apiRootFromLink) {
    methods.push({
      name: 'html-link-rel',
      matched: true,
      weight: 0.25,
      detail: `Found <link rel="https://api.w.org/"> pointing to ${domSignals.apiRootFromLink}`,
    });
  } else {
    methods.push({ name: 'html-link-rel', matched: false, weight: 0.25 });
  }

  const generatorHasWordPress = !!domSignals?.generator?.toLowerCase().includes('wordpress');
  methods.push({
    name: 'html-generator',
    matched: generatorHasWordPress,
    weight: 0.1,
    detail: domSignals?.generator,
  });

  const contentSignals = !!(domSignals?.hasWpContentPaths || domSignals?.hasWpIncludesPaths || domSignals?.hasWpJsonPreload);
  methods.push({
    name: 'html-content-signals',
    matched: contentSignals,
    weight: 0.1,
    detail: contentSignals ? 'Found wp-content/wp-includes/wp-json references in markup' : undefined,
  });

  const candidates = dedupe([
    domSignals?.apiRootFromLink,
    headerApiRoot,
    joinPath(normalizedOrigin, 'wp-json/'),
  ]).filter((candidate) => isSameOrigin(candidate, normalizedOrigin) || candidate.startsWith(normalizedOrigin));

  const restRouteFallback = `${normalizedOrigin}/?rest_route=/`;

  let apiRoot: string | undefined;
  let apiIndex: WordPressApiIndex | undefined;
  let usedFallback = false;

  for (const candidate of candidates) {
    const result = await detectFromApiIndex(candidate, signal);
    if (result.valid) {
      apiRoot = result.apiRoot;
      apiIndex = result.index;
      break;
    }
  }

  if (!apiRoot) {
    const fallback = await detectFromApiIndex(restRouteFallback, signal);
    if (fallback.valid) {
      apiRoot = fallback.apiRoot;
      apiIndex = fallback.index;
      usedFallback = true;
    }
  }

  methods.push({
    name: 'rest-index',
    matched: !!apiIndex,
    weight: 0.45,
    detail: apiIndex ? `Validated REST index at ${apiRoot}` : 'No candidate REST index validated',
  });
  methods.push({
    name: 'rest-route-fallback',
    matched: usedFallback,
    weight: 0.1,
    detail: usedFallback ? `Used ?rest_route=/ fallback at ${apiRoot}` : undefined,
  });

  const totalWeight = methods.reduce((sum, m) => sum + m.weight, 0);
  const matchedWeight = methods.reduce((sum, m) => sum + (m.matched ? m.weight : 0), 0);
  const confidence = totalWeight > 0 ? Math.min(1, matchedWeight / totalWeight) : 0;

  const detection: WordPressDetectionResult = {
    detected: !!apiIndex || confidence >= 0.5,
    confidence,
    siteUrl: normalizedOrigin,
    apiRoot,
    methods,
    wordpressVersion: extractVersionFromGenerator(domSignals?.generator),
  };

  return { detection, apiIndex };
}
