import { useEffect, useState } from 'react';
import { useSite } from '../SiteContext';
import { hasWooCommerce, hasWooCommerceStoreApi } from '@/api/routes';
import { formatNumber } from '@/utils/format';

interface CountEntry {
  label: string;
  route: string;
}

const CORE_COUNTS: CountEntry[] = [
  { label: 'Posts', route: 'wp/v2/posts' },
  { label: 'Pages', route: 'wp/v2/pages' },
  { label: 'Media', route: 'wp/v2/media' },
  { label: 'Categories', route: 'wp/v2/categories' },
  { label: 'Tags', route: 'wp/v2/tags' },
  { label: 'Comments', route: 'wp/v2/comments' },
];

const WC_COUNTS: CountEntry[] = [{ label: 'Products', route: 'wc/store/v1/products' }];

export function SiteOverview() {
  const { origin, detection, apiIndex, client, routeTree } = useSite();
  const [counts, setCounts] = useState<Record<string, number | undefined>>({});

  const wooCommerce = hasWooCommerce(apiIndex);
  const wooCommerceStore = hasWooCommerceStoreApi(apiIndex);
  const knownNamespaces = new Set(['wp/v2', 'oembed/1.0', 'wc/store/v1', 'wc/v3']);
  const customNamespaces = apiIndex.namespaces.filter((ns) => ns && !knownNamespaces.has(ns));

  useEffect(() => {
    let cancelled = false;
    const entries = [...CORE_COUNTS.filter((c) => routeTree.core.some((n) => n.route === `/${c.route}`)), ...(wooCommerceStore ? WC_COUNTS : [])];

    void Promise.all(
      entries.map(async (entry) => {
        try {
          const response = await client.getCollection(entry.route, { per_page: 1 });
          return [entry.label, response.total] as const;
        } catch {
          return [entry.label, undefined] as const;
        }
      }),
    ).then((results) => {
      if (!cancelled) setCounts(Object.fromEntries(results));
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  return (
    <div className="site-overview">
      <h1>{apiIndex.name ?? origin}</h1>
      <p className="site-overview-url">{origin}</p>

      <div className="overview-grid">
        <div className="overview-row">
          <span>WordPress</span>
          <strong className={detection.detected ? 'ok' : 'fail'}>{detection.detected ? '✓' : '✗'}</strong>
        </div>
        <div className="overview-row">
          <span>REST API</span>
          <strong className="ok">✓</strong>
        </div>
        <div className="overview-row">
          <span>API root</span>
          <code>{detection.apiRoot}</code>
        </div>
        <div className="overview-row">
          <span>WordPress API</span>
          <code>{apiIndex.namespaces.includes('wp/v2') ? 'wp/v2' : '—'}</code>
        </div>
        <div className="overview-row">
          <span>WooCommerce</span>
          <strong className={wooCommerce ? 'ok' : 'muted'}>{wooCommerce ? '✓' : '—'}</strong>
        </div>
        <div className="overview-row">
          <span>WooCommerce Store API</span>
          <strong className={wooCommerceStore ? 'ok' : 'muted'}>{wooCommerceStore ? '✓' : '—'}</strong>
        </div>
        <div className="overview-row">
          <span>Custom namespaces</span>
          <strong>{customNamespaces.length}</strong>
        </div>
      </div>

      <h2>Content counts</h2>
      <div className="overview-grid">
        {[...CORE_COUNTS, ...(wooCommerceStore ? WC_COUNTS : [])]
          .filter((entry) => counts[entry.label] !== undefined)
          .map((entry) => (
            <div className="overview-row" key={entry.label}>
              <span>{entry.label}</span>
              <strong>{formatNumber(counts[entry.label] ?? 0)}</strong>
            </div>
          ))}
      </div>

      <h2>Discovered namespaces</h2>
      <ul className="namespace-list">
        {apiIndex.namespaces.filter(Boolean).map((ns) => (
          <li key={ns}>
            <code>{ns}</code>
          </li>
        ))}
      </ul>

      <h2>Detection methods</h2>
      <ul className="detection-methods">
        {detection.methods.map((method) => (
          <li key={method.name} className={method.matched ? 'matched' : 'unmatched'}>
            <span>{method.matched ? '✓' : '✗'}</span> {method.name}
            {method.detail ? ` — ${method.detail}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}
