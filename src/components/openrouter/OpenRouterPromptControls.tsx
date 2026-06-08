export type OpenRouterChoiceOption<Value extends string = string> = {
  value: Value;
  label: string;
  description: string;
};

export type OpenRouterLanguageOption<Value extends string = string> = {
  value: Value;
  label: string;
};

export type OpenRouterPromptControlsProps<
  InputModeValue extends string = string,
  LanguageValue extends string = string,
  PromptSourceValue extends string = string,
  DurationValue extends number = number,
> = {
  inputModeOptions: Array<OpenRouterChoiceOption<InputModeValue>>;
  selectedInputMode: InputModeValue;
  onSelectInputMode: (value: InputModeValue) => void;

  durationOptions: DurationValue[];
  selectedDurationMinutes: DurationValue;
  onSelectDurationMinutes: (value: DurationValue) => void;

  languageOptions: Array<OpenRouterLanguageOption<LanguageValue>>;
  selectedLanguage: LanguageValue;
  onSelectLanguage: (value: LanguageValue) => void;

  promptSourceOptions: Array<OpenRouterChoiceOption<PromptSourceValue>>;
  selectedPromptSource: PromptSourceValue;
  onSelectPromptSource: (value: PromptSourceValue) => void;
};

export function OpenRouterPromptControls<
  InputModeValue extends string = string,
  LanguageValue extends string = string,
  PromptSourceValue extends string = string,
  DurationValue extends number = number,
>({
  inputModeOptions,
  selectedInputMode,
  onSelectInputMode,
  durationOptions,
  selectedDurationMinutes,
  onSelectDurationMinutes,
  languageOptions,
  selectedLanguage,
  onSelectLanguage,
  promptSourceOptions,
  selectedPromptSource,
  onSelectPromptSource,
}: OpenRouterPromptControlsProps<InputModeValue, LanguageValue, PromptSourceValue, DurationValue>) {
  const visibleInputModeOptions = inputModeOptions.filter((option) => option.value !== 'cosyvoice-cache');

  return (
    <div className="openrouter-generate-controls">
      <section className="openrouter-button-control" aria-label="Input mode">
        <h4>Input mode</h4>
        <div className="openrouter-choice-row">
          {visibleInputModeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`secondary-button openrouter-choice-button ${selectedInputMode === option.value ? 'openrouter-choice-button-active' : ''}`}
              onClick={() => onSelectInputMode(option.value)}
              aria-pressed={selectedInputMode === option.value}
              title={`Use ${option.description} as the required generated script inputMode (${option.value}).`}
            >
              <span>{option.label}</span>
              <small>{option.description}</small>
            </button>
          ))}
        </div>
      </section>
      <section className="openrouter-button-control" aria-label="Duration">
        <h4>Duration</h4>
        <div className="openrouter-choice-row openrouter-language-row">
          {durationOptions.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={`secondary-button openrouter-choice-button ${selectedDurationMinutes === minutes ? 'openrouter-choice-button-active' : ''}`}
              onClick={() => onSelectDurationMinutes(minutes)}
              aria-pressed={selectedDurationMinutes === minutes}
              title={`Generate a ${minutes}-minute voice/audio session and request estimatedDurationSec close to ${minutes * 60}.`}
            >
              {minutes} min
            </button>
          ))}
        </div>
      </section>
      <section className="openrouter-button-control" aria-label="Language">
        <h4>Language</h4>
        <div className="openrouter-choice-row openrouter-language-row">
          {languageOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`secondary-button openrouter-choice-button ${selectedLanguage === option.value ? 'openrouter-choice-button-active' : ''}`}
              onClick={() => onSelectLanguage(option.value)}
              aria-pressed={selectedLanguage === option.value}
              title={`Use ${option.value} as the required generated script language.`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
      <section className="openrouter-button-control openrouter-prompt-source-control" aria-label="Prompt source">
        <h4>Prompt source</h4>
        <div className="openrouter-choice-row">
          {promptSourceOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`secondary-button openrouter-choice-button ${selectedPromptSource === option.value ? 'openrouter-choice-button-active' : ''}`}
              onClick={() => onSelectPromptSource(option.value)}
              aria-pressed={selectedPromptSource === option.value}
              title={option.description}
            >
              <span>{option.label}</span>
              <small>{option.description}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
