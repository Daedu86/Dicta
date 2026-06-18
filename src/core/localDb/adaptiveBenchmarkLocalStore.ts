import {
  adaptiveBenchmarkRecordId,
  getDictaLocalDbAdapter,
  type DictaLocalDbAdaptiveBenchmarkRecord,
} from './dictaLocalDb';

export type AdaptiveBenchmarkLocalPayload = Record<string, Record<string, unknown>>;

export async function loadAdaptiveBenchmarks<TBenchmarks extends object>(profileId: string): Promise<TBenchmarks> {
  const records = await getDictaLocalDbAdapter().loadAdaptiveBenchmarks(profileId);
  const benchmarks: AdaptiveBenchmarkLocalPayload = {};
  for (const record of records) {
    benchmarks[record.inputMode] = {
      ...(benchmarks[record.inputMode] ?? {}),
      [record.language]: record.payload,
    };
  }
  return benchmarks as TBenchmarks;
}

export async function saveAdaptiveBenchmarks<TBenchmarks extends object>(
  profileId: string,
  benchmarks: TBenchmarks,
): Promise<void> {
  const records: DictaLocalDbAdaptiveBenchmarkRecord[] = [];
  for (const [inputMode, languageMap] of Object.entries(benchmarks)) {
    if (!languageMap || typeof languageMap !== 'object' || Array.isArray(languageMap)) continue;
    for (const [language, payload] of Object.entries(languageMap)) {
      records.push({
        id: adaptiveBenchmarkRecordId(profileId, inputMode, language),
        profileId,
        inputMode,
        language,
        updatedAt: getUpdatedAt(payload),
        payload,
      });
    }
  }
  await getDictaLocalDbAdapter().replaceAdaptiveBenchmarks(profileId, records);
}

function getUpdatedAt(payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const value = (payload as { lastUpdatedAt?: unknown; updatedAt?: unknown }).lastUpdatedAt ??
      (payload as { updatedAt?: unknown }).updatedAt;
    if (typeof value === 'string') return value;
  }
  return new Date().toISOString();
}
