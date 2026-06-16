type LiveMetricProps = {
  label: string;
  value: string;
  title?: string;
};

export function LiveMetric({ label, value, title }: LiveMetricProps) {
  return (
    <div className="metric" title={title} aria-label={title ? `${label}: ${value}. ${title}` : undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
