import type { PhraseSize } from '../core/adaptive/types';
import type { BrowserTtsBoundaryStrictness } from './browserTtsPlaybackPlan';
import { advanceBrowserTtsMacroPhraseCursor } from './browserTtsPlaybackLoopLifecycle';

export type BrowserTtsPlaybackLoopCursorPosition = {
  chunkIndex: number;
  macroPhraseIndex: number;
  macroWordOffset: number;
};

export type BrowserTtsPlaybackLoopCursorDecisionState = {
  lastPhraseSize: PhraseSize;
  lastBoundaryStrictness: BrowserTtsBoundaryStrictness;
};

export type BrowserTtsPlaybackLoopCursorSnapshot = BrowserTtsPlaybackLoopCursorPosition &
  BrowserTtsPlaybackLoopCursorDecisionState;

export function createBrowserTtsPlaybackLoopCursor(initialCursor: BrowserTtsPlaybackLoopCursorSnapshot) {
  let cursor = { ...initialCursor };

  return {
    get(): BrowserTtsPlaybackLoopCursorSnapshot {
      return cursor;
    },
    advanceMacroPhrase(): BrowserTtsPlaybackLoopCursorSnapshot {
      const nextPosition = advanceBrowserTtsMacroPhraseCursor(cursor);
      cursor = { ...cursor, ...nextPosition };
      return cursor;
    },
    updatePosition(nextPosition: BrowserTtsPlaybackLoopCursorPosition): BrowserTtsPlaybackLoopCursorSnapshot {
      cursor = { ...cursor, ...nextPosition };
      return cursor;
    },
    updateDecisionState(nextState: BrowserTtsPlaybackLoopCursorDecisionState): BrowserTtsPlaybackLoopCursorSnapshot {
      cursor = { ...cursor, ...nextState };
      return cursor;
    },
  };
}
