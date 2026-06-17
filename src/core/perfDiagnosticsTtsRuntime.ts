import { PerfDiagnosticsState } from './perfDiagnosticsState';
import type { PerfTtsVoice } from './perfDiagnosticsTypes';
import {
  buildPerfTtsUtterance,
  recordPerfTtsEnd,
  recordPerfTtsError,
  recordPerfTtsSpeak,
  recordPerfTtsStart,
  type PerfTtsUtteranceArgs,
} from './perfDiagnosticsTtsEvents';
import { now } from './perfDiagnosticsUtils';

type PerfDiagnosticsLog = (event: string, payload: unknown) => void;

export function beginPerfDiagnosticsTtsPlay(
  enabled: boolean,
  state: PerfDiagnosticsState,
  source: string,
): number {
  if (!enabled) return 0;
  const id = state.nextTtsPlayIdentifier();
  state.setTtsPlay({ id, clickedAt: now(), source });
  return id;
}

export function beginPerfDiagnosticsTtsUtterance(
  enabled: boolean,
  state: PerfDiagnosticsState,
  args: PerfTtsUtteranceArgs,
): number {
  if (!enabled) return 0;
  const play = state.getTtsPlay(args.playId);
  const id = state.nextTtsUtteranceIdentifier();
  const utterance = buildPerfTtsUtterance(id, args, play?.clickedAt ?? now());
  state.addTtsUtterance(utterance);
  return id;
}

export function recordPerfDiagnosticsTtsVoices({
  state,
  enabled,
  voices,
  log,
}: {
  state: PerfDiagnosticsState;
  enabled: boolean;
  voices: PerfTtsVoice[];
  log: PerfDiagnosticsLog;
}): void {
  state.setTtsVoices(voices);
  if (!enabled) return;
  log('tts-voices', {
    count: voices.length,
    voices: voices.map((voice) => `${voice.lang} ${voice.name} (${voice.voiceURI})`),
  });
}

export function recordPerfDiagnosticsTtsSpeak(enabled: boolean, state: PerfDiagnosticsState, utteranceId: number): void {
  const utterance = state.getTtsUtterance(utteranceId);
  if (!enabled || !utterance) return;
  recordPerfTtsSpeak(utterance);
}

export function recordPerfDiagnosticsTtsStart(enabled: boolean, state: PerfDiagnosticsState, utteranceId: number): void {
  const utterance = state.getTtsUtterance(utteranceId);
  if (!enabled || !utterance) return;
  recordPerfTtsStart(utterance);
}

export function recordPerfDiagnosticsTtsEnd(enabled: boolean, state: PerfDiagnosticsState, utteranceId: number): void {
  const utterance = state.getTtsUtterance(utteranceId);
  if (!enabled || !utterance) return;
  recordPerfTtsEnd(utterance);
}

export function recordPerfDiagnosticsTtsError({
  enabled,
  state,
  utteranceId,
  error,
  log,
}: {
  enabled: boolean;
  state: PerfDiagnosticsState;
  utteranceId: number;
  error: string;
  log: PerfDiagnosticsLog;
}): void {
  const utterance = state.getTtsUtterance(utteranceId);
  if (!enabled || !utterance) return;
  recordPerfTtsError(utterance, error);
  log('tts-error', utterance);
}
