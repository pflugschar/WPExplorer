import type { WordPressApiIndex } from '@/types/api';

export const basicWordPressIndex: WordPressApiIndex = {
  name: 'Example Site',
  url: 'https://example.com',
  namespaces: ['', 'oembed/1.0', 'wp/v2'],
  routes: {
    '/': { namespace: '', route: '/', methods: ['GET'], endpoints: [{ methods: ['GET'] }] },
    '/wp/v2': { namespace: 'wp/v2', route: '/wp/v2', methods: ['GET'], endpoints: [{ methods: ['GET'] }] },
    '/wp/v2/posts': {
      namespace: 'wp/v2',
      route: '/wp/v2/posts',
      methods: ['GET', 'POST'],
      endpoints: [
        {
          methods: ['GET'],
          args: {
            search: { type: 'string', description: 'Limit results to those matching a string.' },
            page: { type: 'integer', default: 1 },
            per_page: { type: 'integer', default: 10 },
            status: { type: 'string', enum: ['publish', 'future', 'draft'], default: 'publish' },
          },
        },
      ],
    },
    '/wp/v2/posts/(?P<id>[\\d]+)': {
      namespace: 'wp/v2',
      route: '/wp/v2/posts/(?P<id>[\\d]+)',
      methods: ['GET'],
      endpoints: [{ methods: ['GET'] }],
    },
    '/wp/v2/pages': { namespace: 'wp/v2', route: '/wp/v2/pages', methods: ['GET'], endpoints: [{ methods: ['GET'] }] },
    '/wp/v2/media': { namespace: 'wp/v2', route: '/wp/v2/media', methods: ['GET'], endpoints: [{ methods: ['GET'] }] },
    '/wp/v2/movies': { namespace: 'wp/v2', route: '/wp/v2/movies', methods: ['GET'], endpoints: [{ methods: ['GET'] }] },
  },
};

export const wooCommerceIndex: WordPressApiIndex = {
  ...basicWordPressIndex,
  namespaces: [...basicWordPressIndex.namespaces, 'wc/store/v1', 'wc/v3'],
  routes: {
    ...basicWordPressIndex.routes,
    '/wc/store/v1/products': {
      namespace: 'wc/store/v1',
      route: '/wc/store/v1/products',
      methods: ['GET'],
      endpoints: [{ methods: ['GET'] }],
    },
    '/wc/v3/products': { namespace: 'wc/v3', route: '/wc/v3/products', methods: ['GET'], endpoints: [{ methods: ['GET'] }] },
  },
};

export const nonWordPressHtml = '<html><head><title>Just a static site</title></head><body>Hello</body></html>';
