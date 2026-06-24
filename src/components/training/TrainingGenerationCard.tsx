import { buildTrainingGenerationButtonDisplay } from './trainingGenerationDisplay';
import type { TrainingGenerationButton } from './trainingGenerationDisplay';
export type { TrainingGenerationButton } from './trainingGenerationDisplay';

export type TrainingGenerationCardProps = {
  generationButtons: TrainingGenerationButton[];
  className?: string;
};

export function TrainingGenerationCard({ generationButtons, className = '' }: TrainingGenerationCardProps) {
  if (generationButtons.length === 0) return null;

  return (
    <section className={`training-card training-generation-card ${className}`.trim()} aria-label="Generate new sessions">
      <div className="training-generation-grid">
        {generationButtons.map((button) => {
          const display = buildTrainingGenerationButtonDisplay(button);
          return (
            <div key={button.id} className="training-generation-action">
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
              <p className="training-generation-duration">{display.displayDurationLabel}</p>
              {button.statusMessage ? (
                <p className={`training-generation-notice training-generation-notice-${button.statusTone ?? 'hint'}`} aria-live="polite">
                  {button.statusMessage}
                </p>
              ) : null}
              {button.statusItems && button.statusItems.length > 0 ? (
                <ul className="training-generation-log" aria-live="polite">
                  {button.statusItems.map((item) => (
                    <li key={item.id} className={`training-generation-log-item training-generation-notice-${item.tone}`}>
                      <span className="training-generation-log-message">{item.message}</span>
                      {item.onCancel ? (
                        <button
                          type="button"
                          className="training-generation-cancel-button"
                          onClick={item.onCancel}
                          disabled={item.cancelDisabled}
                          title={item.cancelTitle ?? item.cancelLabel ?? 'Cancel generation'}
                        >
                          {item.cancelLabel ?? 'Cancel'}
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
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
