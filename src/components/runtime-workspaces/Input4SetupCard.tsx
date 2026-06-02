import type { SupportedLanguage } from '../../core/languages';
import type { TtsPacingMode } from '../../types/dictation';

type TtsStatus = 'idle' | 'ready' | 'playing' | 'paused' | 'finished';

type QwenCloudFallbackDetails = {
  phraseId: string;
  path: string;
};

type Input4SetupCardProps = {
  activeInputLabel: string;
  activeInputFeatureLabel: string;
  qwenExpanded: boolean;
  ttsHasText: boolean;
  ttsText: string;
  ttsLanguage: SupportedLanguage;
  ttsStatus: TtsStatus;
  ttsSpeechRate: number;
  ttsPacingMode: TtsPacingMode;
  ttsCurrentChunk: string | null;
  supportedLanguages: readonly SupportedLanguage[];
  setupLocked: boolean;
  inputSettingsReady: boolean;
  localDevFeaturesAvailable: boolean;
  cosyVoiceCacheReady: boolean | null;
  cosyVoiceCacheConfigured: boolean | null;
  cosyVoiceCacheRuntime: Record<string, unknown> | null;
  cosyVoiceCacheGenerating: boolean;
  cosyVoiceCacheMessage: string;
  qwenCloudManifestMessage: string;
  qwenCloudFallbackDetails: QwenCloudFallbackDetails | null;
  onToggleExpanded: () => void;
  onTtsTextChange: (value: string) => void;
  onTtsLanguageChange: (language: SupportedLanguage) => void;
  onBootstrapCosyVoiceSidecar: () => void;
  onEnsureCosyVoiceCacheSidecar: () => void;
  onGenerateCosyVoiceCacheFromCurrentText: () => void;
  onCopyQwenCloudCacheManifest: () => void;
  onDownloadQwenCloudCacheManifest: () => void;
  onLockInputSettings: () => void;
  onFallbackToBrowserTtsFromQwen: () => void;
  formatTtsPacingMode: (mode: TtsPacingMode) => string;
};

