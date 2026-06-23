import { useEffect, useMemo, useState } from 'react';
import {
  OPEN_ROUTER_DIRECT_GENERATION_DURATION_OPTIONS,
  OPEN_ROUTER_DIRECT_GENERATION_PRESETS,
  type OpenRouterDirectGenerationPreset,
} from '../../app/openRouterDirectGenerationPresets';
import { buildOpenRouterDirectGenerationJobPlan } from '../../app/openRouterDirectGenerationJobPlan';
import { normalizeOpenRouterDirectGenerationTopicContext } from '../../app/openRouterDirectGenerationTopicContext';
import type { OpenRouterDurationMinutes } from '../../core/adaptive/openRouterGenerationPrompt';
import type { BenchmarkLanguageButton, OpenRouterWorkspaceProps } from '../openrouter/types';

export const OPENROUTER_DIRECT_GENERATION_CARD_ID = 'adaptive-flow-generation-session-card';

const MAX_ACTIVE_OPEN_ROUTER_JOBS_PER_VARIANT = 3;

type AdaptiveFlowDirectGenerationVariant = 'without-context' | 'with-context';

type AdaptiveFlowDirectGenerationCardProps = {
  openRouterWorkspaceProps: OpenRouterWorkspaceProps;
  selectedLanguageCode: BenchmarkLanguageButton;
};

type DirectGenerationPreview = {
  variant: AdaptiveFlowDirectGenerationVariant;
  preset: OpenRouterDirectGenerationPreset;
  plan: ReturnType<typeof buildOpenRouterDirectGenerationJobPlan>;
};

