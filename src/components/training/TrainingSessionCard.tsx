export type TrainingSessionSubmissionMeta = {
  positionLabel: string;
  scoreLabel: string;
  scoreHelpText: string;
  accuracyLabel: string;
  pointsLabel: string;
  pointsHelpText: string;
  durationLabel: string;
  submittedAtLabel: string;
};

export type TrainingSessionCardProps = {
  activeInputLabel: string;
  sessionTitle: string;
  submissionMeta: TrainingSessionSubmissionMeta | null;
  activeDifficultyLabel: string;
  sourceLabel: string;
  sessionStatusLabel: string;
};

export function TrainingSessionCard({
  activeInputLabel,
  sessionTitle,
  submissionMeta,
  activeDifficultyLabel,
  sourceLabel,
  sessionStatusLabel,
}: TrainingSessionCardProps) {
  return (
    <section className="training-card training-session-card">
      <p className="training-eyebrow">{activeInputLabel}</p>
      <h2>{sessionTitle}</h2>
      {submissionMeta ? (
        <div className="training-session-submission-meta" aria-label="Submitted session metadata">
          <span>Position {submissionMeta.positionLabel}</span>
          <span>Difficulty {activeDifficultyLabel}</span>
          <span
            title={submissionMeta.scoreHelpText}
            aria-label={`Score ${submissionMeta.scoreLabel}. ${submissionMeta.scoreHelpText}`}
          >
            Score {submissionMeta.scoreLabel}
          </span>
          <span>Accuracy {submissionMeta.accuracyLabel}</span>
          <span
            title={submissionMeta.pointsHelpText}
            aria-label={`Points ${submissionMeta.pointsLabel}. ${submissionMeta.pointsHelpText}`}
          >
            Points {submissionMeta.pointsLabel}
          </span>
          <span>Duration {submissionMeta.durationLabel}</span>
          <span>Submitted {submissionMeta.submittedAtLabel}</span>
        </div>
      ) : null}
      <div className="training-session-meta" aria-label="Current session info">
        <span>{sourceLabel}</span>
        {!submissionMeta ? <span>Difficulty {activeDifficultyLabel}</span> : null}
        <span>{sessionStatusLabel}</span>
      </div>
    </section>
  );
}
