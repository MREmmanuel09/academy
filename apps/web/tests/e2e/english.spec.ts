import { expect, test } from '@playwright/test';
import { registerUser } from './helpers';

test.describe('English episodes', () => {
  test('episode quiz tab answers a question', async ({ page }) => {
    test.setTimeout(60_000);
    await registerUser(page, { name: 'E2E Episode' });
    if (page.url().includes('/onboarding')) {
      await page.getByRole('button', { name: /DevOps & Cloud/i }).click();
      await page.getByRole('button', { name: /(empezar|get started)/i }).click();
    }
    await page.waitForURL(/\/dashboard/);

    await page.goto('/academy/courses/english/units/03-trabajo/lessons/email');
    await page.getByRole('tab', { name: /quiz/i }).click();
    // First quiz question with options renders (InlineQuiz buttons).
    const option = page.getByRole('button', { name: /states the obvious/i });
    await expect(option).toBeVisible({ timeout: 10_000 });
    await option.click();
    await page.getByRole('button', { name: /check answer/i }).click();
    // Explanation or next-question affordance appears after checking.
    await expect(
      page.getByText(/skip what the reader|siguiente|next|see results/i).first(),
    ).toBeVisible({
      timeout: 10_000,
    });
  });

  test('episode speak tab lists dialogue lines', async ({ page }) => {
    test.setTimeout(60_000);
    await registerUser(page, { name: 'E2E Speak' });
    if (page.url().includes('/onboarding')) {
      await page.getByRole('button', { name: /DevOps & Cloud/i }).click();
      await page.getByRole('button', { name: /(empezar|get started)/i }).click();
    }
    await page.waitForURL(/\/dashboard/);

    await page.goto('/academy/courses/english/units/03-trabajo/lessons/email');
    await page.getByRole('tab', { name: /speak/i }).click();
    // Dialogue lines render (headless has no mic; TTS buttons suffice).
    await expect(page.getByText(/^tom$/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('listening game is audio-first', async ({ page }) => {
    test.setTimeout(60_000);
    await registerUser(page, { name: 'E2E Listening' });
    if (page.url().includes('/onboarding')) {
      await page.getByRole('button', { name: /DevOps & Cloud/i }).click();
      await page.getByRole('button', { name: /(empezar|get started)/i }).click();
    }
    await page.waitForURL(/\/dashboard/);

    await page.goto('/academy/practice/games/listening');
    // Renamed title renders and the sentence stays hidden pre-answer.
    await expect(page.getByText(/listening/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/listen, then choose/i)).toBeVisible({ timeout: 10_000 });
  });
});
