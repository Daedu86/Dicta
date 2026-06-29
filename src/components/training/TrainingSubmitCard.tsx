export type TrainingSubmitCardProps = {
  canSubmit: boolean;
  submitLabel: string;
  onSubmit: () => void;
  message: string;
  messageTone?: 'error' | 'success' | 'hint';
  showAction?: boolean;
};

export function TrainingSubmitCard({
  canSubmit,
  submitLabel,
  onSubmit,
  message,
  messageTone,
  showAction = true,
}: TrainingSubmitCardProps) {
  if (!showAction && !message) return null;
  return (
    <section className="training-card training-submit-card">
      {showAction ? (
        <button type="button" className="training-submit-button" onClick={onSubmit} disabled={!canSubmit}>
          {submitLabel}
        </button>
      ) : null}
      {message ? <p className={messageTone ?? (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed') ? 'error' : 'hint')}>{message}</p> : null}
    </section>
  );
}
