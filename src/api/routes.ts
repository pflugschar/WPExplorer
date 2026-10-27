import type { WordPressApiIndex } from '@/types/api';

export interface RouteTreeNode {
  id: string;
  label: string;
  route?: string;
  namespace?: string;
  children?: RouteTreeNode[];
}

export interface RouteTree {
  core: RouteTreeNode[];
  woocommerce: RouteTreeNode[];
  customPostTypes: RouteTreeNode[];
  apiExplorer: RouteTreeNode[];
}

const CORE_ROUTE_LABELS: Record<string, string> = {
  posts: 'Posts',
  pages: 'Pages',
  media: 'Media',
  categories: 'Categories',
  tags: 'Tags',
  comments: 'Comments',
  users: 'Users',
  search: 'Search',
  types: 'Post Types',
  taxonomies: 'Taxonomies',
  blocks: 'Reusable Blocks',
};

const KNOWN_CORE_SUFFIXES = new Set(Object.keys(CORE_ROUTE_LABELS));

function isCollectionRoute(route: string): boolean {
  return !route.includes('(?P<');
}

function humanize(slug: string): string {
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function collectionRoutesForNamespace(index: WordPressApiIndex, namespace: string): string[] {
  return Object.keys(index.routes)
    .filter((route) => isCollectionRoute(route) && route.startsWith(`/${namespace}/`) && route !== `/${namespace}`)
    .sort();
}

interface PathTrieNode {
  fullPath: string;
  route?: string;
  namespace?: string;
  children: Map<string, PathTrieNode>;
}

/** Finds (creating as needed) the trie node for a path, splitting it into one node per '/' segment. */
function getOrCreateTrieNode(root: PathTrieNode, path: string): PathTrieNode {
  let node = root;
  let cumulative = '';
  for (const segment of path.split('/').filter(Boolean)) {
    cumulative += `/${segment}`;
    let child = node.children.get(segment);
    if (!child) {
      child = { fullPath: cumulative, children: new Map() };
      node.children.set(segment, child);
    }
    node = child;
  }
  return node;
}

function trieToNodes(node: PathTrieNode): RouteTreeNode[] {
  return [...node.children.values()]
    .sort((a, b) => a.fullPath.localeCompare(b.fullPath))
    .map((child) => {
      const children = trieToNodes(child);
      return {
        id: `explorer-${child.fullPath}`,
        label: child.fullPath,
        route: child.route,
        namespace: child.namespace,
        children: children.length > 0 ? children : undefined,
      };
    });
}

/**
 * Builds the API Explorer tree by splitting every discovered route into one nested,
 * collapsible group per path segment (e.g. /wp-site-health -> /wp-site-health/v1 -> .../directory-sizes).
 */
function buildApiExplorerTree(index: WordPressApiIndex): RouteTreeNode[] {
  const root: PathTrieNode = { fullPath: '', children: new Map() };
  for (const [route, info] of Object.entries(index.routes)) {
    if (route === '/') continue;
    const node = getOrCreateTrieNode(root, route);
    node.route = route;
    node.namespace = info.namespace;
  }
  for (const namespace of index.namespaces) {
    if (!namespace) continue;
    getOrCreateTrieNode(root, `/${namespace}`).namespace = namespace;
  }
  return trieToNodes(root);
}

/** Builds the sidebar navigation tree entirely from the discovered REST index (no hardcoded site assumptions). */
export function buildRouteTree(index: WordPressApiIndex): RouteTree {
  const core: RouteTreeNode[] = [];
  const customPostTypes: RouteTreeNode[] = [];

  if (index.namespaces.includes('wp/v2')) {
    const wpRoutes = collectionRoutesForNamespace(index, 'wp/v2');
    for (const route of wpRoutes) {
      const suffix = route.replace('/wp/v2/', '');
      if (KNOWN_CORE_SUFFIXES.has(suffix)) {
        core.push({ id: route, label: CORE_ROUTE_LABELS[suffix], route, namespace: 'wp/v2' });
      }
    }
    for (const route of wpRoutes) {
      const suffix = route.replace('/wp/v2/', '');
      if (!KNOWN_CORE_SUFFIXES.has(suffix) && suffix !== 'settings') {
        customPostTypes.push({ id: route, label: humanize(suffix), route, namespace: 'wp/v2' });
      }
    }
    core.sort((a, b) => Object.keys(CORE_ROUTE_LABELS).indexOf(a.route!.split('/').pop()!) -
      Object.keys(CORE_ROUTE_LABELS).indexOf(b.route!.split('/').pop()!));
  }

  const woocommerce: RouteTreeNode[] = [];
  const wcNamespaces = index.namespaces.filter((ns) => ns.startsWith('wc/'));
  for (const namespace of wcNamespaces) {
    const routes = collectionRoutesForNamespace(index, namespace);
    if (routes.length === 0) continue;
    woocommerce.push({
      id: namespace,
      label: namespace,
      namespace,
      children: routes.map((route) => ({
        id: route,
        label: humanize(route.split('/').pop() ?? route),
        route,
        namespace,
      })),
    });
  }

  const apiExplorer = buildApiExplorerTree(index);

  return { core, woocommerce, customPostTypes, apiExplorer };
}

export function hasWooCommerce(index: WordPressApiIndex): boolean {
  return index.namespaces.some((ns) => ns.startsWith('wc/'));
}

export function hasWooCommerceStoreApi(index: WordPressApiIndex): boolean {
  return index.namespaces.includes('wc/store/v1') || index.namespaces.includes('wc/store');
}
