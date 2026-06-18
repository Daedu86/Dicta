import type { ListenerStateV3, ListenerStateV3Axis } from './listenerStateV3';
import type { LiveTelemetryFrame, PhraseBoundaryType } from './types/pacing';

export type ListeningCycleInsightReportV3ReplayStrategy =
  | 'none'
  | 'repeat-short'
  | 'repeat-from-nucleus'
  | 'repeat-with-preroll';

export type ListeningCycleInsightReportV3PauseClass =
  | 'none'
  | 'micro'
  | 'boundary'
  | 'sentence'
  | 'recovery';

export interface ListeningCycleInsightReportV3ProsodySnapshot {
  boundaryStrength?: 'weak' | 'medium' | 'strong';
  pauseClass?: ListeningCycleInsightReportV3PauseClass;
  replayStrategy?: ListeningCycleInsightReportV3ReplayStrategy;
  reasonCodes?: readonly string[];
}

export interface ListeningCycleInsightReportV3ReplaySnapshot {
  strategy?: ListeningCycleInsightReportV3ReplayStrategy;
  reasonCodes?: readonly string[];
}

export interface ListeningCycleInsightReportV3Frame
  extends Partial<
    Pick<
      LiveTelemetryFrame,
      | 'phraseBoundaryType'
      | 'semanticCompleteness'
      | 'syntaxComplexity'
      | 'listenerStateV3'
      | 'wpm'
      | 'accuracy'
      | 'chunkAccuracy'
      | 'currentPlaybackRate'
      | 'currentPauseAfterPhraseMs'
    >
  > {
  actualPauseMs?: number;
  v3Prosody?: ListeningCycleInsightReportV3ProsodySnapshot;
  surgicalReplayPlan?: ListeningCycleInsightReportV3ReplaySnapshot;
  voiceCalibrationStatus?: 'calibrated' | 'uncalibrated' | 'rate-capped' | 'voice-unresolved';
  voiceRateLimited?: boolean;
  reasonCodes?: readonly string[];
}

export interface ListeningCycleInsightReportV3Evidence {
  totalFrames: number;
  framesWithListenerState: number;
  fragileBoundaryFrames: number;
  incompleteSemanticFrames: number;
  recoveryPauseFrames: number;
  shortPauseFrames: number;
  replayWithPrerollFrames: number;
  surgicalReplayFrames: number;
  voiceRateLimitedFrames: number;
  lowWpmHighAccuracyFrames: number;
}

export interface ListeningCycleInsightReportV3Recommendations {
  shorterChunks: boolean;
  strongerBoundaries: boolean;
  longerPauses: boolean;
  lowerRate: boolean;
  preserveRate: boolean;
  typingPracticeSeparately: boolean;
}

export interface ListeningCycleInsightReportV3 {
  version: 3;
  primaryConstraint: ListenerStateV3['primaryConstraint'];
  confidence: number;
  axes: Record<
    ListenerStateV3Axis,
    {
      averageScore: number;
      peakScore: number;
      level: ListenerStateV3['axes'][ListenerStateV3Axis]['level'];
    }
  >;
  evidence: ListeningCycleInsightReportV3Evidence;
  reasonCodes: string[];
  headline: string;
  summaryBullets: string[];
  nextSessionKnobs: ListeningCycleInsightReportV3Recommendations;
}

const AXES: ListenerStateV3Axis[] = [
  'listeningSegmentation',
  'reconstruction',
  'typingMechanics',
  'ttsEnvironment',
];

export function buildListeningCycleInsightReportV3(
  frames: readonly ListeningCycleInsightReportV3Frame[],
): ListeningCycleInsightReportV3 {
  const evidence = buildEvidence(frames);
  const axes = aggregateAxes(frames);
  const primaryConstraint = choosePrimaryConstraint(axes);
  const reasonCodes = collectReasonCodes(frames, evidence, primaryConstraint);
  const nextSessionKnobs = buildNextSessionKnobs(frames, primaryConstraint, evidence);

  return {
    version: 3,
    primaryConstraint,
    confidence: buildConfidence(evidence),
    axes,
    evidence,
    reasonCodes,
    headline: buildHeadline(primaryConstraint, evidence),
    summaryBullets: buildSummaryBullets(primaryConstraint, evidence, nextSessionKnobs),
    nextSessionKnobs,
  };
}

