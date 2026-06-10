import type { BrowserTtsEnvironmentFingerprint } from '../../types/dictation';
import { normalizeBrowserTtsEnvironmentFingerprint } from './browserTtsEnvironment';

export function sameBrowserTtsEnvironment(
  left: BrowserTtsEnvironmentFingerprint | null | undefined,
  right: BrowserTtsEnvironmentFingerprint | null | undefined,
): boolean {
  const normalizedLeft = normalizeBrowserTtsEnvironmentFingerprint(left);
  const normalizedRight = normalizeBrowserTtsEnvironmentFingerprint(right);
  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
}
