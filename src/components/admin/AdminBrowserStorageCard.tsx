import type { RefObject, ChangeEvent } from 'react';

type SupabaseSyncStatus = {
  enabled: boolean;
  state: 'disabled' | 'idle' | 'pulling' | 'pushing' | 'synced' | 'error';
  message: string;
  lastSyncedAt: string | null;
  imported: number;
  pushed: number;
};

type AdminBrowserStorageEntry = {
  key: string;
  bytes: number;
  valuePreview: string;
};

type AdminBrowserStorageCardProps = {
  localStorageEntries: AdminBrowserStorageEntry[];
  syncStatus: SupabaseSyncStatus;
  importInputRef: RefObject<HTMLInputElement | null>;
  onCopyLocalStorage: () => void;
  onExportLocalStorage: () => void;
  onImportFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1000000) return `${(bytes / 1000).toFixed(1)} kB`;
  if (bytes < 1000000000) return `${(bytes / 1000000).toFixed(1)} MB`;
  return `${(bytes / 1000000000).toFixed(1)} GB`;
}

function formatSessionDate(value: string): string {
  try {
    const date = new Date(value);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return value;
  }
}

export function AdminBrowserStorageCard({
  localStorageEntries,
  syncStatus,
  importInputRef,
  onCopyLocalStorage,
  onExportLocalStorage,
  onImportFileChange,
}: AdminBrowserStorageCardProps) {
  return (
    <section className="dashboard-card admin-card admin-card-wide">
      <div className="admin-card-header">
        <div>
          <h3>Browser storage</h3>
          <p>Dicta keys currently visible in this browser.</p>
        </div>
        <div className="admin-actions">
          <button type="button" className="secondary-button" onClick={onCopyLocalStorage}>
            Copy JSON
          </button>
          <button type="button" className="secondary-button" onClick={onExportLocalStorage}>
            Export JSON
          </button>
          <button type="button" className="secondary-button" onClick={() => importInputRef.current?.click()}>
            Import JSON
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            onChange={(event) => void onImportFileChange(event)}
            style={{ display: 'none' }}
          />
        </div>
      </div>
      <p className="hint">
        Export from your localhost app, then import that file here to restore sessions, leaderboard data, adaptive
        benchmarks, and feedback for this browser.
      </p>
      <p className={syncStatus.state === 'error' ? 'error' : 'hint'}>
        Supabase sync: {syncStatus.message}
        {syncStatus.lastSyncedAt ? ` Last synced ${formatSessionDate(syncStatus.lastSyncedAt)}.` : ''}
        {syncStatus.enabled ? ` Imported ${syncStatus.imported}; pushed ${syncStatus.pushed}.` : ''}
      </p>
      <div className="admin-table admin-table-storage">
        <div className="admin-table-row admin-table-header">
          <span>Key</span>
          <span>Size</span>
          <span>Preview</span>
        </div>
        {localStorageEntries.map((entry) => (
          <div key={entry.key} className="admin-table-row">
            <span>{entry.key}</span>
            <span>{formatBytes(entry.bytes)}</span>
            <span>{entry.valuePreview}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
