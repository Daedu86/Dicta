import { PerfDiagnosticsOverlay } from '../PerfDiagnosticsOverlay';
import { AuthWorkspaceBrandHeader } from './AuthWorkspaceBrandHeader';
import { AuthWorkspaceContent } from './AuthWorkspaceContent';
import type { AuthWorkspaceProps } from './AuthWorkspaceTypes';

export type { AuthWorkspaceProps } from './AuthWorkspaceTypes';

export function AuthWorkspace({
  themeMode,
  perfDiagnosticsEnabled,
  ...authWorkspaceContentProps
}: AuthWorkspaceProps) {
  return (
    <main className={`app auth-app ${themeMode === 'dark' ? 'app-theme-dark' : 'app-theme-light'}`}>
      <section className="auth-panel">
        <AuthWorkspaceBrandHeader />
        <AuthWorkspaceContent {...authWorkspaceContentProps} />
      </section>
      <PerfDiagnosticsOverlay enabled={perfDiagnosticsEnabled} />
    </main>
  );
}
