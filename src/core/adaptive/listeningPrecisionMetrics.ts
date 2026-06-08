export type ListeningPrecisionMetrics = {
  listeningRecallScore: number;
  contentWordRecall: number;
  detailPrecisionScore: number;
  omissionRate: number;
  substitutionRate: number;
  wordOrderAccuracy: number;
  functionWordAccuracy: number;
  lateCompletionRate: number;
};

export type ListeningPrecisionLanguage = 'en' | 'es' | 'de' | 'fr' | 'pt' | string;

export type ComputeListeningPrecisionMetricsArgs = {
  targetText: string;
  typedText: string;
  language?: ListeningPrecisionLanguage | null;
  typedTextAtPlaybackEnd?: string | null;
};

const DEFAULT_PRECISION_METRICS: ListeningPrecisionMetrics = {
  listeningRecallScore: 1,
  contentWordRecall: 1,
  detailPrecisionScore: 1,
  omissionRate: 0,
  substitutionRate: 0,
  wordOrderAccuracy: 1,
  functionWordAccuracy: 1,
  lateCompletionRate: 0,
};

const FUNCTION_WORDS_BY_LANGUAGE: Record<string, Set<string>> = {
  en: new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'because', 'but', 'by', 'for', 'from', 'if', 'in', 'into', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'then', 'there', 'this', 'to', 'with', 'without',
  ]),
  es: new Set([
    'a', 'al', 'ante', 'aunque', 'como', 'con', 'contra', 'de', 'del', 'desde', 'el', 'en', 'entre', 'esa', 'ese', 'esta', 'este', 'la', 'las', 'lo', 'los', 'o', 'para', 'pero', 'por', 'que', 'se', 'si', 'sin', 'sobre', 'un', 'una', 'y',
  ]),
  de: new Set([
    'aber', 'als', 'am', 'an', 'auf', 'aus', 'bei', 'bis', 'das', 'dem', 'den', 'der', 'des', 'die', 'ein', 'eine', 'einem', 'einen', 'einer', 'für', 'im', 'in', 'ist', 'mit', 'nach', 'oder', 'ohne', 'und', 'von', 'vor', 'weil', 'wenn', 'zu', 'zum', 'zur',
  ]),
  fr: new Set([
    'à', 'au', 'aux', 'avec', 'ce', 'cet', 'cette', 'dans', 'de', 'des', 'du', 'elle', 'en', 'est', 'et', 'il', 'la', 'le', 'les', 'mais', 'ou', 'par', 'pour', 'que', 'qui', 'sans', 'sur', 'un', 'une',
  ]),
  pt: new Set([
    'a', 'ao', 'aos', 'as', 'com', 'como', 'da', 'das', 'de', 'do', 'dos', 'e', 'em', 'entre', 'esta', 'este', 'mas', 'na', 'nas', 'no', 'nos', 'o', 'os', 'ou', 'para', 'por', 'que', 'sem', 'sobre', 'um', 'uma',
  ]),
};

export function createDefaultListeningPrecisionMetrics(): ListeningPrecisionMetrics {
  return { ...DEFAULT_PRECISION_METRICS };
}

