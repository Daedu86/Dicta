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
});
