import type { SupportedLanguage } from '../../core/languages';

type TtsStatus = 'idle' | 'ready' | 'playing' | 'paused' | 'finished';

type KokoroSetupCardProps = {
  activeInputLabel: string;
  activeInputFeatureLabel: string;
  kokoroExpanded: boolean;
  kokoroHasText: boolean;
  kokoroText: string;
  kokoroLanguage: SupportedLanguage;
  kokoroVoice: string;
  kokoroStatus: TtsStatus;
  kokoroSpeechRate: number;
  kokoroServiceReady: boolean | null;
  supportedLanguages: readonly SupportedLanguage[];
  setupLocked: boolean;
  inputSettingsReady: boolean;
  localDevFeaturesAvailable: boolean;
  kokoroLanguageWarning: string;
  error: string;
  onToggleExpanded: () => void;
  onKokoroTextChange: (value: string) => void;
  onKokoroLanguageChange: (language: SupportedLanguage) => void;
  onKokoroVoiceChange: (voice: string) => void;
  onLockInputSettings: () => void;
  formatSupportedLanguage: (language: SupportedLanguage) => string;
  isKokoroLanguageBlocked: (language: SupportedLanguage) => boolean;
};

export function KokoroSetupCard({
  activeInputLabel,
  activeInputFeatureLabel,
  kokoroExpanded,
  kokoroHasText,
  kokoroText,
  kokoroLanguage,
  kokoroVoice,
  kokoroStatus,
  kokoroSpeechRate,
  kokoroServiceReady,
  supportedLanguages,
  setupLocked,
  inputSettingsReady,
  localDevFeaturesAvailable,
  kokoroLanguageWarning,
  error,
  onToggleExpanded,
  onKokoroTextChange,
  onKokoroLanguageChange,
  onKokoroVoiceChange,
  onLockInputSettings,
  formatSupportedLanguage,
  isKokoroLanguageBlocked,
}: KokoroSetupCardProps) {
  return (
    <section className="sidebar-section sidebar-section-border">
      <button
        type="button"
        className="sidebar-section-heading sidebar-section-toggle"
        onClick={onToggleExpanded}
        aria-expanded={kokoroExpanded}
      >
        <span className="sidebar-input-heading">
          <span>{activeInputLabel}</span>
          {activeInputFeatureLabel ? <span className="sidebar-input-feature">{activeInputFeatureLabel}</span> : null}
        </span>
        <span className="sidebar-section-meta">
          <span className={`tts-paste-pill ${kokoroHasText ? 'tts-paste-pill-ready' : 'tts-paste-pill-empty'}`}>
            {kokoroHasText ? 'Pasted' : 'Paste text'}
          </span>
          <span className={`sidebar-chevron ${kokoroExpanded ? 'sidebar-chevron-open' : ''}`}>⌃</span>
        </span>
      </button>
      {kokoroExpanded ? (
        <div className="sidebar-card tts-card kokoro-card">
          <label>
            Kokoro source text
            <textarea
              value={kokoroText}
              onChange={(e) => onKokoroTextChange(e.target.value)}
              placeholder="Paste text here for local Kokoro phrase audio..."
              rows={9}
              readOnly={setupLocked}
              disabled={setupLocked}
            />
          </label>
          <label>
            Kokoro language
            <select value={kokoroLanguage} disabled={setupLocked} onChange={(e) => onKokoroLanguageChange(e.target.value as SupportedLanguage)}>
              {supportedLanguages.map((language) => (
                <option key={language} value={language}>
                  {formatSupportedLanguage(language)}
                  {isKokoroLanguageBlocked(language) ? ' (experimental / not native)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            Voice
            <input value={kokoroVoice} disabled={setupLocked} onChange={(e) => onKokoroVoiceChange(e.target.value)} placeholder="default" />
          </label>
          <div className={`tts-visor ${kokoroHasText ? 'tts-visor-ready' : ''}`} aria-live="polite">
            {kokoroHasText ? 'Text pasted. Ready for local Kokoro generation.' : 'Waiting for pasted text.'}
          </div>
          <div className="tts-runtime">
            <span>Status: {kokoroStatus}</span>
            <span>Rate: {kokoroSpeechRate.toFixed(2)}x</span>
            <span>Language: {kokoroLanguage}</span>
            <span>Service: {kokoroServiceReady === false ? 'offline' : kokoroServiceReady ? 'ready' : 'not checked'}</span>
          </div>
          <p className="hint">
            {localDevFeaturesAvailable
              ? 'Local Kokoro service expected at http://localhost:8787. Generated phrase audio is cached on disk by the sidecar.'
              : 'Kokoro is local-only and unavailable in the Vercel build. Use Input #2 for hosted/mobile practice.'}
          </p>
          {kokoroLanguageWarning ? <p className="error">{kokoroLanguageWarning}</p> : null}
          <div className="input-lock-box">
            <button
              type="button"
              className="secondary-button"
              onClick={onLockInputSettings}
              disabled={!localDevFeaturesAvailable || setupLocked || !inputSettingsReady}
            >
              {setupLocked ? 'Input settings locked' : 'Submit and lock input settings'}
            </button>
            <p className="hint">
              {setupLocked
                ? 'This Kokoro source, language, and voice are locked for this session.'
                : 'Lock after the Kokoro source, language, and voice are configured.'}
            </p>
          </div>
          {error ? <p className="error">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
