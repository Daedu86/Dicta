import type { PhraseBoundaryType } from '../../core/adaptive/types';
import type {
  BrowserTtsV3PauseClass,
  BrowserTtsV3ProsodyMetadata,
  BrowserTtsV3ReplayStrategy,
  BrowserTtsV3SemanticCompletenessClass,
  BrowserTtsV3SyntacticRisk,
} from './ttsDynamicChunkPlannerTypes';

export function buildBrowserTtsV3ProsodyMetadata(source: {
  boundaryType: PhraseBoundaryType;
  edgeWordFlag: boolean;
  pauseClass: BrowserTtsV3PauseClass;
  phraseDifficulty: number;
  semanticCompleteness: number;
  startWordIndex: number;
  syntaxComplexity: number;
  wordCount: number;
}): BrowserTtsV3ProsodyMetadata {
  return {
    boundaryStrength: source.boundaryType,
    pauseClass: source.pauseClass,
    semanticCompletenessClass: classifyV3SemanticCompleteness(source.semanticCompleteness),
    syntacticRisk: classifyV3SyntacticRisk(source.phraseDifficulty, source.syntaxComplexity),
    edgeWordFlag: source.edgeWordFlag,
    replayStrategy: chooseV3ReplayStrategy({
      edgeWordFlag: source.edgeWordFlag,
      semanticCompleteness: source.semanticCompleteness,
      wordCount: source.wordCount,
    }),
    breathGroup: {
      startWordIndex: source.startWordIndex,
      endWordIndex: source.startWordIndex + Math.max(0, source.wordCount - 1),
      wordCount: source.wordCount,
      isComplete: source.boundaryType === 'sentence' || source.boundaryType === 'clause',
    },
  };
}

function classifyV3SemanticCompleteness(value: number): BrowserTtsV3SemanticCompletenessClass {
  if (value >= 0.92) return 'complete';
  if (value >= 0.75) return 'stable-clause';
  if (value >= 0.55) return 'partial';
  return 'fragile';
}

function classifyV3SyntacticRisk(phraseDifficulty: number, syntaxComplexity: number): BrowserTtsV3SyntacticRisk {
  const risk = Math.max(phraseDifficulty, syntaxComplexity);
  if (risk >= 0.65) return 'high';
  if (risk >= 0.35) return 'medium';
  return 'low';
}

function chooseV3ReplayStrategy(source: {
  edgeWordFlag: boolean;
  semanticCompleteness: number;
  wordCount: number;
}): BrowserTtsV3ReplayStrategy {
  if (source.edgeWordFlag) return 'repeat-with-preroll';
  if (source.wordCount <= 4 || source.semanticCompleteness >= 0.9) return 'repeat-short';
  return 'repeat-from-nucleus';
}