export function Input4SetupCard({
  activeInputLabel,
  activeInputFeatureLabel,
  qwenExpanded,
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
  localDevFeaturesAvailable,
  cosyVoiceCacheReady,
  cosyVoiceCacheConfigured,
  cosyVoiceCacheRuntime,
  cosyVoiceCacheGenerating,
  cosyVoiceCacheMessage,
  qwenCloudManifestMessage,
  qwenCloudFallbackDetails,
  onToggleExpanded,
  onTtsTextChange,
  onTtsLanguageChange,
  onBootstrapCosyVoiceSidecar,
  onEnsureCosyVoiceCacheSidecar,
  onGenerateCosyVoiceCacheFromCurrentText,
  onCopyQwenCloudCacheManifest,
  onDownloadQwenCloudCacheManifest,
  onLockInputSettings,
  onFallbackToBrowserTtsFromQwen,
  formatTtsPacingMode,
}: Input4SetupCardProps) {
  return (
    <section className="sidebar-section sidebar-section-border">
      <button
        type="button"
        className="sidebar-section-heading sidebar-section-toggle"
        onClick={onToggleExpanded}
        aria-expanded={qwenExpanded}
      >
        <span className="sidebar-input-heading">
          <span>{activeInputLabel}</span>
          {activeInputFeatureLabel ? <span className="sidebar-input-feature">{activeInputFeatureLabel}</span> : null}
        </span>
        <span className="sidebar-section-meta">
          <span className={`tts-paste-pill ${ttsHasText ? 'tts-paste-pill-ready' : 'tts-paste-pill-empty'}`}>
            {ttsHasText ? 'Pasted' : 'Paste text'}
          </span>
          <span className={`sidebar-chevron ${qwenExpanded ? 'sidebar-chevron-open' : ''}`}>⌃</span>
        </span>
      </button>
      {qwenExpanded ? (
        <div className="sidebar-card tts-card">
          <label>
            CosyVoice2 text
            <textarea
              value={ttsText}
              onChange={(e) => onTtsTextChange(e.target.value)}
              placeholder="Paste text here to play cached CosyVoice2 audio..."
              rows={9}
              readOnly={setupLocked}
              disabled={setupLocked}
            />
          </label>
          <label>
            CosyVoice2 language
            <select value={ttsLanguage} disabled={setupLocked} onChange={(e) => onTtsLanguageChange(e.target.value as SupportedLanguage)}>
              {supportedLanguages.map((language) => (
                <option key={language} value={language}>{language}</option>
              ))}
            </select>
          </label>
          <div className={`tts-visor ${ttsHasText ? 'tts-visor-ready' : ''}`} aria-live="polite">
            {ttsHasText ? 'Text pasted. Ready for cached audio playback.' : 'Waiting for pasted text.'}
          </div>

          <div className="tts-source-actions input4-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onBootstrapCosyVoiceSidecar}
              disabled={!localDevFeaturesAvailable}
              title={localDevFeaturesAvailable ? 'Bootstrap the local CosyVoice2 generator.' : 'Local-only in the Vercel build.'}
            >
              1. Bootstrap CosyVoice2
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onEnsureCosyVoiceCacheSidecar}
              disabled={!localDevFeaturesAvailable}
              title={localDevFeaturesAvailable ? 'Start the local CosyVoice2 generator.' : 'Local-only in the Vercel build.'}
            >
              2. Start CosyVoice2 generator
            </button>
          </div>
          {!localDevFeaturesAvailable ? (
            <p className="hint">CosyVoice2 cache generation is local-only. The Vercel build keeps Input #4 disabled to stay free-tier friendly.</p>
          ) : null}
          <div className="kokoro-toggle-row">
            <span
              className={`kokoro-toggle-status ${
                cosyVoiceCacheReady ? 'kokoro-on' : cosyVoiceCacheReady === false ? 'kokoro-off' : ''
              }`}
            >
              <span className="kokoro-toggle-dot" />
              {cosyVoiceCacheReady
                ? cosyVoiceCacheConfigured
                  ? 'Ready'
                  : 'Running (needs model)'
                : cosyVoiceCacheReady === false
                  ? 'Error'
                  : 'Not started'}
            </span>
          </div>
          {cosyVoiceCacheRuntime && cosyVoiceCacheConfigured === false ? (
            <details className="hint">
              <summary>Why “needs model”?</summary>
              <pre className="mono">{JSON.stringify(cosyVoiceCacheRuntime, null, 2)}</pre>
            </details>
          ) : null}
          <div className="tts-source-actions input4-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onGenerateCosyVoiceCacheFromCurrentText}
              disabled={!localDevFeaturesAvailable || !ttsHasText || cosyVoiceCacheGenerating}
            >
              {cosyVoiceCacheGenerating ? 'Generating cache…' : '3. Generate cache WAVs'}
            </button>
          </div>
          {cosyVoiceCacheMessage ? <p className="hint">{cosyVoiceCacheMessage}</p> : null}

          <details className="hint">
            <summary>Optional (Colab): export manifest</summary>
            <div className="tts-source-actions input4-actions">
              <button type="button" className="secondary-button" onClick={onCopyQwenCloudCacheManifest} disabled={!ttsHasText}>
                Copy Cache Manifest JSON
              </button>
              <button type="button" className="secondary-button" onClick={onDownloadQwenCloudCacheManifest} disabled={!ttsHasText}>
                Export Cache Manifest JSON
              </button>
            </div>
            {qwenCloudManifestMessage ? <p className="hint">{qwenCloudManifestMessage}</p> : null}
          </details>

          <div className="input-lock-box">
            <button
              type="button"
              className="secondary-button"
              onClick={onLockInputSettings}
              disabled={!localDevFeaturesAvailable || setupLocked || !inputSettingsReady}
            >
              {setupLocked ? '4. Input settings locked' : '4. Submit and lock input settings'}
            </button>
            <p className="hint">
              {setupLocked
                ? 'This Input #4 source and language are locked for this session.'
                : 'Lock after cache generation if you want to freeze this setup for the session.'}
            </p>
          </div>
          {qwenCloudFallbackDetails ? (
            <div className="sidebar-card">
              <p className="error">Missing cached audio for phrase {qwenCloudFallbackDetails.phraseId}.</p>
              <p className="hint">Expected path: {qwenCloudFallbackDetails.path}</p>
              <p className="hint">
                Use “Copy Cache Manifest JSON” and run the CosyVoice2 Colab to generate WAV files into{' '}
                <span className="mono">public/tts-cache/cosyvoice/...</span>.
              </p>
              <button type="button" className="secondary-button" onClick={onFallbackToBrowserTtsFromQwen}>
                Fallback to browser TTS
              </button>
            </div>
          ) : null}
          <div className="tts-runtime">
            <span>Status: {ttsStatus}</span>
            <span>Rate: {ttsSpeechRate.toFixed(2)}x</span>
            <span>Language: {ttsLanguage}</span>
            <span>Pacing: {formatTtsPacingMode(ttsPacingMode)}</span>
          </div>
          {ttsCurrentChunk ? <p className="tts-current-chunk">{ttsCurrentChunk}</p> : null}
            <p className="hint">
              {'Uses cached CosyVoice2 phrase audio from /public/tts-cache/cosyvoice/{language}/{phraseId}.wav. Playback is driven by adaptive pacing and phrase-level chunks.'}
            </p>
        </div>
      ) : null}
    </section>
  );
}
