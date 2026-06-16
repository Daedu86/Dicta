type OpenRouterTrainingIntent = 'precision' | 'stabilize' | 'challenge';

export function formatOpenRouterSlotDisplayLabel(slotLabel: string): string {
  switch (resolveOpenRouterTrainingIntentFromLabel(slotLabel)) {
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
    case 'precision':
      return ['Easy direct session', 'Express easy direct session'];
    case 'stabilize':
      return ['Intermediate direct session', 'Express intermediate direct session'];
    case 'challenge':
      return ['Advanced direct session', 'Express advanced direct session'];
    default:
      return [slotLabel];
  }
}

function resolveOpenRouterTrainingIntentFromLabel(slotLabel: string): OpenRouterTrainingIntent | null {
  const normalized = slotLabel.trim().toLowerCase();
  if (normalized.includes('easy')) return 'precision';
  if (normalized.includes('intermediate') || normalized.includes('medium')) return 'stabilize';
  if (normalized.includes('advanced') || normalized.includes('hard')) return 'challenge';
  return null;
}
