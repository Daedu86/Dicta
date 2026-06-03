import type { Difficulty } from '../../core/config';
import type { SupportedLanguage } from '../../core/languages';

type AudioInputSetupCardProps = {
  activeInputLabel: string;
  setupExpanded: boolean;
  setupLocked: boolean;
  audioSourceUrlInput: string;
  transcribing: boolean;
  transcriptionProgress: number;
  transcriptionLanguage: SupportedLanguage;
  supportedLanguages: readonly SupportedLanguage[];
  difficulty: Difficulty;
  canGenerateTranscript: boolean;
  inputSettingsReady: boolean;
  audioReadyMessage: string;
  transcriptReadyMessage: string;
  error: string;
  onToggleExpanded: () => void;
  onAudioFile: (file: File | null) => void;
  onAudioSourceUrlInputChange: (value: string) => void;
  onAudioUrlLoad: () => void;
  onTranscriptFile: (file: File | null) => void | Promise<void>;
  onTranscriptionLanguageChange: (language: SupportedLanguage) => void;
  onGenerateTranscriptFromAudio: () => void | Promise<void>;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onLockInputSettings: () => void;
};

export function AudioInputSetupCard({
  activeInputLabel,
  setupExpanded,
  setupLocked,
  audioSourceUrlInput,
  transcribing,
  transcriptionProgress,
  transcriptionLanguage,
  supportedLanguages,
  difficulty,
  canGenerateTranscript,
  inputSettingsReady,
  audioReadyMessage,
  transcriptReadyMessage,
  error,
  onToggleExpanded,
  onAudioFile,
  onAudioSourceUrlInputChange,
  onAudioUrlLoad,
  onTranscriptFile,
  onTranscriptionLanguageChange,
  onGenerateTranscriptFromAudio,
  onDifficultyChange,
  onLockInputSettings,
}: AudioInputSetupCardProps) {
  return (
    <section className="sidebar-section sidebar-section-border">
      <button
        type="button"
        className="sidebar-section-heading sidebar-section-toggle"
        onClick={onToggleExpanded}
        aria-expanded={setupExpanded}
      >
        <span>{activeInputLabel}</span>
        <span className="sidebar-section-meta">
          <span className={`sidebar-chevron ${setupExpanded ? 'sidebar-chevron-open' : ''}`}>⌃</span>
        </span>
      </button>
      {setupExpanded ? (
        <>
          <div className="sidebar-card">
            <label>
              Audio file
              <input type="file" accept="audio/*" disabled={setupLocked} onChange={(e) => onAudioFile(e.target.files?.[0] ?? null)} />
            </label>
            <label>
              Audio URL (direct .mp3/.wav)
              <input
                type="url"
                value={audioSourceUrlInput}
                disabled={setupLocked}
                onChange={(e) => onAudioSourceUrlInputChange(e.target.value)}
                placeholder="https://.../audio.mp3"
              />
              <button type="button" onClick={onAudioUrlLoad} disabled={setupLocked}>Load audio URL</button>
            </label>
            <div className="progress-wrap" aria-live="polite">
              {transcribing || transcriptionProgress > 0 ? (
                <>
                  <div className="progress-meta">
                    <span>{transcribing ? 'Transcribing audio...' : 'Transcription complete'}</span>
                    <strong>{Math.round(transcriptionProgress)}%</strong>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${transcriptionProgress}%` }} />
                  </div>
                </>
              ) : null}
            </div>
            <label>
              Transcript JSON
              <input type="file" accept="application/json" disabled={setupLocked} onChange={(e) => void onTranscriptFile(e.target.files?.[0] ?? null)} />
            </label>
            <label>
              Transcription language
              <select value={transcriptionLanguage} disabled={setupLocked} onChange={(e) => onTranscriptionLanguageChange(e.target.value as SupportedLanguage)}>
                {supportedLanguages.map((language) => (
                  <option key={language} value={language}>{language}</option>
                ))}
              </select>
              <button type="button" onClick={() => void onGenerateTranscriptFromAudio()} disabled={!canGenerateTranscript || transcribing || setupLocked}>
                {transcribing ? 'Generating transcription...' : 'Get transcription'}
              </button>
            </label>
            <label>
              Difficulty
              <select value={difficulty} disabled={setupLocked} onChange={(e) => onDifficultyChange(e.target.value as Difficulty)}>
                <option value="easy">easy</option>
                <option value="normal">normal</option>
                <option value="hard">hard</option>
              </select>
            </label>
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
                  ? 'This input setup is locked for this session.'
                  : 'Lock after audio and transcript are ready.'}
              </p>
            </div>
          </div>
          {audioReadyMessage ? <p className="success">{audioReadyMessage}</p> : null}
          {transcriptReadyMessage ? <p className="success">{transcriptReadyMessage}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </>
      ) : null}
    </section>
  );
}
