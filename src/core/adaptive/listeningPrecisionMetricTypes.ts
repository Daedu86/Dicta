export type ListeningPrecisionMetrics = {
  listeningRecallScore: number;
  contentWordRecall: number;
  detailPrecisionScore: number;
  omissionRate: number;
  substitutionRate: number;
  wordOrderAccuracy: number;
  functionWordAccuracy: number;
  lateCompletionRate: number;
  completionWindowScore: number;
};

export type ListeningPrecisionLanguage = 'en' | 'es' | 'de' | 'fr' | 'pt' | string;

export type ComputeListeningPrecisionMetricsArgs = {
  targetText: string;
  typedText: string;
  language?: ListeningPrecisionLanguage | null;
  typedTextAtPlaybackEnd?: string | null;
};

export const DEFAULT_PRECISION_METRICS: ListeningPrecisionMetrics = {
  listeningRecallScore: 1,
  contentWordRecall: 1,
  detailPrecisionScore: 1,
  omissionRate: 0,
  substitutionRate: 0,
  wordOrderAccuracy: 1,
  functionWordAccuracy: 1,
  lateCompletionRate: 0,
  completionWindowScore: 1,
};
