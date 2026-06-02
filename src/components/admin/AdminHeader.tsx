import type { DictaAppProfile } from '../../core/appProfiles';
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '../../core/languages';
import type { MetricsLanguageView } from '../../core/liveMetrics';

type AdminHeaderProps = {
  appProfile: DictaAppProfile | null;
  languageView: MetricsLanguageView;
  onChangeLanguage: (value: MetricsLanguageView) => void;
  onBackToTraining: () => void;
};

export function AdminHeader({
  appProfile,
  languageView,
  onChangeLanguage,
  onBackToTraining,
}: AdminHeaderProps) {
  return (
    <div className="tts-workspace-header">
      <div>
        <p className="dashboard-eyebrow">Storage control</p>
        <h2>Admin</h2>
        <p className="dashboard-meta">Read-only project storage, session, transcript, and telemetry overview.</p>
        {appProfile ? (
          <p className="dashboard-meta">
            Signed in as {appProfile.displayName} · {appProfile.role} · profile {appProfile.profileId}
          </p>
        ) : null}
        <div className="live-metrics-language-tabs admin-language-tabs" role="tablist" aria-label="Admin language">
          {SUPPORTED_LANGUAGES.map((code) => (
            <button
              key={code}
              type="button"
              className={`live-metrics-language-tab ${languageView === code ? 'live-metrics-language-tab-active' : ''}`}
              onClick={() => onChangeLanguage(code)}
              aria-pressed={languageView === code}
              title={`Admin view for ${LANGUAGE_LABELS[code]} sessions`}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="dashboard-header-actions">
        <button type="button" className="secondary-button" onClick={onBackToTraining}>
          Back to training
        </button>
      </div>
    </div>
  );
}
