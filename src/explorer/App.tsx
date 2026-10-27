import { useEffect, useMemo, useState } from 'react';
import { SiteContext, type SiteContextValue } from './SiteContext';
import { Sidebar, type SidebarView } from './components/Sidebar';
import { SiteOverview } from './components/SiteOverview';
import { RouteExplorer } from './components/RouteExplorer';
import { GlobalSearch } from './components/GlobalSearch';
import { DevTools } from './components/DevTools';
import { ExportDialog } from './components/ExportDialog';
import { AuthenticationDialog } from './components/AuthenticationDialog';
import { JsonViewer } from './components/JsonViewer';
import { discoverWordPress } from '@/api/discovery';
import { WordPressClient, type RequestLogEntry } from '@/api/wordpressClient';
import { buildRouteTree } from '@/api/routes';
import { normalizeOrigin, originMatchPattern } from '@/security/origins';
import { recordSiteVisit } from '@/storage/sites';
import type { WordPressApiIndex, WordPressDetectionResult } from '@/types/api';
import type { DomDetectionSignals } from '@/detection/detectFromDom';
import type { AuthenticationProvider } from '@/api/authentication';

type AppState =
  | { kind: 'no-site' }
  | { kind: 'checking-permission'; origin: string }
  | { kind: 'needs-permission'; origin: string }
  | { kind: 'detecting'; origin: string }
  | { kind: 'not-detected'; origin: string; detection: WordPressDetectionResult }
  | { kind: 'rest-blocked'; origin: string; detection: WordPressDetectionResult }
  | { kind: 'ready'; origin: string; detection: WordPressDetectionResult; apiIndex: WordPressApiIndex };

function getSiteParam(): string | undefined {
  const params = new URLSearchParams(window.location.search);
  return params.get('site') ?? undefined;
}

