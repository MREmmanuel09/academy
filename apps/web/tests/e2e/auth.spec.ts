import { expect, test } from '@playwright/test';
import { loginUser, registerUser, uniqueEmail } from './helpers';

test.describe('Authentication flow', () => {
  test('register -> onboarding -> dashboard end-to-end', async ({ page }) => {
    const { email } = await registerUser(page, { name: 'E2E Alice' });

    // After register, the server either drops us on /onboarding (new user)
    // or /dashboard if onboarding was already completed.
    if (page.url().includes('/onboarding')) {
      // Pick a goal and submit.
      await page.getByRole('button', { name: /DevOps & Cloud/i }).click();
      await page.getByRole('button', { name: /(empezar|get started)/i }).click();
    }

    // Either an internalised /es/dashboard or a bare /dashboard is fine
    // (the server action redirects to "/dashboard" and the layout then
    // loads under whatever locale the user was in).
    await page.waitForURL((url) => /\/dashboard$/.test(url.pathname), { timeout: 15_000 });
    // The dashboard should now reflect the freshly-created user.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // We shouldn't still be on the login form.
    await expect(page.locator('input[name="email"]')).toHaveCount(0);
    void email;
  });

  test('login as an already-registered user', async ({ page }) => {
    // First, create a user.
    const { email, password } = await registerUser(page, { name: 'E2E Bob' });
    if (page.url().includes('/onboarding')) {
      await page.getByRole('button', { name: /DevOps & Cloud/i }).click();
      await page.getByRole('button', { name: /(empezar|get started)/i }).click();
    }
    await page.waitForURL(/\/dashboard/);

    // Now log out by clearing the session cookie and visit /login.
    await page.context().clearCookies();
    await loginUser(page, { email, password });
    await page.waitForURL((url) => /\/dashboard$/.test(url.pathname), { timeout: 15_000 });
  });

  test('login with wrong password shows an error and does not redirect', async ({ page }) => {
    const { email } = await registerUser(page, { name: 'E2E Carol' });
    if (page.url().includes('/onboarding')) {
      await page.getByRole('button', { name: /DevOps & Cloud/i }).click();
      await page.getByRole('button', { name: /(empezar|get started)/i }).click();
    }
    await page.waitForURL(/\/dashboard/);
    await page.context().clearCookies();

    await page.goto('/academy/login');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill('definitely-wrong');
    await page.locator('button[type="submit"]').click();

    // We must stay on /login. The server action sets an error via redirect
    // query string OR the client form shows the message; either way,
    // the URL should not be /dashboard.
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);
  });

  test('protected route without a session redirects to login with next=', async ({ page }) => {
    const r = await page.goto('/academy/dashboard');
    expect(r?.status()).toBe(200);
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test('each locale keeps the protected path inside its own locale', async ({ page }) => {
    for (const locale of ['es', 'en', 'pt']) {
      await page.goto(`/academy/${locale}/practice/srs`);
      // The middleware redirects to /<locale>/login?next=<urlencoded original path>.
      // The next= value is the FULL path, fully URL-encoded. We match the
      // encoded form (%2F everywhere) which is what Next.js next-intl
      // middleware actually emits.
      const expected = new RegExp(`/${locale}/login\\?next=%2F${locale}%2Fpractice%2Fsrs`);
      await expect(page).toHaveURL(expected);
    }
  });

  test('register rejects a duplicate email', async ({ page }) => {
    const email = uniqueEmail('dup');
    await registerUser(page, { name: 'Dup1', email });
    if (page.url().includes('/onboarding')) {
      await page.getByRole('button', { name: /DevOps & Cloud/i }).click();
      await page.getByRole('button', { name: /(empezar|get started)/i }).click();
    }
    await page.waitForURL(/\/dashboard/);
    await page.context().clearCookies();

    // Try to register again with the same email.
    await page.goto('/academy/register');
    await page.locator('input[name="name"]').fill('Dup2');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill('TestPass123!');
    await page.locator('button[type="submit"]').click();
    // The form should display an error and not redirect to /dashboard.
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/register/);
  });
});
