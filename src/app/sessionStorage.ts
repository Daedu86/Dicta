import {
  isTransientGenerationErrorSessionLike,
} from '../core/adaptive/openRouterFallbackScript';
import { validateDictationScript } from '../core/adaptive/dictationScriptValidation';
import { isSupportedLanguage } from '../core/languages';
import { cloneTelemetry, normalizeSessionForPersistence } from '../core/sessionNormalization';
import { normalizeRestoredSessionStatus } from '../core/sessionStatusNormalization';
import { normalizeCreatedDeviceKind } from '../core/sessionDevice';
import { BROWSER_TTS_SESSION_INPUT_MODE } from '../core/sessionInputModes';
import { safeGetLocalStorageItem } from '../core/storage/safeLocalStorage';
import { normalizeBrowserTtsEnvironmentFingerprint } from '../inputs/browserTts/browserTtsEnvironment';
import { createDefaultMetrics, createStoredSession } from './sessionFactory';
import { normalizeRestoredStoredSession as normalizeRestoredStoredSessionWithDependencies } from './sessionRestoreNormalization';
import {
  coerceSessionInputMode,
  isSessionStatus,
} from './sessionRestoreGuards';
import {
  SESSION_STORAGE_KEY,
  loadDeletedSessionIds,
} from './useSessionPersistenceSync';
import type { StoredSession } from './sessionTypes';

type StoredSessionRestoreFallbacks = {
  id: () => string;
  name: () => string;
  createdAt: () => string;
  updatedAt: () => string;
};

export function restoreStoredSessionFromPartial(
  session: Partial<StoredSession>,
  fallbacks: StoredSessionRestoreFallbacks,
): StoredSession | null {
  const inputMode = coerceSessionInputMode(session.inputMode);
  if (!inputMode) return null;

  const scriptResult = validateDictationScript(session.dictationScript);
  const telemetry = cloneTelemetry(session.telemetry);

  return normalizeRestoredStoredSession({
    id: session.id ?? fallbacks.id(),
    name: session.name ?? fallbacks.name(),
    createdAt: session.createdAt ?? fallbacks.createdAt(),
    updatedAt: session.updatedAt ?? fallbacks.updatedAt(),
    inputMode,
    inputSettingsLocked: Boolean(session.inputSettingsLocked),
    ttsText: session.ttsText ?? '',
    ttsLanguage: isSupportedLanguage(session.ttsLanguage) ? session.ttsLanguage : null,
    ttsVoiceURI:
      inputMode === BROWSER_TTS_SESSION_INPUT_MODE && typeof session.ttsVoiceURI === 'string'
        ? session.ttsVoiceURI
        : null,
    ttsEnvironment:
      inputMode === BROWSER_TTS_SESSION_INPUT_MODE
        ? normalizeBrowserTtsEnvironmentFingerprint(session.ttsEnvironment)
        : undefined,
    ttsPracticeText: session.ttsPracticeText ?? '',
    difficulty: session.difficulty ?? 'normal',
    status: normalizeRestoredSessionStatus(
      isSessionStatus(session.status) ? session.status : 'ready',
      telemetry,
    ),
    metrics: {
      ...createDefaultMetrics(),
      ...session.metrics,
    },
    telemetry,
    sessionSource: session.sessionSource === 'dictationScript' && scriptResult.ok ? 'dictationScript' : 'plainText',
    generationOrigin:
      session.generationOrigin === 'openrouter' || session.generationOrigin === 'fallback-template'
        ? session.generationOrigin
        : 'manual',
    createdDeviceKind: normalizeCreatedDeviceKind(session.createdDeviceKind),
    createdDeviceLabel: typeof session.createdDeviceLabel === 'string' ? session.createdDeviceLabel : undefined,
    dictationScript: scriptResult.ok ? scriptResult.script : null,
    generationError: typeof session.generationError === 'string' ? session.generationError : undefined,
  });
}

export function asAdminRemoteStoredSession(value: unknown): StoredSession | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Partial<StoredSession> & { deleted?: boolean };
  if (record.deleted === true || typeof record.id !== 'string') return null;
  const remoteSessionId = record.id;

  return restoreStoredSessionFromPartial(record, {
    id: () => remoteSessionId,
    name: () => 'Remote session',
    createdAt: () => new Date(0).toISOString(),
    updatedAt: () => new Date(0).toISOString(),
  });
}

export function normalizeRestoredStoredSession(session: StoredSession): StoredSession {
  return normalizeRestoredStoredSessionWithDependencies(session, {
    browserTtsInputMode: BROWSER_TTS_SESSION_INPUT_MODE,
    cloneTelemetry,
    normalizeBrowserTtsEnvironmentFingerprint,
    normalizeRestoredSessionStatus,
    normalizeSessionForPersistence,
  });
}

export function loadSessions(): StoredSession[] {
  const raw = safeGetLocalStorageItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>[];
    if (parsed.length === 0) {
      return [];
    }

    const deletedIds = loadDeletedSessionIds();

    return parsed
      .map((session, index) =>
        restoreStoredSessionFromPartial(session, {
          id: () => createStoredSession(index + 1).id,
          name: () => `Session ${index + 1}`,
          createdAt: () => new Date().toISOString(),
          updatedAt: () => new Date().toISOString(),
        }),
      )
      .filter(
        (session): session is StoredSession =>
          Boolean(
            session &&
              !deletedIds.has(session.id) &&
              !isTransientGenerationErrorSessionLike(session),
          ),
      );
  } catch {
    return [];
  }
}
