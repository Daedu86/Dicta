import { useEffect, useState } from 'react';
import { loadThemeMode, persistThemeMode, type ThemeMode } from './themeModeStorage';

export function useThemeModeRuntime() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());

  useEffect(() => {
    persistThemeMode(themeMode);
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  return {
    themeMode,
    setThemeMode,
  };
}
