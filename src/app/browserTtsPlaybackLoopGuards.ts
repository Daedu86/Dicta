export function resolveBrowserTtsPlaybackStartError({
  activeSessionFinished,
  ttsText,
  isBrowserTtsSupported,
}: {
  activeSessionFinished: boolean;
  ttsText: string;
  isBrowserTtsSupported: () => boolean;
}): string | null {
  if (activeSessionFinished) return 'Reset the finished session before playing TTS again.';
  if (!ttsText.trim()) return 'Paste TTS text before playing.';
  if (!isBrowserTtsSupported()) return 'This browser does not support speech synthesis.';
  return null;
}
