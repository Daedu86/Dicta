import type { PacingDecision, PacingReasonCode } from './types';

export function hasPacingReason(
  decision: Pick<PacingDecision, 'reason'> & { reasonCodes?: PacingReasonCode[] },
  code: PacingReasonCode,
): boolean {
  return decision.reasonCodes?.includes(code) ?? hasLegacyReasonToken(decision.reason, code);
}

export function hasLegacyReasonToken(reason: string, token: string): boolean {
  return reason
    .split(',')
    .map((part) => part.trim())
    .includes(token);
}

export function appendLegacyReasonToken(reason: string, token: string): string {
  return hasLegacyReasonToken(reason, token) ? reason : `${reason}, ${token}`;
}
