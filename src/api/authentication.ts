import { isSameOrigin, isSecureEnoughForCredentials } from '@/security/origins';
import type { AppPasswordCredential, WooCommerceKeyCredential } from '@/security/credentials';

export interface AuthenticationProvider {
  readonly origin: string;
  /** Returns headers to attach, or an empty object if the request target isn't the credential's origin. */
  buildHeaders(requestUrl: string): Record<string, string>;
  /** Appends auth query params (used by WooCommerce consumer key/secret) when headers aren't viable. */
  buildQueryParams(requestUrl: string): Record<string, string>;
}

/** WordPress Application Passwords, sent as HTTP Basic auth, restricted to their own origin. */
export class ApplicationPasswordAuth implements AuthenticationProvider {
  readonly origin: string;
  private readonly credential: AppPasswordCredential;

  constructor(origin: string, credential: AppPasswordCredential) {
    if (!isSecureEnoughForCredentials(origin)) {
      throw new Error('Refusing to configure credentials for a non-HTTPS, non-local origin');
    }
    this.origin = origin;
    this.credential = credential;
  }

  buildHeaders(requestUrl: string): Record<string, string> {
    if (!isSameOrigin(requestUrl, this.origin)) return {};
    const token = btoa(`${this.credential.username}:${this.credential.applicationPassword}`);
    return { Authorization: `Basic ${token}` };
  }

  buildQueryParams(): Record<string, string> {
    return {};
  }
}

/** WooCommerce REST consumer key/secret, sent as query params (only viable over HTTPS). */
export class WooCommerceKeyAuth implements AuthenticationProvider {
  readonly origin: string;
  private readonly credential: WooCommerceKeyCredential;

  constructor(origin: string, credential: WooCommerceKeyCredential) {
    if (!isSecureEnoughForCredentials(origin)) {
      throw new Error('Refusing to configure credentials for a non-HTTPS, non-local origin');
    }
    this.origin = origin;
    this.credential = credential;
  }

  buildHeaders(): Record<string, string> {
    return {};
  }

  buildQueryParams(requestUrl: string): Record<string, string> {
    if (!isSameOrigin(requestUrl, this.origin)) return {};
    return {
      consumer_key: this.credential.consumerKey,
      consumer_secret: this.credential.consumerSecret,
    };
  }
}

export class NoAuth implements AuthenticationProvider {
  constructor(readonly origin: string) {}
  buildHeaders(): Record<string, string> {
    return {};
  }
  buildQueryParams(): Record<string, string> {
    return {};
  }
}

/** Redacts credentials before a request is copied as cURL/fetch code for the user. */
export function redactAuthHeader(headers: Record<string, string>): Record<string, string> {
  if (!headers.Authorization) return headers;
  return { ...headers, Authorization: 'REDACTED' };
}
