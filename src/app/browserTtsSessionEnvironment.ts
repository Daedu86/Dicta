import type { BrowserTtsEnvironmentFingerprint } from '../types/dictation';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';
import { collectBrowserTtsEnvironmentFingerprint } from '../inputs/browserTts/browserTtsEnvironment';
import { sameBrowserTtsEnvironment } from '../inputs/browserTts/browserTtsEnvironmentComparison';
import {
  chooseDiverseBrowserTtsVoiceURIForSession,
  resolveBrowserTtsSessionVoice,
  type BrowserTtsVoiceLike,
} from '../inputs/browserTts/browserTtsVoices';
import type { StoredSession } from './sessionTypes';
import {
  collectUsedBrowserTtsVoiceURIs,
  findBrowserTtsVoiceByURI,
  shouldAssignMissingBrowserTtsVoiceEnvironment,
} from './browserTtsSessionEnvironmentAssignment';
import type {
  AssignMissingBrowserTtsVoiceEnvironmentsOptions,
  AttachBrowserTtsSessionEnvironmentOptions,
  CollectBrowserTtsSessionEnvironmentOptions,
  ResolveBrowserTtsVoiceForSessionOptions,
  ResolveBrowserTtsVoiceSessionUpdateOptions,
} from './browserTtsSessionEnvironmentTypes';

export type {
  AssignMissingBrowserTtsVoiceEnvironmentsOptions,
  AttachBrowserTtsSessionEnvironmentOptions,
  BrowserTtsEnvironmentRuntimeOptions,
  CollectBrowserTtsSessionEnvironmentOptions,
  ResolveBrowserTtsVoiceForSessionOptions,
  ResolveBrowserTtsVoiceSessionUpdateOptions,
} from './browserTtsSessionEnvironmentTypes';

export function collectBrowserTtsEnvironmentForSession<TVoice extends BrowserTtsVoiceLike>({
  session,
  selectedVoice = null,
  selectedVoiceURI,
  browserTtsVoices,
  navigatorRef,
  matchMedia,
}: CollectBrowserTtsSessionEnvironmentOptions<TVoice>): BrowserTtsEnvironmentFingerprint | null {
  if (!session || session.inputMode !== BROWSER_TTS_SESSION_INPUT_MODE) return null;

  return collectBrowserTtsEnvironmentFingerprint({
    inputMode: 'browser-tts',
    language: session.ttsLanguage,
    selectedVoice,
    selectedVoiceURI: selectedVoice?.voiceURI ?? selectedVoiceURI ?? session.ttsVoiceURI ?? null,
    voices: browserTtsVoices,
    navigatorRef,
    matchMedia,
  });
}

export function attachBrowserTtsEnvironment<TVoice extends BrowserTtsVoiceLike>({
  session,
  selectedVoice = null,
  selectedVoiceURI,
  browserTtsVoices,
  navigatorRef,
  matchMedia,
}: AttachBrowserTtsSessionEnvironmentOptions<TVoice>): StoredSession {
  if (session.inputMode !== BROWSER_TTS_SESSION_INPUT_MODE) return session;

  const ttsEnvironment = collectBrowserTtsEnvironmentForSession({
    session,
    selectedVoice,
    selectedVoiceURI,
    browserTtsVoices,
    navigatorRef,
    matchMedia,
  });

  if (sameBrowserTtsEnvironment(session.ttsEnvironment, ttsEnvironment)) return session;

  return { ...session, ttsEnvironment };
}

export function assignMissingBrowserTtsVoiceEnvironments<TVoice extends BrowserTtsVoiceLike>({
  sessions,
  browserTtsVoices,
  navigatorRef,
  matchMedia,
  random,
}: AssignMissingBrowserTtsVoiceEnvironmentsOptions<TVoice>): StoredSession[] {
  if (browserTtsVoices.length === 0) return sessions as StoredSession[];

  let changed = false;
  const usedVoiceURIs = collectUsedBrowserTtsVoiceURIs(sessions);
  const next = sessions.map((session) => {
    if (!shouldAssignMissingBrowserTtsVoiceEnvironment(session)) return session;

    const ttsVoiceURI = chooseDiverseBrowserTtsVoiceURIForSession(
      session.inputMode,
      browserTtsVoices,
      session.ttsLanguage,
      usedVoiceURIs,
      random,
    );

    if (!ttsVoiceURI) return session;

    usedVoiceURIs.push(ttsVoiceURI);
    changed = true;

    return attachBrowserTtsEnvironment({
      session: { ...session, ttsVoiceURI },
      selectedVoice: findBrowserTtsVoiceByURI(browserTtsVoices, ttsVoiceURI),
      selectedVoiceURI: ttsVoiceURI,
      browserTtsVoices,
      navigatorRef,
      matchMedia,
    });
  });

  return changed ? next : sessions as StoredSession[];
}

export function resolveBrowserTtsVoiceForSession<TVoice extends BrowserTtsVoiceLike>({
  session,
  browserTtsVoices,
  language,
  random,
}: ResolveBrowserTtsVoiceForSessionOptions<TVoice>) {
  if (!session || session.inputMode !== BROWSER_TTS_SESSION_INPUT_MODE) {
    return { voice: null, voiceURI: null, usedFallback: false };
  }

  return resolveBrowserTtsSessionVoice(browserTtsVoices, language, session.ttsVoiceURI, random);
}

export function resolveBrowserTtsVoiceSessionUpdate<TVoice extends BrowserTtsVoiceLike>({
  session,
  browserTtsVoices,
  language,
  navigatorRef,
  matchMedia,
  nowIso = () => new Date().toISOString(),
  random,
}: ResolveBrowserTtsVoiceSessionUpdateOptions<TVoice>) {
  const resolution = resolveBrowserTtsVoiceForSession({
    session,
    browserTtsVoices,
    language,
    random,
  });

  const nextVoiceURI = resolution.voiceURI ?? session.ttsVoiceURI ?? null;
  const nextEnvironment = collectBrowserTtsEnvironmentForSession({
    session,
    selectedVoice: resolution.voice,
    selectedVoiceURI: nextVoiceURI,
    browserTtsVoices,
    navigatorRef,
    matchMedia,
  });

  const changed =
    nextVoiceURI !== session.ttsVoiceURI ||
    !sameBrowserTtsEnvironment(session.ttsEnvironment, nextEnvironment);

  return {
    ...resolution,
    changed,
    ttsEnvironment: nextEnvironment,
    nextSession: changed
      ? {
          ...session,
          ttsVoiceURI: nextVoiceURI,
          ttsEnvironment: nextEnvironment,
          updatedAt: nowIso(),
        }
      : session,
  };
}
