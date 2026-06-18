export type AdaptiveSessionFeedbackRetentionState = Record<
  string,
  Record<string, unknown[]>
>;

export function pruneAdaptiveSessionFeedbackBySessionIds<TFeedback extends AdaptiveSessionFeedbackRetentionState>(
  feedback: TFeedback,
  sessionIds: ReadonlySet<string>,
): TFeedback {
  if (sessionIds.size === 0) return feedback;

  let changed = false;
  const nextFeedback: AdaptiveSessionFeedbackRetentionState = {};

  for (const [inputMode, byLanguage] of Object.entries(feedback)) {
    const nextByLanguage: Record<string, unknown[]> = {};
    for (const [language, feedbackList] of Object.entries(byLanguage)) {
      const nextFeedbackList = feedbackList.filter((item) => {
        const sessionId = readFeedbackSessionId(item);
        return !sessionIds.has(sessionId);
      });
      if (nextFeedbackList.length !== feedbackList.length) changed = true;
      if (nextFeedbackList.length > 0) {
        nextByLanguage[language] = nextFeedbackList;
      } else if (feedbackList.length > 0) {
        changed = true;
      }
    }
    if (Object.keys(nextByLanguage).length > 0) {
      nextFeedback[inputMode] = nextByLanguage;
    } else if (Object.keys(byLanguage).length > 0) {
      changed = true;
    }
  }

  return changed ? nextFeedback as TFeedback : feedback;
}

function readFeedbackSessionId(item: unknown): string {
  if (!item || typeof item !== 'object') return '';
  const sessionId = (item as { sessionId?: unknown }).sessionId;
  return typeof sessionId === 'string' ? sessionId : '';
}
