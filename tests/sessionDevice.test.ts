import { describe, expect, it, vi } from 'vitest';
import {
  detectCreatedDeviceMetadata,
  formatCreatedDeviceIcon,
  formatCreatedDeviceTooltip,
  normalizeCreatedDeviceKind,
} from '../src/core/sessionDevice';

describe('sessionDevice', () => {
  it('formats device metadata symbols and tooltips', () => {
    expect(formatCreatedDeviceIcon('mobile')).toBe('📱');
    expect(formatCreatedDeviceIcon('desktop')).toBe('💻');
    expect(formatCreatedDeviceIcon('unknown')).toBe('');
    expect(formatCreatedDeviceTooltip('mobile', 'Android Chrome')).toBe('Created on mobile (Android Chrome)');
    expect(formatCreatedDeviceTooltip('desktop')).toBe('Created on desktop');
    expect(formatCreatedDeviceTooltip('unknown')).toBe('Device not recorded');
  });

  it('normalizes missing metadata from old sessions safely', () => {
    expect(normalizeCreatedDeviceKind(undefined)).toBe('unknown');
    expect(normalizeCreatedDeviceKind('tablet')).toBe('unknown');
    expect(normalizeCreatedDeviceKind('mobile')).toBe('mobile');
  });

  it('detects mobile sessions from userAgentData when creating new sessions', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36',
      userAgentData: {
        mobile: true,
        platform: 'Android',
      },
      platform: 'Linux armv8l',
    });

    expect(detectCreatedDeviceMetadata()).toMatchObject({
      createdDeviceKind: 'mobile',
      createdDeviceLabel: 'Android Chrome',
    });

    vi.unstubAllGlobals();
  });
});
