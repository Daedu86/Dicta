import { BROWSER_TTS_SESSION_INPUT_MODE } from '../../core/sessionInputModes';
import { useState } from 'react';
import { TrainingView } from '../TrainingView';

type HarnessSession = {
  id: string;
  name: string;
  inputMode: typeof BROWSER_TTS_SESSION_INPUT_MODE;
  inputSettingsLocked: boolean;
  ttsLanguage: 'de';
  difficulty: 'normal';
  status: 'running';
  createdDeviceKind: 'unknown';
  dictationScript: null;
};

const session: HarnessSession = {
  id: 'e2e-training-session',
  name: 'E2E mobile training session',
  inputMode: BROWSER_TTS_SESSION_INPUT_MODE,
  inputSettingsLocked: true,
  ttsLanguage: 'de',
  difficulty: 'normal',
  status: 'running',
  createdDeviceKind: 'unknown',
  dictationScript: null,
};

export function E2ETrainingPerfHarness() {
  const [text, setText] = useState('');
  const [chunkIndex, setChunkIndex] = useState(0);
  const [embeddedPlayStarted, setEmbeddedPlayStarted] = useState(false);
  const searchParams = new URLSearchParams(window.location.search);
  const chunkPracticeMode = searchParams.get('chunkPractice') === '1';
  const embeddedPlayMode = searchParams.get('embeddedPlay') === '1';
  const showChunkPractice = chunkPracticeMode || (embeddedPlayMode && embeddedPlayStarted);
  const submitPracticeChunk = showChunkPractice
    ? () => {
        setText('');
        setChunkIndex((currentIndex) => currentIndex + 1);
      }
    : undefined;

  return (
    <TrainingView
      activeSession={session}
      submissionMeta={null}
      activeInputLabel="Browser TTS"
      sessionStatus="running"
      sourceLabel="E2E fixture"
      progressLabel="0 / 1"
      statusLabel="Running"
      currentTextValue={text}
      onTextChange={setText}
      onImmediateTextChange={() => undefined}
      onTextKeyDown={() => undefined}
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
      canPlay={chunkPracticeMode || embeddedPlayMode}
      playLabel="Play"
      onPlay={() => {
        if (embeddedPlayMode) setEmbeddedPlayStarted(true);
      }}
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
      textCommitDelayMs={1200}
      pendingSessions={[]}
      activeSessionId={session.id}
      onOpenPendingSession={() => undefined}
      onDeletePendingSession={() => undefined}
      syncStatus={{ enabled: false, state: 'disabled', message: 'Sync disabled for E2E', lastSyncedAt: null, imported: 0, pushed: 0 }}
      pendingSyncSummary={{ count: 0, hasPending: false }}
      isOnline={true}
      activePracticeChunk={showChunkPractice
        ? {
            id: `practice-${chunkIndex}-${chunkIndex * 6}`,
            index: chunkIndex,
            startWordIndex: chunkIndex * 6,
            wordCount: 6,
            firstSemanticPhraseIndex: chunkIndex,
            lastSemanticPhraseIndex: chunkIndex,
            isFinal: false,
            typedText: text,
          }
        : null}
      practiceChunkActionQueued={false}
      practiceChunkAdvanceCountdownSeconds={null}
      finalPracticeChunkAudioCompleted={false}
      onReplayPracticeChunk={() => undefined}
      onSubmitPracticeChunk={submitPracticeChunk}
    />
  );
}
