export interface ExtensionSettings {
  autoDetectWordPress: boolean;
  theme: 'system' | 'light' | 'dark';
  defaultPageSize: number;
}

const SETTINGS_KEY = 'wpRestExplorer.settings';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  autoDetectWordPress: false,
  theme: 'system',
  defaultPageSize: 10,
};

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await browser.storage.local.get(SETTINGS_KEY);
  const value = stored[SETTINGS_KEY] as Partial<ExtensionSettings> | undefined;
  return { ...DEFAULT_SETTINGS, ...value };
}
