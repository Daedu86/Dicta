import type { AdaptiveWeakArea } from './types';

export const RECOVERY_WEAK_AREAS = new Set<AdaptiveWeakArea>([
  'lag',
  'lag_instability',
  'low_accuracy',
  'accuracy_instability',
  'flow_instability',
  'support_dependency',
  'unsafe_boundary_pressure',
]);

export const CHALLENGE_BLOCKING_WEAK_AREAS = new Set<AdaptiveWeakArea>([
  'low_accuracy',
  'accuracy_instability',
  'lag',
  'lag_instability',
  'flow_instability',
  'support_dependency',
  'unsafe_boundaries',
  'unsafe_boundary_pressure',
  'low_semantic_completeness',
  'replay',
]);

export const BOUNDARY_SUPPORT_WEAK_AREAS = new Set<AdaptiveWeakArea>([
  'unsafe_boundaries',
  'unsafe_boundary_pressure',
  'low_semantic_completeness',
  'support_dependency',
  'replay',
]);

export function hasAny(values: Set<AdaptiveWeakArea>, targets: Set<AdaptiveWeakArea>): boolean {
  for (const value of values) {
    if (targets.has(value)) return true;
  }
  return false;
}
