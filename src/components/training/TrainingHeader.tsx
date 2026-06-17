import { LANGUAGE_LABELS, LANGUAGE_TAB_LABELS, SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../core/languages';

export type TrainingHeaderProps = {
  selectedLanguage: SupportedLanguage;
  onChangeLanguage: (language: SupportedLanguage) => void;
  onBackToApp: () => void;
};

export function TrainingHeader({ selectedLanguage, onChangeLanguage, onBackToApp }: TrainingHeaderProps) {
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
        {SUPPORTED_LANGUAGES.map((code) => (
          <button
            key={code}
            type="button"
            className={`training-header-language-tab ${selectedLanguage === code ? 'training-header-language-tab-active' : ''}`}
            onClick={() => onChangeLanguage(code)}
            aria-pressed={selectedLanguage === code}
            aria-label={`Use ${LANGUAGE_LABELS[code]} for training`}
            title={`Use ${LANGUAGE_LABELS[code]} for Dicta training views and new generated sessions`}
          >
            {LANGUAGE_TAB_LABELS[code]}
          </button>
        ))}
      </div>
      <button type="button" className="secondary-button training-header-button" onClick={onBackToApp}>
        Full app
      </button>
    </header>
  );
}
