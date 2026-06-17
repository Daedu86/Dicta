import { createEmptyInputLanguageBenchmark } from '../../core/adaptive/AdaptiveInputLanguageBenchmarkService';
import { SUPPORTED_LANGUAGES } from '../../core/languages';
import type { BenchmarkLanguageButton } from '../openrouter/types';
import {
  benchmarkSubtitle,
  formatScore,
  getBenchmarkHealth,
} from './adaptiveWorkspaceViewHelpers';
import { mapSessionInputMode } from './adaptiveBenchmarkWorkspaceUtils';
import type { AdaptiveProfileMatrixProps } from './adaptiveBenchmarkWorkspaceTypes';

export function AdaptiveProfileMatrix({
  adapters,
  benchmarks,
  selectedInputMode,
  selectedLanguage,
  onSelect,
}: AdaptiveProfileMatrixProps) {
  const languages: BenchmarkLanguageButton[] = [...SUPPORTED_LANGUAGES];
  return (
    <div className="adaptive-profile-matrix" aria-label="Benchmark profile matrix">
      <div className="adaptive-profile-matrix-header" aria-hidden="true">
        <span>Input</span>
        {languages.map((language) => (
          <span key={language}>{language.toUpperCase()}</span>
        ))}
      </div>
      {adapters.map((adapter) => {
        const inputMode = mapSessionInputMode(adapter.inputMode);
        return (
          <div key={inputMode} className="adaptive-profile-matrix-row">
            <div className="adaptive-profile-matrix-input">
              <strong>{adapter.title.replace('Input # ', '#')}</strong>
              <span>{benchmarkSubtitle(inputMode)}</span>
            </div>
            {languages.map((language) => {
              const profile = benchmarks[inputMode]?.[language] ?? createEmptyInputLanguageBenchmark(inputMode, language);
              const selected = selectedInputMode === inputMode && selectedLanguage === language;
              const health = getBenchmarkHealth(profile);
              return (
                <button
                  key={`${inputMode}-${language}`}
                  type="button"
                  className={`adaptive-profile-cell adaptive-profile-cell-${health} ${selected ? 'adaptive-profile-cell-selected' : ''}`}
                  onClick={() => onSelect(inputMode, language)}
                  aria-pressed={selected}
                  title={`${inputMode}/${language}: ${formatScore(profile.sweetSpotScore)} sweet spot, ${formatScore(profile.recommendation.confidence)} confidence, ${profile.sampleCount} samples`}
                >
                  <span>{formatScore(profile.sweetSpotScore)}</span>
                  <strong>{profile.sampleCount}</strong>
                  <small>{formatScore(profile.recommendation.confidence)}</small>
                </button>
              );
            })}
          </div>
        );
      })}
      <div className="adaptive-profile-matrix-legend" aria-label="Matrix legend">
        <span><i className="adaptive-health-dot adaptive-health-strong" /> Strong</span>
        <span><i className="adaptive-health-dot adaptive-health-watch" /> Watch</span>
        <span><i className="adaptive-health-dot adaptive-health-empty" /> Not enough data</span>
      </div>
    </div>
  );
}
