import type { PacingDecision, PacingReasonCode } from './types';

export function hasPacingReason(
  decision: Pick<PacingDecision, 'reason'> & { reasonCodes?: PacingReasonCode[] },
  code: PacingReasonCode,
): boolean {
  return decision.reasonCodes?.includes(code) ?? decision.reason.includes(code);
}