function buildEvidence(frames: readonly ListeningCycleInsightReportV3Frame[]): ListeningCycleInsightReportV3Evidence {
  const evidence: ListeningCycleInsightReportV3Evidence = {
    totalFrames: frames.length,
    framesWithListenerState: 0,
    fragileBoundaryFrames: 0,
    incompleteSemanticFrames: 0,
    recoveryPauseFrames: 0,
    shortPauseFrames: 0,
    replayWithPrerollFrames: 0,
    surgicalReplayFrames: 0,
    voiceRateLimitedFrames: 0,
    lowWpmHighAccuracyFrames: 0,
  };

  for (const frame of frames) {
    if (frame.listenerStateV3) evidence.framesWithListenerState += 1;

    if (isFragileBoundary(frame)) evidence.fragileBoundaryFrames += 1;
    if ((frame.semanticCompleteness ?? 1) < 0.65) evidence.incompleteSemanticFrames += 1;
    if (frame.v3Prosody?.pauseClass === 'recovery') evidence.recoveryPauseFrames += 1;

    const pauseMs = frame.actualPauseMs ?? frame.currentPauseAfterPhraseMs ?? 0;
    if (pauseMs > 0 && pauseMs < 500) evidence.shortPauseFrames += 1;

    const replayStrategy = frame.surgicalReplayPlan?.strategy ?? frame.v3Prosody?.replayStrategy ?? 'none';
    if (replayStrategy !== 'none') evidence.surgicalReplayFrames += 1;
    if (replayStrategy === 'repeat-with-preroll') evidence.replayWithPrerollFrames += 1;

    if (frame.voiceRateLimited || frame.voiceCalibrationStatus === 'rate-capped') {
      evidence.voiceRateLimitedFrames += 1;
    }

    const accuracy = frame.chunkAccuracy ?? frame.accuracy ?? 0;
    if ((frame.wpm ?? 0) > 0 && (frame.wpm ?? 0) < 28 && accuracy >= 0.9) {
      evidence.lowWpmHighAccuracyFrames += 1;
    }
  }

  return evidence;
}

function aggregateAxes(
  frames: readonly ListeningCycleInsightReportV3Frame[],
): ListeningCycleInsightReportV3['axes'] {
  const totals = Object.fromEntries(AXES.map((axis) => [axis, 0])) as Record<ListenerStateV3Axis, number>;
  const peaks = Object.fromEntries(AXES.map((axis) => [axis, 0])) as Record<ListenerStateV3Axis, number>;
  let count = 0;

  for (const frame of frames) {
    if (!frame.listenerStateV3) continue;
    count += 1;
    for (const axis of AXES) {
      const score = frame.listenerStateV3.axes[axis].score;
      totals[axis] += score;
      peaks[axis] = Math.max(peaks[axis], score);
    }
  }

  return Object.fromEntries(
    AXES.map((axis) => {
      const averageScore = count > 0 ? round2(totals[axis] / count) : 0;
      const peakScore = round2(peaks[axis]);
      return [
        axis,
        {
          averageScore,
          peakScore,
          level: toLevel(Math.max(averageScore, peakScore * 0.72)),
        },
      ];
    }),
  ) as ListeningCycleInsightReportV3['axes'];
}

function choosePrimaryConstraint(
  axes: ListeningCycleInsightReportV3['axes'],
): ListenerStateV3['primaryConstraint'] {
  let primary: ListenerStateV3['primaryConstraint'] = 'none';
  let bestScore = 0.34;

  for (const axis of AXES) {
    const weightedScore = axes[axis].averageScore * 0.65 + axes[axis].peakScore * 0.35;
    if (weightedScore > bestScore) {
      primary = axis;
      bestScore = weightedScore;
    }
  }

  return primary;
}

function collectReasonCodes(
  frames: readonly ListeningCycleInsightReportV3Frame[],
  evidence: ListeningCycleInsightReportV3Evidence,
  primaryConstraint: ListenerStateV3['primaryConstraint'],
): string[] {
  const reasonCodes = new Set<string>();

  for (const frame of frames) {
    for (const reasonCode of frame.reasonCodes ?? []) reasonCodes.add(reasonCode);
    for (const reasonCode of frame.v3Prosody?.reasonCodes ?? []) reasonCodes.add(reasonCode);
    for (const reasonCode of frame.surgicalReplayPlan?.reasonCodes ?? []) reasonCodes.add(reasonCode);
    for (const reasonCode of frame.listenerStateV3?.reasonCodes ?? []) reasonCodes.add(reasonCode);
  }

  if (evidence.fragileBoundaryFrames > 0) reasonCodes.add('boundary-fragile');
  if (evidence.replayWithPrerollFrames > 0) reasonCodes.add('replay-with-preroll');
  if (evidence.voiceRateLimitedFrames > 0) reasonCodes.add('voice-rate-limited');
  if (evidence.lowWpmHighAccuracyFrames > 0) reasonCodes.add('typing-lag-with-accuracy');
  if (primaryConstraint === 'none') reasonCodes.add('low-pressure');

  return Array.from(reasonCodes).sort();
}

