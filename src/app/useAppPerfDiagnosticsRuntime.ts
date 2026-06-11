import { useEffect, useRef, useState } from 'react';
import { perfDiagnostics } from '../core/perfDiagnostics';

export function useAppPerfDiagnosticsRuntime(): boolean {
  const appRenderCountRef = useRef(0);
  appRenderCountRef.current += 1;

  const [perfDiagnosticsEnabled, setPerfDiagnosticsEnabled] = useState(false);

  useEffect(() => {
    perfDiagnostics.recordRender('App', appRenderCountRef.current);
  });

  useEffect(() => {
    const enabled = perfDiagnostics.configure({
      envDev: import.meta.env.DEV,
      search: window.location.search,
      storage: window.localStorage,
    });
    setPerfDiagnosticsEnabled(enabled);
    return () => perfDiagnostics.dispose();
  }, []);

  return perfDiagnosticsEnabled;
}
