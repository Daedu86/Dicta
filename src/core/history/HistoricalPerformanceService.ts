import { buildAdaptivePlaybackComfortProfile } from '../adaptive/adaptivePlaybackComfortProfile';
import type {
  InputMode,
  ImprovementTrend,
  HistoricalPerformanceProfile,
} from '../adaptive/types';

export interface SessionHistoryRecord {
  inputMode: InputMode;
  language?: string;
  durationSec: number;
  averagePlaybackRate: number;
  averageWpm: number;
  averageAccuracy: number;
  averageLagSec: number;
  averagePauseMs: number;
  replayCount: number;
  phraseCount: number;
  supportCount: number;
  balancedCount: number;
  flowCount: number;
  backspaceRate: number;
  correctionRate: number;
  score: number;
  points: number;
  improvementTrend: ImprovementTrend;
  timestamp: string;
}

export class HistoricalPerformanceService {
  computeProfile(records: SessionHistoryRecord[], language?: string, inputMode?: InputMode): HistoricalPerformanceProfile {
    const filtered = records.filter((record) => {
      if (language && record.language !== language) {
        return false;
      }
      if (inputMode && record.inputMode !== inputMode) {
        return false;
      }
      return true;
    });

    const count = filtered.length;
    const averageRate = average(filtered.map((record) => record.averagePlaybackRate));
    const averageWpm = average(filtered.map((record) => record.averageWpm));
    const averageAccuracy = average(filtered.map((record) => record.averageAccuracy));
    const averageLagSec = average(filtered.map((record) => record.averageLagSec));
    const averagePauseMs = average(filtered.map((record) => record.averagePauseMs));
    const preferredSize = selectPreferredPhraseSize(filtered);
    const preferredPauseAfterPhraseMs = average(filtered.map((record) => record.averagePauseMs));
    const typicalBackspaceRate = average(filtered.map((record) => record.backspaceRate));
    const typicalCorrectionRate = average(filtered.map((record) => record.correctionRate));
    const improvementTrend = majorityTrend(filtered.map((record) => record.improvementTrend));
    const profileConfidence = computeConfidence(count);

    const profile: HistoricalPerformanceProfile = {
      language,
      inputMode,
      comfortablePlaybackRate: clamp(averageRate || 0.82, 0.6, 1.15),
      averageWpm: Number((averageWpm || 0).toFixed(1)),
      averageAccuracy: Number((averageAccuracy || 0).toFixed(2)),
      averageLagSec: Number((averageLagSec || 0).toFixed(2)),
      averagePauseMs: Number((averagePauseMs || 1200).toFixed(0)),
      preferredPhraseSize: preferredSize,
      preferredPauseAfterPhraseMs: Number((preferredPauseAfterPhraseMs || 1200).toFixed(0)),
      typicalBackspaceRate: Number((typicalBackspaceRate || 0).toFixed(3)),
      typicalCorrectionRate: Number((typicalCorrectionRate || 0).toFixed(3)),
      strugglesWithLongPhrases: records.some((record) => record.phraseCount > 0 && record.averageWpm < 40),
      strugglesWithNumbers: false,
      strugglesWithNames: false,
      strugglesWithPunctuation: false,
      improvementTrend,
      sessionsCount: count,
      profileConfidence,
    };

    return {
      ...profile,
      adaptivePlaybackComfortProfile: buildAdaptivePlaybackComfortProfile({ history: profile }),
    };
  }

  summarizeSession(record: SessionHistoryRecord): SessionHistoryRecord {
    return { ...record };
  }
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function computeConfidence(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 0.2;
  if (count === 2) return 0.4;
  if (count === 3) return 0.55;
  if (count <= 6) return 0.75;
  return 0.95;
}

function selectPreferredPhraseSize(records: SessionHistoryRecord[]): 'short' | 'medium' | 'long' {
  if (records.length === 0) return 'medium';
  const tally = records.reduce(
    (acc, item) => {
      acc.support += item.supportCount;
      acc.balanced += item.balancedCount;
      acc.flow += item.flowCount;
      return acc;
    },
    { support: 0, balanced: 0, flow: 0 },
  );
  if (tally.flow >= tally.balanced && tally.flow >= tally.support) return 'long';
  if (tally.support >= tally.balanced && tally.support >= tally.flow) return 'short';
  return 'medium';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function majorityTrend(values: ImprovementTrend[]): ImprovementTrend {
  const counts = values.reduce(
    (acc, trend) => ({ ...acc, [trend]: (acc[trend] || 0) + 1 }),
    {} as Record<ImprovementTrend, number>,
  );
  if (counts.improving >= counts.stable && counts.improving >= counts.declining) return 'improving';
  if (counts.declining >= counts.stable && counts.declining >= counts.improving) return 'declining';
  return 'stable';
}
