type AdaptiveBenchmarkMetricProps = {
  label: string;
  value: string;
  title?: string;
};

export function AdaptiveBenchmarkMetric({ label, value, title }: AdaptiveBenchmarkMetricProps) {
  return (
    <div className="metric" title={title} aria-label={title ? `${label}: ${value}. ${title}` : undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
