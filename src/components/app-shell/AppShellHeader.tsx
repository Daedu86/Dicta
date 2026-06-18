import type { DictaAppProfile } from '../../core/appProfiles';
import type { ReactNode } from 'react';
import { useAppUpdateAvailable } from '../../app/useAppUpdateAvailable';

type ThemeMode = 'light' | 'dark';

export type AppShellHeaderProps = {
  themeMode: ThemeMode;
  showOpenRouterStatus: boolean;
  openRouterModelIsSet: boolean;
  openRouterModelTitle: string;
  buildInfoTitle: string;
  buildInfoLabel: string;
  showAdminButton: boolean;
  showAdaptiveButton: boolean;
  showOpenRouterButton: boolean;
  syncStatusState: string;
  syncStatusText: string;
  appProfile: DictaAppProfile | null;
  sessionQuotaLimit: number | null;
  sessionQuotaUsed: number;
  sessionQuotaBlocked: boolean;
  children?: ReactNode;
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
  buildInfoTitle,
  buildInfoLabel,
  showAdminButton,
  showAdaptiveButton,
  showOpenRouterButton,
  syncStatusState,
  syncStatusText,
  appProfile,
  sessionQuotaLimit,
  sessionQuotaUsed,
  sessionQuotaBlocked,
  children,
  onOpenMobileTraining,
  onOpenAdaptive,
  onOpenAdmin,
  onOpenOpenRouter,
  onToggleTheme,
  onSignOut,
}: AppShellHeaderProps) {
  const hasAppUpdate = useAppUpdateAvailable();
  const buildMarkTitle = buildInfoLabel.replace(/^.*commit: /, '') || buildInfoTitle;

  return (
    <section className="panel brand-block brand-header-panel workspace-main-header">
      <div className="brand-header-main">
        <div className="brand-mark" title={buildMarkTitle}>
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
          {sessionQuotaLimit !== null ? (
            <p className={`brand-profile-meta ${sessionQuotaBlocked ? 'brand-profile-meta-blocked' : ''}`}>
              Sessions used {sessionQuotaUsed}/{sessionQuotaLimit}
              {sessionQuotaBlocked ? ' · contact admin' : ''}
            </p>
          ) : null}
        </div>
      </div>
      <div className={`brand-header-actions ${hasAppUpdate ? 'brand-header-actions-has-update' : ''}`}>
        <button
          type="button"
          className="secondary-button brand-training-mode-button"
          onClick={onOpenMobileTraining}
          title="Open the focused mobile training view"
        >
          Training Mode
        </button>
        {showAdaptiveButton ? (
          <button
            type="button"
            className="secondary-button brand-adaptive-button"
            onClick={onOpenAdaptive}
          >
            🧠 Adaptive Pace Layer
          </button>
        ) : null}
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
        {showOpenRouterStatus ? (
          <span
            className={`brand-llm-status ${openRouterModelIsSet ? 'brand-llm-status-set' : 'brand-llm-status-unset'}`}
            aria-label={openRouterModelTitle}
            title={openRouterModelTitle}
          >
            <span className="brand-llm-status-label">LLM</span>
            <span className="brand-llm-status-led" aria-hidden="true" />
          </span>
        ) : null}
        <span className={`brand-sync-status brand-sync-status-${syncStatusState}`}>
          {syncStatusText}
        </span>
        {hasAppUpdate ? (
          <button
            type="button"
            className="secondary-button brand-update-button"
            onClick={() => document.location.assign(document.location.href)}
            aria-label="Update Dicta app to the latest version"
            title="Update Dicta app to the latest version"
          >
            Update APP
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}
