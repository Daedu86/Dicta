import { normalizeBenchmarkLanguage } from '../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { buildAdaptivePlaybackComfortProfile } from '../core/adaptive/adaptivePlaybackComfortProfile';
import type { HistoricalPerformanceProfile, InputMode, LanguageCode } from '../core/adaptive/types';
import type { HistoricalPerformanceService } from '../core/history/HistoricalPerformanceService';
import { estimateSessionVoiceDurationSec } from '../core/sessionDuration';
import type { AdaptiveRuntimeSessionInput, AdaptiveRuntimeSessionInputMode } from './adaptiveRuntimeTypes';

export function buildHistoricalPerformanceProfile(
  sessions: AdaptiveRuntimeSessionInput[],
  historyService: HistoricalPerformanceService,
  inputMode: InputMode,
  language?: string,
): HistoricalPerformanceProfile {
  const records = sessions
    .filter((session) => session.status === 'finished' && session.metrics.points > 0)
    .map((session) => {
      const mode = mapRuntimeSessionInputMode(session.inputMode);
      return {
        inputMode: mode,
        language:
          (mode === 'browser-tts'
            ? session.ttsLanguage
            : session.ttsLanguage) ?? undefined,
        durationSec: Math.max(1, estimateSessionVoiceDurationSec(session) ?? session.metrics.points * 2),
        averagePlaybackRate: clamp(session.metrics.rate, 0.6, 1.15),
        averageWpm: session.metrics.wpm,
        averageAccuracy: clamp01(session.metrics.accuracy / 100),
        averageLagSec: Math.abs(session.metrics.lagSec),
        averagePauseMs: 1200,
        replayCount: 0,
        phraseCount: 1,
        supportCount: session.metrics.trend === 'declining' ? 1 : 0,
        balancedCount: session.metrics.trend === 'stable' ? 1 : 0,
        flowCount: session.metrics.trend === 'improving' ? 1 : 0,
        backspaceRate: 0.03,
        correctionRate: 0.05,
        strugglesWithLongPhrases: session.metrics.wpm < 40,
        strugglesWithNumbers: false,
        strugglesWithNames: false,
        strugglesWithPunctuation: false,
        score: session.metrics.score,
        points: session.metrics.points,
        improvementTrend: session.metrics.trend,
        timestamp: session.updatedAt,
        sessionsCount: 1,
        profileConfidence: 0.5,
      };
    });

  if (records.length === 0) {
    const profile: HistoricalPerformanceProfile = {
      language,
      inputMode,
      comfortablePlaybackRate: 0.82,
      averageWpm: 55,
      averageAccuracy: 0.92,
      averageLagSec: 1.2,
      averagePauseMs: 1200,
      preferredPhraseSize: 'medium',
      preferredPauseAfterPhraseMs: 1200,
      typicalBackspaceRate: 0.05,
      typicalCorrectionRate: 0.05,
      strugglesWithLongPhrases: false,
      strugglesWithNumbers: false,
      strugglesWithNames: false,
      strugglesWithPunctuation: false,
      improvementTrend: 'stable',
      sessionsCount: 0,
      profileConfidence: 0.2,
    };
    return {
      ...profile,
      adaptivePlaybackComfortProfile: buildAdaptivePlaybackComfortProfile({ history: profile }),
    };
  }

  return historyService.computeProfile(records, language, inputMode);
}

export function findLatestFinishedBrowserTtsDeDictationScriptSession(
  sourceSessions: AdaptiveRuntimeSessionInput[],
): AdaptiveRuntimeSessionInput | null {
  return (
    sourceSessions
      .filter(isFinishedBrowserTtsDeDictationScriptSession)
      .sort((a, b) => getRuntimeSessionFinishedAtMs(b) - getRuntimeSessionFinishedAtMs(a))[0] ?? null
  );
}

export function isFinishedBrowserTtsDeDictationScriptSession(session: AdaptiveRuntimeSessionInput): boolean {
  return (
    session.status === 'finished' &&
    session.sessionSource === 'dictationScript' &&
    mapRuntimeSessionInputMode(session.inputMode) === 'browser-tts' &&
    normalizeBenchmarkLanguage(resolveRuntimeSessionLanguage(session)) === 'de'
  );
}

export function getRuntimeSessionFinishedAtMs(session: AdaptiveRuntimeSessionInput): number {
  const finishedAtMs = new Date(session.telemetry.finishedAt ?? session.updatedAt ?? session.createdAt).getTime();
  return Number.isFinite(finishedAtMs) ? finishedAtMs : 0;
}

export function mapRuntimeSessionInputMode(mode: AdaptiveRuntimeSessionInputMode): InputMode {
  if (mode === 'browser-tts') return 'browser-tts';
  return 'browser-tts';
}

export function resolveRuntimeSessionLanguage(session: AdaptiveRuntimeSessionInput): LanguageCode {
  return session.ttsLanguage ?? 'unknown';
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
