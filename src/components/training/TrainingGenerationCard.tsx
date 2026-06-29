import { X } from 'lucide-react';
import { useState } from 'react';
import { buildTrainingGenerationButtonDisplay } from './trainingGenerationDisplay';
import type { TrainingGenerationButton } from './trainingGenerationDisplay';
export type { TrainingGenerationButton } from './trainingGenerationDisplay';

export type TrainingGenerationCardProps = {
  generationButtons: TrainingGenerationButton[];
  className?: string;
};

export function TrainingGenerationCard({ generationButtons, className = '' }: TrainingGenerationCardProps) {
  const [dismissedStatusItemIds, setDismissedStatusItemIds] = useState<ReadonlySet<string>>(() => new Set());

  if (generationButtons.length === 0) return null;

  return (
    <section className={`training-card training-generation-card ${className}`.trim()} aria-label="Generate new sessions">
      <div className="training-generation-grid">
        {generationButtons.map((button) => {
          const display = buildTrainingGenerationButtonDisplay(button);
          const visibleStatusItems = button.statusItems?.filter((item) => !dismissedStatusItemIds.has(item.id));
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
              {visibleStatusItems && visibleStatusItems.length > 0 ? (
                <ul className="training-generation-log" aria-live="polite">
                  {visibleStatusItems.map((item) => (
                    <li key={item.id} className={`training-generation-log-item training-generation-notice-${item.tone}`}>
                      <span className="training-generation-log-message">{item.message}</span>
                      <span className="training-generation-log-actions">
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
                        <button
                          type="button"
                          className="training-generation-dismiss-button"
                          onClick={() => {
                            setDismissedStatusItemIds((current) => new Set(current).add(item.id));
                          }}
                          aria-label="Dismiss notification"
                          title="Dismiss notification"
                        >
                          <X aria-hidden="true" size={18} strokeWidth={2.5} />
                        </button>
                      </span>
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
