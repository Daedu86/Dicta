import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics } from './types';
import type { buildTtsEnvironmentReport } from './adaptiveUserSystemReportEnvironment';
import type { AdaptiveUserSystemReport } from './adaptiveUserSystemReportTypes';
import { buildControllerStatus, buildExpectedControllerBehavior } from './adaptiveUserSystemReportController';
import { formatDecimal } from './adaptiveUserSystemReportUtils';

export function buildAdaptiveLoopBreakdown({
  profile,
  feedback,
  feedbackStatus,
  recommendedNextExercise,
  ttsEnvironmentReport,
}: {
  profile: InputLanguageBenchmarkMetrics;
  feedback: AdaptiveSessionFeedback | null;
  feedbackStatus: string;
  recommendedNextExercise: AdaptiveUserSystemReport['userProgressSummary']['recommendedNextExercise'];
  ttsEnvironmentReport: ReturnType<typeof buildTtsEnvironmentReport>;
}): AdaptiveUserSystemReport['adaptiveLoopBreakdown'] {
  return {
    sourceOfTruth: {
      benchmark: 'Long-term adaptive memory scoped by inputMode + language. It stores accepted telemetry, weak areas, and pacing recommendations.',
      feedback: 'Completed-session diagnosis. It can be current, stale, or unavailable depending on the latest finished session.',
      insightReport: 'Human/debug export that explains benchmark + feedback + runtime evidence. It is not the direct LLM prompt.',
    },
    generation: {
      role: 'Generate structured dictation content from a compact adaptive prescription.',
      status: `Next content should be generated at ${recommendedNextExercise.difficulty} difficulty.`,
      evidence: [
        `Target focus: ${profile.recommendation.nextTrainingFocus.join(', ') || 'collect more evidence'}.`,
        `Recommendation confidence: ${formatDecimal(profile.recommendation.confidence)}.`,
      ],
      promptMode: 'compact-adaptive-v2',
      complianceAuditStatus: 'not_recorded_in_this_report_yet',
    },
    plannerAndChunking: {
      role: 'Convert generated macro phrases into safe playable chunks before Browser TTS speaks.',
      status: `Use ${profile.recommendation.targetPhraseSize} chunks with ${profile.recommendation.targetPauseMs}ms target pauses.`,
      evidence: [
        `Average semantic completeness: ${formatDecimal(profile.averageSemanticCompleteness)}.`,
        `Unsafe pauses: ${profile.unsafePauseCount}. Deferred pauses: ${profile.deferredPauseCount}.`,
      ],
    },
    controllerBrain: {
      role: 'Adapt the live listening experience: rate, pause, phrase size, boundary strictness, support/recovery/flow behavior.',
      status: buildControllerStatus(profile),
      evidence: buildExpectedControllerBehavior(profile),
    },
    runtimeExecution: {
      role: 'Apply final Browser TTS/mobile/language constraints so the controller decision can be executed safely.',
      status:
        profile.inputMode === 'browser-tts'
          ? ttsEnvironmentReport.ttsEnvironment
            ? 'Browser TTS environment metadata is available.'
            : 'Browser TTS environment metadata is missing for this report.'
          : 'This input mode does not use Browser TTS.',
      evidence: [
        profile.environmentChanged || Boolean(ttsEnvironmentReport.environmentChanged)
          ? 'Environment changed recently; interpret benchmark/runtime behavior carefully.'
          : 'No Browser TTS environment change is flagged.',
      ],
    },
    learningLoop: {
      role: 'Feed accepted telemetry and completed-session feedback back into the benchmark for future prescriptions.',
      status: feedbackStatus,
      evidence: [
        `Benchmark sessions: ${profile.sessionCount}. Samples: ${profile.sampleCount}.`,
        feedback ? `Latest feedback verdict: ${feedback.verdict}.` : 'No current feedback object is attached.',
      ],
    },
  };
}
