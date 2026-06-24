export type TrainingGenerationStatusItem = {
  id: string;
  message: string;
  tone: 'hint' | 'success' | 'error';
  onCancel?: () => void;
  cancelLabel?: string;
  cancelTitle?: string;
  cancelDisabled?: boolean;
};

export type TrainingGenerationButton = {
  id: string;
  label: string;
  onClick: () => void;
  disabled: boolean;
  title: string;
  durationMinutes?: number;
  helpText?: string;
  statusMessage?: string;
  statusTone?: 'hint' | 'success' | 'error';
  statusItems?: TrainingGenerationStatusItem[];
};

export type TrainingGenerationButtonDisplay = TrainingGenerationButton & {
  displayLabel: string;
  displayTitle: string;
  displayDurationLabel: string;
  displayHelpText?: string;
};

type TrainingGenerationIntent = 'adaptive' | 'topic' | 'precision' | 'stabilize' | 'challenge';

const INTENT_LABELS: Record<TrainingGenerationIntent, string> = {
  adaptive: 'Generate Session',
  topic: 'Generate Topic Session',
  precision: 'Precision',
  stabilize: 'Stabilize',
  challenge: 'Challenge',
};

export function buildTrainingGenerationButtonDisplay(button: TrainingGenerationButton): TrainingGenerationButtonDisplay {
  const intent = resolveTrainingGenerationIntent(button.id);
  const intentLabel = INTENT_LABELS[intent];
  const displayName = intent === 'adaptive' || intent === 'topic' ? (button.label.trim() || intentLabel) : intentLabel;
  const displayLabel = formatIntentButtonLabel(button.label, intent, intentLabel, displayName);
  const durationMinutes = resolveTrainingGenerationDurationMinutes(button.durationMinutes);

  return {
    ...button,
    displayLabel,
    displayTitle: buildIntentButtonTitle(intent, button.title, durationMinutes),
    displayDurationLabel: formatVisibleDurationLabel(durationMinutes),
    displayHelpText: buildIntentButtonHelpText(intent, durationMinutes),
  };
}

function resolveTrainingGenerationIntent(id: string): TrainingGenerationIntent {
  switch (id) {
    case 'adaptive':
      return 'adaptive';
    case 'topic':
      return 'topic';
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
      return 'adaptive';
  }
}

function formatIntentButtonLabel(label: string, intent: TrainingGenerationIntent, intentLabel: string, displayName: string): string {
  if (intent === 'adaptive' || intent === 'topic') return displayName;

  const normalized = label.trim().toLocaleLowerCase();
  if (normalized.startsWith('requesting')) return `Requesting ${intentLabel}...`;
  if (normalized.startsWith('generating')) return `Generating ${intentLabel}...`;
  return displayName;
}

function resolveTrainingGenerationDurationMinutes(durationMinutes: number | undefined): number {
  if (typeof durationMinutes === 'number' && Number.isFinite(durationMinutes) && durationMinutes > 0) {
    return durationMinutes;
  }
  return 3;
}

function buildIntentButtonTitle(intent: TrainingGenerationIntent, fallback: string, durationMinutes: number): string {
  const duration = `${formatDurationMinutes(durationMinutes)}-minute`;
  switch (intent) {
    case 'adaptive':
      return `Generate a ${duration} adaptive session: the benchmark and latest feedback choose recovery, stabilization, progress, or challenge.`;
    case 'topic':
      return `Generate a ${duration} adaptive topic session: you provide the semantic theme, while the benchmark still resolves difficulty and pacing.`;
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

function buildIntentButtonHelpText(intent: TrainingGenerationIntent, durationMinutes: number): string {
  const duration = formatApproxDurationText(durationMinutes);
  if (intent === 'adaptive') {
    return `${duration}. The trainer reads your benchmark and latest feedback, then resolves the actual training mode before asking OpenRouter for a session.`;
  }
  if (intent === 'topic') {
    return `${duration}. Adds your topic to the LLM prompt, but the trainer still controls difficulty, phrase length, and pacing from your benchmark.`;
  }
  if (intent === 'precision') {
    return `${duration}. Rebuilds listening precision with shorter phrases, clearer content-word anchors, detail recall, and a safer completion window.`;
  }
  if (intent === 'stabilize') {
    return `${duration}. Stabilizes listening flow with balanced vocabulary, semantic phrase boundaries, word-order practice, and controlled pacing.`;
  }
  return `${duration}. Challenges listening with richer vocabulary and grammar only after precision, word order, and completion-window timing are stable.`;
}

function formatVisibleDurationLabel(durationMinutes: number): string {
  return `Approx. ${formatDurationMinutes(durationMinutes)} min audio`;
}

function formatApproxDurationText(durationMinutes: number): string {
  const unit = durationMinutes === 1 ? 'minute' : 'minutes';
  return `About ${formatDurationMinutes(durationMinutes)} ${unit}`;
}

function formatDurationMinutes(durationMinutes: number): string {
  return Number.isInteger(durationMinutes) ? String(durationMinutes) : durationMinutes.toFixed(1);
}