function buildNextSessionKnobs(
  frames: readonly ListeningCycleInsightReportV3Frame[],
  primaryConstraint: ListenerStateV3['primaryConstraint'],
  evidence: ListeningCycleInsightReportV3Evidence,
): ListeningCycleInsightReportV3Recommendations {
  const knobs: ListeningCycleInsightReportV3Recommendations = {
    shorterChunks: false,
    strongerBoundaries: false,
    longerPauses: false,
    lowerRate: false,
    preserveRate: primaryConstraint === 'none',
    typingPracticeSeparately: false,
  };

  for (const frame of frames) {
    const frameKnobs = frame.listenerStateV3?.nextSessionKnobs;
    if (!frameKnobs) continue;
    knobs.shorterChunks ||= frameKnobs.shorterChunks;
    knobs.strongerBoundaries ||= frameKnobs.strongerBoundaries;
    knobs.longerPauses ||= frameKnobs.longerPauses;
    knobs.lowerRate ||= frameKnobs.lowerRate;
    knobs.preserveRate ||= frameKnobs.preserveRate;
    knobs.typingPracticeSeparately ||= frameKnobs.typingPracticeSeparately;
  }

  if (evidence.fragileBoundaryFrames > 0 || evidence.replayWithPrerollFrames > 0) {
    knobs.shorterChunks = true;
    knobs.strongerBoundaries = true;
  }
  if (evidence.shortPauseFrames > 0 || evidence.recoveryPauseFrames > 0) knobs.longerPauses = true;
  if (evidence.voiceRateLimitedFrames > 0) knobs.lowerRate = true;
  if (evidence.lowWpmHighAccuracyFrames > 0 && evidence.voiceRateLimitedFrames === 0) {
    knobs.typingPracticeSeparately = true;
    knobs.preserveRate = true;
    knobs.lowerRate = false;
  }

  if (knobs.lowerRate) knobs.preserveRate = false;

  return knobs;
}

function buildConfidence(evidence: ListeningCycleInsightReportV3Evidence): number {
  if (evidence.totalFrames === 0) return 0;
  const coverage = evidence.framesWithListenerState / evidence.totalFrames;
  const sampleScore = Math.min(1, evidence.totalFrames / 8);
  return round2(0.35 + coverage * 0.45 + sampleScore * 0.2);
}

function buildHeadline(
  primaryConstraint: ListenerStateV3['primaryConstraint'],
  evidence: ListeningCycleInsightReportV3Evidence,
): string {
  if (evidence.totalFrames === 0) return 'No hay suficiente telemetría para explicar la sesión todavía.';

  switch (primaryConstraint) {
    case 'listeningSegmentation':
      return 'La dificultad principal fue segmentar lo oído, no escribir más rápido.';
    case 'reconstruction':
      return 'La dificultad principal fue reconstruir el contenido después de escucharlo.';
    case 'typingMechanics':
      return 'La dificultad principal parece mecánica de tipeo, no comprensión auditiva.';
    case 'ttsEnvironment':
      return 'La dificultad principal vino del entorno Browser TTS o de la velocidad de voz.';
    case 'none':
    default:
      return 'La sesión se mantuvo estable; conviene preservar el ritmo actual.';
  }
}

function buildSummaryBullets(
  primaryConstraint: ListenerStateV3['primaryConstraint'],
  evidence: ListeningCycleInsightReportV3Evidence,
  knobs: ListeningCycleInsightReportV3Recommendations,
): string[] {
  const bullets: string[] = [];

  if (evidence.fragileBoundaryFrames > 0) {
    bullets.push(`Aparecieron ${evidence.fragileBoundaryFrames} chunks con boundary frágil.`);
  }
  if (evidence.replayWithPrerollFrames > 0) {
    bullets.push(`El replay con preroll fue necesario en ${evidence.replayWithPrerollFrames} chunks.`);
  }
  if (evidence.voiceRateLimitedFrames > 0) {
    bullets.push(`La voz Browser TTS fue limitada o no calibrada en ${evidence.voiceRateLimitedFrames} frames.`);
  }
  if (evidence.lowWpmHighAccuracyFrames > 0 && primaryConstraint === 'typingMechanics') {
    bullets.push('Hubo WPM bajo con accuracy alta; eso apunta a mecánica de tipeo separada del listening.');
  }
  if (knobs.shorterChunks) bullets.push('Próxima sesión: usar chunks más cortos.');
  if (knobs.strongerBoundaries) bullets.push('Próxima sesión: preferir boundaries más fuertes.');
  if (knobs.longerPauses) bullets.push('Próxima sesión: aumentar pausas perceptibles entre chunks.');
  if (knobs.lowerRate) bullets.push('Próxima sesión: bajar o mantener capado el rate de Browser TTS.');
  if (knobs.preserveRate && !knobs.lowerRate) bullets.push('Próxima sesión: preservar el rate actual.');

  if (bullets.length === 0) bullets.push('No se detectó presión clara; mantener el perfil actual.');

  return bullets;
}

function isFragileBoundary(frame: ListeningCycleInsightReportV3Frame): boolean {
  const boundaryType = frame.phraseBoundaryType as PhraseBoundaryType | undefined;
  return (
    boundaryType === 'minor' ||
    boundaryType === 'unsafe' ||
    frame.v3Prosody?.boundaryStrength === 'weak'
  );
}

function toLevel(score: number): ListenerStateV3['axes'][ListenerStateV3Axis]['level'] {
  return score >= 0.58 ? 'strained' : score >= 0.28 ? 'watch' : 'clear';
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}
