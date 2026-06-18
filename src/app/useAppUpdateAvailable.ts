import { useEffect, useState } from 'react';
import type { DictaBuildInfo } from '../core/buildInfo';
import { DICTA_BUILD_INFO } from './dictaBuildInfo';

const APP_UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

type DictaVersionInfo = Partial<Pick<DictaBuildInfo, 'commitSha' | 'shortCommitSha'>>;

function getComparableCommit(info: DictaVersionInfo): string {
  return info.commitSha?.trim() || info.shortCommitSha?.trim() || '';
}

async function fetchLatestVersionInfo(): Promise<DictaVersionInfo | null> {
  const response = await fetch('/version.json', {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as DictaVersionInfo;
}

export function useAppUpdateAvailable(): boolean {
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const currentCommit = getComparableCommit(DICTA_BUILD_INFO);

    async function checkForUpdate() {
      try {
        const latestVersionInfo = await fetchLatestVersionInfo();
        const latestCommit = latestVersionInfo ? getComparableCommit(latestVersionInfo) : '';

        if (!cancelled && currentCommit && latestCommit && latestCommit !== currentCommit) {
          setHasUpdate(true);
        }
      } catch {
        return;
      }
    }

    void checkForUpdate();

    const intervalId = window.setInterval(() => {
      void checkForUpdate();
    }, APP_UPDATE_CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return hasUpdate;
}
