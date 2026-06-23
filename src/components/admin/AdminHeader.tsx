import type { DictaAppProfile } from '../../core/appProfiles';
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '../../core/languages';
import type { MetricsLanguageView } from '../../core/liveMetrics';

type AdminHeaderProps = {
  appProfile: DictaAppProfile | null;
  languageView: MetricsLanguageView;
  onChangeLanguage: (value: MetricsLanguageView) => void;
  onBackToTraining: () => void;
  activeSection: 'overview' | 'openrouter';
  onOpenOverview: () => void;
  onOpenOpenRouter: () => void;
};

export function AdminHeader({
  appProfile,
  languageView,
  onChangeLanguage,
  onBackToTraining,
  activeSection,
  onOpenOverview,
  onOpenOpenRouter,
}: AdminHeaderProps) {
  const isOpenRouterSection = activeSection === 'openrouter';

  return (
    <div className="tts-workspace-header">
      <div>
        <p className="dashboard-eyebrow">{isOpenRouterSection ? 'Admin / model gateway' : 'Admin console'}</p>
        <h2>Admin</h2>
        <p className="dashboard-meta">
          {isOpenRouterSection
            ? 'Configure OpenRouter keys, free models, and test prompts from the admin workspace.'
            : 'Manage users, member limits, browser storage, project files, and session diagnostics.'}
        </p>
        {appProfile ? (
          <p className="dashboard-meta">
            Signed in as {appProfile.displayName} · {appProfile.role} · profile {appProfile.profileId}
          </p>
        ) : null}
        <nav className="admin-section-tabs" aria-label="Admin sections">
          <button
            type="button"
            className={`admin-section-tab ${activeSection === 'overview' ? 'admin-section-tab-active' : ''}`}
            onClick={onOpenOverview}
            aria-pressed={activeSection === 'overview'}
          >
            Overview
          </button>
          <button
            type="button"
            className={`admin-section-tab ${isOpenRouterSection ? 'admin-section-tab-active' : ''}`}
            onClick={onOpenOpenRouter}
            aria-pressed={isOpenRouterSection}
          >
            OpenRouter
          </button>
        </nav>
        {isOpenRouterSection ? null : (
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
        )}
      </div>
      <div className="dashboard-header-actions">
        <button type="button" className="secondary-button" onClick={onBackToTraining}>
          Back to training
        </button>
      </div>
    </div>
  );
}
