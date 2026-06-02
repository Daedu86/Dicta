export type OpenRouterGeneratedOutputValidationSummary = {
  title: string;
  inputMode: string;
  language: string;
  difficulty: string;
  phrases: string;
  duration: string;
};

export type OpenRouterGeneratedOutputPanelProps = {
  slotLabel: string;
  validationSummary: OpenRouterGeneratedOutputValidationSummary | null;
  json?: string | null;
  text?: string | null;
};

function GeneratedOutputMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric" title={undefined} aria-label={undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function OpenRouterGeneratedOutputPanel({
  slotLabel,
  validationSummary,
  json,
  text,
}: OpenRouterGeneratedOutputPanelProps) {
  return (
    <>
      {validationSummary ? (
        <div className="today-summary-grid">
          <GeneratedOutputMetric label="Title" value={validationSummary.title} />
          <GeneratedOutputMetric label="Input mode" value={validationSummary.inputMode} />
          <GeneratedOutputMetric label="Language" value={validationSummary.language} />
          <GeneratedOutputMetric label="Difficulty" value={validationSummary.difficulty} />
          <GeneratedOutputMetric label="Phrases" value={validationSummary.phrases} />
          <GeneratedOutputMetric label="Duration" value={validationSummary.duration} />
        </div>
      ) : null}

      {json ? (
        <label>
          Generated DictationScript JSON · {slotLabel}
          <textarea value={json} readOnly rows={8} />
        </label>
      ) : text ? (
        <label>
          Raw model response · {slotLabel}
          <textarea value={text} readOnly rows={8} />
        </label>
      ) : null}
    </>
  );
}
