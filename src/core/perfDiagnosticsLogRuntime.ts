export function logPerfDiagnosticsEvent({
  enabled,
  event,
  payload,
}: {
  enabled: boolean;
  event: string;
  payload: unknown;
}): void {
  if (!enabled) return;
  console.info('[DictaPerf]', event, payload);
}
