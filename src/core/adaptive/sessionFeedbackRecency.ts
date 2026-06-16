import type { AdaptiveSessionFeedback } from './types';
import type { SessionFeedbackReference } from './sessionFeedbackContracts';

export type SessionFeedbackRecency = {
  status: 'current_for_latest_finished_session' | 'stale_for_latest_finished_session' | 'missing_for_latest_finished_session';
  latestFinishedSession: SessionFeedbackReference | null;
  feedbackSession: ReturnType<typeof summarizeFeedbackForRecency>;
  message: string;
};

export function buildSessionFeedbackStatus(
  feedback: AdaptiveSessionFeedback | null,
  activeSessionStatus?: string,
  recency?: SessionFeedbackRecency | null,
): string {
  if (recency?.status === 'stale_for_latest_finished_session') return 'stale_completed_feedback_for_latest_finished_session';
  if (recency?.status === 'missing_for_latest_finished_session') return 'latest_finished_session_no_completed_feedback_yet';
  if (feedback) return 'completed_feedback_available';
  if (activeSessionStatus === 'running' || activeSessionStatus === 'paused' || activeSessionStatus === 'ready') {
    return `session_${activeSessionStatus}_no_completed_feedback_yet`;
  }
  return 'no_completed_feedback_available';
}

export function buildSessionFeedbackRecency(
  feedback: AdaptiveSessionFeedback | null,
  latestFinishedSession: SessionFeedbackReference | null | undefined,
): SessionFeedbackRecency | null {
  if (!latestFinishedSession?.sessionId) return null;
  const feedbackSession = summarizeFeedbackForRecency(feedback);
  if (!feedback) {
    return {
      status: 'missing_for_latest_finished_session',
      latestFinishedSession,
      feedbackSession,
      message: 'No formal session feedback exists for the latest finished session in this input/language scope.',
    };
  }
  if (feedback.sessionId === latestFinishedSession.sessionId) {
    return {
      status: 'current_for_latest_finished_session',
      latestFinishedSession,
      feedbackSession,
      message: 'Formal session feedback matches the latest finished session in this input/language scope.',
    };
  }
  return {
    status: 'stale_for_latest_finished_session',
    latestFinishedSession,
    feedbackSession,
    message: 'The newest saved session is newer than the newest available formal session feedback; stale feedback is diagnostic only.',
  };
}

export function summarizeFeedbackForRecency(feedback: AdaptiveSessionFeedback | null): {
  sessionId: string | null;
  completedAt: string | null;
  createdAt: string | null;
  scriptId: string | null;
  scriptTitle: string | null;
} {
  return {
    sessionId: feedback?.sessionId ?? null,
    completedAt: feedback?.completedAt ?? null,
    createdAt: feedback?.createdAt ?? null,
    scriptId: feedback?.scriptId ?? null,
    scriptTitle: feedback?.scriptTitle ?? null,
  };
}

export function buildFeedbackUnavailableSnapshot(
  status: string,
  recency?: SessionFeedbackRecency | null,
): { status: string; message: string; latestFinishedSession?: SessionFeedbackReference | null; staleFeedback?: ReturnType<typeof summarizeFeedbackForRecency> } {
  return {
    status,
    message: recency?.message ?? 'Formal completed-session feedback is not available for this selected input/language profile yet.',
    ...(recency?.latestFinishedSession ? { latestFinishedSession: recency.latestFinishedSession } : {}),
    ...(recency?.status === 'stale_for_latest_finished_session' ? { staleFeedback: recency.feedbackSession } : {}),
  };
}
