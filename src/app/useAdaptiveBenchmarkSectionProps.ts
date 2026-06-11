import { useMemo, type ComponentProps, type Dispatch, type SetStateAction } from 'react';
import type { AdaptiveBenchmarkSection } from '../components/adaptive-workspace/AdaptiveBenchmarkWorkspace';

type AdaptiveBenchmarkSectionProps = ComponentProps<typeof AdaptiveBenchmarkSection>;
type AdaptiveBenchmarkProfile = AdaptiveBenchmarkSectionProps['selectedProfile'];
type AdaptiveBenchmarkFeedback = AdaptiveBenchmarkSectionProps['sessionFeedback'];

type AsyncOrSyncBenchmarkHandler<TArgs extends unknown[]> = (...args: TArgs) => void | Promise<void>;

type UseAdaptiveBenchmarkSectionPropsArgs<TAdaptiveSectionExpanded extends { benchmarks: boolean }> = Omit<
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

export function useAdaptiveBenchmarkSectionProps<TAdaptiveSectionExpanded extends { benchmarks: boolean }>({
  adaptiveAdapters,
  adaptiveBenchmarksByInputLanguage,
  adaptiveSectionExpanded,
  adaptiveBenchmarksFocusAnchor,
  selectedBenchmarkInputMode,
  selectedBenchmarkLanguage,
  selectedBenchmarkProfile,
  repeatWordStats,
  benchmarkExportMessage,
  selectedSessionFeedback,
  sessionFeedbackMessage,
  formatSessionDate,
  setAdaptiveSectionExpanded,
  setSelectedBenchmarkInputMode,
  setSelectedBenchmarkLanguage,
  setBenchmarkExportMessage,
  setSessionFeedbackMessage,
  copySelectedBenchmarkJson,
  downloadSelectedBenchmarkJson,
  copyDictationScriptPrompt,
  copyBenchmarkWithDictationScriptPrompt,
  copyDictationScriptTemplate,
  copySessionFeedbackJson,
  copyBenchmarkFeedbackJson,
  copyBenchmarkFeedbackPrompt,
  copyBenchmarkFeedbackPromptWithHumanFeedback,
}: UseAdaptiveBenchmarkSectionPropsArgs<TAdaptiveSectionExpanded>): AdaptiveBenchmarkSectionProps {
  return useMemo(
    () => ({
      id: 'adaptive-benchmarks',
      adapters: adaptiveAdapters,
      benchmarks: adaptiveBenchmarksByInputLanguage,
      expanded: adaptiveSectionExpanded.benchmarks,
      onToggleExpanded: () => setAdaptiveSectionExpanded((prev) => ({ ...prev, benchmarks: !prev.benchmarks })),
      focusAnchor: adaptiveBenchmarksFocusAnchor,
      selectedInputMode: selectedBenchmarkInputMode,
      selectedLanguage: selectedBenchmarkLanguage,
      selectedProfile: selectedBenchmarkProfile,
      repeatWordStats,
      formatSessionDate,
      onSelect: (inputMode, language) => {
        setSelectedBenchmarkInputMode(inputMode);
        setSelectedBenchmarkLanguage(language);
        setBenchmarkExportMessage('');
        setSessionFeedbackMessage('');
      },
      benchmarkExportMessage,
      sessionFeedback: selectedSessionFeedback,
      sessionFeedbackMessage,
      onCopyBenchmark: (profile) => {
        void copySelectedBenchmarkJson(profile);
      },
      onExportBenchmark: (profile) => {
        void downloadSelectedBenchmarkJson(profile);
      },
      onCopyScriptPrompt: (profile) => {
        void copyDictationScriptPrompt(profile);
      },
      onCopyBenchmarkWithScriptPrompt: (profile) => {
        void copyBenchmarkWithDictationScriptPrompt(profile);
      },
      onCopyScriptTemplate: (profile) => {
        void copyDictationScriptTemplate(profile);
      },
      onCopySessionFeedback: (profile, feedback) => {
        void copySessionFeedbackJson(profile, feedback);
      },
      onCopyBenchmarkFeedback: (profile, feedback) => {
        void copyBenchmarkFeedbackJson(profile, feedback);
      },
      onCopyBenchmarkFeedbackPrompt: (profile, feedback) => {
        void copyBenchmarkFeedbackPrompt(profile, feedback);
      },
      onCopyBenchmarkFeedbackPromptWithHumanFeedback: (profile, feedback, humanFeedback) => {
        void copyBenchmarkFeedbackPromptWithHumanFeedback(profile, feedback, humanFeedback);
      },
    }),
    [
      adaptiveAdapters,
      adaptiveBenchmarksByInputLanguage,
      adaptiveSectionExpanded.benchmarks,
      adaptiveBenchmarksFocusAnchor,
      selectedBenchmarkInputMode,
      selectedBenchmarkLanguage,
      selectedBenchmarkProfile,
      repeatWordStats,
      formatSessionDate,
      benchmarkExportMessage,
      selectedSessionFeedback,
      sessionFeedbackMessage,
      setAdaptiveSectionExpanded,
      setSelectedBenchmarkInputMode,
      setSelectedBenchmarkLanguage,
      setBenchmarkExportMessage,
      setSessionFeedbackMessage,
      copySelectedBenchmarkJson,
      downloadSelectedBenchmarkJson,
      copyDictationScriptPrompt,
      copyBenchmarkWithDictationScriptPrompt,
      copyDictationScriptTemplate,
      copySessionFeedbackJson,
      copyBenchmarkFeedbackJson,
      copyBenchmarkFeedbackPrompt,
      copyBenchmarkFeedbackPromptWithHumanFeedback,
    ],
  );
}
