import type { AdaptiveSessionFeedback, InputLanguageBenchmarkMetrics } from '../../core/adaptive/types';
import type { AdaptiveWorkspaceFocusAnchor, RepeatWordStat } from './types';

export type AdaptiveBenchmarkCockpitRuntimeParams = {
  profile: InputLanguageBenchmarkMetrics;
  focusAnchor?: AdaptiveWorkspaceFocusAnchor;
  repeatWordStats: RepeatWordStat[];
  sessionFeedback: AdaptiveSessionFeedback | null;
};
