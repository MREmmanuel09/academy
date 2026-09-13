import type { Page, TestInfo } from '@playwright/test';

/**
 * Shared helpers for E2E tests.
 *
 * Authentication is driven through the real Auth.js / Next.js server
 * actions. The forms are submitted as a real user would (clicks + form
 * fields) so we exercise the whole stack: form -> server action ->
 * bcrypt -> session cookie -> redirect.
 */

const DEFAULT_PASSWORD = 'TestPass123!';

/** Generate a unique email so test runs don't collide on the unique-email index. */
export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.local`;
}

/** Wait for the post-auth landing: dashboard, onboarding, or wherever the
 * server redirected. We accept any of those as success.
 */
async function waitForAuthLanding(page: Page): Promise<void> {
  await page.waitForURL(
    (url) => /(onboarding|dashboard|courses|achievements|practice)/.test(url.pathname),
    { timeout: 15_000 },
  );
}

/** Register a brand-new user through the public register form. */
export async function registerUser(
  page: Page,
  opts: { email?: string; name?: string; password?: string } = {},
): Promise<{ email: string; name: string; password: string }> {
  const email = opts.email ?? uniqueEmail('e2e');
  const name = opts.name ?? `E2E ${email.split('@')[0]}`;
  const password = opts.password ?? DEFAULT_PASSWORD;

  await page.goto('/register');
  await page.locator('input[name="name"]').fill(name);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  // The form posts a server action; the navigation that follows is the
  // real signal of success. We click the submit and then wait.
  await page.locator('button[type="submit"]').click();
  await waitForAuthLanding(page);
  return { email, name, password };
}

/** Log in as an already-registered user. */
export async function loginUser(
  page: Page,
  opts: { email: string; password?: string },
): Promise<void> {
  const password = opts.password ?? DEFAULT_PASSWORD;
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(opts.email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await waitForAuthLanding(page);
}

/** Mark the test as "uses the network" so it can be skipped when offline. */
export function requiresNetwork(test: TestInfo): boolean {
  return !test.project.metadata?.offline;
}
