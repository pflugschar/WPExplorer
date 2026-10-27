import { normalizeOrigin } from './origins';

export interface AppPasswordCredential {
  kind: 'application-password';
  username: string;
  applicationPassword: string;
}

export interface WooCommerceKeyCredential {
  kind: 'woocommerce-keys';
  consumerKey: string;
  consumerSecret: string;
}

export type StoredCredential = AppPasswordCredential | WooCommerceKeyCredential;

/**
 * In-memory-only credential store, scoped to the current explorer session.
 * Nothing here is written to disk; the map is lost on tab close/reload by design.
 */
class CredentialStore {
  private readonly byOrigin = new Map<string, StoredCredential[]>();

  set(origin: string, credential: StoredCredential): void {
    const normalized = normalizeOrigin(origin);
    if (!normalized) return;
    const existing = this.byOrigin.get(normalized) ?? [];
    this.byOrigin.set(
      normalized,
      [...existing.filter((c) => c.kind !== credential.kind), credential],
    );
  }

  get(origin: string, kind: StoredCredential['kind']): StoredCredential | undefined {
    const normalized = normalizeOrigin(origin);
    if (!normalized) return undefined;
    return this.byOrigin.get(normalized)?.find((c) => c.kind === kind);
  }

  clear(origin: string): void {
    const normalized = normalizeOrigin(origin);
    if (normalized) this.byOrigin.delete(normalized);
  }

  clearAll(): void {
    this.byOrigin.clear();
  }
}

export const credentialStore = new CredentialStore();
