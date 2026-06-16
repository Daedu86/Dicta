import { asRecord, isRecord } from './records';
import { timestampFrom } from './timestamps';
import type { DictaSyncItem, DictaSyncRow, DictaSyncState } from './types';

export function buildSyncItems(state: DictaSyncState): DictaSyncItem[] {
  const items: DictaSyncItem[] = [];

  for (const session of state.sessions) {
    const record = asRecord(session);
    const id = typeof record.id === 'string' ? record.id : '';
    if (!id) continue;
    items.push({
      itemType: 'session',
      itemKey: id,
      payload: session,
      updatedAt: timestampFrom(record.updatedAt) ?? new Date(0).toISOString(),
    });
  }

  for (const [inputMode, byLanguage] of Object.entries(state.benchmarks)) {
    if (!isRecord(byLanguage)) continue;
    for (const [language, benchmark] of Object.entries(byLanguage)) {
      const record = asRecord(benchmark);
      items.push({
        itemType: 'benchmark',
        itemKey: `${inputMode}:${language}`,
        payload: benchmark,
        updatedAt: timestampFrom(record.lastUpdatedAt) ?? new Date(0).toISOString(),
      });
    }
  }

  for (const byLanguage of Object.values(state.feedback)) {
    if (!isRecord(byLanguage)) continue;
    for (const feedbackList of Object.values(byLanguage)) {
      if (!Array.isArray(feedbackList)) continue;
      for (const feedback of feedbackList) {
        const record = asRecord(feedback);
        const sessionId = typeof record.sessionId === 'string' ? record.sessionId : '';
        if (!sessionId) continue;
        items.push({
          itemType: 'feedback',
          itemKey: sessionId,
          payload: feedback,
          updatedAt: timestampFrom(record.completedAt) ?? timestampFrom(record.createdAt) ?? new Date(0).toISOString(),
        });
      }
    }
  }

  return items;
}

export function toSyncRows(profileId: string, items: DictaSyncItem[]): DictaSyncRow[] {
  return items.map((item) => ({
    profile_id: profileId,
    item_type: item.itemType,
    item_key: item.itemKey,
    payload: item.payload,
    updated_at: item.updatedAt,
  }));
}
