type AdminManualInputSessionCardProps = {
  manualInput1Name: string;
  onChangeManualInput1Name: (value: string) => void;
  onSubmit: () => void;
};

export function AdminManualInputSessionCard({
  manualInput1Name,
  onChangeManualInput1Name,
  onSubmit,
}: AdminManualInputSessionCardProps) {
  return (
    <section className="dashboard-card admin-card">
      <div className="admin-card-header">
        <div>
          <h3>Manual Input #1 session</h3>
          <p>Create an original-audio dictation session. OpenRouter generation stays in Training/OpenRouter.</p>
        </div>
      </div>
      <label>
        Session name
        <input
          value={manualInput1Name}
          onChange={(event) => onChangeManualInput1Name(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Original audio practice"
        />
      </label>
      <div className="admin-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={onSubmit}
          disabled={manualInput1Name.trim().length === 0}
        >
          Create Input #1 session
        </button>
      </div>
      <p className="hint">After creation, load the audio/transcript in the training workspace.</p>
    </section>
  );
}
