export const OPENROUTER_JOB_TIMEOUT_MS = 285_000;
export const OPENROUTER_JOB_STALE_AFTER_MS = 300_000;

function formatSeconds(ms) {
  return Math.round(ms / 1000);
}

export function formatOpenRouterJobTimeoutError(model, timeoutMs = OPENROUTER_JOB_TIMEOUT_MS) {
  const timeoutSec = formatSeconds(timeoutMs);
  return `Selected OpenRouter model "${model}" timed out after ${timeoutSec} seconds so Dicta has time to persist a terminal job state before the 300-second Vercel function window. Use a shorter duration or a faster OpenRouter model/provider.`;
}

export function formatOpenRouterJobStaleError(model, staleAfterMs = OPENROUTER_JOB_STALE_AFTER_MS) {
  const staleSec = formatSeconds(staleAfterMs);
  return `Selected OpenRouter model "${model}" was still running after ${staleSec} seconds and was marked timed out. OpenRouter may show a provider completion that Dicta could not persist before the Vercel function window closed. Use a shorter duration or a faster OpenRouter model/provider.`;
}
