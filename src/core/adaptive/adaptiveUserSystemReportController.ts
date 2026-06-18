import type { InputLanguageBenchmarkMetrics } from './types';

export function buildExpectedControllerBehavior(profile: InputLanguageBenchmarkMetrics): string[] {
  const behavior: string[] = [];
  if (profile.weakAreas.includes('lag') || profile.averageLagSec > 3) behavior.push('Prefer lower playback rate or longer pauses until lag stabilizes.');
  if (profile.weakAreas.includes('low_accuracy') || profile.averageAccuracy < 0.78) behavior.push('Lower the continuous adaptive level before increasing challenge.');
  if (profile.weakAreas.includes('unsafe_boundary_pressure') || profile.unsafePauseCount > 0) behavior.push('Defer pauses until safe semantic boundaries when needed.');
  if (profile.flowStabilityScore < 0.5) behavior.push('Avoid aggressive mode switches and protect flow stability.');
  return behavior.length > 0 ? behavior : ['Maintain current adaptive pacing and allow gradual progression.'];
}

export function buildControllerStatus(profile: InputLanguageBenchmarkMetrics): string {
  if (profile.recommendation.confidence < 0.3) return 'Low confidence: stay conservative and collect more reliable telemetry.';
  if (profile.weakAreas.includes('low_accuracy') || profile.weakAreas.includes('lag')) return 'Continuous easing should be available during playback.';
  if (profile.learningEffectivenessScore >= 0.75 && profile.flowStabilityScore >= 0.75) return 'Stable enough for gradual progression.';
  return 'Use balanced adaptive pacing until more evidence accumulates.';
}
