import { useState } from 'react';
import { useSite } from '../SiteContext';
import { ApplicationPasswordAuth, WooCommerceKeyAuth } from '@/api/authentication';
import { credentialStore } from '@/security/credentials';
import { isSecureEnoughForCredentials } from '@/security/origins';

export interface AuthenticationDialogProps {
  onClose: () => void;
}

export function AuthenticationDialog({ onClose }: AuthenticationDialogProps) {
  const { origin, setAuth } = useSite();
  const [mode, setMode] = useState<'app-password' | 'woocommerce'>('app-password');
  const [username, setUsername] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [error, setError] = useState<string | undefined>();

  const secureEnough = isSecureEnoughForCredentials(origin);

  function handleConnect() {
    try {
      if (mode === 'app-password') {
        const credential = { kind: 'application-password' as const, username, applicationPassword: appPassword };
        credentialStore.set(origin, credential);
        setAuth(new ApplicationPasswordAuth(origin, credential));
      } else {
        const credential = { kind: 'woocommerce-keys' as const, consumerKey, consumerSecret };
        credentialStore.set(origin, credential);
        setAuth(new WooCommerceKeyAuth(origin, credential));
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function handleDisconnect() {
    credentialStore.clear(origin);
    setAuth(undefined);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Authentication</h2>
        {!secureEnough && (
          <p className="warning">
            This origin is not HTTPS (and is not a recognized local dev host). Credentials will not be sent.
          </p>
        )}
        <p className="hint">
          Credentials are kept in memory only for this explorer session and are never sent to any origin other
          than <code>{origin}</code>.
        </p>
        <div className="tabs">
          <button className={mode === 'app-password' ? 'active' : ''} onClick={() => setMode('app-password')}>
            WordPress Application Password
          </button>
          <button className={mode === 'woocommerce' ? 'active' : ''} onClick={() => setMode('woocommerce')}>
            WooCommerce Keys
          </button>
        </div>

        {mode === 'app-password' ? (
          <div className="form">
            <label>
              Username
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
            </label>
            <label>
              Application Password
              <input
                type="password"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                autoComplete="off"
              />
            </label>
            <p className="hint">
              Do not use your normal account password. Generate an Application Password from your WordPress
              profile page.
            </p>
          </div>
        ) : (
          <div className="form">
            <label>
              Consumer Key
              <input value={consumerKey} onChange={(e) => setConsumerKey(e.target.value)} autoComplete="off" />
            </label>
            <label>
              Consumer Secret
              <input
                type="password"
                value={consumerSecret}
                onChange={(e) => setConsumerSecret(e.target.value)}
                autoComplete="off"
              />
            </label>
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button onClick={handleDisconnect}>Disconnect</button>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleConnect} disabled={!secureEnough}>
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}
