export type TrainingAudioCardProps = {
  statusLabel: string;
  canPlay: boolean;
  playLabel: string;
  onPlay: () => void;
  canPause: boolean;
  onPause: () => void;
  canReplay: boolean;
  onReplay: () => void;
  canStop: boolean;
  onStop: () => void;
  canReset: boolean;
  onReset: () => void;
};

export function TrainingAudioCard({
  statusLabel,
  canPlay,
  playLabel,
  onPlay,
  canPause,
  onPause,
  canReplay,
  onReplay,
  canStop,
  onStop,
  canReset,
  onReset,
}: TrainingAudioCardProps) {
  return (
    <section className="training-card training-audio-card" aria-label="Media player and audio controls">
      <div className="training-audio-status">
        <span>Media player</span>
        <strong>{statusLabel}</strong>
      </div>
      <div className="training-control-grid">
        <button type="button" onClick={onPlay} disabled={!canPlay}>
          {playLabel}
        </button>
        <button type="button" className="secondary-button" onClick={onReplay} disabled={!canReplay}>
          Replay
        </button>
        <button type="button" className="secondary-button" onClick={onPause} disabled={!canPause}>
          Pause
        </button>
        <button type="button" className="secondary-button" onClick={onStop} disabled={!canStop}>
          Stop
        </button>
        <button
          type="button"
          className="secondary-button training-reset-button"
          onClick={onReset}
          disabled={!canReset}
          title="Clear this attempt and return playback to the beginning"
        >
          Reset
        </button>
      </div>
    </section>
  );
}
