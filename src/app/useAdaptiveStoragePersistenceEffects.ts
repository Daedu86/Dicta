import { useEffect } from 'react';
import type {
  AdaptiveBenchmarksByInputLanguage,
  AdaptiveSessionFeedbackByInputLanguage,
} from '../components/openrouter/types';
import {
  persistAdaptiveBenchmarks,
  persistAdaptiveSessionFeedback,
} from './adaptiveStorage';

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
    persistAdaptiveBenchmarks(adaptiveBenchmarksByInputLanguage);
  }, [adaptiveBenchmarksByInputLanguage, localStorageReadyForEffectiveProfile]);

  useEffect(() => {
    adaptiveBenchmarksRef.current = adaptiveBenchmarksByInputLanguage;
  }, [adaptiveBenchmarksByInputLanguage, adaptiveBenchmarksRef]);

  useEffect(() => {
    adaptiveSessionFeedbackRef.current = adaptiveSessionFeedbackByInputLanguage;
    if (!localStorageReadyForEffectiveProfile) return;
    persistAdaptiveSessionFeedback(adaptiveSessionFeedbackByInputLanguage);
  }, [
    adaptiveSessionFeedbackByInputLanguage,
    adaptiveSessionFeedbackRef,
    localStorageReadyForEffectiveProfile,
  ]);
}
