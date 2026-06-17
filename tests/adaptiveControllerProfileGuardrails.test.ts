import { describe } from 'vitest';
import { runAdaptiveControllerBrowserTtsPauseGuardrailsSuite } from './helpers/adaptiveControllerBrowserTtsPauseGuardrailsSuite';
import { runAdaptiveControllerListeningPrecisionSuite } from './helpers/adaptiveControllerListeningPrecisionSuite';
import { runAdaptiveControllerTelemetryGuardrailsSuite } from './helpers/adaptiveControllerTelemetryGuardrailsSuite';

describe('AdaptiveDictationController profile guardrails', () => {
  runAdaptiveControllerBrowserTtsPauseGuardrailsSuite();
  runAdaptiveControllerListeningPrecisionSuite();
  runAdaptiveControllerTelemetryGuardrailsSuite();
});
