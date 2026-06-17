import type { DictationScriptValidation, MetricComponentType } from './SessionCreateCardTypes';

type DictationScriptValidationFeedbackProps = {
  dictationScriptValidation: DictationScriptValidation | null;
  MetricComponent: MetricComponentType;
};

export function DictationScriptValidationFeedback({
  dictationScriptValidation,
  MetricComponent,
}: DictationScriptValidationFeedbackProps) {
  if (!dictationScriptValidation) {
    return null;
  }

  if (!dictationScriptValidation.ok) {
    return (
      <div className="error">
        {dictationScriptValidation.errors.map((message) => (
          <p key={message}>{message}</p>
        ))}
      </div>
    );
  }

  return (
    <div className="script-preview">
      <p className="success">Script validated.</p>
      <div className="today-summary-grid">
        <MetricComponent label="Title" value={dictationScriptValidation.script.title} />
        <MetricComponent label="Language" value={dictationScriptValidation.script.language} />
        <MetricComponent label="Input mode" value={dictationScriptValidation.script.inputMode} />
        <MetricComponent label="Difficulty" value={dictationScriptValidation.script.difficulty} />
        <MetricComponent label="Phrases" value={String(dictationScriptValidation.script.phrases.length)} />
        <MetricComponent label="Duration" value={`${dictationScriptValidation.script.estimatedDurationSec}s`} />
      </div>
      <div className="script-phrase-preview">
        {dictationScriptValidation.script.phrases.slice(0, 3).map((phrase) => (
          <p key={phrase.id} className="hint">
            {phrase.id}: {phrase.text.slice(0, 120)}
          </p>
        ))}
      </div>
    </div>
  );
}
