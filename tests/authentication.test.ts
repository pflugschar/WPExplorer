import { describe, expect, it } from 'vitest';
import { ApplicationPasswordAuth, WooCommerceKeyAuth, redactAuthHeader } from '@/api/authentication';

describe('ApplicationPasswordAuth', () => {
  it('attaches Basic auth only for requests to its own origin', () => {
    const auth = new ApplicationPasswordAuth('https://example.com', {
      kind: 'application-password',
      username: 'admin',
      applicationPassword: 'xxxx yyyy zzzz',
    });

    const headers = auth.buildHeaders('https://example.com/wp-json/wp/v2/posts');
    expect(headers.Authorization).toMatch(/^Basic /);
  });

  it('never sends credentials to a different origin', () => {
    const auth = new ApplicationPasswordAuth('https://example.com', {
      kind: 'application-password',
      username: 'admin',
      applicationPassword: 'xxxx yyyy zzzz',
    });

    expect(auth.buildHeaders('https://evil.com/wp-json/wp/v2/posts')).toEqual({});
  });

  it('refuses to configure credentials for a non-HTTPS public origin', () => {
    expect(
      () =>
        new ApplicationPasswordAuth('http://example.com', {
          kind: 'application-password',
          username: 'admin',
          applicationPassword: 'secret',
        }),
    ).toThrow();
  });

  it('allows a local dev origin over http', () => {
    expect(
      () =>
        new ApplicationPasswordAuth('http://localhost:8080', {
          kind: 'application-password',
          username: 'admin',
          applicationPassword: 'secret',
        }),
    ).not.toThrow();
  });
});

describe('WooCommerceKeyAuth', () => {
  it('only appends query params for its own origin', () => {
    const auth = new WooCommerceKeyAuth('https://shop.example.com', {
      kind: 'woocommerce-keys',
      consumerKey: 'ck_123',
      consumerSecret: 'cs_456',
    });

    expect(auth.buildQueryParams('https://shop.example.com/wp-json/wc/v3/products')).toEqual({
      consumer_key: 'ck_123',
      consumer_secret: 'cs_456',
    });
    expect(auth.buildQueryParams('https://other.example.com/wp-json/wc/v3/products')).toEqual({});
  });
});

describe('redactAuthHeader', () => {
  it('redacts Authorization but leaves other headers intact', () => {
    expect(redactAuthHeader({ Authorization: 'Basic abc123', Accept: 'application/json' })).toEqual({
      Authorization: 'REDACTED',
      Accept: 'application/json',
    });
  });

  it('is a no-op when there is no Authorization header', () => {
    expect(redactAuthHeader({ Accept: 'application/json' })).toEqual({ Accept: 'application/json' });
  });
});
