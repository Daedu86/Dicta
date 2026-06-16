import type { AdaptiveSessionFeedback, AdaptiveWeakArea, InputLanguageBenchmarkMetrics } from './types';
import type { AdaptiveUserSystemReport } from './adaptiveUserSystemReportTypes';
import { parsePointsRatio } from './adaptiveUserSystemReportSessionSummary';

export function buildPositiveSignals(
  profile: InputLanguageBenchmarkMetrics,
  session: AdaptiveUserSystemReport['userProgressSummary']['latestSession'],
  feedback: AdaptiveSessionFeedback | null,
): string[] {
  const signals: string[] = [];
  if (session) {
    const accuracy = Number.parseFloat(session.accuracy);
    const lag = Math.abs(Number.parseFloat(session.lag));
    const wpm = Number.parseFloat(session.wpm);
    const pointsRatio = parsePointsRatio(session.points);
    if (accuracy >= 88) signals.push(`Strong latest-session accuracy at ${session.accuracy}.`);
    if (lag <= 1.5) signals.push(`Timing lag is controlled at ${session.lag}.`);
    if (wpm >= 35) signals.push(`Typing pace is usable at ${session.wpm} WPM.`);
    if (pointsRatio !== null && pointsRatio >= 0.75) signals.push(`Matched-word coverage is solid at ${session.points} points.`);
    if (session.trend === 'improving') signals.push('Latest session trend is improving.');
  }
  if (profile.sampleCount >= 8) signals.push(`Adaptive benchmark has ${profile.sampleCount} accepted telemetry samples.`);
  if (profile.flowStabilityScore >= 0.78) signals.push('Flow stability is currently healthy.');
  if (feedback && feedback.verdict === 'improved') signals.push('Latest formal session feedback marked the run as improved.');
  return signals.length > 0 ? signals : ['No strong positive signal is available yet; collect more finished sessions for a clearer trend.'];
}


export function buildNeedsImprovement(
  profile: InputLanguageBenchmarkMetrics,
  session: AdaptiveUserSystemReport['userProgressSummary']['latestSession'],
  feedback: AdaptiveSessionFeedback | null,
): string[] {
  const needs: string[] = [];
  if (session) {
    const accuracy = Number.parseFloat(session.accuracy);
    const lag = Math.abs(Number.parseFloat(session.lag));
    const repeats = session.repeatCount ?? 0;
    if (accuracy < 82) needs.push(`Accuracy needs work: latest session was ${session.accuracy}.`);
    if (lag > 3) needs.push(`Timing lag needs attention: latest session lag was ${session.lag}.`);
    if (repeats > 3) needs.push(`Replay/repeat load is high: ${repeats} repeat(s) in the latest session.`);
  }
  if (feedback?.playbackIssues.repeatedPhraseCount) {
    needs.push(`Playback feedback found ${feedback.playbackIssues.repeatedPhraseCount} repeated phrase event(s).`);
  }
  if (feedback?.playbackIssues.skippedPhraseCount) {
    needs.push(`Playback feedback found ${feedback.playbackIssues.skippedPhraseCount} skipped phrase event(s).`);
  }
  for (const weakArea of profile.weakAreas) {
    needs.push(formatWeakAreaNeed(weakArea));
  }
  if (profile.flowStabilityScore < 0.65) needs.push('Flow stability is low; pacing may be changing too much or too often.');
  return [...new Set(needs)].slice(0, 8);
}


export function buildNextPracticeFocus(profile: InputLanguageBenchmarkMetrics, needsImprovement: string[]): string[] {
  const focus = [...profile.recommendation.nextTrainingFocus];
  if (profile.weakAreas.includes('lag')) focus.push('reduce lag with slower rate or longer pauses');
  if (profile.weakAreas.includes('low_accuracy')) focus.push('rebuild accuracy before increasing difficulty');
  if (profile.weakAreas.includes('replay')) focus.push('make phrases easier to replay independently');
  if (profile.weakAreas.includes('long_phrases')) focus.push('shorten phrase length');
  if (needsImprovement.length === 0) focus.push('continue gradual difficulty increase');
  return [...new Set(focus)].slice(0, 6);
}


export function formatWeakAreaNeed(weakArea: AdaptiveWeakArea): string {
  const labels: Partial<Record<AdaptiveWeakArea, string>> = {
    long_phrases: 'Long phrases are a weak area; shorten phrase length.',
    numbers: 'Numbers are a weak area; add focused number practice.',
    names: 'Names are a weak area; reduce unfamiliar names or practice them deliberately.',
    punctuation: 'Punctuation is a weak area; simplify punctuation load.',
    high_rate: 'High playback rate is hurting performance; slow down.',
    low_semantic_completeness: 'Phrase boundaries need clearer semantic completeness.',
    unsafe_boundaries: 'Unsafe pause boundaries need tuning.',
    replay: 'Replay behavior needs tuning.',
    lag: 'Lag is a weak area; tune rate and pauses.',
    lag_instability: 'Lag instability is a weak area; stabilize pacing.',
    corrections: 'Corrections are high; reduce density and reinforce accuracy.',
    low_accuracy: 'Accuracy is a weak area; lower challenge until accuracy recovers.',
    accuracy_instability: 'Accuracy instability is a weak area; keep the next session steadier.',
    support_dependency: 'Support dependency is high; reduce support gradually only after accuracy stabilizes.',
    unsafe_boundary_pressure: 'Runtime pressure is producing unsafe boundary risk; use safer phrase cuts.',
    flow_instability: 'Flow stability needs tuning; reduce abrupt rate/pause changes.',
  };
  return labels[weakArea] ?? `Weak area: ${weakArea}.`;
}


