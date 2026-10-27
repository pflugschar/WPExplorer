import { describe, expect, it } from 'vitest';
import { buildRouteTree, hasWooCommerce, hasWooCommerceStoreApi } from '@/api/routes';
import { basicWordPressIndex, wooCommerceIndex } from './fixtures';

describe('buildRouteTree', () => {
  it('groups known wp/v2 routes under WordPress Core', () => {
    const tree = buildRouteTree(basicWordPressIndex);
    const labels = tree.core.map((n) => n.label);
    expect(labels).toContain('Posts');
    expect(labels).toContain('Pages');
    expect(labels).toContain('Media');
  });

  it('excludes item routes (with regex placeholders) from the collection tree', () => {
    const tree = buildRouteTree(basicWordPressIndex);
    const allRoutes = tree.core.map((n) => n.route);
    expect(allRoutes.some((r) => r?.includes('(?P<'))).toBe(false);
  });

  it('places unrecognized wp/v2 routes under Custom Post Types', () => {
    const tree = buildRouteTree(basicWordPressIndex);
    expect(tree.customPostTypes.some((n) => n.route === '/wp/v2/movies')).toBe(true);
  });

  it('builds a nested API Explorer tree grouped by path segment', () => {
    const tree = buildRouteTree(basicWordPressIndex);
    const wpGroup = tree.apiExplorer.find((n) => n.label === '/wp');
    expect(wpGroup?.children?.some((n) => n.namespace === 'wp/v2')).toBe(true);
    const v2Group = wpGroup?.children?.find((n) => n.namespace === 'wp/v2');
    expect(v2Group?.children?.some((n) => n.route === '/wp/v2/posts')).toBe(true);
  });

  it('groups WooCommerce routes separately when present', () => {
    const tree = buildRouteTree(wooCommerceIndex);
    expect(tree.woocommerce.some((n) => n.namespace === 'wc/store/v1')).toBe(true);
    expect(tree.woocommerce.some((n) => n.namespace === 'wc/v3')).toBe(true);
  });
});

describe('hasWooCommerce / hasWooCommerceStoreApi', () => {
  it('detects WooCommerce namespaces', () => {
    expect(hasWooCommerce(wooCommerceIndex)).toBe(true);
    expect(hasWooCommerce(basicWordPressIndex)).toBe(false);
  });

  it('detects the public WooCommerce Store API namespace specifically', () => {
    expect(hasWooCommerceStoreApi(wooCommerceIndex)).toBe(true);
    expect(hasWooCommerceStoreApi(basicWordPressIndex)).toBe(false);
  });
});
