type AdminFileInventory = {
  projectRoot: string;
  folders: Array<{
    label: string;
    relativePath: string;
    absolutePath: string;
    exists: boolean;
    fileCount: number;
    totalBytes: number;
    wavCount: number;
    jsonCount: number;
    transcriptCount: number;
  }>;
};

interface AdminProjectFilesCardProps {
  fileInventory: AdminFileInventory | null;
  fileInventoryError: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function AdminProjectFilesCard({
  fileInventory,
  fileInventoryError,
}: AdminProjectFilesCardProps) {
  return (
    <section className="dashboard-card admin-card">
      <div className="admin-card-header">
        <div>
          <h3>Project files</h3>
          <p>{fileInventory ? fileInventory.projectRoot : 'Known dev folders exposed by the local Vite server.'}</p>
        </div>
      </div>
      {fileInventoryError ? <p className="hint">{fileInventoryError}</p> : null}
      <div className="admin-table admin-table-files">
        <div className="admin-table-row admin-table-header">
          <span>Folder</span>
          <span>Files</span>
          <span>Size</span>
        </div>
        {(fileInventory?.folders ?? []).map((folder) => (
          <div key={folder.relativePath} className="admin-table-row">
            <span>
              {folder.label}
              <small>{folder.exists ? folder.absolutePath : 'Not found'}</small>
            </span>
            <span>
              {folder.exists
                ? `${folder.fileCount} files, ${folder.wavCount} wav, ${folder.jsonCount} json`
                : '0 files'}
            </span>
            <span>{folder.exists ? formatBytes(folder.totalBytes) : 'n/a'}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
