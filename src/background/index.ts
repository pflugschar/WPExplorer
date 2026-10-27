import { detectFromDom } from '@/detection/detectFromDom';
import type { DomDetectionSignals } from '@/detection/detectFromDom';
import { normalizeOrigin, isSafeHttpUrl } from '@/security/origins';
import { getSettings } from '@/storage/settings';

const EXPLORER_PATH = 'explorer.html';
const DOM_SIGNALS_PREFIX = 'domSignals:';

async function openExplorerTab(origin?: string): Promise<void> {
  const url = origin
    ? browser.runtime.getURL(`${EXPLORER_PATH}?site=${encodeURIComponent(origin)}`)
    : browser.runtime.getURL(EXPLORER_PATH);
  await browser.tabs.create({ url });
}

async function handleActionClick(tab: browser.tabs.Tab): Promise<void> {
  if (!tab.id || !tab.url || !isSafeHttpUrl(tab.url)) {
    await openExplorerTab();
    return;
  }

  const origin = normalizeOrigin(tab.url);
  if (!origin) {
    await openExplorerTab();
    return;
  }

  try {
    const [injection] = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: detectFromDom as unknown as () => void,
    });
    if (injection?.result) {
      await browser.storage.session.set({ [`${DOM_SIGNALS_PREFIX}${origin}`]: injection.result });
    }
  } catch {
    // Detection is best-effort: activeTab may not cover privileged pages (about:, addons store, etc.).
  }

  await openExplorerTab(origin);
}

function setBadgeForTab(tabId: number, state: 'wordpress' | 'warning' | 'neutral'): void {
  const config = {
    wordpress: { text: 'WP', color: '#2fb170' },
    warning: { text: '!', color: '#e0a52c' },
    neutral: { text: '', color: '#888888' },
  }[state];
  void browser.action.setBadgeText({ tabId, text: config.text });
  void browser.action.setBadgeBackgroundColor({ tabId, color: config.color });
}

/** Lightweight, opt-in auto-detection for tabs, only active once the user grants broad host access. */
async function maybeRegisterAutoDetect(): Promise<void> {
  const settings = await getSettings();
  if (!settings.autoDetectWordPress) return;

  const granted = await browser.permissions.contains({ origins: ['http://*/*', 'https://*/*'] });
  if (!granted) return;

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete' || !tab.url || !isSafeHttpUrl(tab.url)) return;
    setBadgeForTab(tabId, 'neutral');
    browser.scripting
      .executeScript({ target: { tabId }, func: detectFromDom as unknown as () => void })
      .then(([injection]) => {
        const signals = injection?.result as DomDetectionSignals | undefined;
        if (signals?.apiRootFromLink || signals?.hasWpJsonPreload) {
          setBadgeForTab(tabId, 'wordpress');
        } else if (signals?.hasWpContentPaths || signals?.hasWpIncludesPaths) {
          setBadgeForTab(tabId, 'warning');
        }
      })
      .catch(() => undefined);
  });
}

browser.action.onClicked.addListener((tab) => {
  void handleActionClick(tab);
});

void maybeRegisterAutoDetect();
