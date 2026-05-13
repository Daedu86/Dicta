export type CreatedDeviceKind = 'mobile' | 'desktop' | 'unknown';

export type SessionDeviceMetadata = {
  createdDeviceKind: CreatedDeviceKind;
  createdDeviceLabel?: string;
};

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    mobile?: boolean;
    platform?: string;
  };
};

export function detectCreatedDeviceMetadata(): SessionDeviceMetadata {
  if (typeof navigator === 'undefined') {
    return { createdDeviceKind: 'unknown' };
  }

  const nav = navigator as NavigatorWithUserAgentData;
  const userAgent = nav.userAgent ?? '';
  const platform = nav.userAgentData?.platform || nav.platform || '';
  const isMobile =
    typeof nav.userAgentData?.mobile === 'boolean'
      ? nav.userAgentData.mobile
      : /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) ||
        (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches && window.innerWidth <= 900);

  return {
    createdDeviceKind: isMobile ? 'mobile' : 'desktop',
    createdDeviceLabel: buildDeviceLabel(userAgent, platform, isMobile),
  };
}

export function normalizeCreatedDeviceKind(value: unknown): CreatedDeviceKind {
  return value === 'mobile' || value === 'desktop' || value === 'unknown' ? value : 'unknown';
}

export function formatCreatedDeviceIcon(kind: CreatedDeviceKind): string {
  if (kind === 'mobile') return '📱';
  if (kind === 'desktop') return '💻';
  return '';
}

export function formatCreatedDeviceTooltip(kind: CreatedDeviceKind, label?: string): string {
  const suffix = label?.trim() ? ` (${label.trim()})` : '';
  if (kind === 'mobile') return `Created on mobile${suffix}`;
  if (kind === 'desktop') return `Created on desktop${suffix}`;
  return 'Device not recorded';
}

function buildDeviceLabel(userAgent: string, platform: string, isMobile: boolean): string {
  const browser = userAgent.includes('Edg/') ? 'Edge' : userAgent.includes('Firefox/') ? 'Firefox' : userAgent.includes('Chrome/') ? 'Chrome' : 'Browser';
  if (/SamsungBrowser/i.test(userAgent)) return `Samsung Internet on ${platform || 'Android'}`;
  if (/Android/i.test(userAgent)) return `${platform || 'Android'} ${browser}`;
  if (/iPhone|iPad|iPod/i.test(userAgent)) return `iOS ${browser}`;
  if (platform) return `${platform} ${browser}`;
  return isMobile ? `Mobile ${browser}` : `Desktop ${browser}`;
}
