import type { OpenRouterWorkspaceProps } from './types';
import type { OpenRouterWorkspaceRuntime } from './openRouterWorkspaceRuntimeTypes';

export type OpenRouterExportProfileControlsProps = {
  workspace: OpenRouterWorkspaceProps;
  runtime: OpenRouterWorkspaceRuntime;
};

export function OpenRouterExportProfileControls({ workspace, runtime }: OpenRouterExportProfileControlsProps) {
  const { exportProfile, onSelectExportProfile } = workspace;
  const { exportLanguage, profileInputModeOptions, profileLanguageOptions } = runtime;

  return (
    <div className="openrouter-generate-controls openrouter-export-profile-controls">
      <section className="openrouter-button-control" aria-label="Section 4 input mode">
        <h4>Input mode</h4>
        <div className="openrouter-choice-row">
          {profileInputModeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`secondary-button openrouter-choice-button ${exportProfile.inputMode === option.value ? 'openrouter-choice-button-active' : ''}`}
              onClick={() => onSelectExportProfile(option.value, exportLanguage)}
              aria-pressed={exportProfile.inputMode === option.value}
              title={`Use ${option.description} benchmark exports for Section #4.`}
            >
              <span>{option.label}</span>
              <small>{option.description}</small>
            </button>
          ))}
        </div>
      </section>
      <section className="openrouter-button-control" aria-label="Section 4 language">
        <h4>Language</h4>
        <div className="openrouter-choice-row openrouter-language-row">
          {profileLanguageOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`secondary-button openrouter-choice-button ${exportLanguage === option.value ? 'openrouter-choice-button-active' : ''}`}
              onClick={() => onSelectExportProfile(exportProfile.inputMode, option.value)}
              aria-pressed={exportLanguage === option.value}
              title={`Use ${option.value} benchmark exports for Section #4.`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
