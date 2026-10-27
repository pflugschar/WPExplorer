import type { PaginatedResponse, QueryValue, RouteInfo, WordPressApiIndex } from '@/types/api';
import { AppError } from '@/types/api';
import { safeFetch, parseJsonResponse } from '@/utils/fetch';
import { withRetry } from '@/utils/retry';
import { buildUrl } from '@/utils/urls';
import { parsePaginationHeaders } from './pagination';
import type { AuthenticationProvider } from './authentication';

export interface RequestLogEntry {
  method: string;
  url: string;
  status?: number;
  durationMs: number;
  responseSize?: number;
  error?: string;
  startedAt: number;
}

export interface WordPressClientOptions {
  auth?: AuthenticationProvider;
  onRequest?: (entry: RequestLogEntry) => void;
  signal?: AbortSignal;
}

/** Reusable, cache-aware client for a single WordPress site's REST API root. Read-only by design. */
export class WordPressClient {
  readonly apiRoot: string;
  private readonly auth?: AuthenticationProvider;
  private readonly onRequest?: (entry: RequestLogEntry) => void;
  private readonly signal?: AbortSignal;
  private readonly getCache = new Map<string, Promise<unknown>>();

  constructor(apiRoot: string, options: WordPressClientOptions = {}) {
    this.apiRoot = apiRoot.endsWith('/') ? apiRoot : `${apiRoot}/`;
    this.auth = options.auth;
    this.onRequest = options.onRequest;
    this.signal = options.signal;
  }

  private async request(url: string, init: RequestInit = {}): Promise<Response> {
    const method = init.method ?? 'GET';
    const started = performance.now();
    const startedAt = Date.now();
    const authHeaders = this.auth?.buildHeaders(url) ?? {};

    try {
      const response = await withRetry(
        () =>
          safeFetch(url, {
            ...init,
            signal: this.signal,
            headers: { Accept: 'application/json', ...authHeaders, ...init.headers },
          }),
        { signal: this.signal },
      );
      this.onRequest?.({
        method,
        url,
        status: response.status,
        durationMs: performance.now() - started,
        responseSize: Number(response.headers.get('content-length')) || undefined,
        startedAt,
      });
      return response;
    } catch (error) {
      this.onRequest?.({
        method,
        url,
        durationMs: performance.now() - started,
        error: error instanceof Error ? error.message : String(error),
        startedAt,
      });
      throw error;
    }
  }

  private withAuthQuery(url: string, query: Record<string, QueryValue> = {}): Record<string, QueryValue> {
    const authParams = this.auth?.buildQueryParams(url) ?? {};
    return { ...query, ...authParams };
  }

  async getApiIndex(): Promise<WordPressApiIndex> {
    const cacheKey = this.apiRoot;
    const cached = this.getCache.get(cacheKey);
    if (cached) return cached as Promise<WordPressApiIndex>;

    const promise = (async () => {
      const response = await this.request(this.apiRoot);
      return parseJsonResponse<WordPressApiIndex>(response);
    })();
    this.getCache.set(cacheKey, promise);
    return promise;
  }

  async getRouteInfo(route: string): Promise<RouteInfo> {
    const index = await this.getApiIndex();
    const info = index.routes[route];
    if (!info) {
      throw new AppError('not-found', `Route ${route} was not found in the REST index`);
    }
    return info;
  }

  async get<T>(route: string, query?: Record<string, QueryValue>): Promise<T> {
    const url = buildUrl(this.apiRoot, route.replace(/^\//, ''), this.withAuthQuery(this.apiRoot + route, query));
    const response = await this.request(url);
    return parseJsonResponse<T>(response);
  }

  async getCollection<T>(route: string, params: Record<string, QueryValue> = {}): Promise<PaginatedResponse<T>> {
    const page = Number(params.page ?? 1);
    const perPage = Number(params.per_page ?? 10);
    const query = this.withAuthQuery(this.apiRoot + route, { page, per_page: perPage, ...params });
    const url = buildUrl(this.apiRoot, route.replace(/^\//, ''), query);
    const response = await this.request(url);
    const items = await parseJsonResponse<T[]>(response);
    const { total, totalPages } = parsePaginationHeaders(response.headers);
    return { items, total, totalPages, page, perPage, responseHeaders: response.headers };
  }

  /** Raw request escape hatch for the API Explorer / query builder (still GET-only). */
  async getRaw(fullUrl: string): Promise<{ status: number; headers: Headers; text: string; durationMs: number }> {
    const started = performance.now();
    const response = await this.request(fullUrl);
    const text = await response.text();
    return { status: response.status, headers: response.headers, text, durationMs: performance.now() - started };
  }
}
