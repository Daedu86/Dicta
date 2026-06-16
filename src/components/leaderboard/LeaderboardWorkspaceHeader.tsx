import type { LeaderboardLanguageCode } from './leaderboardWorkspaceTypes';

type LeaderboardWorkspaceHeaderProps = {
  sessionCount: number;
  leaderboardLanguageView: LeaderboardLanguageCode;
  leaderboardExpanded: boolean;
  supportedLanguages: readonly LeaderboardLanguageCode[];
  languageLabels: Record<LeaderboardLanguageCode, string>;
  onChangeLeaderboardLanguageView: (code: LeaderboardLanguageCode) => void;
  onToggleLeaderboardExpanded: () => void;
  onBackToTraining: () => void;
};

export function LeaderboardWorkspaceHeader({
  sessionCount,
  leaderboardLanguageView,
  leaderboardExpanded,
  supportedLanguages,
  languageLabels,
  onChangeLeaderboardLanguageView,
  onToggleLeaderboardExpanded,
  onBackToTraining,
}: LeaderboardWorkspaceHeaderProps) {
  return (
    <div className="metrics-header">
      <div>
        <h2>Leaderboard</h2>
        <p className="dashboard-meta">
          {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'} for {leaderboardLanguageView.toUpperCase()}.
        </p>
      </div>
      <div className="live-metrics-language-tabs leaderboard-language-tabs" role="tablist" aria-label="Leaderboard language">
        {supportedLanguages.map((code) => (
          <button
            key={code}
            type="button"
            className={`live-metrics-language-tab ${leaderboardLanguageView === code ? 'live-metrics-language-tab-active' : ''}`}
            onClick={() => onChangeLeaderboardLanguageView(code)}
            aria-pressed={leaderboardLanguageView === code}
            title={`Leaderboard for ${languageLabels[code]}`}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="secondary-button leaderboard-collapse-button"
        onClick={onToggleLeaderboardExpanded}
        aria-expanded={leaderboardExpanded}
        aria-label={leaderboardExpanded ? 'Minimize leaderboard' : 'Expand leaderboard'}
        title={leaderboardExpanded ? 'Minimize' : 'Expand'}
      >
        <span className={`leaderboard-collapse-icon ${leaderboardExpanded ? 'leaderboard-collapse-icon-open' : ''}`} aria-hidden="true">
          ⌃
        </span>
      </button>
      <button type="button" className="secondary-button" onClick={onBackToTraining}>
        Back
      </button>
    </div>
  );
}
