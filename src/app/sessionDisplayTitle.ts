import type { DictationScript } from '../core/adaptive/dictationScriptValidation';
import { formatSupportedLanguage } from '../core/languages';
import { normalizeGeneratedDictationScriptTitle } from './generatedDictationScriptTitle';

export function getSessionDisplayTitle(session: {
  dictationScript?: DictationScript | null;
  name?: string | null;
}): string {
  if (session.dictationScript) {
    return normalizeGeneratedDictationScriptTitle(session.dictationScript, formatSupportedLanguage).title;
  }

  return session.name || 'Untitled session';
}
