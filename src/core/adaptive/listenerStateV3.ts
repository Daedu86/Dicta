export type ListenerStateV3Axis =
  | 'listeningSegmentation'
  | 'reconstruction'
  | 'typingMechanics'
  | 'ttsEnvironment';

export type ListenerStateV3Level = 'clear' | 'watch' | 'strained';

export type ListenerStateV3PrimaryConstraint = ListenerStateV3Axis | 'none';

export type ListenerStateV3ReasonCode =
  | 'low-pressure'
  | 'boundary-fragile'
  | 'semantic-incomplete'
  | 'syntax-high'
  | 'lag-pressure'
  | 'accuracy-pressure'
  | 'rolling-accuracy-pressure'
  | 'typing-lag-with-accuracy'
  | 'correction-burden'
  | 'voice-rate-limited'
  | 'voice-unmeasured'
  | 'rate-too-high'
  | 'pause-too-short';

export type ListenerStateV3BoundaryType = 'sentence' | 'clause' | 'minor' | 'unsafe';

export type ListenerStateV3VoiceCalibrationStatus =
  | 'calibrated'
  | 'uncalibrated'
  | 'rate-capped'
  | 'voice-unresolved';

export interface ListenerStateV3Signals {
  lagSec?: number;
  lagOutlierCount?: number;
  accuracy?: number;
  chunkAccuracy?: number;
  rollingAccuracyLast3?: number;
  wpm?: number;
  backspaceRate?: number;
  correctionRate?: number;
  phraseBoundaryType?: ListenerStateV3BoundaryType;
  semanticCompleteness?: number;
  syntaxComplexity?: number;
  currentPlaybackRate?: number;
  currentPauseAfterPhraseMs?: number;
  voiceCalibrationStatus?: ListenerStateV3VoiceCalibrationStatus;
  voiceRateLimited?: boolean;
}

export interface ListenerStateV3AxisState {
  score: number;
  level: ListenerStateV3Level;
}

export interface ListenerStateV3NextSessionKnobs {
  shorterChunks: boolean;
  strongerBoundaries: boolean;
  longerPauses: boolean;
  lowerRate: boolean;
  preserveRate: boolean;
  typingPracticeSeparately: boolean;
}

export interface ListenerStateV3 {
  version: 3;
  primaryConstraint: ListenerStateV3PrimaryConstraint;
  axes: Record<ListenerStateV3Axis, ListenerStateV3AxisState>;
  reasonCodes: ListenerStateV3ReasonCode[];
  nextSessionKnobs: ListenerStateV3NextSessionKnobs;
}

export function buildListenerStateV3(signals: ListenerStateV3Signals): ListenerStateV3 {
  const reasonCodes = new Set<ListenerStateV3ReasonCode>();
  const normalized = normalizeSignals(signals);

  const listeningSegmentation = scoreListeningSegmentation(normalized, reasonCodes);
  const reconstruction = scoreReconstruction(normalized, reasonCodes);
  const typingMechanics = scoreTypingMechanics(normalized, reasonCodes);
  const ttsEnvironment = scoreTtsEnvironment(normalized, reasonCodes);

  const axes: Record<ListenerStateV3Axis, ListenerStateV3AxisState> = {
    listeningSegmentation: toAxisState(listeningSegmentation),
    reconstruction: toAxisState(reconstruction),
    typingMechanics: toAxisState(typingMechanics),
    ttsEnvironment: toAxisState(ttsEnvironment),
  };

  const primaryConstraint = choosePrimaryConstraint(axes);
  if (primaryConstraint === 'none') reasonCodes.add('low-pressure');

  return {
    version: 3,
    primaryConstraint,
    axes,
    reasonCodes: Array.from(reasonCodes),
    nextSessionKnobs: buildNextSessionKnobs(primaryConstraint, axes),
  };
}

interface NormalizedListenerStateV3Signals extends Required<Omit<ListenerStateV3Signals, 'phraseBoundaryType' | 'voiceCalibrationStatus'>> {
  phraseBoundaryType: ListenerStateV3BoundaryType | undefined;
  voiceCalibrationStatus: ListenerStateV3VoiceCalibrationStatus | undefined;
}

function normalizeSignals(signals: ListenerStateV3Signals): NormalizedListenerStateV3Signals {
  const accuracy = clamp01(signals.accuracy ?? 1);

  return {
    lagSec: clampNonNegative(signals.lagSec ?? 0),
    lagOutlierCount: clampNonNegative(signals.lagOutlierCount ?? 0),
    accuracy,
    chunkAccuracy: clamp01(signals.chunkAccuracy ?? accuracy),
    rollingAccuracyLast3: clamp01(signals.rollingAccuracyLast3 ?? accuracy),
    wpm: clampNonNegative(signals.wpm ?? 0),
    backspaceRate: clamp01(signals.backspaceRate ?? 0),
    correctionRate: clamp01(signals.correctionRate ?? 0),
    phraseBoundaryType: signals.phraseBoundaryType,
    semanticCompleteness: clamp01(signals.semanticCompleteness ?? 1),
    syntaxComplexity: clamp01(signals.syntaxComplexity ?? 0),
    currentPlaybackRate: clampNonNegative(signals.currentPlaybackRate ?? 1),
    currentPauseAfterPhraseMs: clampNonNegative(signals.currentPauseAfterPhraseMs ?? 0),
    voiceCalibrationStatus: signals.voiceCalibrationStatus,
    voiceRateLimited: Boolean(signals.voiceRateLimited),
  };
}

