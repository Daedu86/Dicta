import { perfDiagnostics } from '../core/perfDiagnostics';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';
import { buildTrainingSubmitMessage } from '../core/trainingSubmitMessage';
import { buildFinalizedTtsSessionState } from './ttsSessionFinalization';
import type {
  TtsSessionSubmitAction,
  TtsSessionSubmitActionOptions,
} from './ttsSessionSubmitActionTypes';

export function createTtsSessionSubmitAction({
  activeInputMode,
  ttsHasText,
  ttsPracticeText,
  ttsLanguage,
  sessions,
  activeSessionId,
  activeSession,
  applyTtsPerformanceSample,
  resolveBrowserTtsVoiceForSession,
  collectBrowserTtsEnvironmentForSession,
  persistAndPushSessionsNow,
  stopTtsPlayback,
  completeAdaptiveSessionFeedback,
  setTtsPracticeText,
  setSessions,
  setRunning,
  setSessionStatus,
  setTtsStatus,
  setError,
  setTrainingSubmitMessage,
  startPerfSpan = (name, context) => perfDiagnostics.startSpan(name, context),
  nowIso = () => new Date().toISOString(),
}: TtsSessionSubmitActionOptions): TtsSessionSubmitAction {
  return function submitTtsSession(latestPracticeText = ttsPracticeText): void {
    const endPerfSpan = startPerfSpan('tts.submit', { inputMode: activeInputMode });
    if (!ttsHasText || !latestPracticeText.trim()) {
      setError('Paste TTS text and type your attempt before submitting.');
      setTrainingSubmitMessage('');
      endPerfSpan();
      return;
    }

    try {
      if (latestPracticeText !== ttsPracticeText) {
        setTtsPracticeText(latestPracticeText);
      }
      const finalSample = applyTtsPerformanceSample({
        action: 'submit',
        finalize: true,
        practiceTextOverride: latestPracticeText,
      });
      const finishedAt = nowIso();
      const finalVoiceResolution = resolveFinalVoice({
        activeSession,
        ttsLanguage,
        resolveBrowserTtsVoiceForSession,
      });
      const finalVoiceURI = finalVoiceResolution?.voiceURI ?? activeSession?.ttsVoiceURI ?? null;
      const finalTtsEnvironment = collectBrowserTtsEnvironmentForSession(
        activeSession,
        finalVoiceResolution?.voice ?? null,
        finalVoiceURI,
      );
      const { nextSessions, finalizedSession } = buildFinalizedTtsSessionState({
        sessions,
        activeSessionId,
        activeSession,
        latestPracticeText,
        finalSample,
        finishedAt,
        finalVoiceURI,
        finalTtsEnvironment,
      });
      setSessions(nextSessions);
      persistAndPushSessionsNow(nextSessions, {
        criticalSessionIds: activeSessionId ? [activeSessionId] : [],
      });
      stopTtsPlayback();
      setRunning(false);
      setSessionStatus('finished');
      setTtsStatus('finished');
      completeAdaptiveSessionFeedback(finalizedSession);
      setError('');
      if (activeSessionId) {
        setTrainingSubmitMessage(buildTrainingSubmitMessage(nextSessions, activeSessionId));
      }
    } finally {
      endPerfSpan();
    }
  };
}

function resolveFinalVoice({
  activeSession,
  ttsLanguage,
  resolveBrowserTtsVoiceForSession,
}: Pick<
  TtsSessionSubmitActionOptions,
  'activeSession' | 'ttsLanguage' | 'resolveBrowserTtsVoiceForSession'
>) {
  if (activeSession?.inputMode !== BROWSER_TTS_SESSION_INPUT_MODE) return null;
  return resolveBrowserTtsVoiceForSession(activeSession, ttsLanguage);
}
