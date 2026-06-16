import type { OpenRouterModelSummary } from './types';

export function buildOpenRouterModelOptions(
  models: OpenRouterModelSummary[],
  assignedModels: Array<string | null | undefined> = [],
): OpenRouterModelSummary[] {
  const byId = new Map<string, OpenRouterModelSummary>();
  for (const model of models) {
    const id = model.id.trim();
    if (id) byId.set(id, { ...model, id });
  }
  for (const assignedModel of assignedModels) {
    const id = assignedModel?.trim();
    if (id && !byId.has(id)) byId.set(id, { id });
  }
  return [...byId.values()].sort((a, b) => {
    if (a.id === 'openrouter/free') return -1;
    if (b.id === 'openrouter/free') return 1;
    return a.id.localeCompare(b.id);
  });
}
