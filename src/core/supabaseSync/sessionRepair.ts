import { computeSessionScore } from '../sessionScore';

import type { CompletedFeedbackEvidence } from './feedbackEvidence';
import { asRecord, getStringField, isRecord, normalizeNumberArray, numberField } from './records';
import { isSubmittedFinishedSession } from './sessionConflictPolicy';
import { isSessionTombstonePayload } from './sessionTombstones';
import { timestampFrom } from './timestamps';

export function repairPendingSessionFromCompletedFeedback(session: unknown, evidence: CompletedFeedbackEvidence | undefined): unknown {
  if (!evidence || !isRecord(session) || isSubmittedFinishedSession(session) || isSessionTombstonePayload(session)) {
    return session;
  }
  if (getStringField(session, 'status') === 'error') return session;

  const telemetry = isRecord(session.telemetry) ? session.telemetry : {};
  const metrics = isRecord(session.metrics) ? session.metrics : {};
  const nextAccuracy = evidence.accuracy ?? numberField(metrics, 'accuracy');
  const nextLagSec = evidence.lagSec ?? numberField(metrics, 'lagSec');
  const nextWpm = evidence.wpm ?? numberField(metrics, 'wpm');
  const recoveredRate = evidence.rate ?? numberField(metrics, 'rate');
  const nextRate = recoveredRate || 1;
  const existingPoints = numberField(metrics, 'points');
  const repairedPoints =
    existingPoints > 0
      ? existingPoints
      : estimatePointsFromAccuracy(session, nextAccuracy);
  const existingScore = numberField(metrics, 'score');
  const repairedScore =
    existingScore > 0
      ? existingScore
      : computeSessionScore({
          accuracy: nextAccuracy,
          lagSec: nextLagSec,
          wpm: nextWpm,
          rate: nextRate,
          points: repairedPoints,
        });
  const existingActions = Array.isArray(telemetry.actions) ? telemetry.actions : [];
  const hasSubmitAction = existingActions.some((entry) => isRecord(entry) && entry.action === 'submit');
  const startedAt = typeof telemetry.startedAt === 'string' && telemetry.startedAt
    ? telemetry.startedAt
    : evidence.startedAt ?? '';
  const submitOffsetSec =
    startedAt && timestampFrom(startedAt)
      ? Math.max(0, (new Date(evidence.completedAt).getTime() - new Date(startedAt).getTime()) / 1000)
      : 0;

  return {
    ...session,
    status: 'finished',
    updatedAt: evidence.completedAt,
    metrics: {
      ...metrics,
      controllerState: typeof metrics.controllerState === 'string' ? metrics.controllerState : 'hold',
      rate: nextRate,
      lagSec: nextLagSec,
      lagWords: numberField(metrics, 'lagWords'),
      wpm: nextWpm,
      accuracy: nextAccuracy,
      trend: typeof metrics.trend === 'string' ? metrics.trend : 'stable',
      points: repairedPoints,
      score: repairedScore,
    },
    telemetry: {
      ...telemetry,
      startedAt,
      finishedAt: evidence.completedAt,
      lagSeries: normalizeNumberArray(telemetry.lagSeries, evidence.lagSeries),
      wpmSeries: normalizeNumberArray(telemetry.wpmSeries, evidence.wpmSeries),
      accuracySeries: normalizeNumberArray(telemetry.accuracySeries, evidence.accuracySeries),
      actions: hasSubmitAction
        ? existingActions
        : [
            ...existingActions,
            {
              t: submitOffsetSec,
              action: 'submit',
              rate: nextRate,
            },
          ],
    },
  };
}

function estimatePointsFromAccuracy(session: Record<string, unknown>, accuracy: number): number {
  if (accuracy <= 0) return 0;
  const sourceText = getStringField(session, 'ttsText');
  const wordCount = countWords(sourceText);
  return wordCount > 0 ? Math.round(wordCount * Math.max(0, Math.min(100, accuracy)) / 100) : 0;
}

function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
}
