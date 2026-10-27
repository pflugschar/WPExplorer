import { createContext, useContext } from 'react';
import type { WordPressApiIndex, WordPressDetectionResult } from '@/types/api';
import type { WordPressClient, RequestLogEntry } from '@/api/wordpressClient';
import type { RouteTree } from '@/api/routes';
import type { AuthenticationProvider } from '@/api/authentication';

export interface SiteContextValue {
  origin: string;
  detection: WordPressDetectionResult;
  apiIndex: WordPressApiIndex;
  client: WordPressClient;
  routeTree: RouteTree;
  requestLog: RequestLogEntry[];
  clearRequestLog: () => void;
  auth?: AuthenticationProvider;
  setAuth: (auth: AuthenticationProvider | undefined) => void;
}

export const SiteContext = createContext<SiteContextValue | undefined>(undefined);

export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used within a SiteContext provider');
  return ctx;
}