export function App() {
  const [state, setState] = useState<AppState>({ kind: 'no-site' });
  const [view, setView] = useState<SidebarView>({ kind: 'overview' });
  const [requestLog, setRequestLog] = useState<RequestLogEntry[]>([]);
  const [auth, setAuth] = useState<AuthenticationProvider>();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [rawResourceUrl, setRawResourceUrl] = useState<string>();
  const [rawResourceData, setRawResourceData] = useState<unknown>();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const site = getSiteParam();
    if (!site) {
      setState({ kind: 'no-site' });
      return;
    }
    const origin = normalizeOrigin(site);
    if (!origin) {
      setState({ kind: 'no-site' });
      return;
    }
    setState({ kind: 'checking-permission', origin });
  }, []);

  useEffect(() => {
    if (state.kind !== 'checking-permission') return;
    const { origin } = state;
    const pattern = originMatchPattern(origin);
    if (!pattern) {
      setState({ kind: 'no-site' });
      return;
    }
    void browser.permissions.contains({ origins: [pattern] }).then((granted) => {
      setState(granted ? { kind: 'detecting', origin } : { kind: 'needs-permission', origin });
    });
  }, [state]);

  useEffect(() => {
    if (state.kind !== 'detecting') return;
    const { origin } = state;
    let cancelled = false;

    void browser.storage.session
      .get(`domSignals:${origin}`)
      .then(async (stored) => {
        const domSignals = stored[`domSignals:${origin}`] as DomDetectionSignals | undefined;
        const { detection, apiIndex } = await discoverWordPress(origin, domSignals);
        if (cancelled) return;

        if (apiIndex && detection.apiRoot) {
          void recordSiteVisit(origin, apiIndex.name, detection.apiRoot);
          setState({ kind: 'ready', origin, detection, apiIndex });
        } else {
          const hadPositiveSignal = detection.methods.some(
            (m) => m.matched && (m.name === 'html-link-rel' || m.name === 'link-header' || m.name === 'html-content-signals'),
          );
          setState(hadPositiveSignal ? { kind: 'rest-blocked', origin, detection } : { kind: 'not-detected', origin, detection });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'not-detected', origin, detection: { detected: false, confidence: 0, siteUrl: origin, methods: [] } });
      });

    return () => {
      cancelled = true;
    };
  }, [state]);

  async function requestPermission(origin: string) {
    const pattern = originMatchPattern(origin);
    if (!pattern) return;
    const granted = await browser.permissions.request({ origins: [pattern] });
    setState(granted ? { kind: 'detecting', origin } : { kind: 'needs-permission', origin });
  }

  function addRequestLogEntry(entry: RequestLogEntry) {
    setRequestLog((prev) => [...prev.slice(-199), entry]);
  }

  const client = useMemo(() => {
    if (state.kind !== 'ready') return undefined;
    return new WordPressClient(state.detection.apiRoot ?? `${state.origin}/wp-json/`, {
      auth,
      onRequest: addRequestLogEntry,
    });
  }, [state, auth]);

  const routeTree = useMemo(() => (state.kind === 'ready' ? buildRouteTree(state.apiIndex) : undefined), [state]);

  async function handleNavigateUrl(url: string) {
    if (!client) return;
    setRawResourceUrl(url);
    try {
      const response = await client.getRaw(url);
      setRawResourceData(JSON.parse(response.text));
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
      setRawResourceUrl(undefined);
    }
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  if (state.kind === 'no-site') {
    return (
      <div className="empty-page">
        <h1>WP REST Explorer</h1>
        <p>Open a website in your browser, then click the WP REST Explorer toolbar icon to inspect it here.</p>
      </div>
    );
  }

  if (state.kind === 'checking-permission' || state.kind === 'detecting') {
    return (
      <div className="empty-page">
        <h1>{state.origin}</h1>
        <p>{state.kind === 'checking-permission' ? 'Checking permissions…' : 'Detecting WordPress…'}</p>
      </div>
    );
  }

  if (state.kind === 'needs-permission') {
    return (
      <div className="empty-page">
        <h1>{state.origin}</h1>
        <p>WP REST Explorer needs permission to access this site before it can inspect its REST API.</p>
        <button className="primary" onClick={() => requestPermission(state.origin)}>
          Grant access to {state.origin}
        </button>
      </div>
    );
  }

  if (state.kind === 'not-detected') {
    return (
      <div className="empty-page">
        <h1>{state.origin}</h1>
        <p className="error">WordPress was not detected on this site.</p>
        <ul className="detection-methods">
          {state.detection.methods.map((m) => (
            <li key={m.name} className={m.matched ? 'matched' : 'unmatched'}>
              <span>{m.matched ? '✓' : '✗'}</span> {m.name} {m.detail ? `— ${m.detail}` : ''}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (state.kind === 'rest-blocked') {
    return (
      <div className="empty-page">
        <h1>{state.origin}</h1>
        <p className="error">WordPress signals were found, but the REST API could not be reached.</p>
        <p className="hint">
          Possible causes: the REST API is disabled, a firewall/security plugin is blocking it, a CORS/permission
          issue, or the endpoint requires authentication.
        </p>
        <ul className="detection-methods">
          {state.detection.methods.map((m) => (
            <li key={m.name} className={m.matched ? 'matched' : 'unmatched'}>
              <span>{m.matched ? '✓' : '✗'}</span> {m.name} {m.detail ? `— ${m.detail}` : ''}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (!client || !routeTree) return null;

  const contextValue: SiteContextValue = {
    origin: state.origin,
    detection: state.detection,
    apiIndex: state.apiIndex,
    client,
    routeTree,
    requestLog,
    clearRequestLog: () => setRequestLog([]),
    auth,
    setAuth,
  };

  return (
    <SiteContext.Provider value={contextValue}>
      <div className="app-layout">
        <Sidebar active={view} onSelect={setView} />
        <div className="app-main">
          <header className="app-toolbar">
            <span className="breadcrumbs">
              {state.origin} {view.kind === 'route' ? `› ${view.node.label}` : ''}
            </span>
            <div className="toolbar-actions">
              <button onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}>
                {theme === 'dark' ? '☀ Light' : '☾ Dark'}
              </button>
              <button onClick={() => setShowAuthDialog(true)}>{auth ? 'Authenticated' : 'Authentication'}</button>
            </div>
          </header>
          <main className="app-content">
            {(view.kind === 'overview' || view.kind === 'export') && <SiteOverview />}
            {view.kind === 'route' && <RouteExplorer node={view.node} onNavigateUrl={handleNavigateUrl} />}
            {view.kind === 'search' && <GlobalSearch onOpenResult={(url) => window.open(url, '_blank', 'noopener,noreferrer')} />}
            {view.kind === 'devtools' && <DevTools />}
          </main>
        </div>
      </div>

      {showAuthDialog && <AuthenticationDialog onClose={() => setShowAuthDialog(false)} />}
      {view.kind === 'export' && <ExportDialog onClose={() => setView({ kind: 'overview' })} />}

      {rawResourceUrl && rawResourceData !== undefined && (
        <div className="modal-backdrop" onClick={() => setRawResourceUrl(undefined)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-tabs">
              <code>{rawResourceUrl}</code>
              <button onClick={() => setRawResourceUrl(undefined)}>Close</button>
            </div>
            <JsonViewer data={rawResourceData} onNavigateUrl={handleNavigateUrl} />
          </div>
        </div>
      )}
    </SiteContext.Provider>
  );
}
