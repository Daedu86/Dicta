import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { AudioEngine } from '../core/audioEngine';

export type AudioPlaybackRuntime = {
  audioRef: RefObject<HTMLAudioElement | null>;
  audioReady: boolean;
  audioReadyMessage: string;
  currentAudioTime: number;
  hasAudioElement: () => boolean;
  hasAudioEngine: () => boolean;
  loadAudioSource: (url: string, readyMessage?: string) => boolean;
  setAudioReadyState: (ready: boolean, message?: string) => void;
  setAudioCurrentTime: (timeSec: number) => void;
  handleAudioTimeUpdate: () => void;
  playAudio: () => Promise<void>;
  pauseAudio: () => void;
  resetAudio: () => void;
  seekAudio: (timeSec: number) => void;
  rewindAudio: (seconds: number) => void;
  getAudioCurrentTime: () => number;
  getAudioRate: () => number;
  setAudioRate: (rate: number) => void;
};

export function useAudioPlaybackRuntime(audioUrl: string): AudioPlaybackRuntime {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const engineRef = useRef<AudioEngine | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [audioReadyMessage, setAudioReadyMessage] = useState('');
  const [currentAudioTime, setCurrentAudioTime] = useState(0);

  const hasAudioElement = useCallback(() => Boolean(audioRef.current), []);
  const hasAudioEngine = useCallback(() => Boolean(engineRef.current), []);

  const ensureAudioEngine = useCallback((): AudioEngine | null => {
    if (!audioRef.current) return null;
    if (!engineRef.current) {
      engineRef.current = new AudioEngine(audioRef.current);
    }
    return engineRef.current;
  }, []);

  const loadAudioSource = useCallback((url: string, readyMessage?: string): boolean => {
    if (!audioRef.current) return false;
    engineRef.current = new AudioEngine(audioRef.current);
    engineRef.current.load(url);
    setAudioReady(true);
    if (readyMessage !== undefined) {
      setAudioReadyMessage(readyMessage);
    }
    return true;
  }, []);

  const setAudioReadyState = useCallback((ready: boolean, message?: string): void => {
    setAudioReady(ready);
    if (message !== undefined) {
      setAudioReadyMessage(message);
    }
  }, []);

  const setAudioCurrentTime = useCallback((timeSec: number): void => {
    setCurrentAudioTime(timeSec);
  }, []);

  const handleAudioTimeUpdate = useCallback((): void => {
    setCurrentAudioTime(audioRef.current?.currentTime ?? 0);
  }, []);

  const playAudio = useCallback(async (): Promise<void> => {
    const engine = ensureAudioEngine();
    if (!engine) return;
    await engine.play();
  }, [ensureAudioEngine]);

  const pauseAudio = useCallback((): void => {
    engineRef.current?.pause();
  }, []);

  const resetAudio = useCallback((): void => {
    engineRef.current?.reset();
    setCurrentAudioTime(0);
  }, []);

  const seekAudio = useCallback((timeSec: number): void => {
    const nextTime = Math.max(0, timeSec);
    engineRef.current?.seek(nextTime);
    if (audioRef.current) {
      audioRef.current.currentTime = nextTime;
    }
    setCurrentAudioTime(nextTime);
  }, []);

  const rewindAudio = useCallback((seconds: number): void => {
    const currentTime = engineRef.current?.getCurrentTime() ?? audioRef.current?.currentTime ?? 0;
    seekAudio(Math.max(0, currentTime - seconds));
  }, [seekAudio]);

  const getAudioCurrentTime = useCallback((): number => {
    return engineRef.current?.getCurrentTime() ?? audioRef.current?.currentTime ?? 0;
  }, []);

  const getAudioRate = useCallback((): number => {
    return engineRef.current?.getRate() ?? audioRef.current?.playbackRate ?? 1;
  }, []);

  const setAudioRate = useCallback((rate: number): void => {
    const engine = ensureAudioEngine();
    if (engine) {
      engine.setRate(rate);
    } else if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, [ensureAudioEngine]);

  useEffect(() => {
    if (!audioRef.current || !audioUrl) return;
    const engine = ensureAudioEngine();
    if (!engine) return;
    engine.load(audioUrl);
    setAudioReady(true);
    setAudioReadyMessage((current) => current || 'Audio loaded successfully.');
  }, [audioUrl, ensureAudioEngine]);

  return {
    audioRef,
    audioReady,
    audioReadyMessage,
    currentAudioTime,
    hasAudioElement,
    hasAudioEngine,
    loadAudioSource,
    setAudioReadyState,
    setAudioCurrentTime,
    handleAudioTimeUpdate,
    playAudio,
    pauseAudio,
    resetAudio,
    seekAudio,
    rewindAudio,
    getAudioCurrentTime,
    getAudioRate,
    setAudioRate,
  };
}
