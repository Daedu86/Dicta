type OpenRouterTrainingIntent = 'adaptive' | 'precision' | 'stabilize' | 'challenge';

export function formatOpenRouterSlotDisplayLabel(slotLabel: string): string {
  switch (resolveOpenRouterTrainingIntentFromLabel(slotLabel)) {
    case 'adaptive':
      return 'Adaptive session';
    case 'precision':
      return 'Precision session';
    case 'stabilize':
      return 'Stabilize session';
    case 'challenge':
      return 'Challenge session';
    default:
      return slotLabel;
  }
}

export function getOpenRouterTrainingSlotAliases(slotLabel: string): string[] {
  switch (resolveOpenRouterTrainingIntentFromLabel(slotLabel)) {
    case 'adaptive':
      return ['Adaptive direct session'];
    default:
      return [slotLabel];
  }
}

function resolveOpenRouterTrainingIntentFromLabel(slotLabel: string): OpenRouterTrainingIntent | null {
  const normalized = slotLabel.trim().toLowerCase();
  if (normalized.includes('adaptive')) return 'adaptive';
  if (normalized.includes('easy')) return 'precision';
  if (normalized.includes('intermediate') || normalized.includes('medium')) return 'stabilize';
  if (normalized.includes('advanced') || normalized.includes('hard')) return 'challenge';
  return null;
}
