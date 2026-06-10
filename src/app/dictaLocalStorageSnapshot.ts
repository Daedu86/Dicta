import type { Dispatch, SetStateAction } from 'react';

export type LocalStorageEntry = {
  key: string;
  bytes: number;
  valuePreview: string;
};

export function getDictaLocalStorageEntries(): LocalStorageEntry[] {
  return Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
    .filter((key): key is string => Boolean(key && key.startsWith('dicta.')))
    .sort()
    .map((key) => {
      const value = window.localStorage.getItem(key) ?? '';

      return {
        key,
        bytes: byteSize(`${key}${value}`),
        valuePreview: value.length > 96 ? `${value.slice(0, 96)}...` : value,
      };
    });
}

export function getDictaLocalStorageSnapshot(): Record<string, string> {
  return Object.fromEntries(
    getDictaLocalStorageEntries().map((entry) => [entry.key, window.localStorage.getItem(entry.key) ?? '']),
  );
}

export function downloadDictaLocalStorage(): void {
  const payload = JSON.stringify(getDictaLocalStorageSnapshot(), null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = `dicta-local-storage-${Date.now()}.json`;
  a.style.display = 'none';

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function copyDictaLocalStorage(setExportMessage: Dispatch<SetStateAction<string>>): Promise<void> {
  await navigator.clipboard.writeText(JSON.stringify(getDictaLocalStorageSnapshot(), null, 2));
  setExportMessage('Dicta localStorage JSON copied.');
}

function byteSize(value: string): number {
  return new TextEncoder().encode(value).length;
}
