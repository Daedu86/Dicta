export type TrainingSubmitCardProps = {
  canSubmit: boolean;
  submitLabel: string;
  onSubmit: () => void;
  message: string;
  messageTone?: 'error' | 'success' | 'hint';
};

export function TrainingSubmitCard({
  canSubmit,
  submitLabel,
  onSubmit,
  message,
  messageTone,
}: TrainingSubmitCardProps) {
  return (
    <section className="training-card training-submit-card">
      <button type="button" className="training-submit-button" onClick={onSubmit} disabled={!canSubmit}>
        {submitLabel}
      </button>
      {message ? <p className={messageTone ?? (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed') ? 'error' : 'hint')}>{message}</p> : null}
    </section>
  );
}
