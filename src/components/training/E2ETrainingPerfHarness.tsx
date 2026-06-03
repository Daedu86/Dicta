import { useState, type KeyboardEvent } from 'react';
import { perfDiagnostics } from '../../core/perfDiagnostics';
import { TrainingView } from '../TrainingView';

type HarnessSession = {
  id: string;
  name: string;
  inputMode: 'input2';
  inputSettingsLocked: boolean;
  transcriptionLanguage: null;
  ttsLanguage: 'de';
  kokoroLanguage: null;
  difficulty: 'normal';
  status: 'running';
  createdDeviceKind: 'unknown';
  dictationScript: null;
};

const session: HarnessSession = {
  id: 'e2e-training-session',
  name: 'E2E mobile training session',
  inputMode: 'input2',
  inputSettingsLocked: true,
  transcriptionLanguage: null,
  ttsLanguage: 'de',
  kokoroLanguage: null,
  difficulty: 'normal',
  status: 'running',
  createdDeviceKind: 'unknown',
  dictationScript: null,
};

export function E2ETrainingPerfHarness() {
  const [text, setText] = useState('');

  return (
    <TrainingView
      activeSession={session}
      submissionMeta={null}
      activeInputLabel="Browser TTS"
      sessionStatus="running"
      sourceLabel="E2E fixture"
      progressLabel="0 / 1"
      statusLabel="Running"
      audioRef={{ current: null }}
      audioUrl=""
      onAudioTimeUpdate={() => undefined}
      onAudioEnded={() => undefined}
      showAudioElement={false}
      currentTextValue={text}
      onTextChange={setText}
      onImmediateTextChange={() => undefined}
      onTextKeyDown={(_: KeyboardEvent<HTMLTextAreaElement>) => undefined}
      textPlaceholder="Type what you hear"
      liveScoreLabel="0"
      liveScoreHelpText="E2E score fixture"
      livePointsLabel="0"
      livePointsHelpText="E2E points fixture"
      liveAccuracyLabel="—"
      liveAccuracyHelpText="E2E accuracy fixture"
      liveLagLabel="—"
      liveLagHelpText="E2E lag fixture"
      readOnly={false}
      canPlay={false}
      playLabel="Play"
      onPlay={() => undefined}
      canPause={false}
      onPause={() => undefined}
      canReplay={false}
      onReplay={() => undefined}
      canStop={false}
      onStop={() => undefined}
      canReset={false}
      onReset={() => undefined}
      canSubmit={false}
      onSubmit={() => undefined}
      submitLabel="Submit"
      message="E2E training performance harness"
      messageTone="hint"
      generationButtons={[]}
      textCommitDelayMs={90}
      pendingSessions={[]}
      activeSessionId={session.id}
      onOpenPendingSession={() => undefined}
      onDeletePendingSession={() => undefined}
      syncStatus={{ enabled: false, state: 'disabled', message: 'Sync disabled for E2E', lastSyncedAt: null, imported: 0, pushed: 0 }}
      pendingSyncSummary={{ count: 0, hasPending: false }}
      isOnline={true}
    />
  );
}

export function configureE2ETrainingPerf(): void {
  perfDiagnostics.configure({ envDev: true, search: '?perf=1', storage: window.localStorage });
  perfDiagnostics.reset();
}
