export interface SiteHistoryEntry {
  origin: string;
  siteName?: string;
  apiRoot?: string;
  lastOpened: string;
  favorite: boolean;
}

const SITES_KEY = 'wpRestExplorer.sites';
const MAX_HISTORY = 50;

async function readAll(): Promise<SiteHistoryEntry[]> {
  const stored = await browser.storage.local.get(SITES_KEY);
  return (stored[SITES_KEY] as SiteHistoryEntry[] | undefined) ?? [];
}

async function writeAll(entries: SiteHistoryEntry[]): Promise<void> {
  await browser.storage.local.set({ [SITES_KEY]: entries });
}

export async function recordSiteVisit(origin: string, siteName?: string, apiRoot?: string): Promise<void> {
  const entries = await readAll();
  const existing = entries.find((e) => e.origin === origin);
  const updated: SiteHistoryEntry = {
    origin,
    siteName: siteName ?? existing?.siteName,
    apiRoot: apiRoot ?? existing?.apiRoot,
    lastOpened: new Date().toISOString(),
    favorite: existing?.favorite ?? false,
  };
  const rest = entries.filter((e) => e.origin !== origin);
  await writeAll([updated, ...rest].slice(0, MAX_HISTORY));
}