export function computeListeningPrecisionMetrics({
  targetText,
  typedText,
  language,
  typedTextAtPlaybackEnd,
}: ComputeListeningPrecisionMetricsArgs): ListeningPrecisionMetrics {
  const targetTokens = tokenizeListeningText(targetText);
  if (targetTokens.length === 0) return createDefaultListeningPrecisionMetrics();

  const typedTokens = tokenizeListeningText(typedText);
  const typedAtPlaybackEndTokens = tokenizeListeningText(typedTextAtPlaybackEnd ?? typedText);
  const functionWords = resolveFunctionWords(language);
  const exactOverlap = countMultisetOverlap(targetTokens, typedTokens);
  const orderedMatches = longestCommonSubsequenceLength(targetTokens, typedTokens);
  const missingTargetTokenCount = Math.max(0, targetTokens.length - exactOverlap);
  const extraTypedTokenCount = Math.max(0, typedTokens.length - exactOverlap);
  const substitutionCount = Math.min(missingTargetTokenCount, extraTypedTokenCount);
  const contentTargetTokens = targetTokens.filter((token) => isContentWord(token, functionWords));
  const contentTypedTokens = typedTokens.filter((token) => isContentWord(token, functionWords));
  const functionTargetTokens = targetTokens.filter((token) => isFunctionWord(token, functionWords));
  const functionTypedTokens = typedTokens.filter((token) => isFunctionWord(token, functionWords));
  const detailTargetTokens = targetTokens.filter((token) => isDetailToken(token, functionWords));
  const detailTypedTokens = typedTokens.filter((token) => isDetailToken(token, functionWords));

  const finalMatches = exactOverlap;
  const playbackEndMatches = countMultisetOverlap(targetTokens, typedAtPlaybackEndTokens);
  const missingAtPlaybackEnd = Math.max(0, targetTokens.length - playbackEndMatches);
  const lateCompletions = Math.max(0, finalMatches - playbackEndMatches);

  return {
    listeningRecallScore: roundMetric(orderedMatches / targetTokens.length),
    contentWordRecall: ratioOrOne(countMultisetOverlap(contentTargetTokens, contentTypedTokens), contentTargetTokens.length),
    detailPrecisionScore: ratioOrOne(countMultisetOverlap(detailTargetTokens, detailTypedTokens), detailTargetTokens.length),
    omissionRate: roundMetric(missingTargetTokenCount / targetTokens.length),
    substitutionRate: roundMetric(substitutionCount / targetTokens.length),
    wordOrderAccuracy: exactOverlap === 0 ? 0 : roundMetric(orderedMatches / exactOverlap),
    functionWordAccuracy: ratioOrOne(countMultisetOverlap(functionTargetTokens, functionTypedTokens), functionTargetTokens.length),
    lateCompletionRate: missingAtPlaybackEnd === 0 ? 0 : roundMetric(lateCompletions / missingAtPlaybackEnd),
  };
}

export function tokenizeListeningText(text: string | null | undefined): string[] {
  return (text ?? '')
    .normalize('NFC')
    .toLocaleLowerCase()
    .match(/[\p{L}\p{N}]+/gu) ?? [];
}

function resolveFunctionWords(language?: ListeningPrecisionLanguage | null): Set<string> {
  const normalized = typeof language === 'string' ? language.toLocaleLowerCase().split('-')[0] : '';
  return FUNCTION_WORDS_BY_LANGUAGE[normalized] ?? FUNCTION_WORDS_BY_LANGUAGE.en;
}

function isFunctionWord(token: string, functionWords: Set<string>): boolean {
  return functionWords.has(token);
}

function isContentWord(token: string, functionWords: Set<string>): boolean {
  return !isFunctionWord(token, functionWords) && !isNumericToken(token);
}

function isDetailToken(token: string, functionWords: Set<string>): boolean {
  return isFunctionWord(token, functionWords) || isNumericToken(token) || token.length <= 3;
}

function isNumericToken(token: string): boolean {
  return /^\p{N}+$/u.test(token);
}

function ratioOrOne(matches: number, total: number): number {
  if (total <= 0) return 1;
  return roundMetric(matches / total);
}

function countMultisetOverlap(left: string[], right: string[]): number {
  const counts = new Map<string, number>();
  for (const token of right) counts.set(token, (counts.get(token) ?? 0) + 1);

  let overlap = 0;
  for (const token of left) {
    const available = counts.get(token) ?? 0;
    if (available <= 0) continue;
    counts.set(token, available - 1);
    overlap += 1;
  }
  return overlap;
}

function longestCommonSubsequenceLength(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) return 0;
  const previous = new Array(right.length + 1).fill(0);
  const current = new Array(right.length + 1).fill(0);

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = left[i - 1] === right[j - 1]
        ? previous[j - 1] + 1
        : Math.max(previous[j], current[j - 1]);
    }
    previous.splice(0, previous.length, ...current);
    current.fill(0);
  }
  return previous[right.length];
}

function roundMetric(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.max(0, Math.min(1, value)) * 10000) / 10000;
}
