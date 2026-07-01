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
  await page.goto('/e2e-training.html', { waitUntil: 'domcontentloaded' });

  const textarea = page.getByLabel('Type what you hear');
  await expect(textarea).toBeVisible();
  await expect(page.getByRole('region', { name: 'Media player and audio controls' })).toHaveCount(0);
  await expect(page.locator('.training-chunk-start-action-row').getByRole('button', { name: 'Play', exact: true })).toBeVisible();

  const text = 'dies ist ein langer test fuer mobile pwa low latency typing ohne parent render pro taste';
  await textarea.focus();

  const beforeTyping = await page.evaluate<DictaPerfSnapshot>(() => window.__DICTA_PERF__?.snapshot() as DictaPerfSnapshot);
  expect(beforeTyping.enabled).toBe(true);
  const lowLatencyRendersBefore = beforeTyping.renders.LowLatencyTextarea ?? 0;
  const trainingViewRendersBefore = beforeTyping.renders.TrainingView ?? 0;
  const commitsBefore = beforeTyping.input.inputToCommit.count;

  await page.keyboard.insertText(text);

  await expect(textarea).toHaveValue(text);

  const beforeFinalWait = await page.evaluate<DictaPerfSnapshot>(() => window.__DICTA_PERF__?.snapshot() as DictaPerfSnapshot);
  const commitLimit = Math.ceil(text.length / 12);
  const earlyCommitDelta = beforeFinalWait.input.inputToCommit.count - commitsBefore;
  expect(beforeFinalWait.input.latest?.valueLength).toBe(text.length);
  expect(earlyCommitDelta).toBeLessThanOrEqual(commitLimit);
  expect(beforeFinalWait.renders.LowLatencyTextarea ?? 0).toBeLessThanOrEqual(lowLatencyRendersBefore + earlyCommitDelta + 1);
  expect(beforeFinalWait.renders.TrainingView ?? 0).toBeLessThanOrEqual(trainingViewRendersBefore + earlyCommitDelta + 1);

  await page.waitForTimeout(1400);

  const afterFinalWait = await page.evaluate<DictaPerfSnapshot>(() => window.__DICTA_PERF__?.snapshot() as DictaPerfSnapshot);
  const commitDelta = afterFinalWait.input.inputToCommit.count - commitsBefore;
  expect(commitDelta).toBeGreaterThan(0);
  expect(commitDelta).toBeLessThanOrEqual(commitLimit + 1);
  expect(afterFinalWait.input.inputToCommit.max).toBeLessThan(1500);
  expect(afterFinalWait.renders.LowLatencyTextarea ?? 0).toBeLessThanOrEqual(lowLatencyRendersBefore + commitDelta + 1);
  expect(afterFinalWait.renders.TrainingView ?? 0).toBeLessThanOrEqual(trainingViewRendersBefore + commitDelta + 1);
});

