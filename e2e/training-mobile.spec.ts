import { test, expect } from '@playwright/test';

test('typing remains visible during rapid input', async ({ page }) => {
  await page.goto('/?perf=1');
  const textarea = page.locator('textarea').first();
  await expect(textarea).toBeVisible();
  const text = 'dies ist ein langer test fuer mobile pwa low latency typing';
  await textarea.fill(text);
  await expect(textarea).toHaveValue(text);
});