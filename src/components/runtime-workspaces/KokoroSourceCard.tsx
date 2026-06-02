import type { SupportedLanguage } from '../../core/languages';
import type { Transcript, TtsPacingMode } from '../../types/dictation';

type TtsStatus = 'idle' | 'ready' | 'playing' | 'paused' | 'finished';

type KokoroSourceChunk = {
  text: string;
  cached?: boolean;
  engine: string;
};

type KokoroSourceCardProps = {
  kokoroStatus: TtsStatus;
  kokoroHasText: boolean;
  kokoroText: string;
  kokoroTranscript: Transcript | null;
  kokoroLanguage: SupportedLanguage;
  kokoroPacingMode: TtsPacingMode;
  kokoroSpeechRate: number;
  kokoroVoice: string;
  kokoroPlayerCurrentSec: number;
  kokoroPlayerDurationSec: number;
  kokoroPlayerProgressPercent: number;
  kokoroPlayerCurrentWord: number;
  kokoroPlayerWordCount: number;
  kokoroLanguageWarning: string;
  kokoroCurrentChunk: KokoroSourceChunk | null;
  localDevFeaturesAvailable: boolean;
  kokoroEnabled: boolean;
  kokoroLanguageBlocked: boolean;
  onStartOrResumeKokoro: () => void;
  onPauseKokoro: () => void;
  onStopKokoro: () => void;
  formatDuration: (seconds: number) => string;
  formatTtsPacingMode: (mode: TtsPacingMode) => string;
};

export function KokoroSourceCard({
  kokoroStatus,
  kokoroHasText,
  kokoroText,
  kokoroTranscript,
  kokoroLanguage,
  kokoroPacingMode,
  kokoroSpeechRate,
  kokoroVoice,
  kokoroPlayerCurrentSec,
  kokoroPlayerDurationSec,
  kokoroPlayerProgressPercent,
  kokoroPlayerCurrentWord,
  kokoroPlayerWordCount,
  kokoroLanguageWarning,
  kokoroCurrentChunk,
  localDevFeaturesAvailable,
  kokoroEnabled,
  kokoroLanguageBlocked,
  onStartOrResumeKokoro,
  onPauseKokoro,
  onStopKokoro,
  formatDuration,
  formatTtsPacingMode,
}: KokoroSourceCardProps) {
  const primaryPlaybackLabel = kokoroStatus === 'paused' ? 'Resume Kokoro' : 'Start Kokoro';

  return (
    <section className="panel workspace-panel tts-source-panel kokoro-source-panel">
      <h3>Kokoro source</h3>
      <div className="source-media-player">
        <span className="bottom-metrics-player-label">Media player</span>
        <div className="tts-media-controls" role="group" aria-label="Kokoro media controls">
          <button
            type="button"
            className="tts-media-icon-button"
            onClick={onStartOrResumeKokoro}
            disabled={
              !localDevFeaturesAvailable ||
              !kokoroEnabled ||
              !kokoroHasText ||
              kokoroStatus === 'playing' ||
              kokoroLanguageBlocked
            }
            aria-label={primaryPlaybackLabel}
            title={primaryPlaybackLabel}
          >
            ▶
          </button>
          <span className="tts-media-time">
            {formatDuration(kokoroPlayerCurrentSec)} / {formatDuration(kokoroPlayerDurationSec)}
          </span>
          <div className="tts-media-progress" aria-hidden="true">
            <span style={{ width: `${kokoroPlayerProgressPercent}%` }} />
          </div>
          <button
            type="button"
            className="tts-media-icon-button"
            onClick={onPauseKokoro}
            disabled={!localDevFeaturesAvailable || !kokoroEnabled || kokoroStatus !== 'playing'}
            aria-label="Pause Kokoro"
            title="Pause Kokoro"
          >
            ❚❚
          </button>
          <button
            type="button"
            className="tts-media-icon-button"
            onClick={onStopKokoro}
            disabled={!localDevFeaturesAvailable || kokoroStatus === 'idle'}
            aria-label="Stop Kokoro"
            title="Stop Kokoro"
          >
            ■
          </button>
        </div>
        <p className="hint">
          Synced to the Kokoro source transcript: {kokoroPlayerCurrentWord}/{kokoroPlayerWordCount} words.
        </p>
      </div>
      <div className={`tts-source-box ${kokoroHasText ? 'tts-source-box-ready' : ''}`}>
        {kokoroHasText ? kokoroText : 'Paste text in the sidebar to load a Kokoro source passage.'}
      </div>
      <div className="tts-source-meta">
        <span>{kokoroHasText ? `${kokoroTranscript?.words.length ?? 0} source words` : 'No source loaded'}</span>
        <span>{kokoroLanguage}</span>
        <span>{formatTtsPacingMode(kokoroPacingMode)}</span>
      </div>
      {kokoroLanguageWarning ? <p className="error">{kokoroLanguageWarning}</p> : null}
      {kokoroCurrentChunk ? (
        <p className="tts-current-chunk">
          Current phrase: {kokoroCurrentChunk.text}
        </p>
      ) : null}
      <div className="tts-source-meta">
        <span>Rate {kokoroSpeechRate.toFixed(2)}x</span>
        <span>
          {kokoroCurrentChunk
            ? `${kokoroCurrentChunk.cached ? 'Cached' : 'Generated'} via ${kokoroCurrentChunk.engine}`
            : 'No phrase yet'}
        </span>
        <span>Voice {kokoroVoice || 'default'}</span>
      </div>
    </section>
  );
}
