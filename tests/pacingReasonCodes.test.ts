import { describe, expect, it } from 'vitest';
import {
  appendLegacyReasonToken,
  hasLegacyReasonToken,
  hasPacingReason,
} from '../src/core/adaptive/pacingReasonCodes';
import type { PacingDecision } from '../src/core/adaptive/types';

const baseDecision: PacingDecision = {
  playbackRate: 0.9,
  pauseMs: 750,
  shouldReplayPhrase: false,
  nextPhraseSize: 'medium',
  reason: 'mode=balanced',
  reasonCodes: ['mode-balanced'],
  lagScore: 0,
  accuracyScore: 1,
  correctionPressure: 0,
  confidence: 0.8,
  mode: 'balanced',
};

describe('hasPacingReason', () => {
  it('prefers structured reason codes', () => {
    expect(hasPacingReason({
      ...baseDecision,
      reason: 'mode=support',
      reasonCodes: ['mode-support', 'support-needed'],
    }, 'support-needed')).toBe(true);
  });

  it('falls back to the legacy reason string for transitional mocks', () => {
    const legacyDecision = {
      ...baseDecision,
      reason: 'mode=support, support-needed',
      reasonCodes: undefined,
    };

    expect(hasPacingReason(legacyDecision, 'support-needed')).toBe(true);
  });
  it('matches legacy reason tokens exactly instead of by substring', () => {
    expect(hasLegacyReasonToken('mode=support, de-target-rate-clamp', 'de-target-rate-clamp')).toBe(true);
    expect(hasLegacyReasonToken('mode=support, not-de-target-rate-clamp', 'de-target-rate-clamp')).toBe(false);
  });

  it('appends legacy reason tokens only once', () => {
    expect(appendLegacyReasonToken('mode=support', 'de-target-rate-clamp')).toBe(
      'mode=support, de-target-rate-clamp',
    );
    expect(appendLegacyReasonToken('mode=support, de-target-rate-clamp', 'de-target-rate-clamp')).toBe(
      'mode=support, de-target-rate-clamp',
    );
  });

});
