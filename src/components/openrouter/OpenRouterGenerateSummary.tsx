import type { ReactNode } from 'react';

export type OpenRouterGenerateSummaryProps = {
  targetLabel: string;
  benchmarkAvailable: boolean;
  feedbackAvailable: boolean;
  durationLabel: string;
  promptSizeLabel: string;
  prompt: string;
  children?: ReactNode;
};

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric" aria-label={undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function OpenRouterGenerateSummary({
  targetLabel,
  benchmarkAvailable,
  feedbackAvailable,
  durationLabel,
  promptSizeLabel,
  prompt,
  children,
}: OpenRouterGenerateSummaryProps) {
  return (
    <>
      <div className="today-summary-grid">
        <SummaryMetric label="Target" value={targetLabel} />
        <SummaryMetric label="Benchmark" value={benchmarkAvailable ? 'available' : 'missing'} />
        <SummaryMetric label="Feedback" value={feedbackAvailable ? 'available' : 'missing'} />
        <SummaryMetric label="Duration" value={durationLabel} />
        <SummaryMetric label="Prompt size" value={promptSizeLabel} />
      </div>

      {children}

      {!benchmarkAvailable ? <p className="hint">No benchmark available for this input/language. Generation will use the base profile/template.</p> : null}
      {!feedbackAvailable ? <p className="hint">No completed session feedback for this input/language. Generation will not include latest feedback.</p> : null}

      <label>
        Prompt sent to OpenRouter
        <textarea value={prompt} readOnly rows={8} />
      </label>
    </>
  );
}
