type DictationScriptTitleSource = {
  title: string;
  language: string;
  inputMode: string;
  phrases: Array<{
    text: string;
  }>;
};

export function normalizeGeneratedDictationScriptTitle<TScript extends DictationScriptTitleSource>(
  script: TScript,
  formatSupportedLanguage: (language: string) => string,
): TScript {
  const title = script.title.trim();
  if (!isGenericGeneratedTitle(title)) {
    return script;
  }

  return {
    ...script,
    title: buildFallbackDictationScriptTitle(script, formatSupportedLanguage),
  };
}

function isGenericGeneratedTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase().replace(/[\s_-]+/g, ' ');

  return (
    normalized.length === 0 ||
    normalized === 'generated dictation' ||
    normalized === 'dictation' ||
    normalized === 'training script' ||
    normalized === 'generated script' ||
    normalized === 'untitled'
  );
}

function buildFallbackDictationScriptTitle(
  script: DictationScriptTitleSource,
  formatSupportedLanguage: (language: string) => string,
): string {
  const firstPhrase = script.phrases.find((phrase) => phrase.text.trim().length > 0)?.text.trim() ?? '';
  const words = firstPhrase.match(/[\p{L}\p{N}]+/gu) ?? [];
  const titleWords = words.slice(0, 6);

  if (titleWords.length > 0) {
    return truncateTitle(titleWords.join(' '));
  }

  const language = formatSupportedLanguage(script.language);
  return `${language} ${String(script.inputMode)} practice`;
}

function truncateTitle(title: string): string {
  return title.length > 64 ? `${title.slice(0, 61).trim()}...` : title;
}
