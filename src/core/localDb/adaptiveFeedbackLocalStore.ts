import {
  adaptiveFeedbackRecordId,
  getDictaLocalDbAdapter,
  type DictaLocalDbAdaptiveFeedbackRecord,
} from './dictaLocalDb';

export type AdaptiveFeedbackLocalPayload = Record<string, Record<string, unknown[]>>;

export async function loadAdaptiveSessionFeedback<TFeedback extends object>(profileId: string): Promise<TFeedback> {
  const records = await getDictaLocalDbAdapter().loadAdaptiveFeedback(profileId);
  const feedback: AdaptiveFeedbackLocalPayload = {};
  const sortedRecords = records.slice().sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  for (const record of sortedRecords) {
    feedback[record.inputMode] = {
      ...(feedback[record.inputMode] ?? {}),
      [record.language]: [...(feedback[record.inputMode]?.[record.language] ?? []), record.payload],
    };
  }
  return feedback as TFeedback;
}

export async function saveAdaptiveSessionFeedback<TFeedback extends object>(
  profileId: string,
  feedback: TFeedback,
): Promise<void> {
  const records: DictaLocalDbAdaptiveFeedbackRecord[] = [];
  for (const [inputMode, languageMap] of Object.entries(feedback)) {
    if (!languageMap || typeof languageMap !== 'object' || Array.isArray(languageMap)) continue;
    for (const [language, entries] of Object.entries(languageMap)) {
      if (!Array.isArray(entries)) continue;
      for (const payload of entries) {
        const sessionId = getSessionId(payload);
        if (!sessionId) continue;
        records.push({
          id: adaptiveFeedbackRecordId(profileId, inputMode, language, sessionId),
          profileId,
          inputMode,
          language,
          sessionId,
          updatedAt: getUpdatedAt(payload),
          payload,
        });
      }
    }
  }
  await getDictaLocalDbAdapter().replaceAdaptiveFeedback(profileId, records);
}

function getSessionId(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const value = (payload as { sessionId?: unknown }).sessionId;
  return typeof value === 'string' ? value : '';
}

function getUpdatedAt(payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const value = (payload as { completedAt?: unknown; createdAt?: unknown; updatedAt?: unknown }).completedAt ??
      (payload as { createdAt?: unknown }).createdAt ??
      (payload as { updatedAt?: unknown }).updatedAt;
    if (typeof value === 'string') return value;
  }
  return new Date().toISOString();
}