test('embedded Browser TTS play replaces the media card and focuses the first chunk', async ({ page }) => {
  await page.goto('/e2e-training.html?embeddedPlay=1', { waitUntil: 'domcontentloaded' });

  const textarea = page.locator('#training-dictation-input');
  const startPlay = page.locator('.training-chunk-start-action-row').getByRole('button', { name: 'Play', exact: true });

  await expect(page.getByRole('region', { name: 'Media player and audio controls' })).toHaveCount(0);
  await expect(startPlay).toBeVisible();
  await expect(startPlay).toBeEnabled();

  await startPlay.click();

  await expect(textarea).toBeFocused();
  await expect(page.locator('.training-chunk-start-action-row')).toHaveCount(0);
  await expect(page.locator('.training-chunk-action-buttons').getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Replay chunk', exact: true })).toBeVisible();
});

test('mobile chunk submit stays below the focused textbox', async ({ page }) => {
  await page.goto('/e2e-training.html?chunkPractice=1', { waitUntil: 'domcontentloaded' });

  const textarea = page.locator('#training-dictation-input');
  await expect(textarea).toBeVisible();
  await expect(page.getByRole('region', { name: 'Media player and audio controls' })).toHaveCount(0);
  await expect(page.locator('.training-chunk-action-buttons').getByRole('button', { name: 'Play', exact: true })).toBeVisible();

  for (let chunkIndex = 0; chunkIndex < 6; chunkIndex += 1) {
    await expect(page.getByText(`Chunk ${chunkIndex + 1}`, { exact: true })).toBeVisible();
    await textarea.focus();

    const flow = page.locator('.training-chunk-flow-keyboard-active');
    await expect(flow).toBeVisible();

    const cardPosition = await page.locator('.training-chunk-card-active').evaluate((element) => getComputedStyle(element).position);
    const actionRowPosition = await page.locator('.training-chunk-action-row').evaluate((element) => getComputedStyle(element).position);
    expect(cardPosition).not.toBe('fixed');
    expect(actionRowPosition).not.toBe('sticky');
    expect(actionRowPosition).toBe('static');

    const textareaBox = await textarea.boundingBox();
    const replayBox = await page.getByRole('button', { name: 'Replay chunk', exact: true }).boundingBox();
    const submitBox = await page.getByRole('button', { name: /Skip chunk|Submit \/ Check/ }).boundingBox();
    const viewport = page.viewportSize();
    expect(textareaBox).not.toBeNull();
    expect(replayBox).not.toBeNull();
    expect(submitBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(Math.abs(replayBox!.y - submitBox!.y)).toBeLessThanOrEqual(1);
    expect(submitBox!.y).toBeGreaterThanOrEqual(textareaBox!.y + textareaBox!.height - 1);
    expect(replayBox!.y + replayBox!.height).toBeLessThanOrEqual(viewport!.height);
    expect(submitBox!.y + submitBox!.height).toBeLessThanOrEqual(viewport!.height);

    await page.getByRole('button', { name: /Skip chunk|Submit \/ Check/ }).click();
  }
});

test('mobile chunk play focus keeps textbox and submit button stable', async ({ page }) => {
  await page.goto('/e2e-training.html?chunkPractice=1', { waitUntil: 'domcontentloaded' });

  const textarea = page.locator('#training-dictation-input');
  const submitButton = page.getByRole('button', { name: /Skip chunk|Submit \/ Check/ });

  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(textarea).toBeFocused();
  await expect(page.locator('.training-chunk-flow-keyboard-active')).toBeVisible();

  await page.waitForTimeout(150);
  const settledLayout = await readChunkLayout();
  await page.waitForTimeout(500);
  const laterLayout = await readChunkLayout();

  expect(settledLayout.cardPosition).not.toBe('fixed');
  expect(settledLayout.actionRowPosition).toBe('static');
  expect(settledLayout.submitBottom).toBeLessThanOrEqual(settledLayout.viewportHeight);
  expect(settledLayout.submitY).toBeGreaterThanOrEqual(settledLayout.textareaBottom - 1);
  expect(Math.abs(laterLayout.textareaY - settledLayout.textareaY)).toBeLessThanOrEqual(1);
  expect(Math.abs(laterLayout.submitY - settledLayout.submitY)).toBeLessThanOrEqual(1);

  async function readChunkLayout() {
    const textareaBox = await textarea.boundingBox();
    const submitBox = await submitButton.boundingBox();
    const viewport = page.viewportSize();
    expect(textareaBox).not.toBeNull();
    expect(submitBox).not.toBeNull();
    expect(viewport).not.toBeNull();

    return {
      textareaY: textareaBox!.y,
      textareaBottom: textareaBox!.y + textareaBox!.height,
      submitY: submitBox!.y,
      submitBottom: submitBox!.y + submitBox!.height,
      viewportHeight: viewport!.height,
      cardPosition: await page.locator('.training-chunk-card-active').evaluate((element) => getComputedStyle(element).position),
      actionRowPosition: await page.locator('.training-chunk-action-row').evaluate((element) => getComputedStyle(element).position),
    };
  }
});
