import { useEffect, useState } from 'react';
import type { AdminFileInventory } from './sessionTypes';
import type { WorkspaceMode } from './useWorkspaceRouting';

interface UseAdminFileInventoryOptions {
  workspaceMode: WorkspaceMode;
  localDevFeaturesAvailable: boolean;
}

interface UseAdminFileInventoryResult {
  adminFileInventory: AdminFileInventory | null;
  adminFileInventoryError: string;
}

export function useAdminFileInventory({
  workspaceMode,
  localDevFeaturesAvailable,
}: UseAdminFileInventoryOptions): UseAdminFileInventoryResult {
  const [adminFileInventory, setAdminFileInventory] = useState<AdminFileInventory | null>(null);
  const [adminFileInventoryError, setAdminFileInventoryError] = useState('');

  useEffect(() => {
    if (workspaceMode !== 'admin') return;
    if (!localDevFeaturesAvailable) {
      setAdminFileInventory(null);
      setAdminFileInventoryError('Local file inventory is available only when running the Vite dev server.');
      return;
    }

    let cancelled = false;

    async function loadAdminFiles(): Promise<void> {
      try {
        const response = await fetch('/api/admin/files');
        if (!response.ok) {
          throw new Error(`File inventory unavailable (${response.status})`);
        }

        const payload = (await response.json()) as AdminFileInventory;
        if (!cancelled) {
          setAdminFileInventory(payload);
          setAdminFileInventoryError('');
        }
      } catch (error) {
        if (!cancelled) {
          setAdminFileInventory(null);
          setAdminFileInventoryError(error instanceof Error ? error.message : 'File inventory unavailable');
        }
      }
    }

    void loadAdminFiles();

    return () => {
      cancelled = true;
    };
  }, [localDevFeaturesAvailable, workspaceMode]);

  return {
    adminFileInventory,
    adminFileInventoryError,
  };
}
