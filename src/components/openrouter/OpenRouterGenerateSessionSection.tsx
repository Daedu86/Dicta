import { OpenRouterGenerateActionPanel } from './OpenRouterGenerateActionPanel';
import { OpenRouterGenerateSummary } from './OpenRouterGenerateSummary';
import { OpenRouterGeneratedOutputPanel } from './OpenRouterGeneratedOutputPanel';
import { OpenRouterGenerationStatusPanel } from './OpenRouterGenerationStatusPanel';
import { OpenRouterPromptControls } from './OpenRouterPromptControls';
import { OpenRouterSlotSelector } from './OpenRouterSlotSelector';
import { OPENROUTER_GENERATION_SLOT_IDS, formatElapsedMs, getOpenRouterSlotLabel, validateGeneratedScriptForTarget } from './openRouterViewHelpers';
import type { OpenRouterGenerateSessionRuntime } from './useOpenRouterGenerateSessionRuntime';

export type OpenRouterGenerateSessionSectionProps = { runtime: OpenRouterGenerateSessionRuntime };

export function OpenRouterGenerateSessionSection({ runtime }: OpenRouterGenerateSessionSectionProps) {
  const slots = OPENROUTER_GENERATION_SLOT_IDS.map((slotId) => {
    const slot = runtime.generationSlots[slotId];
    const slotValidation = slot.json && slot.inputMode && slot.language ? validateGeneratedScriptForTarget(slot.json, slot.inputMode, slot.language) : null;
    return {
      id: slotId,
      label: getOpenRouterSlotLabel(slotId),
      active: runtime.activeGenerateSlotId === slotId,
      statusLabel: slotValidation?.ok ? 'ready to create' : slot.error ? 'needs fix' : slot.json || slot.text ? 'draft saved' : 'empty setup',
    };
  });

  return (
    <div className="admin-card-body">
      <OpenRouterSlotSelector slots={slots} onSelectSlot={runtime.setActiveGenerateSlotId} />
      <OpenRouterGenerateSummary
        targetLabel={`${runtime.generateInputMode}/${runtime.generateLanguage}`}
        benchmarkAvailable={runtime.generateHasBenchmarkData}
        feedbackAvailable={runtime.generateHasSessionFeedback}
        durationLabel={`${runtime.generateDurationMinutes} min`}
        promptSizeLabel={runtime.formatPromptSizeHint(runtime.activeGenerateSlotPrompt).replace('Words: ', '').replace(' · Tokens:', ' /')}
        prompt={runtime.activeGenerateSlotPrompt}
      >
        <OpenRouterPromptControls
          inputModeOptions={runtime.generateInputModeOptions}
          selectedInputMode={runtime.generateInputMode}
          onSelectInputMode={runtime.setGenerateInputMode}
          durationOptions={runtime.generateDurationOptions}
          selectedDurationMinutes={runtime.generateDurationMinutes}
          onSelectDurationMinutes={runtime.setGenerateDurationMinutes}
          languageOptions={runtime.profileLanguageOptions}
          selectedLanguage={runtime.generateLanguage}
          onSelectLanguage={runtime.setGenerateLanguage}
          promptSourceOptions={runtime.generatePromptSourceOptions}
          selectedPromptSource={runtime.generatePromptSource}
          onSelectPromptSource={runtime.setGeneratePromptSource}
        />
      </OpenRouterGenerateSummary>
      <OpenRouterGenerateActionPanel
        disabled={runtime.activeGenerateSlotBusy || !runtime.activeGenerateSlotModel}
        requesting={Boolean(runtime.generateBusySlots[runtime.activeGenerateSlotId])}
        generating={Boolean(runtime.activeGenerateSlotJob)}
        slotLabel={getOpenRouterSlotLabel(runtime.activeGenerateSlotId)}
        model={runtime.activeGenerateSlotModel}
        onGenerate={() => void runtime.generateOpenRouterSlot(runtime.activeGenerateSlotId)}
      />
      <OpenRouterGenerationStatusPanel
        slotLabel={getOpenRouterSlotLabel(runtime.activeGenerateSlotId)}
        jobNotice={runtime.activeGenerateSlotJobNotice}
        usage={runtime.activeGenerateSlot.usage}
        elapsedLabel={runtime.activeGenerateSlot.elapsedMs !== null ? formatElapsedMs(runtime.activeGenerateSlot.elapsedMs) : null}
        generatedAtLabel={runtime.activeGenerateSlot.generatedAt ? new Date(runtime.activeGenerateSlot.generatedAt).toLocaleString() : null}
        error={runtime.activeGenerateSlot.error}
        hasDraft={Boolean(runtime.activeGenerateSlot.json || runtime.activeGenerateSlot.text)}
        draftInputMode={runtime.activeGenerateSlot.inputMode}
        draftLanguage={runtime.activeGenerateSlot.language}
        onClearDraft={() => runtime.clearGeneratedScriptDraft(runtime.activeGenerateSlotId)}
      />
      <OpenRouterGeneratedOutputPanel
        slotLabel={getOpenRouterSlotLabel(runtime.activeGenerateSlotId)}
        validationSummary={
          runtime.activeGenerateSlotValidation?.ok
            ? {
                title: runtime.activeGenerateSlotValidation.script.title,
                inputMode: String(runtime.activeGenerateSlotValidation.script.inputMode),
                language: runtime.activeGenerateSlotValidation.script.language,
                difficulty: runtime.activeGenerateSlotValidation.script.difficulty,
                phrases: String(runtime.activeGenerateSlotValidation.script.phrases.length),
                duration: `${runtime.activeGenerateSlotValidation.script.estimatedDurationSec}s`,
              }
            : null
        }
        json={runtime.activeGenerateSlot.json}
        text={runtime.activeGenerateSlot.text}
      />
    </div>
  );
}
