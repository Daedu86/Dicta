import { useState } from 'react';
import type { Difficulty } from '../core/config';
import type {
  ControlAction,
  TtsPacingMode,
} from '../types/dictation';
import type {
  PerformanceTrend,
  SessionStatus,
  TtsLanguage,
  TtsStatus,
} from './sessionTypes';

export function useTrainingRuntimeState() {
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('ready');
  const [controllerState, setControllerState] = useState<ControlAction>('hold');
  const [rate, setRate] = useState(1);
  const [lagSec, setLagSec] = useState(0);
  const [lagWords, setLagWords] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [trend, setTrend] = useState<PerformanceTrend>('stable');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [exportMessage, setExportMessage] = useState('');
  const [trainingSubmitMessage, setTrainingSubmitMessage] = useState('');
  const [inputSettingsLocked, setInputSettingsLocked] = useState(false);
  const [ttsText, setTtsText] = useState('');
  const [ttsLanguage, setTtsLanguage] = useState<TtsLanguage>('de');
  const [ttsPracticeText, setTtsPracticeText] = useState('');
  const [ttsStatus, setTtsStatus] = useState<TtsStatus>('idle');
  const [ttsCurrentChunk, setTtsCurrentChunk] = useState('');
  const [ttsPlayerProgressTick, setTtsPlayerProgressTick] = useState(0);
  const [ttsPacingMode, setTtsPacingMode] = useState<TtsPacingMode>('balanced');
  const [ttsSpeechRate, setTtsSpeechRate] = useState(1);

  return {
    difficulty,
    setDifficulty,
    sessionStatus,
    setSessionStatus,
    controllerState,
    setControllerState,
    rate,
    setRate,
    lagSec,
    setLagSec,
    lagWords,
    setLagWords,
    wpm,
    setWpm,
    accuracy,
    setAccuracy,
    trend,
    setTrend,
    running,
    setRunning,
    error,
    setError,
    exportMessage,
    setExportMessage,
    trainingSubmitMessage,
    setTrainingSubmitMessage,
    inputSettingsLocked,
    setInputSettingsLocked,
    ttsText,
    setTtsText,
    ttsLanguage,
    setTtsLanguage,
    ttsPracticeText,
    setTtsPracticeText,
    ttsStatus,
    setTtsStatus,
    ttsCurrentChunk,
    setTtsCurrentChunk,
    ttsPlayerProgressTick,
    setTtsPlayerProgressTick,
    ttsPacingMode,
    setTtsPacingMode,
    ttsSpeechRate,
    setTtsSpeechRate,
  };
}
