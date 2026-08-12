import { expect, test, type Page } from '@playwright/test';

async function ensureFitReady(page: Page) {
  await page.goto('/');

  const manualRam = page.getByLabel(/System RAM/i);
  if (await manualRam.isVisible({ timeout: 5_000 })) {
    await manualRam.fill('16');
    await page.getByRole('button', { name: /Calculate fit/i }).click();
  }

  await expect(page.getByText('Boske models')).toBeVisible({ timeout: 20_000 });
}

test('fit page loads and shows hardware + Boske models', async ({ page }) => {
  await ensureFitReady(page);

  await expect(page.getByRole('heading', { name: 'Grove Fit' })).toBeVisible();
  await expect(page.getByPlaceholder(/Llama 3.1 8B/i)).toBeVisible();
});

test('manual hardware form appears when WebGPU unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true });
  });

  await page.goto('/');

  await expect(page.getByLabel(/System RAM/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /Calculate fit/i })).toBeVisible();
});

test('model search shows fit badges in results', async ({ page }) => {
  await ensureFitReady(page);

  const search = page.getByPlaceholder(/Llama 3.1 8B/i);
  await search.fill('ministral');

  await expect(page.getByText(/\d+ match/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('OK').first()).toBeVisible();
});

test('rejects invalid RAM instead of silently computing on a stale value', async ({ page }) => {
  await ensureFitReady(page);
  await page.getByRole('button', { name: /^Edit$/ }).click();

  const ram = page.getByLabel(/System RAM/i);
  // Type key-by-key rather than fill() — fill() sets the whole value in one
  // event and cannot reproduce the desync this test exists to catch.
  await ram.fill('');
  await ram.pressSequentially('3');

  await page.getByRole('button', { name: /Calculate fit/i }).click();

  // The form must object, not quietly return a verdict for the previous value.
  await expect(page.getByRole('alert')).toContainText(/between 4 and 256/i);
  await expect(page.getByLabel(/System RAM/i)).toBeVisible();
});

test('keeps a typed value that is briefly out of range', async ({ page }) => {
  await ensureFitReady(page);
  await page.getByRole('button', { name: /^Edit$/ }).click();

  const ram = page.getByLabel(/System RAM/i);
  await ram.fill('');
  // "1" is below the minimum on the way to "128" — the field must not revert.
  await ram.pressSequentially('128');
  await expect(ram).toHaveValue('128');

  await page.getByRole('button', { name: /Calculate fit/i }).click();
  await expect(page.getByText('128 GB RAM')).toBeVisible();
});

test('cloud presets are never reported as unable to run', async ({ page }) => {
  await ensureFitReady(page);

  // Force the weakest hardware: if anything reports "won't run", it is cloud.
  await page.getByRole('button', { name: /^Edit$/ }).click();
  const ram = page.getByLabel(/System RAM/i);
  await ram.fill('');
  await ram.pressSequentially('4');
  await page.getByRole('button', { name: /Calculate fit/i }).click();

  await page.getByPlaceholder(/Llama 3.1 8B/i).fill('Breeze');
  await page.getByRole('button', { name: /^Breeze/ }).first().click();

  const panel = page.locator('.gf-model-result');
  await expect(panel).toContainText(/Always available/i);
  await expect(panel).not.toContainText(/Won't run/i);
  await expect(panel).not.toContainText(/Not enough RAM/i);
});
