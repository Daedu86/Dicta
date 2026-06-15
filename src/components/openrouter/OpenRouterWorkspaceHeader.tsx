export type OpenRouterWorkspaceHeaderProps = {
  onBackToTraining: () => void;
};

export function OpenRouterWorkspaceHeader({ onBackToTraining }: OpenRouterWorkspaceHeaderProps) {
  return (
    <div className="tts-workspace-header">
      <div>
        <p className="dashboard-eyebrow">Model gateway</p>
        <h2>OpenRouter</h2>
        <p className="dashboard-meta">
          Fetches models via a server API route so the OpenRouter key is not stored in the browser.
        </p>
      </div>
      <div className="dashboard-header-actions">
        <button type="button" className="secondary-button" onClick={onBackToTraining}>
          Back
        </button>
      </div>
    </div>
  );
}
