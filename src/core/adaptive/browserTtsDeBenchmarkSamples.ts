import type { AdaptiveTimelinePoint, PacingDecision } from './types';
import {
  BROWSER_TTS_DE_RAW_LAG_MAX_SEC,
  BROWSER_TTS_DE_RAW_LAG_MIN_SEC,
  isBrowserTtsDe,
} from './browserTtsDeBenchmarkCore';

export type BrowserTtsDeBenchmarkRejectionReason =
  | 'stale_tts_progress'
  | 'rawLagSec_missing_or_non_finite'
  | 'lagSec_non_finite'
  | 'stableLagSec_non_finite'
  | 'lag_clipped_to_sentinel'
  | 'rawLagSec_out_of_range'
  | 'wpm_not_positive_or_placeholder'
  | 'unsafe_phrase_boundary'
  | 'semantic_completeness_below_0.7'
  | 'event_not_scoring'
  | 'filtered_by_de_scoring_rule';

export function isValidBrowserTtsDeBenchmarkSample(point: AdaptiveTimelinePoint): boolean {
  if (!isBrowserTtsDe(point.inputMode, point.language)) return true;
  const rawLagSec = point.rawLagSec;
  const lagSec = point.lagSec;
  const stableLagSec = point.stableLagSec;
  const semanticCompleteness = point.semanticCompleteness ?? 1;
  const hasValidPhrasePosition = hasValidBrowserTtsDePhrasePosition(point);
  return (
    hasValidPhrasePosition &&
    typeof rawLagSec === 'number' &&
    Number.isFinite(rawLagSec) &&
    Number.isFinite(lagSec) &&
    (stableLagSec === undefined || Number.isFinite(stableLagSec)) &&
    rawLagSec >= BROWSER_TTS_DE_RAW_LAG_MIN_SEC &&
    rawLagSec <= BROWSER_TTS_DE_RAW_LAG_MAX_SEC &&
    rawLagSec !== -5 &&
    rawLagSec !== 5 &&
    lagSec !== -5 &&
    lagSec !== 5 &&
    stableLagSec !== -5 &&
    stableLagSec !== 5 &&
    point.wpm > 0 &&
    point.phraseBoundaryType !== 'unsafe' &&
    semanticCompleteness >= 0.7 &&
    isScoringTimelineEvent(point.event)
  );
}

export function isValidBrowserTtsDeSessionInsightSample(point: AdaptiveTimelinePoint): boolean {
  if (!isBrowserTtsDe(point.inputMode, point.language)) return true;
  const lagSec = point.lagSec;
  const stableLagSec = point.stableLagSec ?? point.lagSec;
  const semanticCompleteness = point.semanticCompleteness ?? 1;
  const hasValidPhrasePosition = hasValidBrowserTtsDePhrasePosition(point);
  return (
    hasValidPhrasePosition &&
    Number.isFinite(lagSec) &&
    typeof stableLagSec === 'number' &&
    Number.isFinite(stableLagSec) &&
    lagSec !== -5 &&
    lagSec !== 5 &&
    stableLagSec !== -5 &&
    stableLagSec !== 5 &&
    point.wpm > 0 &&
    point.phraseBoundaryType !== 'unsafe' &&
    semanticCompleteness >= 0.7 &&
    isScoringTimelineEvent(point.event)
  );
}

