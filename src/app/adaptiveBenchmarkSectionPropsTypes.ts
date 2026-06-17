import type { ComponentProps, Dispatch, SetStateAction } from 'react';
import type { AdaptiveBenchmarkSection } from '../components/adaptive-workspace/AdaptiveBenchmarkWorkspace';

export type AdaptiveBenchmarkSectionProps = ComponentProps<typeof AdaptiveBenchmarkSection>;
export type AdaptiveBenchmarkProfile = AdaptiveBenchmarkSectionProps['selectedProfile'];
export type AdaptiveBenchmarkFeedback = AdaptiveBenchmarkSectionProps['sessionFeedback'];

export type AsyncOrSyncBenchmarkHandler<TArgs extends unknown[]> = (...args: TArgs) => void | Promise<void>;

export type UseAdaptiveBenchmarkSectionPropsArgs<TAdaptiveSectionExpanded extends { benchmarks: boolean }> = Omit<
  AdaptiveBenchmarkSectionProps,
  | 'id'
  | 'adapters'
  | 'benchmarks'
  | 'expanded'
  | 'focusAnchor'
  | 'selectedInputMode'
  | 'selectedLanguage'
  | 'selectedProfile'
  | 'formatSessionDate'
  | 'onToggleExpanded'
  | 'onSelect'
  | 'sessionFeedback'
  | 'onCopyBenchmark'
  | 'onExportBenchmark'
  | 'onCopyScriptPrompt'
  | 'onCopyBenchmarkWithScriptPrompt'
  | 'onCopyScriptTemplate'
  | 'onCopySessionFeedback'
  | 'onCopyBenchmarkFeedback'
  | 'onCopyBenchmarkFeedbackPrompt'
  | 'onCopyBenchmarkFeedbackPromptWithHumanFeedback'
> & {
  adaptiveAdapters: AdaptiveBenchmarkSectionProps['adapters'];
  adaptiveBenchmarksByInputLanguage: AdaptiveBenchmarkSectionProps['benchmarks'];
  adaptiveSectionExpanded: TAdaptiveSectionExpanded;
  adaptiveBenchmarksFocusAnchor: AdaptiveBenchmarkSectionProps['focusAnchor'];
  selectedBenchmarkInputMode: AdaptiveBenchmarkSectionProps['selectedInputMode'];
  selectedBenchmarkLanguage: AdaptiveBenchmarkSectionProps['selectedLanguage'];
  selectedBenchmarkProfile: AdaptiveBenchmarkProfile;
  selectedSessionFeedback: AdaptiveBenchmarkFeedback;
  formatSessionDate: AdaptiveBenchmarkSectionProps['formatSessionDate'];
  setAdaptiveSectionExpanded: Dispatch<SetStateAction<TAdaptiveSectionExpanded>>;
  setSelectedBenchmarkInputMode: (inputMode: AdaptiveBenchmarkSectionProps['selectedInputMode']) => void;
  setSelectedBenchmarkLanguage: (language: AdaptiveBenchmarkSectionProps['selectedLanguage']) => void;
  setBenchmarkExportMessage: (message: string) => void;
  setSessionFeedbackMessage: (message: string) => void;
  copySelectedBenchmarkJson: AsyncOrSyncBenchmarkHandler<[AdaptiveBenchmarkProfile]>;
  downloadSelectedBenchmarkJson: AsyncOrSyncBenchmarkHandler<[AdaptiveBenchmarkProfile]>;
  copyDictationScriptPrompt: AsyncOrSyncBenchmarkHandler<[AdaptiveBenchmarkProfile]>;
  copyBenchmarkWithDictationScriptPrompt: AsyncOrSyncBenchmarkHandler<[AdaptiveBenchmarkProfile]>;
  copyDictationScriptTemplate: AsyncOrSyncBenchmarkHandler<[AdaptiveBenchmarkProfile]>;
  copySessionFeedbackJson: AsyncOrSyncBenchmarkHandler<[AdaptiveBenchmarkProfile, AdaptiveBenchmarkFeedback]>;
  copyBenchmarkFeedbackJson: AsyncOrSyncBenchmarkHandler<[AdaptiveBenchmarkProfile, AdaptiveBenchmarkFeedback]>;
  copyBenchmarkFeedbackPrompt: AsyncOrSyncBenchmarkHandler<[AdaptiveBenchmarkProfile, AdaptiveBenchmarkFeedback]>;
  copyBenchmarkFeedbackPromptWithHumanFeedback: AsyncOrSyncBenchmarkHandler<[
    AdaptiveBenchmarkProfile,
    AdaptiveBenchmarkFeedback,
    string,
  ]>;
};