function scoreListeningSegmentation(
  signals: NormalizedListenerStateV3Signals,
  reasonCodes: Set<ListenerStateV3ReasonCode>,
): number {
  let score = 0;

  if (signals.phraseBoundaryType === 'unsafe' || signals.phraseBoundaryType === 'minor') {
    score += signals.phraseBoundaryType === 'unsafe' ? 0.42 : 0.28;
    reasonCodes.add('boundary-fragile');
  }

  if (signals.semanticCompleteness < 0.65) {
    score += signals.semanticCompleteness < 0.45 ? 0.32 : 0.2;
    reasonCodes.add('semantic-incomplete');
  }

  if (signals.syntaxComplexity > 0.7) {
    score += 0.18;
    reasonCodes.add('syntax-high');
  }

  if (signals.lagSec > 2.2) {
    score += signals.lagSec > 4 ? 0.22 : 0.12;
    reasonCodes.add('lag-pressure');
  }

  if (signals.lagOutlierCount >= 2) {
    score += 0.1;
    reasonCodes.add('lag-pressure');
  }

  return clamp01(score);
}

function scoreReconstruction(
  signals: NormalizedListenerStateV3Signals,
  reasonCodes: Set<ListenerStateV3ReasonCode>,
): number {
  let score = 0;
  const effectiveAccuracy = Math.min(signals.accuracy, signals.chunkAccuracy);
  const errorRate = 1 - effectiveAccuracy;

  if (errorRate > 0.18) {
    score += errorRate > 0.35 ? 0.52 : 0.34;
    reasonCodes.add('accuracy-pressure');
  }

  if (signals.rollingAccuracyLast3 < 0.75) {
    score += signals.rollingAccuracyLast3 < 0.6 ? 0.26 : 0.16;
    reasonCodes.add('rolling-accuracy-pressure');
  }

  if (signals.semanticCompleteness < 0.45 && effectiveAccuracy < 0.82) {
    score += 0.16;
    reasonCodes.add('semantic-incomplete');
  }

  return clamp01(score);
}

function scoreTypingMechanics(
  signals: NormalizedListenerStateV3Signals,
  reasonCodes: Set<ListenerStateV3ReasonCode>,
): number {
  let score = 0;
  const accurateButBehind = signals.accuracy >= 0.82 && signals.lagSec > 1.8;

  if (accurateButBehind && signals.wpm > 0 && signals.wpm < 28) {
    score += 0.42;
    reasonCodes.add('typing-lag-with-accuracy');
  }

  if (signals.backspaceRate > 0.12) {
    score += signals.backspaceRate > 0.25 ? 0.28 : 0.18;
    reasonCodes.add('correction-burden');
  }

  if (signals.correctionRate > 0.16) {
    score += signals.correctionRate > 0.3 ? 0.3 : 0.18;
    reasonCodes.add('correction-burden');
  }

  return clamp01(score);
}

function scoreTtsEnvironment(
  signals: NormalizedListenerStateV3Signals,
  reasonCodes: Set<ListenerStateV3ReasonCode>,
): number {
  let score = 0;

  if (signals.voiceRateLimited) {
    score += 0.38;
    reasonCodes.add('voice-rate-limited');
  }

  if (signals.voiceCalibrationStatus === 'uncalibrated') {
    score += 0.18;
    reasonCodes.add('voice-unmeasured');
  }

  if (signals.voiceCalibrationStatus === 'rate-capped') {
    score += 0.32;
    reasonCodes.add('voice-rate-limited');
  }

  if (signals.currentPlaybackRate > 1.15) {
    score += signals.currentPlaybackRate > 1.3 ? 0.34 : 0.18;
    reasonCodes.add('rate-too-high');
  }

  if (signals.currentPauseAfterPhraseMs > 0 && signals.currentPauseAfterPhraseMs < 250) {
    score += 0.18;
    reasonCodes.add('pause-too-short');
  }

  return clamp01(score);
}

function toAxisState(score: number): ListenerStateV3AxisState {
  return {
    score,
    level: score >= 0.58 ? 'strained' : score >= 0.28 ? 'watch' : 'clear',
  };
}

function choosePrimaryConstraint(
  axes: Record<ListenerStateV3Axis, ListenerStateV3AxisState>,
): ListenerStateV3PrimaryConstraint {
  const ranked: ListenerStateV3Axis[] = [
    'listeningSegmentation',
    'reconstruction',
    'typingMechanics',
    'ttsEnvironment',
  ];
  let primary: ListenerStateV3PrimaryConstraint = 'none';
  let bestScore = 0.34;

  for (const axis of ranked) {
    const score = axes[axis].score;
    if (score > bestScore) {
      primary = axis;
      bestScore = score;
    }
  }

  return primary;
}

function buildNextSessionKnobs(
  primaryConstraint: ListenerStateV3PrimaryConstraint,
  axes: Record<ListenerStateV3Axis, ListenerStateV3AxisState>,
): ListenerStateV3NextSessionKnobs {
  const segmentationPressure = axes.listeningSegmentation.score >= 0.28;
  const reconstructionPressure = axes.reconstruction.score >= 0.28;
  const typingPressure = axes.typingMechanics.score >= 0.28;
  const environmentPressure = axes.ttsEnvironment.score >= 0.28;

  return {
    shorterChunks: segmentationPressure || reconstructionPressure,
    strongerBoundaries: segmentationPressure,
    longerPauses: segmentationPressure || environmentPressure,
    lowerRate: environmentPressure,
    preserveRate:
      primaryConstraint === 'none' ||
      primaryConstraint === 'typingMechanics' ||
      (!environmentPressure && typingPressure),
    typingPracticeSeparately: typingPressure && !environmentPressure,
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}
