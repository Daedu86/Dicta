type LocalDevOllamaModelPayload = {
  data: Array<Record<string, unknown>>;
  source: string;
  recommendedModel: string;
};

const extractOllamaErrorText = (body: string): string => {
  const raw = body.trim();
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw) as { error?: string | { message?: string }; message?: string };
    const message =
      typeof parsed.error === 'string'
        ? parsed.error
        : parsed.error && typeof parsed.error === 'object' && typeof parsed.error.message === 'string'
          ? parsed.error.message
          : typeof parsed.message === 'string'
            ? parsed.message
            : '';
    if (message) return message;
  } catch {
    // Fall through to a short raw text excerpt.
  }
  return raw.slice(0, 500);
};

export function createLocalDevOllamaHelpers(ollamaRecommendedModel: string) {
  const formatOllamaUpstreamError = (
    status: number,
    body: string,
    fallback = 'Ollama Cloud request failed.',
  ): string => {
    const detail = extractOllamaErrorText(body);
    if (status === 429) {
      return `Ollama Cloud rate/quota limit likely (429).${detail ? ` ${detail}` : ''}`;
    }
    if (status === 401 || status === 403) {
      return `Ollama Cloud auth/plan/access issue (${status}).${detail ? ` ${detail}` : ''}`;
    }
    return `${fallback} (${status}).${detail ? ` ${detail}` : ''}`;
  };

  const buildOllamaModelPayload = (rawPayload: { models?: Array<Record<string, unknown>> }): LocalDevOllamaModelPayload => {
    const byId = new Map<string, Record<string, unknown>>();
    const rawModels = Array.isArray(rawPayload.models) ? rawPayload.models : [];
    for (const model of rawModels) {
      const id =
        typeof model.model === 'string' && model.model.trim()
          ? model.model.trim()
          : typeof model.name === 'string'
            ? model.name.trim()
            : '';
      if (!id) continue;
      byId.set(id, {
        id,
        name: typeof model.name === 'string' ? model.name : id,
        modified_at: typeof model.modified_at === 'string' ? model.modified_at : undefined,
        size: Number.isFinite(Number(model.size)) ? Number(model.size) : undefined,
        details: model.details && typeof model.details === 'object' ? model.details : undefined,
      });
    }
    if (!byId.has(ollamaRecommendedModel)) {
      byId.set(ollamaRecommendedModel, { id: ollamaRecommendedModel, name: ollamaRecommendedModel });
    }
    const data = [...byId.values()].sort((a, b) => {
      if (a.id === ollamaRecommendedModel) return -1;
      if (b.id === ollamaRecommendedModel) return 1;
      return String(a.id).localeCompare(String(b.id));
    });
    return { data, source: 'ollama', recommendedModel: ollamaRecommendedModel };
  };

  return {
    formatOllamaUpstreamError,
    buildOllamaModelPayload,
  };
}
