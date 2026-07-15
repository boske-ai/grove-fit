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
