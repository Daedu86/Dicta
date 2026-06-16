import { normalizeOpenRouterModelId } from '../openrouter/_request.js';

export const DEFAULT_MEMBER_SESSION_LIMIT = 15;

export function normalizeBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString('utf8'));
    } catch {
      return {};
    }
  }
  return body;
}

export function slugProfileId(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function normalizeMemberSessionLimit(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) return Math.floor(numeric);
  return DEFAULT_MEMBER_SESSION_LIMIT;
}

export function normalizeAssignedOpenRouterModel(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  return raw ? normalizeOpenRouterModelId(raw) : null;
}

export function profileSelect() {
  return 'user_id,profile_id,display_name,role,active,can_access_openrouter,assigned_openrouter_model,session_limit,created_at,updated_at';
}

export function parseCreateAdminUserBody(rawBody) {
  const body = normalizeBody(rawBody);
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
  const requestedProfileId = typeof body.profileId === 'string' ? slugProfileId(body.profileId) : '';
  const role = body.role === 'admin' ? 'admin' : 'member';
  const canAccessOpenRouter =
    role === 'admin' ? true : typeof body.canAccessOpenRouter === 'boolean' ? body.canAccessOpenRouter : false;
  const assignedOpenRouterModel = role === 'admin' ? null : normalizeAssignedOpenRouterModel(body.assignedOpenRouterModel);
  const sessionLimit = role === 'admin' ? null : normalizeMemberSessionLimit(body.sessionLimit);

  return {
    email,
    password,
    displayName,
    requestedProfileId,
    role,
    canAccessOpenRouter,
    assignedOpenRouterModel,
    sessionLimit,
  };
}

export function resolveCreatedProfileId({ requestedProfileId, displayName, email }) {
  return requestedProfileId || slugProfileId(displayName || email.split('@')[0]);
}

export function parseProfileAccessPatchBody(rawBody) {
  const body = normalizeBody(rawBody);
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  const profileId = typeof body.profileId === 'string' ? body.profileId.trim() : '';
  const patch = { updated_at: new Date().toISOString() };

  if (typeof body.canAccessOpenRouter === 'boolean') {
    patch.can_access_openrouter = body.canAccessOpenRouter;
  }
  if ('assignedOpenRouterModel' in body) {
    patch.assigned_openrouter_model = normalizeAssignedOpenRouterModel(body.assignedOpenRouterModel);
  }
  if ('sessionLimit' in body) {
    patch.session_limit = normalizeMemberSessionLimit(body.sessionLimit);
  }

  return { userId, profileId, patch };
}

export function hasSupportedProfileAccessPatch(patch) {
  return 'can_access_openrouter' in patch || 'assigned_openrouter_model' in patch || 'session_limit' in patch;
}

export function profileAccessPatchFields(patch) {
  return Object.keys(patch).filter((key) => key !== 'updated_at');
}
