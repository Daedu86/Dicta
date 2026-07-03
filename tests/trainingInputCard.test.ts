import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TrainingInputCard } from '../src/components/training/TrainingInputCard';

describe('TrainingInputCard', () => {
  it('renders the review state instead of the textarea after submit', () => {
    const markup = renderToStaticMarkup(
      React.createElement(TrainingInputCard, {
        textAreaId: 'training-dictation-input',
        textInputRef: { current: null },
        currentTextValue: 'Der backer offnet fruh morgens',
        onTextChange: () => undefined,
        onImmediateTextChange: () => undefined,
        onTextKeyDown: () => undefined,
        textPlaceholder: 'Type the dictation here...',
        readOnly: true,
        textCommitDelayMs: 250,
        syncKey: 'session-1:browser-tts',
        liveScoreLabel: '530',
        liveScoreHelpText: 'Score help',
        progressLabel: 'Phrase 3/4',
        livePointsLabel: '147/237',
        livePointsHelpText: 'Points help',
        liveAccuracyLabel: '80.8%',
        liveAccuracyHelpText: 'Accuracy help',
        liveLagLabel: '0.00s',
        liveLagHelpText: 'Lag help',
        showReview: true,
        review: {
          targetWords: [
            { id: 'target-0', text: 'Der', displayText: 'Der', state: 'matched', exact: true },
            { id: 'target-1', text: 'Bäcker', displayText: 'Bäcker', state: 'missing', exact: false },
          ],
          typedWords: [
            { id: 'typed-0', text: 'Der', displayText: 'Der', state: 'matched', exact: true },
            { id: 'typed-1', text: 'backer', displayText: 'backer', state: 'extra', exact: false },
          ],
          extraTypedWords: [
            { id: 'typed-1', text: 'backer', displayText: 'backer', state: 'extra', exact: false },
          ],
          matchedCount: 1,
          missedCount: 1,
          extraCount: 1,
          accuracy: 50,
        },
      }),
    );

    expect(markup).toContain('Submitted answer review');
    expect(markup).toContain('<small>Phrase</small>');
    expect(markup).toContain('<strong>3/4</strong>');
    expect(markup).toContain('Sentence review with highlighted words');
    expect(markup).toContain('training-review-word-matched');
    expect(markup).toContain('training-review-word-missing');
    expect(markup).toContain('training-review-word-extra');
    expect(markup).not.toContain('textarea');
  });

  it('renders live metrics in score, phrase, points, accuracy, lag order', () => {
    const markup = renderToStaticMarkup(
      React.createElement(TrainingInputCard, {
        textAreaId: 'training-dictation-input',
        textInputRef: { current: null },
        currentTextValue: '',
        onTextChange: () => undefined,
        onImmediateTextChange: () => undefined,
        onTextKeyDown: () => undefined,
        textPlaceholder: 'Type the dictation here...',
        readOnly: false,
        textCommitDelayMs: 250,
        syncKey: 'session-1:browser-tts',
        liveScoreLabel: '530',
        liveScoreHelpText: 'Score help',
        progressLabel: 'Phrase 3/4',
        livePointsLabel: '147/237',
        livePointsHelpText: 'Points help',
        liveAccuracyLabel: '80.8%',
        liveAccuracyHelpText: 'Accuracy help',
        liveLagLabel: '0.00s',
        liveLagHelpText: 'Lag help',
        showReview: false,
        review: null,
      }),
    );

    expect(markup.indexOf('<small>Score</small>')).toBeLessThan(markup.indexOf('<small>Phrase</small>'));
    expect(markup.indexOf('<small>Phrase</small>')).toBeLessThan(markup.indexOf('<small>Points</small>'));
    expect(markup.indexOf('<small>Points</small>')).toBeLessThan(markup.indexOf('<small>Accuracy</small>'));
    expect(markup.indexOf('<small>Accuracy</small>')).toBeLessThan(markup.indexOf('<small>Lag</small>'));
    expect(markup).toContain('aria-label="Live phrase 3/4"');
  });

  it('renders the Browser TTS play action below the textarea before chunk practice starts', () => {
    const markup = renderToStaticMarkup(
      React.createElement(TrainingInputCard, {
        textAreaId: 'training-dictation-input',
        textInputRef: { current: null },
        currentTextValue: '',
        onTextChange: () => undefined,
        onImmediateTextChange: () => undefined,
        onTextKeyDown: () => undefined,
        textPlaceholder: 'Type the dictation here...',
        readOnly: false,
        textCommitDelayMs: 250,
        syncKey: 'session-1:browser-tts',
        liveScoreLabel: '0',
        liveScoreHelpText: 'Score help',
        progressLabel: 'Word 0/10',
        livePointsLabel: '0/10',
        livePointsHelpText: 'Points help',
        liveAccuracyLabel: '0.0%',
        liveAccuracyHelpText: 'Accuracy help',
        liveLagLabel: '0.00s',
        liveLagHelpText: 'Lag help',
        showReview: false,
        review: null,
        showEmbeddedPlay: true,
        canPlayPracticeChunk: true,
        playPracticeChunkLabel: 'Play',
        onPlayPracticeChunk: () => undefined,
      }),
    );

    expect(markup).toContain('training-chunk-start-action-row');
    expect(markup).toContain('Start playback and continue typing in this field.');
    expect(markup).toContain('>Play</button>');
  });

  it('renders only the active chunk during practice with one live textarea and a per-chunk submit action', () => {
    const markup = renderToStaticMarkup(
      React.createElement(TrainingInputCard, {
        textAreaId: 'training-dictation-input',
        textInputRef: { current: null },
        currentTextValue: 'glitzert im Morgenlicht',
        onTextChange: () => undefined,
        onImmediateTextChange: () => undefined,
        onTextKeyDown: () => undefined,
        textPlaceholder: 'Type the dictation here...',
        readOnly: false,
        textCommitDelayMs: 250,
        syncKey: 'session-1:browser-tts',
        liveScoreLabel: '530',
        liveScoreHelpText: 'Score help',
        progressLabel: 'Phrase 1/4',
        livePointsLabel: '0/237',
        livePointsHelpText: 'Points help',
        liveAccuracyLabel: '100.0%',
        liveAccuracyHelpText: 'Accuracy help',
        liveLagLabel: '0.00s',
        liveLagHelpText: 'Lag help',
        showReview: false,
        review: null,
        completedPracticeChunks: [
          {
            id: 'practice-0-0',
            index: 0,
            startWordIndex: 0,
            wordCount: 3,
            firstSemanticPhraseIndex: 0,
            lastSemanticPhraseIndex: 0,
            isFinal: false,
            typedText: 'Der feine Sand',
            resolution: 'submitted',
          },
        ],
        activePracticeChunk: {
          id: 'practice-1-3',
          index: 1,
          startWordIndex: 3,
          wordCount: 3,
          firstSemanticPhraseIndex: 1,
          lastSemanticPhraseIndex: 1,
          isFinal: false,
          typedText: 'glitzert im Morgenlicht',
        },
        practiceChunkActionQueued: false,
        activePracticeChunkAudioCompleted: true,
        canPlayPracticeChunk: true,
        playPracticeChunkLabel: 'Play',
        onPlayPracticeChunk: () => undefined,
        onReplayPracticeChunk: () => undefined,
        onSubmitPracticeChunk: () => undefined,
      }),
    );

    expect(markup).toContain('Chunk-by-chunk dictation input');
    expect(markup).not.toContain('Completed chunks');
    expect(markup).not.toContain('Der feine Sand');
    expect(markup).toContain('Chunk 2');
    expect(markup).toContain('>Play</button>');
    expect(markup).toContain('Replay chunk');
    expect(markup).toContain('Submit / Check');
    expect(markup.match(/<textarea/g)).toHaveLength(1);
  });

  it('renders the queued chunk submit counter beside the submit action', () => {
    const markup = renderToStaticMarkup(
      React.createElement(TrainingInputCard, {
        textAreaId: 'training-dictation-input',
        textInputRef: { current: null },
        currentTextValue: 'glitzert im Morgenlicht',
        onTextChange: () => undefined,
        onImmediateTextChange: () => undefined,
        onTextKeyDown: () => undefined,
        textPlaceholder: 'Type the dictation here...',
        readOnly: false,
        textCommitDelayMs: 250,
        syncKey: 'session-1:browser-tts',
        liveScoreLabel: '530',
        liveScoreHelpText: 'Score help',
        progressLabel: 'Phrase 1/4',
        livePointsLabel: '0/237',
        livePointsHelpText: 'Points help',
        liveAccuracyLabel: '100.0%',
        liveAccuracyHelpText: 'Accuracy help',
        liveLagLabel: '0.00s',
        liveLagHelpText: 'Lag help',
        showReview: false,
        review: null,
        completedPracticeChunks: [],
        activePracticeChunk: {
          id: 'practice-1-3',
          index: 1,
          startWordIndex: 3,
          wordCount: 3,
          firstSemanticPhraseIndex: 1,
          lastSemanticPhraseIndex: 1,
          isFinal: false,
          typedText: 'glitzert im Morgenlicht',
        },
        practiceChunkActionQueued: true,
        practiceChunkAdvanceCountdownSeconds: 3,
        activePracticeChunkAudioCompleted: true,
        canPlayPracticeChunk: true,
        playPracticeChunkLabel: 'Play',
        onPlayPracticeChunk: () => undefined,
        onReplayPracticeChunk: () => undefined,
        onSubmitPracticeChunk: () => undefined,
      }),
    );

    expect(markup).toContain('Submitted. The next chunk starts when the counter reaches zero.');
    expect(markup).toContain('Submit / Check (3 Secs)');
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Play<\/button>/);
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Replay chunk<\/button>/);
  });

  it('renders a manual finish action for the final practice chunk', () => {
    const markup = renderToStaticMarkup(
      React.createElement(TrainingInputCard, {
        textAreaId: 'training-dictation-input',
        textInputRef: { current: null },
        currentTextValue: '',
        onTextChange: () => undefined,
        onImmediateTextChange: () => undefined,
        onTextKeyDown: () => undefined,
        textPlaceholder: 'Type the dictation here...',
        readOnly: false,
        textCommitDelayMs: 250,
        syncKey: 'session-1:browser-tts',
        liveScoreLabel: '530',
        liveScoreHelpText: 'Score help',
        progressLabel: 'Phrase 4/4',
        livePointsLabel: '0/237',
        livePointsHelpText: 'Points help',
        liveAccuracyLabel: '100.0%',
        liveAccuracyHelpText: 'Accuracy help',
        liveLagLabel: '0.00s',
        liveLagHelpText: 'Lag help',
        showReview: false,
        review: null,
        completedPracticeChunks: [],
        activePracticeChunk: {
          id: 'practice-3-9',
          index: 3,
          startWordIndex: 9,
          wordCount: 4,
          firstSemanticPhraseIndex: 3,
          lastSemanticPhraseIndex: 3,
          isFinal: true,
          typedText: '',
        },
        practiceChunkActionQueued: false,
        activePracticeChunkAudioCompleted: true,
        canPlayPracticeChunk: true,
        playPracticeChunkLabel: 'Play',
        onPlayPracticeChunk: () => undefined,
        onReplayPracticeChunk: () => undefined,
        onSubmitPracticeChunk: () => undefined,
      }),
    );

    expect(markup).toContain('Final chunk');
    expect(markup).toContain('Audio complete. Tap Shift to replay or Enter to finish.');
    expect(markup).toContain('Finish session');
    expect(markup).not.toContain('Skip chunk');
  });

  it('splits submitted review into persisted chunk cards when chunk telemetry exists', () => {
    const markup = renderToStaticMarkup(
      React.createElement(TrainingInputCard, {
        textAreaId: 'training-dictation-input',
        textInputRef: { current: null },
        currentTextValue: 'Der Sand glitzert',
        onTextChange: () => undefined,
        onImmediateTextChange: () => undefined,
        onTextKeyDown: () => undefined,
        textPlaceholder: 'Type the dictation here...',
        readOnly: true,
        textCommitDelayMs: 250,
        syncKey: 'session-1:browser-tts',
        liveScoreLabel: '530',
        liveScoreHelpText: 'Score help',
        progressLabel: 'Phrase 4/4',
        livePointsLabel: '3/3',
        livePointsHelpText: 'Points help',
        liveAccuracyLabel: '100.0%',
        liveAccuracyHelpText: 'Accuracy help',
        liveLagLabel: '0.00s',
        liveLagHelpText: 'Lag help',
        showReview: true,
        review: {
          targetWords: [
            { id: 'target-0', text: 'Der', displayText: 'Der', state: 'matched', exact: true },
            { id: 'target-1', text: 'Sand', displayText: 'Sand', state: 'matched', exact: true },
            { id: 'target-2', text: 'glitzert', displayText: 'glitzert', state: 'missing', exact: false },
          ],
          typedWords: [
            { id: 'typed-0', text: 'Der', displayText: 'Der', state: 'matched', exact: true },
            { id: 'typed-1', text: 'Sand', displayText: 'Sand', state: 'matched', exact: true },
          ],
          extraTypedWords: [],
          alignedPairs: [
            { typedIndex: 0, targetIndex: 0 },
            { typedIndex: 1, targetIndex: 1 },
          ],
          matchedCount: 2,
          missedCount: 1,
          extraCount: 0,
          accuracy: 66.7,
        },
        reviewChunks: [
          {
            id: 'practice-0-0',
            index: 0,
            startWordIndex: 0,
            wordCount: 2,
            typedWordStartIndex: 0,
            typedWordCount: 2,
            typedText: 'Der Sand',
            resolution: 'submitted',
          },
          {
            id: 'practice-1-2',
            index: 1,
            startWordIndex: 2,
            wordCount: 1,
            typedWordStartIndex: 2,
            typedWordCount: 0,
            typedText: '',
            resolution: 'timeout',
          },
        ],
      }),
    );

    expect(markup).toContain('Chunked sentence review');
    expect(markup).toContain('Chunk 1');
    expect(markup).toContain('Chunk 2');
    expect(markup).toContain('aria-label="Chunk 1 score"');
    expect(markup).toContain('Score 2/2');
    expect(markup).toContain('Accuracy 100.0%');
    expect(markup).toContain('aria-label="Chunk 2 score"');
    expect(markup).toContain('Score 0/1');
    expect(markup).toContain('Accuracy 0.0%');
    expect(markup).toContain('Continued automatically');
    expect(markup).not.toContain('aria-label="Sentence review with highlighted words"');
  });
});
