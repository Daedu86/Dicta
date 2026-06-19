import type { InputLanguageBenchmarkMetrics, InputMode, LanguageCode } from '../../core/adaptive/types';
import { formatSupportedLanguage } from '../../core/languages';

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function benchmarkSubtitle(inputMode: InputMode): string {
  if (inputMode === 'browser-tts') return 'SpeechSynthesis profile';
  return 'Browser fallback profile';
}

export function formatBenchmarkLanguage(language: LanguageCode): string {
  if (language === 'unknown') return 'Unknown language';
  return formatSupportedLanguage(language);
}

export function formatScore(value: number): string {
  return `${Math.round(clamp01(value) * 100)}%`;
}

export function formatSigned(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
}

export function normalizeAccuracyForDisplay(value: number): number {
  return clamp01(value > 1 ? value / 100 : value);
}

export function formatPercent(value: number): string {
  return `${(normalizeAccuracyForDisplay(value) * 100).toFixed(1)}%`;
}

export function getBenchmarkHealth(profile: InputLanguageBenchmarkMetrics): 'empty' | 'watch' | 'strong' {
  if (profile.sampleCount < 8 || profile.recommendation.confidence < 0.2) return 'empty';
  if (profile.sweetSpotScore >= 0.72 && normalizeAccuracyForDisplay(profile.averageAccuracy) >= 0.86 && Math.abs(profile.stableAverageLagSec) <= 1.2) {
    return 'strong';
  }
  return 'watch';
}

export function formatWeakAreaLabel(value: string): string {
  return value.replace(/_/g, ' ');
}
