/** Shared low-level API types: REST index, route metadata, pagination, query values. */

export type QueryValue = string | number | boolean | (string | number)[] | undefined;

export interface RenderedField {
  rendered: string;
  protected?: boolean;
  raw?: string;
}

export interface WordPressLink {
  href: string;
  embeddable?: boolean;
  taxonomy?: string;
  templated?: boolean;
}

export type WordPressLinks = Record<string, WordPressLink[]>;

/** Arbitrary `_embedded` payloads keyed by relation name (e.g. "author", "wp:featuredmedia"). */
export type WordPressEmbedded = Record<string, unknown[]>;

export interface WithLinks {
  _links?: WordPressLinks;
  _embedded?: WordPressEmbedded;
}

export interface EndpointArgSchema {
  type?: string | string[];
  description?: string;
  required?: boolean;
  default?: unknown;
  enum?: unknown[];
  properties?: Record<string, EndpointArgSchema>;
}

export interface RouteEndpoint {
  methods: string[];
  args?: Record<string, EndpointArgSchema>;
}

export interface RouteInfo {
  namespace: string;
  route: string;
  methods: string[];
  endpoints: RouteEndpoint[];
  schema?: Record<string, unknown>;
}

export interface WordPressApiIndex {
  name?: string;
  description?: string;
  url?: string;
  home?: string;
  gmt_offset?: number;
  timezone_string?: string;
  namespaces: string[];
  routes: Record<string, RouteInfo>;
  authentication?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total?: number;
  totalPages?: number;
  page: number;
  perPage: number;
  responseHeaders: Headers;
}

export type DetectionMethodName =
  | 'link-header'
  | 'html-link-rel'
  | 'rest-index'
  | 'rest-route-fallback'
  | 'html-generator'
  | 'html-content-signals';

export interface DetectionMethod {
  name: DetectionMethodName;
  matched: boolean;
  weight: number;
  detail?: string;
}

export interface WordPressDetectionResult {
  detected: boolean;
  confidence: number;
  siteUrl: string;
  apiRoot?: string;
  methods: DetectionMethod[];
  wordpressVersion?: string;
}

export type AppErrorKind =
  | 'not-wordpress'
  | 'rest-blocked'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'rate-limited'
  | 'network'
  | 'invalid-response'
  | 'permission-denied'
  | 'unknown';

export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly status?: number;

  constructor(kind: AppErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'AppError';
    this.kind = kind;
    this.status = status;
  }
}
