type LiveMetricsDiagnosticMessageProps = {
  message: string;
};

export function LiveMetricsDiagnosticMessage({ message }: LiveMetricsDiagnosticMessageProps) {
  if (!message) return null;

  return (
    <p className={`insights-diagnostic-message ${message.toLowerCase().includes('could not') ? 'error' : 'success'}`}>
      {message}
    </p>
  );
}

type LiveMetricsDiagnosticFallbackProps = {
  report: string;
  onSelectReport: () => void;
};

export function LiveMetricsDiagnosticFallback({
  report,
  onSelectReport,
}: LiveMetricsDiagnosticFallbackProps) {
  if (!report) return null;

  return (
    <div className="insights-report-fallback">
      <div className="insights-report-fallback-header">
        <strong>Adaptive report ready</strong>
        <button type="button" className="secondary-button" onClick={onSelectReport}>
          Select report
        </button>
      </div>
      <textarea
        id="insights-diagnostic-fallback-report"
        readOnly
        value={report}
        rows={8}
        aria-label="Generated adaptive user and system report"
      />
    </div>
  );
}
