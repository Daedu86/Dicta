import { buildTrainingGenerationButtonDisplay } from './trainingGenerationDisplay';
import type { TrainingGenerationButton } from './trainingGenerationDisplay';
export type { TrainingGenerationButton } from './trainingGenerationDisplay';

export type TrainingGenerationCardProps = {
  generationButtons: TrainingGenerationButton[];
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
