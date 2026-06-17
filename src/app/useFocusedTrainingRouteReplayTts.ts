import { useCallback } from 'react';
import type { UseFocusedTrainingRouteRuntimeArgs } from './useFocusedTrainingRouteRuntimeTypes';

export function useFocusedTrainingRouteReplayTts(
  { seekTtsPlayback }: UseFocusedTrainingRouteRuntimeArgs,
  ttsPlayerProgressPercent: number,
): () => void {
  return useCallback((): void => {
    seekTtsPlayback(Math.max(0, ttsPlayerProgressPercent / 100 - 0.08));
  }, [seekTtsPlayback, ttsPlayerProgressPercent]);
}
