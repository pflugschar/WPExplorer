import { useSite } from '../SiteContext';
import { formatDuration } from '@/utils/format';

export function DevTools() {
  const { apiIndex, detection, requestLog, clearRequestLog } = useSite();

  return (
    <div className="dev-tools">
      <h1>Developer Tools</h1>
      <div className="overview-grid">
        <div className="overview-row">
          <span>REST API root</span>
          <code>{detection.apiRoot}</code>
        </div>
        <div className="overview-row">
          <span>Namespaces</span>
          <strong>{apiIndex.namespaces.length}</strong>
        </div>
        <div className="overview-row">
          <span>Routes</span>
          <strong>{Object.keys(apiIndex.routes).length}</strong>
        </div>
      </div>

      <div className="dev-tools-header">
        <h2>Request history (this session)</h2>
        <button onClick={clearRequestLog}>Clear history</button>
      </div>
      <table className="resource-table">
        <thead>
          <tr>
            <th>Method</th>
            <th>URL</th>
            <th>Status</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {[...requestLog].reverse().map((entry, i) => (
            <tr key={i}>
              <td>{entry.method}</td>
              <td className="url-cell">{entry.url}</td>
              <td>{entry.status ?? entry.error ?? '—'}</td>
              <td>{formatDuration(entry.durationMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">Authorization headers are never written to this history.</p>
    </div>
  );
}
