import { startTransition, useEffect, useRef, useState } from 'react';
import { LANGUAGE_LABELS, LANGUAGE_TAB_LABELS, SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../core/languages';
import { TrainingGenerationCard } from './TrainingGenerationCard';
import type { TrainingGenerationButton } from './trainingGenerationDisplay';

export type TrainingHeaderProps = {
  selectedLanguage: SupportedLanguage;
  onChangeLanguage: (language: SupportedLanguage) => void;
  onBackToApp: () => void;
  generationButtons?: TrainingGenerationButton[];
};

export function TrainingHeader({
  selectedLanguage,
  onChangeLanguage,
  onBackToApp,
  generationButtons = [],
}: TrainingHeaderProps) {
  const [optimisticLanguage, setOptimisticLanguage] = useState(selectedLanguage);
  const deferredLanguageChangeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setOptimisticLanguage(selectedLanguage);
  }, [selectedLanguage]);

  useEffect(() => () => {
    if (deferredLanguageChangeTimeoutRef.current !== null) {
      window.clearTimeout(deferredLanguageChangeTimeoutRef.current);
    }
  }, []);

  const selectLanguage = (code: SupportedLanguage) => {
    if (code === optimisticLanguage && code === selectedLanguage) {
      return;
    }

    setOptimisticLanguage(code);

    if (deferredLanguageChangeTimeoutRef.current !== null) {
      window.clearTimeout(deferredLanguageChangeTimeoutRef.current);
    }

    deferredLanguageChangeTimeoutRef.current = window.setTimeout(() => {
      deferredLanguageChangeTimeoutRef.current = null;
      startTransition(() => {
        onChangeLanguage(code);
      });
    }, 0);
  };

  return (
    <header className="training-header">
      <div className="training-header-brand">
        <span className="training-header-mark" aria-hidden="true">🪗</span>
        <div>
          <h1>Dicta</h1>
          <p>Training Mode</p>
        </div>
      </div>
      <div className="training-header-language-tabs" role="group" aria-label="Training language selector">
        {SUPPORTED_LANGUAGES.map((code) => {
          const isSelected = optimisticLanguage === code;

          return (
            <button
              key={code}
              type="button"
              className={`training-header-language-tab ${isSelected ? 'training-header-language-tab-active' : ''}`}
              onClick={() => selectLanguage(code)}
              aria-pressed={isSelected}
              aria-label={`${LANGUAGE_TAB_LABELS[code]} — Use ${LANGUAGE_LABELS[code]} for training`}
              title={`Use ${LANGUAGE_LABELS[code]} for Dicta training views and new generated sessions`}
            >
              {LANGUAGE_TAB_LABELS[code]}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="secondary-button training-header-button"
        onClick={onBackToApp}
        aria-label="Return to Dicta home"
        title="Return to Dicta home"
      >
        Home
      </button>
      <TrainingGenerationCard
        generationButtons={generationButtons}
        className="training-header-generation-card"
      />
    </header>
  );
}
