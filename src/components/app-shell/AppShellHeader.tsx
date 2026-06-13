import type { DictaAppProfile } from '../../core/appProfiles';
import type { ReactNode } from 'react';

type ThemeMode = 'light' | 'dark';

export type AppShellHeaderProps = {
  themeMode: ThemeMode;
  showOpenRouterStatus: boolean;
  openRouterModelIsSet: boolean;
  openRouterModelTitle: string;
  openRouterModelLabel: string;
  buildInfoTitle: string;
  buildInfoLabel: string;
  showAdminButton: boolean;
  showOpenRouterButton: boolean;
  syncStatusState: string;
  syncStatusText: string;
  appProfile: DictaAppProfile | null;
  children?: ReactNode;
  onOpenLeaderboard: () => void;
  onOpenMobileTraining: () => void;
  onOpenAdaptive: () => void;
  onOpenAdmin: () => void;
  onOpenOpenRouter: () => void;
  onToggleTheme: () => void;
  onSignOut: () => void | Promise<void>;
};

export function AppShellHeader({
  themeMode,
  showOpenRouterStatus,
  openRouterModelIsSet,
  openRouterModelTitle,
  openRouterModelLabel,
  buildInfoTitle,
  buildInfoLabel,
  showAdminButton,
  showOpenRouterButton,
  syncStatusState,
  syncStatusText,
  appProfile,
  children,
  onOpenLeaderboard,
  onOpenMobileTraining,
  onOpenAdaptive,
  onOpenAdmin,
  onOpenOpenRouter,
  onToggleTheme,
  onSignOut,
}: AppShellHeaderProps) {
  return (
    <section className="panel brand-block brand-header-panel workspace-main-header">
      <div className="brand-header-main">
        <div className="brand-mark">
          <span className="brand-mark-icon" aria-hidden="true">🪗</span>
        </div>
        <div className="brand-copy">
          <h1>Dicta MVP</h1>
          <p>Adaptive real-time dictation training</p>
          {appProfile ? (
            <p className="brand-profile-meta">
              Signed in as {appProfile.displayName} · {appProfile.role}
            </p>
          ) : null}
          <div className="brand-status-row">
            {showOpenRouterStatus ? (
              <span
                className={`brand-llm-status ${openRouterModelIsSet ? 'brand-llm-status-set' : 'brand-llm-status-unset'}`}
                title={openRouterModelTitle}
              >
                <span className="brand-llm-status-icon" aria-hidden="true">LLM</span>
                <span className="brand-llm-status-text">{openRouterModelLabel}</span>
              </span>
            ) : null}
            <span className="brand-build-status" title={buildInfoTitle}>
              <span className="brand-build-status-icon" aria-hidden="true">Git</span>
              <span className="brand-build-status-text">{buildInfoLabel}</span>
            </span>
          </div>
        </div>
      </div>
      <div className="brand-header-actions">
        <button
          type="button"
          className="secondary-button brand-leaderboard-button"
          onClick={onOpenLeaderboard}
        >
          Leaderboard
        </button>
        <button
          type="button"
          className="secondary-button brand-training-mode-button"
          onClick={onOpenMobileTraining}
          title="Open the focused mobile training view"
        >
          Training Mode (Mobile ver)
        </button>
        <button
          type="button"
          className="secondary-button brand-adaptive-button"
          onClick={onOpenAdaptive}
        >
          🧠 Adaptive Pace Layer
        </button>
        {showAdminButton ? (
          <button
            type="button"
            className="secondary-button brand-admin-button"
            onClick={onOpenAdmin}
          >
            Admin
          </button>
        ) : null}
        {showOpenRouterButton ? (
          <button
            type="button"
            className="secondary-button brand-openrouter-button"
            onClick={onOpenOpenRouter}
            title="Configure OpenRouter API key and choose a default free model"
          >
            OpenRouter
          </button>
        ) : null}
        <button
          type="button"
          className="secondary-button theme-toggle-button"
          onClick={onToggleTheme}
          aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <button
          type="button"
          className="secondary-button brand-signout-button"
          onClick={() => void onSignOut()}
          title="Sign out and return to login"
        >
          Sign out
        </button>
        <span className={`brand-sync-status brand-sync-status-${syncStatusState}`}>
          {syncStatusText}
        </span>
      </div>
      {children}
    </section>
  );
}
