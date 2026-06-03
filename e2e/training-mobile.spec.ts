import { test, expect } from '@playwright/test';

type DictaPerfSnapshot = {
  enabled: boolean;
  input: {
    inputToCommit: { count: number; max: number };
    latest?: { valueLength: number; renderCount: number };
  };
  renders: Record<string, number>;
};

test('mobile training typing stays local and batches commits', async ({ page }) => {
  await page.goto('/?e2eTraining=1&perf=1', { waitUntil: 'domcontentloaded' });

  const textarea = page.getByLabel('Type what you hear');
  await expect(textarea).toBeVisible();

  const text = 'dies ist ein langer test fuer mobile pwa low latency typing ohne parent render pro taste';
  await textarea.focus();

  const beforeTyping = await page.evaluate<DictaPerfSnapshot>(() => window.__DICTA_PERF__?.snapshot() as DictaPerfSnapshot);
  expect(beforeTyping.enabled).toBe(true);
  const lowLatencyRendersBefore = beforeTyping.renders.LowLatencyTextarea ?? 0;
  const trainingViewRendersBefore = beforeTyping.renders.TrainingView ?? 0;
  const commitsBefore = beforeTyping.input.inputToCommit.count;

  await page.keyboard.type(text, { delay: 1 });

  await expect(textarea).toHaveValue(text);

  const beforeFinalWait = await page.evaluate<DictaPerfSnapshot>(() => window.__DICTA_PERF__?.snapshot() as DictaPerfSnapshot);
  const commitLimit = Math.ceil(text.length / 12);
  const earlyCommitDelta = beforeFinalWait.input.inputToCommit.count - commitsBefore;
  expect(beforeFinalWait.input.latest?.valueLength).toBe(text.length);
  expect(earlyCommitDelta).toBeLessThanOrEqual(commitLimit);
  expect(beforeFinalWait.renders.LowLatencyTextarea ?? 0).toBeLessThanOrEqual(lowLatencyRendersBefore + earlyCommitDelta + 1);
  expect(beforeFinalWait.renders.TrainingView ?? 0).toBeLessThanOrEqual(trainingViewRendersBefore + earlyCommitDelta + 1);

  await page.waitForTimeout(120);

  const afterFinalWait = await page.evaluate<DictaPerfSnapshot>(() => window.__DICTA_PERF__?.snapshot() as DictaPerfSnapshot);
  const commitDelta = afterFinalWait.input.inputToCommit.count - commitsBefore;
  expect(commitDelta).toBeGreaterThan(0);
  expect(commitDelta).toBeLessThanOrEqual(commitLimit + 1);
  expect(afterFinalWait.input.inputToCommit.max).toBeLessThan(500);
  expect(afterFinalWait.renders.LowLatencyTextarea ?? 0).toBeLessThanOrEqual(lowLatencyRendersBefore + commitDelta + 1);
  expect(afterFinalWait.renders.TrainingView ?? 0).toBeLessThanOrEqual(trainingViewRendersBefore + commitDelta + 1);
});
