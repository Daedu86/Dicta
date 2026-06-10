export type ThemeMode = 'light' | 'dark';

const THEME_MODE_KEY = 'dicta.themeMode.v1';

export function loadThemeMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const saved = window.localStorage.getItem(THEME_MODE_KEY);
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function persistThemeMode(themeMode: ThemeMode): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(THEME_MODE_KEY, themeMode);
}
