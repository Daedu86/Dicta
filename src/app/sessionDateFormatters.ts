export function formatSessionDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatSubmittedAt(value: string): string {
  return Number.isFinite(Date.parse(value)) ? formatSessionDate(value) : 'n/a';
}
