import type { EndpointArgSchema, RouteInfo } from '@/types/api';

export interface ParamDoc {
  name: string;
  type: string;
  required: boolean;
  default?: unknown;
  enumValues?: unknown[];
  description?: string;
}

function typeLabel(schema: EndpointArgSchema): string {
  if (Array.isArray(schema.type)) return schema.type.join(' | ');
  return schema.type ?? 'unknown';
}

/** Builds a mini-documentation table for a route/method from REST index schema metadata. */
export function describeRouteParams(route: RouteInfo, method = 'GET'): ParamDoc[] {
  const endpoint = route.endpoints.find((e) => e.methods.includes(method)) ?? route.endpoints[0];
  if (!endpoint?.args) return [];
  return Object.entries(endpoint.args).map(([name, schema]) => ({
    name,
    type: typeLabel(schema),
    required: !!schema.required,
    default: schema.default,
    enumValues: schema.enum,
    description: schema.description,
  }));
}

export function methodsForRoute(route: RouteInfo): string[] {
  return Array.from(new Set(route.endpoints.flatMap((e) => e.methods)));
}

/** Only GET (and HEAD) are surfaced in normal mode; the app is intentionally read-only. */
export function isReadOnlyMethod(method: string): boolean {
  return method === 'GET' || method === 'HEAD';
}
