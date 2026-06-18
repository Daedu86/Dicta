import { useEffect } from 'react';
import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
} from '../components/openrouter/types';
import {
  persistAdaptiveBenchmarks,
  persistAdaptiveSessionFeedback,
} from './adaptiveStorage';
import {
  saveAdaptiveBenchmarks as saveAdaptiveBenchmarksToIndexedDb,
} from '../core/localDb/adaptiveBenchmarkLocalStore';
import {
  saveAdaptiveSessionFeedback as saveAdaptiveSessionFeedbackToIndexedDb,
} from '../core/localDb/adaptiveFeedbackLocalStore';
import { readActiveSyncStorageProfileId } from '../core/profileScopedStorage';
import { resolveLocalPayloadProfileId } from './sessionPersistenceSync/sessionPersistenceLocalPayloadStore';

interface UseAdaptiveStoragePersistenceEffectsOptions {
  adaptiveBenchmarksByInputLanguage: AdaptiveBenchmarksByInputLanguage;
  adaptiveBenchmarksRef: { current: AdaptiveBenchmarksByInputLanguage };
  adaptiveSessionFeedbackByInputLanguage: AdaptiveSessionFeedbackByInputLanguage;
  adaptiveSessionFeedbackRef: { current: AdaptiveSessionFeedbackByInputLanguage };
  localStorageReadyForEffectiveProfile: boolean;
}

export function useAdaptiveStoragePersistenceEffects({
  adaptiveBenchmarksByInputLanguage,
  adaptiveBenchmarksRef,
  adaptiveSessionFeedbackByInputLanguage,
  adaptiveSessionFeedbackRef,
  localStorageReadyForEffectiveProfile,
}: UseAdaptiveStoragePersistenceEffectsOptions): void {
  useEffect(() => {
    if (!localStorageReadyForEffectiveProfile) return;
    const profileId = getActiveLocalPayloadProfileId();
    void saveAdaptiveBenchmarksToIndexedDb(profileId, adaptiveBenchmarksByInputLanguage).catch((error: unknown) => {
      console.warn('[DictaStorage] IndexedDB adaptive benchmark write failed; falling back to localStorage.', error);
      persistAdaptiveBenchmarks(adaptiveBenchmarksByInputLanguage);
    });
  }, [adaptiveBenchmarksByInputLanguage, localStorageReadyForEffectiveProfile]);

  useEffect(() => {
    adaptiveBenchmarksRef.current = adaptiveBenchmarksByInputLanguage;
  }, [adaptiveBenchmarksByInputLanguage, adaptiveBenchmarksRef]);

  useEffect(() => {
    adaptiveSessionFeedbackRef.current = adaptiveSessionFeedbackByInputLanguage;
    if (!localStorageReadyForEffectiveProfile) return;
    const profileId = getActiveLocalPayloadProfileId();
    void saveAdaptiveSessionFeedbackToIndexedDb(profileId, adaptiveSessionFeedbackByInputLanguage).catch((error: unknown) => {
      console.warn('[DictaStorage] IndexedDB adaptive feedback write failed; falling back to localStorage.', error);
      persistAdaptiveSessionFeedback(adaptiveSessionFeedbackByInputLanguage);
    });
  }, [
    adaptiveSessionFeedbackByInputLanguage,
    adaptiveSessionFeedbackRef,
    localStorageReadyForEffectiveProfile,
  ]);
}

function getActiveLocalPayloadProfileId(): string {
  return resolveLocalPayloadProfileId(readActiveSyncStorageProfileId(window.localStorage));
}
