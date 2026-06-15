export type TrainingGenerationButton = {
  id: string;
  label: string;
  onClick: () => void;
  disabled: boolean;
  title: string;
  helpText?: string;
  statusMessage?: string;
  statusTone?: 'hint' | 'success' | 'error';
};

export type TrainingGenerationButtonDisplay = TrainingGenerationButton & {
  displayLabel: string;
  displayTitle: string;
  displayHelpText?: string;
};

type TrainingGenerationIntent = 'precision' | 'stabilize' | 'challenge' | 'custom';

const INTENT_LABELS: Record<Exclude<TrainingGenerationIntent, 'custom'>, string> = {
  precision: 'Precision',
  stabilize: 'Stabilize',
  challenge: 'Challenge',
};

export function buildTrainingGenerationButtonDisplay(button: TrainingGenerationButton): TrainingGenerationButtonDisplay {
  const intent = resolveTrainingGenerationIntent(button.id);
  if (intent === 'custom') {
    return {
      ...button,
      displayLabel: button.label,
      displayTitle: button.title,
      displayHelpText: button.helpText,
    };
  }

  const intentLabel = INTENT_LABELS[intent];
  const displayName = intentLabel;
  const displayLabel = formatIntentButtonLabel(button.label, intentLabel, displayName);

  return {
    ...button,
    displayLabel,
    displayTitle: buildIntentButtonTitle(intent, button.title),
    displayHelpText: buildIntentButtonHelpText(intent),
  };
}

function resolveTrainingGenerationIntent(id: string): TrainingGenerationIntent {
  switch (id) {
    case 'easy':
    case 'express-easy':
      return 'precision';
    case 'medium':
    case 'express-medium':
      return 'stabilize';
    case 'hard':
    case 'express-hard':
      return 'challenge';
    default:
      return 'custom';
  }
}

function formatIntentButtonLabel(label: string, intentLabel: string, displayName: string): string {
  const normalized = label.trim().toLocaleLowerCase();
  if (normalized.startsWith('requesting')) return `Requesting ${intentLabel}...`;
  if (normalized.startsWith('generating')) return `Generating ${intentLabel}...`;
  return displayName;
}

function buildIntentButtonTitle(intent: Exclude<TrainingGenerationIntent, 'custom'>, fallback: string): string {
  const duration = 'two-minute';
  switch (intent) {
    case 'precision':
      return `Generate a ${duration} Precision session: short, clear listening phrases that prioritize recall, content-word anchors, and on-time completion.`;
    case 'stabilize':
      return `Generate a ${duration} Stabilize session: balanced semantic phrases that protect flow, word order, and controlled pacing.`;
    case 'challenge':
      return `Generate a ${duration} Challenge session: denser language only when listening precision, flow, word order, and completion timing are stable.`;
    default:
      return fallback;
  }
}

function buildIntentButtonHelpText(intent: Exclude<TrainingGenerationIntent, 'custom'>): string {
  if (intent === 'precision') {
    return 'About 2 minutes. Rebuilds listening precision with shorter phrases, clearer content-word anchors, detail recall, and a safer completion window.';
  }
  if (intent === 'stabilize') {
    return 'About 2 minutes. Stabilizes listening flow with balanced vocabulary, semantic phrase boundaries, word-order practice, and controlled pacing.';
  }
  return 'About 2 minutes. Challenges listening with richer vocabulary and grammar only after precision, word order, and completion-window timing are stable.';
}
