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

export type TrainingGenerationCardProps = {
  generationButtons: TrainingGenerationButton[];
};

type TrainingGenerationIntent = 'precision' | 'stabilize' | 'challenge' | 'custom';

type TrainingGenerationButtonDisplay = TrainingGenerationButton & {
  displayLabel: string;
  displayTitle: string;
  displayHelpText?: string;
};

const INTENT_LABELS: Record<Exclude<TrainingGenerationIntent, 'custom'>, string> = {
  precision: 'Precision',
  stabilize: 'Stabilize',
  challenge: 'Challenge',
};

export function TrainingGenerationCard({ generationButtons }: TrainingGenerationCardProps) {
  if (generationButtons.length === 0) return null;

  return (
    <section className="training-card training-generation-card" aria-label="Generate new sessions">
      <div className="training-generation-grid">
        {generationButtons.map((button) => {
          const display = buildTrainingGenerationButtonDisplay(button);
          return (
            <div key={button.id} className={`training-generation-action ${button.id === 'custom' ? 'training-generation-action-wide' : ''}`.trim()}>
              <div className="training-generation-button-row">
                <button
                  type="button"
                  className="training-generation-button"
                  onClick={button.onClick}
                  disabled={button.disabled}
                  title={display.displayTitle}
                >
                  {display.displayLabel}
                </button>
                {display.displayHelpText ? <HelpIcon tooltip={display.displayHelpText} ariaLabel={`Help for ${display.displayLabel}`} /> : null}
              </div>
              {button.statusMessage ? (
                <p className={`training-generation-notice training-generation-notice-${button.statusTone ?? 'hint'}`} aria-live="polite">
                  {button.statusMessage}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

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
  const isExpress = button.id.startsWith('express-');
  const displayName = isExpress ? `Express ${intentLabel}` : intentLabel;
  const displayLabel = formatIntentButtonLabel(button.label, intentLabel, displayName);

  return {
    ...button,
    displayLabel,
    displayTitle: buildIntentButtonTitle(intent, isExpress, button.title),
    displayHelpText: buildIntentButtonHelpText(intent, isExpress),
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
  if (normalized.startsWith('requesting express')) return `Requesting Express ${intentLabel}...`;
  if (normalized.startsWith('generating express')) return `Generating Express ${intentLabel}...`;
  if (normalized.startsWith('requesting')) return `Requesting ${intentLabel}...`;
  if (normalized.startsWith('generating')) return `Generating ${intentLabel}...`;
  return displayName;
}

function buildIntentButtonTitle(intent: Exclude<TrainingGenerationIntent, 'custom'>, isExpress: boolean, fallback: string): string {
  const duration = isExpress ? 'one-minute express' : 'two-minute';
  switch (intent) {
    case 'precision':
      return `Generate a ${duration} precision session focused on clear recall, content-word anchors, and a safer completion window.`;
    case 'stabilize':
      return `Generate a ${duration} stabilization session focused on steady listening flow, balanced phrases, and controlled pacing.`;
    case 'challenge':
      return `Generate a ${duration} challenge session only when listening precision, flow, and completion timing are stable.`;
    default:
      return fallback;
  }
}

function buildIntentButtonHelpText(intent: Exclude<TrainingGenerationIntent, 'custom'>, isExpress: boolean): string {
  const duration = isExpress ? 'About 1 minute.' : 'About 2 minutes.';
  switch (intent) {
    case 'precision':
      return `${duration} Rebuilds listening precision with shorter, clearer phrases and strong content-word anchors.`;
    case 'stabilize':
      return `${duration} Stabilizes flow with balanced vocabulary, semantic phrases, and conservative pacing.`;
    case 'challenge':
      return `${duration} Challenges listening only after precision, word order, and completion-window timing are stable.`;
  }
}

function HelpIcon({ tooltip, ariaLabel = 'Help' }: { tooltip: string; ariaLabel?: string }) {
  return (
    <button
      type="button"
      className="help-icon"
      aria-label={ariaLabel}
      data-tooltip={tooltip}
      onClick={(event) => event.preventDefault()}
    >
      ?
    </button>
  );
}
