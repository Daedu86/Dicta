const MAX_TOPIC_CONTEXT_LENGTH = 180;

export function normalizeOpenRouterDirectGenerationTopicContext(value: string | null | undefined): string {
  const trimmed = value?.trim().replace(/\s+/g, ' ') ?? '';
  return trimmed.slice(0, MAX_TOPIC_CONTEXT_LENGTH);
}
