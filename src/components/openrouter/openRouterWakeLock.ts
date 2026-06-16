type OpenRouterWakeLockSentinel = {
  released?: boolean;
  release: () => Promise<void>;
};

type OpenRouterWakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<OpenRouterWakeLockSentinel>;
  };
};

export function releaseOpenRouterWakeLock(wakeLock: OpenRouterWakeLockSentinel | null): void {
  void wakeLock?.release().catch(() => {});
}

export async function requestOpenRouterWakeLock(): Promise<OpenRouterWakeLockSentinel | null> {
  const wakeLock = (navigator as OpenRouterWakeLockNavigator).wakeLock;
  if (!wakeLock) return null;
  try {
    return await wakeLock.request('screen');
  } catch {
    return null;
  }
}
