import type { KeyboardEvent } from 'react';
import type { DictationScript } from '../core/adaptive/dictationScriptValidation';
import type { LanguageCode } from '../core/adaptive/types';
import type { Difficulty } from '../core/config';
import type { CreatedDeviceKind } from '../core/sessionDevice';
import type { TrainingGenerationButton } from './training/TrainingGenerationCard';
import type { TrainingSessionSubmissionMeta } from './training/TrainingSessionCard';
import type { BrowserTtsPracticeChunkView } from '../app/browserTtsPracticeChunks';
import type { BrowserTtsPracticeChunkTelemetry } from '../types/dictation';

export type TrainingSessionStatus = 'ready' | 'running' | 'paused' | 'finished' | 'error';
export type TrainingSessionInputMode = string;

export type TrainingSupabaseSyncStatus = {
  enabled: boolean;
  state: 'disabled' | 'idle' | 'pulling' | 'pushing' | 'synced' | 'error';
  message: string;
  lastSyncedAt: string | null;
  imported: number;
  pushed: number;
};

export type TrainingPendingSyncSummary = {
  count: number;
  hasPending: boolean;
};

export type TrainingViewSession = {
  id: string;
  name: string;
  inputMode: TrainingSessionInputMode;
  inputSettingsLocked: boolean;
  ttsText?: string;
  ttsLanguage: LanguageCode | null;
  difficulty: Difficulty;
  status: TrainingSessionStatus;
  createdDeviceKind: CreatedDeviceKind;
  createdDeviceLabel?: string;
  dictationScript: DictationScript | null;
  telemetry?: { practiceChunks?: BrowserTtsPracticeChunkTelemetry[] };
};

export type TrainingViewProps<Session extends TrainingViewSession = TrainingViewSession> = {
  activeSession: Session | null;
  submissionMeta: TrainingSessionSubmissionMeta | null;
  activeInputLabel: string;
  sessionStatus: TrainingSessionStatus;
  sourceLabel: string;
  progressLabel: string;
  statusLabel: string;
  currentTextValue: string;
  onTextChange: (value: string) => void;
  onImmediateTextChange?: (value: string) => void;
  onTextBlur?: (value: string) => void;
  onTextKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  textPlaceholder: string;
  liveScoreLabel: string;
  liveScoreHelpText: string;
  livePointsLabel: string;
  livePointsHelpText: string;
  liveAccuracyLabel: string;
  liveAccuracyHelpText: string;
  liveLagLabel: string;
  liveLagHelpText: string;
  readOnly: boolean;
  canPlay: boolean;
  playLabel: string;
  onPlay: () => void;
  canPause: boolean;
  onPause: (latestTextValue?: string) => void;
  canReplay: boolean;
  onReplay: () => void;
  canStop: boolean;
  onStop: (latestTextValue?: string) => void;
  canReset: boolean;
  onReset: () => void;
  canSubmit: boolean;
  onSubmit: (latestTextValue?: string) => void;
  submitLabel: string;
  message: string;
  messageTone?: 'error' | 'success' | 'hint';
  generationButtons: TrainingGenerationButton[];
  textCommitDelayMs: number;
  pendingSessions: Session[];
  activeSessionId: string | null;
  onOpenPendingSession: (session: Session) => void;
  onDeletePendingSession: (sessionId: string) => void;
  syncStatus: TrainingSupabaseSyncStatus;
  pendingSyncSummary: TrainingPendingSyncSummary;
  isOnline: boolean;
  completedPracticeChunks?: BrowserTtsPracticeChunkView[];
  activePracticeChunk?: BrowserTtsPracticeChunkView | null;
  practiceChunkActionQueued?: boolean;
  finalPracticeChunkAudioCompleted?: boolean;
  onSubmitPracticeChunk?: (latestDraft: string) => void;
};
