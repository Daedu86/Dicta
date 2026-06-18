import {
  buildListenerStateV3,
} from './listenerStateV3';
import {
  buildListeningCycleInsightReportV3,
  type ListeningCycleInsightReportV3,
  type ListeningCycleInsightReportV3Frame,
} from './listeningCycleInsightReportV3';
import type { AdaptiveTimelinePoint, InputLanguageBenchmarkMetrics } from './types';
import type {
  AdaptiveUserSystemReport,
  AdaptiveUserSystemReportSessionSummary,
} from './adaptiveUserSystemReportTypes';

const LISTENING_CYCLE_V3_TIMELINE_WINDOW = 60;
const USABLE_TYPING_WPM = 35;

export function buildAdaptiveUserSystemReportListeningCycleV3({
  profile,
  latestSession,
}: {
  profile: InputLanguageBenchmarkMetrics;
  latestSession: AdaptiveUserSystemReportSessionSummary | null;
}): AdaptiveUserSystemReport['listeningCycleV3'] {
  const frames = buildReportFrames(profile);
  const report = buildListeningCycleInsightReportV3(frames);

  return {
    status: report.evidence.totalFrames > 0 ? 'available' : 'no_frames',
    primaryConstraint: report.primaryConstraint,
    confidence: report.confidence,
    axes: report.axes,
    evidence: report.evidence,
    reasonCodes: report.reasonCodes,
    continuousAdaptive: report.continuousAdaptive,
    nextSessionKnobs: report.nextSessionKnobs,
    summaryBullets: report.summaryBullets,
    contradictionNotes: buildContradictionNotes(profile, latestSession, report),
    accessibilityNote:
      'Real pauses and semantic chunks are intentional listening supports for hearing, retention, and reconstruction; they are not treated as typing-speed failure.',
  };
}

function buildReportFrames(profile: InputLanguageBenchmarkMetrics): ListeningCycleInsightReportV3Frame[] {
  return profile.timeline
    .slice(-LISTENING_CYCLE_V3_TIMELINE_WINDOW)
    .filter(hasUsableTimelineSignal)
    .map((point) => {
      const pauseMs = point.actualPauseMs ?? point.pauseMs;
      const accuracy = normalizeAccuracy(point.accuracy);
      const listenerStateV3 = buildListenerStateV3({
        lagSec: point.stableLagSec ?? point.lagSec,
        lagOutlierCount: point.lagOutlierCount,
        accuracy,
        chunkAccuracy: accuracy,
        rollingAccuracyLast3: accuracy,
        wpm: point.wpm,
        correctionRate: point.correctionRate,
        phraseBoundaryType: point.phraseBoundaryType,
        semanticCompleteness: point.semanticCompleteness,
        currentPlaybackRate: point.actualPlaybackRate ?? point.playbackRate,
        currentPauseAfterPhraseMs: pauseMs,
      });

      return {
        listenerStateV3,
        phraseBoundaryType: point.phraseBoundaryType,
        semanticCompleteness: point.semanticCompleteness,
        wpm: point.wpm,
        accuracy,
        chunkAccuracy: accuracy,
        currentPlaybackRate: point.actualPlaybackRate ?? point.playbackRate,
        currentPauseAfterPhraseMs: pauseMs,
        actualPauseMs: pauseMs,
        requestedPauseMs: point.requestedPauseMs,
        requestedPlaybackRate: point.requestedPlaybackRate,
        actualPlaybackRate: point.actualPlaybackRate,
        adaptiveLevel: point.adaptiveLevel,
        adaptiveDirection: point.adaptiveDirection,
        pressureVector: point.pressureVector,
        pacingOutput: point.pacingOutput,
        sampleQuality: point.sampleQuality,
        languageCalibration: point.languageCalibration,
        derivedAdaptiveLabel: point.derivedAdaptiveLabel,
        perceptualPauseLevel: point.perceptualPauseLevel,
        perceptualPauseShortfallMs: point.perceptualPauseShortfallMs,
        pauseDeferred: point.event === 'defer_pause',
        reasonCodes: point.decisionReason ? point.decisionReason.split(',').map((value) => value.trim()).filter(Boolean) : [],
      };
    });
}

function buildContradictionNotes(
  profile: InputLanguageBenchmarkMetrics,
  latestSession: AdaptiveUserSystemReportSessionSummary | null,
  report: ListeningCycleInsightReportV3,
): string[] {
  const notes: string[] = [];
  const latestLagSec = latestSession ? Number.parseFloat(latestSession.lag) : null;
  const latestWpm = latestSession ? Number.parseFloat(latestSession.wpm) : null;
  const targetPauseMs = profile.recommendation.targetPauseMs;
  const runtimeRecoveryPauseMs = maxRecentRuntimeRecoveryPause(profile.timeline);

  if (
    latestLagSec !== null &&
    Number.isFinite(latestLagSec) &&
    latestLagSec <= 1.5 &&
    (profile.weakAreas.includes('lag') || profile.weakAreas.includes('lag_instability'))
  ) {
    notes.push('Latest lag is controlled, while historical lag instability remains a warning rather than an automatic recovery driver.');
  }

  if (
    latestWpm !== null &&
    Number.isFinite(latestWpm) &&
    latestWpm >= USABLE_TYPING_WPM &&
    report.primaryConstraint !== 'typingMechanics'
  ) {
    notes.push('Typing speed is usable, so the report should prioritize listening segmentation, reconstruction, or Browser TTS environment before typing mechanics.');
  }

  if (runtimeRecoveryPauseMs !== null && runtimeRecoveryPauseMs > targetPauseMs + 250) {
    notes.push(`Benchmark target pause is ${targetPauseMs}ms, but runtime recovery recently used up to ${runtimeRecoveryPauseMs}ms; the runtime pause is the learner-facing value.`);
  }

  if (
    latestSession?.trend === 'improving' &&
    (profile.weakAreas.includes('support_dependency') ||
      profile.weakAreas.includes('accuracy_instability') ||
      profile.weakAreas.includes('lag_instability'))
  ) {
    notes.push('The latest trend is improving, so support/recovery should taper unless current-session pressure returns.');
  }

  if (notes.length === 0 && report.evidence.totalFrames > 0) {
    notes.push('No major contradiction is visible in the recent Listening Cycle V3 evidence.');
  }

  return notes;
}

function hasUsableTimelineSignal(point: AdaptiveTimelinePoint): boolean {
  return (
    Number.isFinite(point.playbackRate) &&
    Number.isFinite(point.accuracy) &&
    Number.isFinite(point.lagSec) &&
    Number.isFinite(point.wpm)
  );
}

function normalizeAccuracy(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value > 1 ? Math.max(0, Math.min(1, value / 100)) : Math.max(0, Math.min(1, value));
}

function maxRecentRuntimeRecoveryPause(timeline: AdaptiveTimelinePoint[]): number | null {
  const pauses = timeline
    .slice(-LISTENING_CYCLE_V3_TIMELINE_WINDOW)
    .filter((point) =>
      (point.decisionReason ?? '').includes('recovery') ||
      (point.decisionReason ?? '').includes('android-speech-rate-fallback') ||
      point.mode === 'recovery'
    )
    .map((point) => point.actualPauseMs ?? point.pauseMs)
    .filter((pauseMs) => Number.isFinite(pauseMs) && pauseMs > 0);

  return pauses.length > 0 ? Math.max(...pauses) : null;
}
