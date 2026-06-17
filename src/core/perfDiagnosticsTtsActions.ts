import type { PerfTtsVoice } from './perfDiagnosticsTypes';
import { PerfDiagnosticsState } from './perfDiagnosticsState';
import type { PerfTtsUtteranceArgs } from './perfDiagnosticsTtsEvents';
import {
  beginPerfDiagnosticsTtsPlay,
  beginPerfDiagnosticsTtsUtterance,
  recordPerfDiagnosticsTtsEnd,
  recordPerfDiagnosticsTtsError,
  recordPerfDiagnosticsTtsSpeak,
  recordPerfDiagnosticsTtsStart,
  recordPerfDiagnosticsTtsVoices,
} from './perfDiagnosticsTtsRuntime';

type PerfDiagnosticsTtsLog = (event: string, payload: unknown) => void;

export type PerfDiagnosticsTtsActionsOptions = {
  state: PerfDiagnosticsState;
  isEnabled: () => boolean;
  log: PerfDiagnosticsTtsLog;
};

export class PerfDiagnosticsTtsActions {
  private readonly state: PerfDiagnosticsState;
  private readonly isEnabled: () => boolean;
  private readonly log: PerfDiagnosticsTtsLog;

  constructor({ state, isEnabled, log }: PerfDiagnosticsTtsActionsOptions) {
    this.state = state;
    this.isEnabled = isEnabled;
    this.log = log;
  }

  beginTtsPlay(source: string): number {
    return beginPerfDiagnosticsTtsPlay(this.isEnabled(), this.state, source);
  }

  beginTtsUtterance(args: PerfTtsUtteranceArgs): number {
    return beginPerfDiagnosticsTtsUtterance(this.isEnabled(), this.state, args);
  }

  recordTtsVoices(voices: PerfTtsVoice[]): void {
    recordPerfDiagnosticsTtsVoices({
      state: this.state,
      enabled: this.isEnabled(),
      voices,
      log: this.log,
    });
  }

  recordTtsSpeak(utteranceId: number): void {
    recordPerfDiagnosticsTtsSpeak(this.isEnabled(), this.state, utteranceId);
  }

  recordTtsStart(utteranceId: number): void {
    recordPerfDiagnosticsTtsStart(this.isEnabled(), this.state, utteranceId);
  }

  recordTtsEnd(utteranceId: number): void {
    recordPerfDiagnosticsTtsEnd(this.isEnabled(), this.state, utteranceId);
  }

  recordTtsError(utteranceId: number, error: string): void {
    recordPerfDiagnosticsTtsError({
      enabled: this.isEnabled(),
      state: this.state,
      utteranceId,
      error,
      log: this.log,
    });
  }
}