export function AdaptiveFlowDirectGenerationCard({
  openRouterWorkspaceProps,
  selectedLanguageCode,
}: AdaptiveFlowDirectGenerationCardProps) {
  const [contextText, setContextText] = useState('');
  const [previewVariant, setPreviewVariant] = useState<AdaptiveFlowDirectGenerationVariant>('without-context');
  const normalizedContext = normalizeOpenRouterDirectGenerationTopicContext(contextText);
  const durationMinutes = openRouterWorkspaceProps.directGenerationDurationMinutes;
  const previews = useMemo(() => buildDirectGenerationPreviews({
    openRouterWorkspaceProps,
    selectedLanguageCode,
    durationMinutes,
    normalizedContext,
  }), [durationMinutes, normalizedContext, openRouterWorkspaceProps, selectedLanguageCode]);
  const activePreview = previewVariant === 'with-context' ? previews.withContext : previews.withoutContext;
  const adaptiveActiveCount = countActiveJobsForPreset(openRouterWorkspaceProps, OPEN_ROUTER_DIRECT_GENERATION_PRESETS.adaptive);
  const topicActiveCount = countActiveJobsForPreset(openRouterWorkspaceProps, OPEN_ROUTER_DIRECT_GENERATION_PRESETS.topic);
  const adaptiveDisabled = isDirectGenerationDisabled({
    openRouterWorkspaceProps,
    busy: openRouterWorkspaceProps.adaptiveOpenRouterBusy,
    activeCount: adaptiveActiveCount,
  });
  const topicDisabled = isDirectGenerationDisabled({
    openRouterWorkspaceProps,
    busy: openRouterWorkspaceProps.topicOpenRouterBusy,
    activeCount: topicActiveCount,
    requiresContext: true,
    normalizedContext,
  });

  useEffect(() => {
    if (openRouterWorkspaceProps.focusGenerateRequest === 0) return;
    window.setTimeout(() => {
      document.getElementById(OPENROUTER_DIRECT_GENERATION_CARD_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, [openRouterWorkspaceProps.focusGenerateRequest]);

  const generateWithoutContext = () => {
    void openRouterWorkspaceProps.onGenerateAdaptiveDirectSession({
      durationMinutes,
      inputModeOverride: 'browser-tts',
      languageOverride: selectedLanguageCode,
    });
  };

  const generateWithContext = () => {
    if (!normalizedContext) return;
    void openRouterWorkspaceProps.onGenerateTopicDirectSession({
      durationMinutes,
      topicContext: normalizedContext,
      inputModeOverride: 'browser-tts',
      languageOverride: selectedLanguageCode,
    });
  };

  return (
    <div className="adaptive-flow-direct-generation-card">
      <div className="adaptive-flow-direct-generation-grid">
        <section className="adaptive-flow-direct-generation-panel" aria-label="Direct generation duration">
          <p className="dashboard-eyebrow">Duration source</p>
          <div className="adaptive-flow-direct-duration-row" aria-label="Direct generation duration options">
            {OPEN_ROUTER_DIRECT_GENERATION_DURATION_OPTIONS.map((minutes) => (
              <button
                type="button"
                key={minutes}
                className={`secondary-button adaptive-flow-direct-duration-button${durationMinutes === minutes ? ' adaptive-flow-direct-duration-button-active' : ''}`}
                aria-pressed={durationMinutes === minutes}
                onClick={() => openRouterWorkspaceProps.onChangeDirectGenerationDurationMinutes(minutes)}
              >
                {minutes} min
              </button>
            ))}
          </div>
        </section>

        <section className="adaptive-flow-direct-generation-panel" aria-label="Direct generation context">
          <label className="adaptive-flow-direct-context-label" htmlFor="adaptive-flow-direct-context">
            <span>My context</span>
            <textarea
              id="adaptive-flow-direct-context"
              value={contextText}
              onChange={(event) => setContextText(event.target.value)}
              placeholder="Theme, situation, vocabulary, or constraints for the context variant."
              rows={4}
            />
          </label>
        </section>
      </div>

      <div className="adaptive-flow-direct-action-row" aria-label="Direct generation actions">
        <button
          type="button"
          className="training-generation-button adaptive-flow-direct-generation-button"
          onClick={generateWithoutContext}
          disabled={adaptiveDisabled}
          title={buildButtonTitle(openRouterWorkspaceProps, adaptiveActiveCount)}
        >
          {openRouterWorkspaceProps.adaptiveOpenRouterBusy ? 'Requesting prompt...' : formatActionLabel('Prompt generation', adaptiveActiveCount)}
        </button>
        <button
          type="button"
          className="training-generation-button adaptive-flow-direct-generation-button"
          onClick={generateWithContext}
          disabled={topicDisabled}
          title={normalizedContext ? buildButtonTitle(openRouterWorkspaceProps, topicActiveCount) : 'Add my context first.'}
        >
          {openRouterWorkspaceProps.topicOpenRouterBusy ? 'Requesting context prompt...' : formatActionLabel('Prompt generation + my context', topicActiveCount)}
        </button>
      </div>

      <section className="adaptive-flow-direct-preview" aria-label="Prompt preview sent to OpenRouter">
        <div className="adaptive-flow-direct-preview-header">
          <div>
            <p className="dashboard-eyebrow">Prompt preview</p>
            <h4>Prompt sent to OpenRouter</h4>
          </div>
          <div className="adaptive-flow-direct-preview-tabs" aria-label="Prompt preview variant">
            <button
              type="button"
              className={`secondary-button adaptive-flow-direct-preview-tab${previewVariant === 'without-context' ? ' adaptive-flow-direct-preview-tab-active' : ''}`}
              aria-pressed={previewVariant === 'without-context'}
              onClick={() => setPreviewVariant('without-context')}
            >
              without context
            </button>
            <button
              type="button"
              className={`secondary-button adaptive-flow-direct-preview-tab${previewVariant === 'with-context' ? ' adaptive-flow-direct-preview-tab-active' : ''}`}
              aria-pressed={previewVariant === 'with-context'}
              onClick={() => setPreviewVariant('with-context')}
            >
              with my context
            </button>
          </div>
        </div>
        <dl className="adaptive-flow-direct-preview-meta">
          <PreviewMetric label="Target" value={`${activePreview.plan.jobRequestBody.inputMode}/${activePreview.plan.jobRequestBody.language}`} />
          <PreviewMetric label="Duration" value={`${activePreview.plan.jobRequestBody.durationMinutes} min`} />
          <PreviewMetric label="Difficulty" value={activePreview.plan.jobRequestBody.targetDifficulty} />
          <PreviewMetric label="Max tokens" value={String(activePreview.plan.jobRequestBody.maxTokens)} />
          <PreviewMetric
            label="Prompt size"
            value={`${activePreview.plan.activeJobDraft.promptCharacterCount ?? 0} chars / ~${activePreview.plan.activeJobDraft.promptApproximateTokenCount ?? 0} tokens`}
          />
          <PreviewMetric label="Prompt mode" value={activePreview.plan.activeJobDraft.promptMode ?? 'compact-adaptive-v2'} />
        </dl>
        <pre className="adaptive-flow-direct-preview-prompt">{activePreview.plan.prompt}</pre>
      </section>
    </div>
  );
}

function buildDirectGenerationPreviews({
  openRouterWorkspaceProps,
  selectedLanguageCode,
  durationMinutes,
  normalizedContext,
}: {
  openRouterWorkspaceProps: OpenRouterWorkspaceProps;
  selectedLanguageCode: BenchmarkLanguageButton;
  durationMinutes: OpenRouterDurationMinutes;
  normalizedContext: string;
}): Record<'withoutContext' | 'withContext', DirectGenerationPreview> {
  const buildPreview = (
    variant: AdaptiveFlowDirectGenerationVariant,
    preset: OpenRouterDirectGenerationPreset,
    topicContext?: string,
  ): DirectGenerationPreview => {
    const plan = buildOpenRouterDirectGenerationJobPlan({
      model: openRouterWorkspaceProps.defaultModel,
      preset: {
        ...preset,
        durationMinutes,
      },
      inputMode: 'browser-tts',
      language: selectedLanguageCode,
      sessions: openRouterWorkspaceProps.sessions,
      adaptiveBenchmarksByInputLanguage: openRouterWorkspaceProps.benchmarks,
      adaptiveSessionFeedbackByInputLanguage: openRouterWorkspaceProps.sessionFeedbackByInputLanguage,
      recentDictationSessionHints: openRouterWorkspaceProps.recentDictationSessionHints,
      generationStartedAt: 'preview',
      topicContext,
    });

    return {
      variant,
      preset,
      plan,
    };
  };

  return {
    withoutContext: buildPreview('without-context', OPEN_ROUTER_DIRECT_GENERATION_PRESETS.adaptive),
    withContext: buildPreview('with-context', OPEN_ROUTER_DIRECT_GENERATION_PRESETS.topic, normalizedContext || undefined),
  };
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function countActiveJobsForPreset(
  openRouterWorkspaceProps: OpenRouterWorkspaceProps,
  preset: OpenRouterDirectGenerationPreset,
): number {
  return openRouterWorkspaceProps.activeJobs.filter((job) => job.slotLabel === preset.slotLabel).length;
}

function isDirectGenerationDisabled({
  openRouterWorkspaceProps,
  busy,
  activeCount,
  requiresContext = false,
  normalizedContext = '',
}: {
  openRouterWorkspaceProps: OpenRouterWorkspaceProps;
  busy: boolean;
  activeCount: number;
  requiresContext?: boolean;
  normalizedContext?: string;
}): boolean {
  return (
    !openRouterWorkspaceProps.isOnline ||
    !openRouterWorkspaceProps.defaultModel.trim() ||
    busy ||
    activeCount >= MAX_ACTIVE_OPEN_ROUTER_JOBS_PER_VARIANT ||
    (requiresContext && !normalizedContext)
  );
}

function formatActionLabel(label: string, activeCount: number): string {
  if (activeCount === 0) return label;
  return `${label} (${activeCount}/${MAX_ACTIVE_OPEN_ROUTER_JOBS_PER_VARIANT})`;
}

function buildButtonTitle(openRouterWorkspaceProps: OpenRouterWorkspaceProps, activeCount: number): string {
  if (!openRouterWorkspaceProps.isOnline) return openRouterWorkspaceProps.openRouterOfflineTitle;
  if (!openRouterWorkspaceProps.defaultModel.trim()) return 'Set a default OpenRouter model first.';
  if (activeCount >= MAX_ACTIVE_OPEN_ROUTER_JOBS_PER_VARIANT) {
    return `Generation limit ${MAX_ACTIVE_OPEN_ROUTER_JOBS_PER_VARIANT}/${MAX_ACTIVE_OPEN_ROUTER_JOBS_PER_VARIANT} for this variant.`;
  }
  return 'Generate a direct Training session with the selected duration.';
}
