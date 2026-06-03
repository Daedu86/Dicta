import type { RefObject } from 'react';

type AudioTranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

type AudioSourceCardProps = {
  audioRef: RefObject<HTMLAudioElement | null>;
  audioUrl: string;
  transcriptSegments: AudioTranscriptSegment[];
  activeTranscriptSegmentIndex: number;
  onTimeUpdate: () => void;
  onEnded: () => void;
  formatTimestamp: (seconds: number) => string;
};

export function AudioSourceCard({
  audioRef,
  audioUrl,
  transcriptSegments,
  activeTranscriptSegmentIndex,
  onTimeUpdate,
  onEnded,
  formatTimestamp,
}: AudioSourceCardProps) {
  return (
    <section className="panel workspace-panel tts-source-panel tall-panel">
      <h2>Audio source</h2>
      <div className="source-media-player">
        <span className="bottom-metrics-player-label">Media player</span>
        <audio
          ref={audioRef}
          controls
          src={audioUrl}
          className="audio"
          onTimeUpdate={onTimeUpdate}
          onEnded={onEnded}
        />
      </div>
      <h3>Whisper transcript</h3>
      <div className="transcript-preview long transcript-segment-list">
        {transcriptSegments.length > 0 ? (
          transcriptSegments.map((segment, index) => (
            <article
              key={`${segment.start}-${segment.end}`}
              className={`transcript-segment ${index === activeTranscriptSegmentIndex ? 'transcript-segment-active' : ''}`}
            >
              <span className="transcript-segment-time">{formatTimestamp(segment.start)}</span>
              <p>{segment.text}</p>
            </article>
          ))
        ) : (
          <p>No transcript yet.</p>
        )}
      </div>
    </section>
  );
}
