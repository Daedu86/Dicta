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
  await page.goto('/?e2eTraining=1&perf=1');

  const textarea = page.getByLabel('Type what you hear');
  await expect(textarea).toBeVisible();

  const text = 'dies ist ein langer test fuer mobile pwa low latency typing ohne parent render pro taste';
  await textarea.focus();
  await page.keyboard.type(text, { delay: 1 });

  await expect(textarea).toHaveValue(text);

  const beforeCommit = await page.evaluate<DictaPerfSnapshot>(() => window.__DICTA_PERF__?.snapshot() as DictaPerfSnapshot);
  expect(beforeCommit.enabled).toBe(true);
  expect(beforeCommit.input.latest?.valueLength).toBe(text.length);
  expect(beforeCommit.input.latest?.renderCount).toBe(1);
  expect(beforeCommit.input.inputToCommit.count).toBe(0);
  expect(beforeCommit.renders.LowLatencyTextarea).toBe(1);

  await page.waitForTimeout(120);

  const afterCommit = await page.evaluate<DictaPerfSnapshot>(() => window.__DICTA_PERF__?.snapshot() as DictaPerfSnapshot);
  expect(afterCommit.input.inputToCommit.count).toBe(1);
  expect(afterCommit.input.inputToCommit.max).toBeLessThan(500);
  expect(afterCommit.renders.LowLatencyTextarea).toBeLessThanOrEqual(2);
  expect(afterCommit.renders.TrainingView).toBeLessThanOrEqual(3);
});
