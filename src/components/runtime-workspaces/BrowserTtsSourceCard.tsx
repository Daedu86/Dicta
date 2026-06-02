import type { CSSProperties } from 'react';
import type { Transcript, TtsPacingMode } from '../../types/dictation';
import type { SupportedLanguage } from '../../core/languages';

type TtsStatus = 'idle' | 'ready' | 'playing' | 'paused' | 'finished';

type BrowserTtsSourceCardProps = {
  ttsStatus: TtsStatus;
  ttsHasText: boolean;
  ttsText: string;
  ttsTranscript: Transcript | null;
  ttsLanguage: SupportedLanguage | null;
  ttsPacingMode: TtsPacingMode;
  ttsPlayerCurrentSec: number;
  ttsPlayerDurationSec: number;
  ttsPlayerProgressPercent: number;
  onPlayTts: () => void;
  onResumeTts: () => void;
  onPauseTts: () => void;
  onStopTts: () => void;
  onSeekTtsPlayback: (percent: number) => void;
  formatDuration: (seconds: number) => string;
  formatTtsPacingMode: (mode: TtsPacingMode) => string;
};

export function BrowserTtsSourceCard({
  ttsStatus,
  ttsHasText,
  ttsText,
  ttsTranscript,
  ttsLanguage,
  ttsPacingMode,
  ttsPlayerCurrentSec,
  ttsPlayerDurationSec,
  ttsPlayerProgressPercent,
  onPlayTts,
  onResumeTts,
  onPauseTts,
  onStopTts,
  onSeekTtsPlayback,
  formatDuration,
  formatTtsPacingMode,
}: BrowserTtsSourceCardProps) {
  return (
    <section className="panel workspace-panel tts-source-panel">
      <h3>TTS source</h3>
      <div className="source-media-player">
        <span className="bottom-metrics-player-label">Media player</span>
        <div className="tts-media-controls" role="group" aria-label="Browser TTS media controls">
          <button
            type="button"
            className="tts-media-icon-button"
            onClick={ttsStatus === 'paused' ? onResumeTts : onPlayTts}
            disabled={!ttsHasText || ttsStatus === 'playing'}
            aria-label={ttsStatus === 'paused' ? 'Resume TTS' : 'Play TTS'}
            title={ttsStatus === 'paused' ? 'Resume TTS' : 'Play TTS'}
          >
            ▶
          </button>
          <span className="tts-media-time">
            {formatDuration(ttsPlayerCurrentSec)} / {formatDuration(ttsPlayerDurationSec)}
          </span>
          <input
            className="tts-media-seek"
            type="range"
            min="0"
            max="100"
            step="1"
            value={Math.round(ttsPlayerProgressPercent)}
            onChange={(event) => onSeekTtsPlayback(Number(event.currentTarget.value) / 100)}
            disabled={!ttsHasText || ttsPlayerDurationSec === 0}
            aria-label="Seek Browser TTS playback"
            title="Seek Browser TTS playback"
            style={{ '--tts-progress': `${ttsPlayerProgressPercent}%` } as CSSProperties}
          />
          <button
            type="button"
            className="tts-media-icon-button"
            onClick={onPauseTts}
            disabled={ttsStatus !== 'playing'}
            aria-label="Pause TTS"
            title="Pause TTS"
          >
            ❚❚
          </button>
          <button
            type="button"
            className="tts-media-icon-button"
            onClick={onStopTts}
            disabled={ttsStatus === 'idle'}
            aria-label="Stop TTS"
            title="Stop TTS"
          >
            ■
          </button>
        </div>
        <p className="hint">
          Browser TTS does not expose an audio file, so these controls drive the speech engine directly.
        </p>
      </div>
      <div className={`tts-source-box ${ttsHasText ? 'tts-source-box-ready' : ''}`}>
        {ttsHasText ? ttsText : 'Paste text in the sidebar to load a source passage.'}
      </div>
      <div className="tts-source-meta">
        <span>{ttsHasText ? `${ttsTranscript?.words.length ?? 0} source words` : 'No source loaded'}</span>
        <span>{ttsLanguage}</span>
        <span>{formatTtsPacingMode(ttsPacingMode)}</span>
      </div>
    </section>
  );
}
