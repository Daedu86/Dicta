import type { AdaptiveSessionFeedback, InputMode, LanguageCode } from './types';

export function selectLatestAdaptiveSessionFeedback(
  feedbackList: readonly AdaptiveSessionFeedback[] | null | undefined,
  inputMode: InputMode,
  language: LanguageCode,
): AdaptiveSessionFeedback | null {
  const targetLanguage = normalizeFeedbackLanguage(language);
  let latest: AdaptiveSessionFeedback | null = null;
  let latestTimestamp = Number.NEGATIVE_INFINITY;

  for (const feedback of feedbackList ?? []) {
    if (feedback.inputMode !== inputMode) continue;
    if (normalizeFeedbackLanguage(feedback.language) !== targetLanguage) continue;

    const timestamp = getFeedbackRecencyTimestampMs(feedback);
    if (!latest || timestamp > latestTimestamp) {
      latest = feedback;
      latestTimestamp = timestamp;
    }
  }

  return latest;
}

export function hasAdaptiveSessionFeedbackForSession(
  feedbackList: readonly AdaptiveSessionFeedback[] | null | undefined,
  inputMode: InputMode,
  language: LanguageCode,
  sessionId: string,
): boolean {
  if (!sessionId) return false;
  const targetLanguage = normalizeFeedbackLanguage(language);
  return (feedbackList ?? []).some(
    (feedback) =>
      feedback.sessionId === sessionId &&
      feedback.inputMode === inputMode &&
      normalizeFeedbackLanguage(feedback.language) === targetLanguage,
  );
}

export function upsertAdaptiveSessionFeedbackByInputLanguage<T extends Record<string, Record<string, AdaptiveSessionFeedback[]>>>(
  current: T,
  inputMode: InputMode,
  language: LanguageCode,
  feedback: AdaptiveSessionFeedback,
  limit = 12,
): T {
  const inputFeedback = current[inputMode] ?? {};
  const languageFeedback = inputFeedback[language] ?? [];
  const nextLanguageFeedback = [feedback, ...languageFeedback.filter((item) => item.sessionId !== feedback.sessionId)].slice(0, limit);
  return {
    ...current,
    [inputMode]: {
      ...inputFeedback,
      [language]: nextLanguageFeedback,
    },
  };
}

function normalizeFeedbackLanguage(language: LanguageCode): string {
  return String(language).toLowerCase();
}

function getFeedbackRecencyTimestampMs(feedback: AdaptiveSessionFeedback): number {
  const record = feedback as AdaptiveSessionFeedback & {
    finishedAt?: string;
    updatedAt?: string;
  };
  for (const timestamp of [record.completedAt, record.finishedAt, record.updatedAt, record.createdAt]) {
    const parsed = parseFeedbackTimestampMs(timestamp);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.NEGATIVE_INFINITY;
}

function parseFeedbackTimestampMs(value: string | null | undefined): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}
