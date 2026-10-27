import { useState } from 'react';
import { useSite } from '../SiteContext';
import { hasWooCommerceStoreApi } from '@/api/routes';
import type { WordPressSearchResult } from '@/types/wordpress';
import type { WcStoreProduct } from '@/types/woocommerce';

export interface GlobalSearchProps {
  onOpenResult: (url: string) => void;
}

interface GroupedResults {
  posts: WordPressSearchResult[];
  pages: WordPressSearchResult[];
  media: WordPressSearchResult[];
  other: WordPressSearchResult[];
  products: WcStoreProduct[];
}

export function GlobalSearch({ onOpenResult }: GlobalSearchProps) {
  const { client, apiIndex } = useSite();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GroupedResults>();
  const [loading, setLoading] = useState(false);

  async function runSearch() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const [coreResults, products] = await Promise.all([
        client.get<WordPressSearchResult[]>('wp/v2/search', { search: query, per_page: 50 }).catch(() => []),
        hasWooCommerceStoreApi(apiIndex)
          ? client.getCollection<WcStoreProduct>('wc/store/v1/products', { search: query, per_page: 20 }).then((r) => r.items).catch(() => [])
          : Promise.resolve([]),
      ]);

      setResults({
        posts: coreResults.filter((r) => r.subtype === 'post'),
        pages: coreResults.filter((r) => r.subtype === 'page'),
        media: coreResults.filter((r) => r.type === 'media' || r.subtype === 'attachment'),
        other: coreResults.filter((r) => !['post', 'page', 'attachment'].includes(r.subtype)),
        products,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="global-search">
      <h1>Global Search</h1>
      <div className="search-bar">
        <input
          placeholder="Search across posts, pages, products, media…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
        />
        <button onClick={runSearch} disabled={loading}>
          Search
        </button>
      </div>

      {loading && <p className="empty-state">Searching…</p>}

      {results && (
        <div className="search-results">
          <h2>
            Results for &ldquo;{query}&rdquo;
          </h2>
          <div className="search-summary">
            <span>Posts {results.posts.length}</span>
            <span>Pages {results.pages.length}</span>
            <span>Products {results.products.length}</span>
            <span>Media {results.media.length}</span>
          </div>
          {[
            { label: 'Posts', items: results.posts },
            { label: 'Pages', items: results.pages },
            { label: 'Media', items: results.media },
            { label: 'Other', items: results.other },
          ]
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <section key={group.label}>
                <h3>{group.label}</h3>
                <ul>
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <button onClick={() => onOpenResult(item.url)}>{item.title}</button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          {results.products.length > 0 && (
            <section>
              <h3>Products</h3>
              <ul>
                {results.products.map((product) => (
                  <li key={product.id}>
                    <button onClick={() => onOpenResult(product.permalink)}>{product.name}</button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
