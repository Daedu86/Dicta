import type { SupportedLanguage } from '../../core/languages';
import type { TtsPacingMode } from '../../types/dictation';

type TtsStatus = 'idle' | 'ready' | 'playing' | 'paused' | 'finished';

type BrowserTtsSetupCardProps = {
  activeInputLabel: string;
  activeInputFeatureLabel: string;
  ttsExpanded: boolean;
  ttsHasText: boolean;
  ttsText: string;
  ttsLanguage: SupportedLanguage;
  ttsStatus: TtsStatus;
  ttsSpeechRate: number;
  ttsPacingMode: TtsPacingMode;
  ttsCurrentChunk: string;
  supportedLanguages: readonly SupportedLanguage[];
  setupLocked: boolean;
  inputSettingsReady: boolean;
  onToggleExpanded: () => void;
  onTtsTextChange: (value: string) => void;
  onTtsLanguageChange: (language: SupportedLanguage) => void;
  onLockInputSettings: () => void;
  formatTtsPacingMode: (mode: TtsPacingMode) => string;
};

export function BrowserTtsSetupCard({
  activeInputLabel,
  activeInputFeatureLabel,
  ttsExpanded,
  ttsHasText,
  ttsText,
  ttsLanguage,
  ttsStatus,
  ttsSpeechRate,
  ttsPacingMode,
  ttsCurrentChunk,
  supportedLanguages,
  setupLocked,
  inputSettingsReady,
  onToggleExpanded,
  onTtsTextChange,
  onTtsLanguageChange,
  onLockInputSettings,
  formatTtsPacingMode,
}: BrowserTtsSetupCardProps) {
  return (
    <section className="sidebar-section sidebar-section-border">
      <button
        type="button"
        className="sidebar-section-heading sidebar-section-toggle"
        onClick={onToggleExpanded}
        aria-expanded={ttsExpanded}
      >
        <span className="sidebar-input-heading">
          <span>{activeInputLabel}</span>
          {activeInputFeatureLabel ? <span className="sidebar-input-feature">{activeInputFeatureLabel}</span> : null}
        </span>
        <span className="sidebar-section-meta">
          <span className={`tts-paste-pill ${ttsHasText ? 'tts-paste-pill-ready' : 'tts-paste-pill-empty'}`}>
            {ttsHasText ? 'Pasted' : 'Paste text'}
          </span>
          <span className={`sidebar-chevron ${ttsExpanded ? 'sidebar-chevron-open' : ''}`}>⌃</span>
        </span>
      </button>
      {ttsExpanded ? (
        <div className="sidebar-card tts-card">
          <label>
            TTS text
            <textarea
              value={ttsText}
              onChange={(e) => onTtsTextChange(e.target.value)}
              placeholder="Paste text here to prepare it for TTS playback..."
              rows={9}
              readOnly={setupLocked}
              disabled={setupLocked}
            />
          </label>
          <label>
            TTS processing language
            <select value={ttsLanguage} disabled={setupLocked} onChange={(e) => onTtsLanguageChange(e.target.value as SupportedLanguage)}>
              {supportedLanguages.map((language) => (
                <option key={language} value={language}>{language}</option>
              ))}
            </select>
          </label>
          <div className={`tts-visor ${ttsHasText ? 'tts-visor-ready' : ''}`} aria-live="polite">
            {ttsHasText ? 'Text pasted. Ready for TTS playback.' : 'Waiting for pasted text.'}
          </div>
          <div className="tts-runtime">
            <span>Status: {ttsStatus}</span>
            <span>Rate: {ttsSpeechRate.toFixed(2)}x</span>
            <span>Language: {ttsLanguage}</span>
            <span>Pacing: {formatTtsPacingMode(ttsPacingMode)}</span>
          </div>
          {ttsCurrentChunk ? <p className="tts-current-chunk">{ttsCurrentChunk}</p> : null}
          <div className="input-lock-box">
            <button
              type="button"
              className="secondary-button"
              onClick={onLockInputSettings}
              disabled={setupLocked || !inputSettingsReady}
            >
              {setupLocked ? 'Input settings locked' : 'Submit and lock input settings'}
            </button>
            <p className="hint">
              {setupLocked
                ? 'This TTS source and language are locked for this session.'
                : 'Lock after the TTS text is pasted and the language is selected.'}
            </p>
          </div>
          <p className="hint">
            Browser built-in feature. This panel is ready for a future TTS engine, such as Gemini 3.1 Flash TTS, with pace control driven by telemetry and typing history.
          </p>
        </div>
      ) : null}
    </section>
  );
}
