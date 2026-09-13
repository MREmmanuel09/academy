import { expect, test } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('home page loads with localized title and skip link', async ({ page }) => {
    await page.goto('/');
    // Middleware should redirect "/" to "/es" since default locale is "es".
    await expect(page).toHaveURL(/\/(es|en)\/?$/);

    // The home page renders the welcome heading.
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();

    // Skip link is present (only visually hidden, but in the DOM).
    await expect(page.getByRole('link', { name: /skip to main content/i })).toBeAttached();

    // Health endpoint answers.
    const response = await page.request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { status: string; service: string };
    expect(body.status).toBe('ok');
    expect(body.service).toBe('academy-web');
  });

  test('language switch via /en route renders English copy', async ({ page }) => {
    await page.goto('/en');
    await expect(page).toHaveURL(/\/en\/?$/);
    // English copy: "Welcome to Academy"
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/welcome/i);
  });

  test('demo route is reachable', async ({ page }) => {
    await page.goto('/demo');
    // Demo showcase: hero heading plus the tracks section with real courses.
    await expect(page.getByRole('heading', { name: /welcome|bienvenido/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /courses|cursos/i })).toBeVisible();
  });

  test('login page is reachable and shows form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /iniciar sesi/i })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('register page is reachable and shows form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /crear cuenta/i })).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('protected dashboard redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test('courses index lists all 6 courses', async ({ page }) => {
    await page.goto('/courses');
    // Use substring match because the in-app <Link> wrapper prepends the
    // active locale segment to every internal href.
    const cards = page.locator('a[href*="/courses/"]');
    // At least 6 course cards (the heading "All courses" is a heading, not a card).
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(6);
  });

  test('English course detail page renders title and syllabus', async ({ page }) => {
    await page.goto('/en/courses/english');
    await expect(page).toHaveURL(/\/en\/courses\/english$/);
    // Sprint L2 content: course page + 6 narrative arcs with episodes.
    await expect(page.getByRole('heading', { name: /english \(sprint l2\)/i })).toBeVisible();
    await expect(page.getByText(/30 lessons/i)).toBeVisible();
    await expect(page.getByText(/aterrizaje|landing/i).first()).toBeVisible();
  });

  test('dashboard renders unauthenticated (redirect to login)', async ({ page }) => {
    const response = await page.goto('/es/dashboard');
    // Middleware should redirect to /login?next=/es/dashboard
    expect(page.url()).toMatch(/\/login\?next=/);
    expect(response?.status()).toBe(200);
  });

  test('achievements page renders unauthenticated (redirect to login)', async ({ page }) => {
    const response = await page.goto('/es/achievements');
    expect(page.url()).toMatch(/\/login\?next=/);
    expect(response?.status()).toBe(200);
  });

  test('settings page renders unauthenticated (redirect to login)', async ({ page }) => {
    const response = await page.goto('/es/settings');
    expect(page.url()).toMatch(/\/login\?next=/);
    expect(response?.status()).toBe(200);
  });

  test('PWA service worker is served at /sw.js (smoke)', async ({ page }) => {
    const r = await page.request.get('/sw.js');
    // In dev the wrapper is disabled (we ship a stub). In prod it's
    // the real workbox-generated SW. Either way, the URL must respond.
    expect(r.status()).toBe(200);
    const body = await r.text();
    expect(body.length).toBeGreaterThan(50);
  });

  test('manifest is served at /manifest.json', async ({ page }) => {
    const r = await page.request.get('/manifest.json');
    expect(r.status()).toBe(200);
    const body = (await r.json()) as { name: string; display: string };
    expect(body.name).toBeTruthy();
    expect(body.display).toBe('standalone');
  });
});
