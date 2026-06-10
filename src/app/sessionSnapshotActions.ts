import type { Dispatch, SetStateAction } from 'react';
import { sessionSnapshotJson } from '../core/sessionSnapshot';

type SessionSnapshotSource = Parameters<typeof sessionSnapshotJson>[0];

export function downloadSessionSnapshot(session: SessionSnapshotSource & { id: string }): void {
  const payload = sessionSnapshotJson(session);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = `dicta-session-${session.id}.json`;
  a.style.display = 'none';

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function copySessionSnapshot(
  session: SessionSnapshotSource & { name?: string },
  setExportMessage: Dispatch<SetStateAction<string>>,
): Promise<void> {
  await navigator.clipboard.writeText(sessionSnapshotJson(session));
  setExportMessage(`Session JSON copied for ${session.name || 'session'}.`);
}
