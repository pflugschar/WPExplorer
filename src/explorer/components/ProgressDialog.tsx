export interface ProgressDialogProps {
  title: string;
  current: string;
  pagesFetched: number;
  totalPages?: number;
  objectsDownloaded: number;
  mediaDownloaded?: number;
  failures: number;
  onCancel: () => void;
  done?: boolean;
  onClose?: () => void;
}

export function ProgressDialog({
  title,
  current,
  pagesFetched,
  totalPages,
  objectsDownloaded,
  mediaDownloaded,
  failures,
  onCancel,
  done,
  onClose,
}: ProgressDialogProps) {
  const percent = totalPages ? Math.min(100, Math.round((pagesFetched / totalPages) * 100)) : undefined;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>{title}</h2>
        <p>Current resource: {current}</p>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${percent ?? 0}%` }} />
        </div>
        <ul className="progress-stats">
          <li>
            Pages fetched: {pagesFetched}
            {totalPages ? ` / ${totalPages}` : ''}
          </li>
          <li>Objects downloaded: {objectsDownloaded}</li>
          {mediaDownloaded !== undefined && <li>Media downloaded: {mediaDownloaded}</li>}
          <li>Failures: {failures}</li>
        </ul>
        <div className="modal-actions">
          {!done && <button onClick={onCancel}>Cancel</button>}
          {done && (
            <button className="primary" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
