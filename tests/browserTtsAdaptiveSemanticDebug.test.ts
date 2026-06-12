import { describe, expect, it } from 'vitest';
import { buildBrowserTtsPhraseStartDebugUpdate } from '../src/app/browserTtsAdaptiveSemanticDebug';

const baseState = {
  semanticCutPenalty: 0,
  unsafePauseCount: 0,
  safePauseCount: 0,
  deferredPauseCount: 0,
  replayDeniedByBoundaryCount: 0,
  averageSemanticCompleteness: 0,
  averagePhraseDifficulty: 0,
  inputExecutionFidelityScore: 1,
  currentPhraseIndex: 0,
  currentPhraseId: '',
  currentPhraseTextPreview: '',
  totalSemanticPhrases: 0,
  phraseAdvanceCount: 0,
  phraseReplayCount: 0,
  lastPhraseAdvanceReason: '',
};

const chunk = {
  text: 'Dies ist ein kurzer Testabschnitt für Browser TTS.',
  wordCount: 8,
  startWordIndex: 0,
  phraseDifficulty: 0.7,
  phraseBoundaryType: 'sentence' as const,
  canPauseAfter: true,
  semanticCompleteness: 0.9,
  punctuationLoad: 0.1,
  rareWordLoad: 0.2,
  syntaxComplexity: 0.3,
};

describe('buildBrowserTtsPhraseStartDebugUpdate', () => {
  it('records phrase start debug metrics for a safe pause', () => {
    const result = buildBrowserTtsPhraseStartDebugUpdate({
      current: baseState,
      semanticCompleteness: 0.9,
      chunk,
      shouldPauseNow: true,
      pauseAtBoundary: true,
      effectivePauseNow: true,
      deferPauseUntilSafeBoundary: false,
      shouldReplayPhrase: false,
      effectiveReplay: false,
      macroPhraseIndex: 2,
      semanticPhrase: { id: 'phrase-2', text: 'Phrase text' },
      totalSemanticPhrases: 5,
      phraseAdvanceCount: 3,
      phraseReplayCount: 1,
    });

    expect(result).toMatchObject({
      safePauseCount: 1,
      unsafePauseCount: 0,
      deferredPauseCount: 0,
      replayDeniedByBoundaryCount: 0,
      semanticCutPenalty: 0,
      averageSemanticCompleteness: 0.9,
      averagePhraseDifficulty: 0.7,
      inputExecutionFidelityScore: 1,
      currentPhraseIndex: 2,
      currentPhraseId: 'phrase-2',
      totalSemanticPhrases: 5,
      phraseAdvanceCount: 3,
      phraseReplayCount: 1,
      lastPhraseAdvanceReason: 'phrase_start',
    });
  });

  it('penalizes unsafe pauses, deferred pauses, and denied replays', () => {
    const result = buildBrowserTtsPhraseStartDebugUpdate({
      current: baseState,
      semanticCompleteness: 0.5,
      chunk: { ...chunk, phraseDifficulty: undefined },
      shouldPauseNow: true,
      pauseAtBoundary: false,
      effectivePauseNow: false,
      deferPauseUntilSafeBoundary: true,
      shouldReplayPhrase: true,
      effectiveReplay: false,
      macroPhraseIndex: 1,
      semanticPhrase: undefined,
      totalSemanticPhrases: 4,
      phraseAdvanceCount: 0,
      phraseReplayCount: 0,
    });

    expect(result.unsafePauseCount).toBe(1);
    expect(result.deferredPauseCount).toBe(1);
    expect(result.replayDeniedByBoundaryCount).toBe(1);
    expect(result.semanticCutPenalty).toBe(1.85);
    expect(result.averagePhraseDifficulty).toBe(0.5);
    expect(result.inputExecutionFidelityScore).toBe(0);
    expect(result.currentPhraseId).toBe('phrase-1');
  });

  it('keeps a short preview of the current chunk text', () => {
    const result = buildBrowserTtsPhraseStartDebugUpdate({
      current: baseState,
      semanticCompleteness: 1,
      chunk: { ...chunk, text: 'x'.repeat(120) },
      shouldPauseNow: false,
      pauseAtBoundary: true,
      effectivePauseNow: false,
      deferPauseUntilSafeBoundary: false,
      shouldReplayPhrase: false,
      effectiveReplay: false,
      macroPhraseIndex: 0,
      semanticPhrase: { id: 'p0', text: 'ignored' },
      totalSemanticPhrases: 1,
      phraseAdvanceCount: 0,
      phraseReplayCount: 0,
    });

    expect(result.currentPhraseTextPreview).toHaveLength(80);
  });
});
