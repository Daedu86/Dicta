import { useCallback, useEffect, useState } from 'react';
import { perfDiagnostics } from '../core/perfDiagnostics';

export type BrowserTtsRuntime = {
  browserTtsVoices: SpeechSynthesisVoice[];
  isBrowserTtsSupported: () => boolean;
  speakBrowserTts: (utterance: SpeechSynthesisUtterance) => boolean;
  pauseBrowserTts: () => boolean;
  resumeBrowserTts: () => boolean;
  cancelBrowserTts: () => boolean;
};

function getBrowserTtsSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }
  return window.speechSynthesis;
}

export function useBrowserTtsRuntime(): BrowserTtsRuntime {
  const [browserTtsVoices, setBrowserTtsVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const speech = getBrowserTtsSpeechSynthesis();
    if (!speech) return;
    const refreshVoices = () => {
      const voices = speech.getVoices();
      setBrowserTtsVoices(voices);
      perfDiagnostics.recordTtsVoices(voices.map((voice) => ({
        lang: voice.lang,
        name: voice.name,
        voiceURI: voice.voiceURI,
        default: voice.default,
        localService: voice.localService,
      })));
    };
    refreshVoices();
    speech.addEventListener('voiceschanged', refreshVoices);
    return () => speech.removeEventListener('voiceschanged', refreshVoices);
  }, []);

  const isBrowserTtsSupported = useCallback((): boolean => Boolean(getBrowserTtsSpeechSynthesis()), []);

  const speakBrowserTts = useCallback((utterance: SpeechSynthesisUtterance): boolean => {
    const speech = getBrowserTtsSpeechSynthesis();
    if (!speech) return false;
    speech.speak(utterance);
    return true;
  }, []);

  const pauseBrowserTts = useCallback((): boolean => {
    const speech = getBrowserTtsSpeechSynthesis();
    if (!speech) return false;
    speech.pause();
    return true;
  }, []);

  const resumeBrowserTts = useCallback((): boolean => {
    const speech = getBrowserTtsSpeechSynthesis();
    if (!speech) return false;
    speech.resume();
    return true;
  }, []);

  const cancelBrowserTts = useCallback((): boolean => {
    const speech = getBrowserTtsSpeechSynthesis();
    if (!speech) return false;
    speech.cancel();
    return true;
  }, []);

  return {
    browserTtsVoices,
    isBrowserTtsSupported,
    speakBrowserTts,
    pauseBrowserTts,
    resumeBrowserTts,
    cancelBrowserTts,
  };
}
