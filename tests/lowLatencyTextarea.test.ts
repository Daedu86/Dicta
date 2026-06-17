// @vitest-environment jsdom
import { afterEach, beforeEach } from 'vitest';
import {
  cleanupLowLatencyTextareaHarness,
  setupLowLatencyTextareaHarness,
} from './helpers/lowLatencyTextareaHarness';
import { describeLowLatencyTextareaCommitSuite } from './helpers/lowLatencyTextareaCommitSuite';
import { describeLowLatencyTextareaSyncSuite } from './helpers/lowLatencyTextareaSyncSuite';

beforeEach(setupLowLatencyTextareaHarness);
afterEach(cleanupLowLatencyTextareaHarness);

describeLowLatencyTextareaCommitSuite();
describeLowLatencyTextareaSyncSuite();
