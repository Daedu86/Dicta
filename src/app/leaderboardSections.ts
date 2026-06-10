import type { Difficulty } from '../core/config';
import type { MetricsLanguageView, MetricsRangeView } from '../core/liveMetrics';
import { buildRangeSummaryForLanguage, resolveSessionLanguage } from '../core/liveMetrics';
import type { DictationScript } from '../core/adaptive/dictationScriptValidation';

export type LeaderboardSessionLength = 'express' | 'standard';

export type LeaderboardSectionId =
  | 'easy-express'
  | 'medium-express'
  | 'hard