export function getBrowserTtsDeBenchmarkRejectionReason(
  point: AdaptiveTimelinePoint,
): BrowserTtsDeBenchmarkRejectionReason | null {
  if (!isBrowserTtsDe(point.inputMode, point.language)) return null;
  if (isValidBrowserTtsDeBenchmarkSample(point)) return null;

  const rawLagSec = point.rawLagSec;
  const stableLagSec = point.stableLagSec;
  const hasValidPhrasePosition = hasValidBrowserTtsDePhrasePosition(point);

  if (!hasValidPhrasePosition) return 'stale_tts_progress';
  if (typeof rawLagSec !== 'number' || !Number.isFinite(rawLagSec)) return 'rawLagSec_missing_or_non_finite';
  if (!Number.isFinite(point.lagSec)) return 'lagSec_non_finite';
  if (stableLagSec !== undefined && !Number.isFinite(stableLagSec)) return 'stableLagSec_non_finite';
  if (
    rawLagSec === -5 ||
    rawLagSec === 5 ||
    point.lagSec === -5 ||
    point.lagSec === 5 ||
    stableLagSec === -5 ||
    stableLagSec === 5
  ) {
    return 'lag_clipped_to_sentinel';
  }
  if (rawLagSec < BROWSER_TTS_DE_RAW_LAG_MIN_SEC || rawLagSec > BROWSER_TTS_DE_RAW_LAG_MAX_SEC) {
    return 'rawLagSec_out_of_range';
  }
  if (point.wpm <= 0) return 'wpm_not_positive_or_placeholder';
  if (point.phraseBoundaryType === 'unsafe') return 'unsafe_phrase_boundary';
  if ((point.semanticCompleteness ?? 1) < 0.7) return 'semantic_completeness_below_0.7';
  if (!isScoringTimelineEvent(point.event)) return 'event_not_scoring';
  return 'filtered_by_de_scoring_rule';
}

export function getBrowserTtsDeBenchmarkRejectionTokens(point: AdaptiveTimelinePoint): string[] {
  if (!isBrowserTtsDe(point.inputMode, point.language)) return [];
  const tokens: string[] = [];
  const rawLagSec = point.rawLagSec;
  const lagSec = point.lagSec;
  const stableLagSec = point.stableLagSec;
  if (!hasValidBrowserTtsDePhrasePosition(point)) {
    tokens.push('stale-tts-progress');
  }
  if (
    typeof rawLagSec !== 'number' ||
    !Number.isFinite(rawLagSec) ||
    !Number.isFinite(lagSec) ||
    (stableLagSec !== undefined && !Number.isFinite(stableLagSec)) ||
    rawLagSec < BROWSER_TTS_DE_RAW_LAG_MIN_SEC ||
    rawLagSec > BROWSER_TTS_DE_RAW_LAG_MAX_SEC ||
    rawLagSec === -5 ||
    rawLagSec === 5 ||
    lagSec === -5 ||
    lagSec === 5 ||
    stableLagSec === -5 ||
    stableLagSec === 5
  ) {
    tokens.push('invalid-lag-alignment');
  }
  if (tokens.length > 0 || point.wpm <= 0 || point.phraseBoundaryType === 'unsafe' || (point.semanticCompleteness ?? 1) < 0.7 || !isScoringTimelineEvent(point.event)) {
    tokens.push('rejected-benchmark-sample');
  }
  if (!isValidBrowserTtsDeBenchmarkSample(point) && isValidBrowserTtsDeSessionInsightSample(point)) {
    tokens.push('accepted-session-insight');
  }
  return [...new Set(tokens)];
}

export function includesDiagnosticReason(point: AdaptiveTimelinePoint, token: string): boolean {
  return typeof point.decisionReason === 'string' && point.decisionReason.toLowerCase().includes(token);
}

export function isScoringTimelineEvent(event: AdaptiveTimelinePoint['event']): boolean {
  return (
    event === 'phrase_advance' ||
    event === 'phrase_completed' ||
    event === 'rate_change' ||
    event === 'support_entered' ||
    event === 'flow_entered'
  );
}

export function deriveTimelineEvent(decision: PacingDecision): AdaptiveTimelinePoint['event'] {
  if (decision.deferPauseUntilSafeBoundary) return 'defer_pause';
  if (decision.shouldReplayPhrase) return 'replay';
  if (decision.shouldPauseNow) return 'pause';
  if (decision.mode === 'support') return 'support_entered';
  if (decision.mode === 'flow') return 'flow_entered';
  return 'rate_change';
}

function hasValidBrowserTtsDePhrasePosition(point: AdaptiveTimelinePoint): boolean {
  return (
    (point.phraseIndex === undefined || (Number.isInteger(point.phraseIndex) && point.phraseIndex >= 0)) &&
    (typeof point.totalSemanticPhrases !== 'number' ||
      point.phraseIndex === undefined ||
      point.phraseIndex < point.totalSemanticPhrases)
  );
}
