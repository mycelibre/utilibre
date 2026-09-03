import { expect, test, type Page } from '@playwright/test';

async function assertNoProcessingNetwork(page: Page, action: () => Promise<void>): Promise<void> {
  const requests: string[] = [];
  const sockets: string[] = [];
  const requestListener = (request: { url(): string }) => requests.push(request.url());
  const socketListener = (socket: { url(): string }) => sockets.push(socket.url());
  page.on('request', requestListener);
  page.on('websocket', socketListener);
  await action();
  await page.waitForTimeout(100);
  page.off('request', requestListener);
  page.off('websocket', socketListener);
  expect(requests).toEqual([]);
  expect(sockets).toEqual([]);
}

test('Redlib routing remains local glue until the visitor follows the result', async ({ page }) => {
  await page.route('**/_portal/config', async (route) => route.fulfill({
    json: { publicRedditUrl: 'https://reddit.utility.test/', enabledServices: ['redlib'] },
  }));
  await page.goto('/en/tools/open-privately');
  await expect(page.locator('.tool-panel')).toBeVisible();
  await page.waitForLoadState('networkidle');

  await assertNoProcessingNetwork(page, async () => {
    await page.getByLabel('Supported public URL').fill('https://youtube.com.evil.example/watch?v=test');
    await page.getByRole('button', { name: 'Check URL' }).click();
    await expect(page.getByRole('status')).toContainText('not from a supported');
  });
  await expect(page.locator('.router-result a')).toHaveCount(0);

  await assertNoProcessingNetwork(page, async () => {
    await page.getByLabel('Supported public URL').fill('https://old.reddit.com/r/privacy?sort=top&redirect=https://evil.example');
    await page.getByRole('button', { name: 'Check URL' }).click();
    await expect(page.getByRole('status')).toContainText('Destination recognized');
  });
  await expect(page.locator('.router-result a')).toHaveAttribute('href', 'https://reddit.utility.test/r/privacy?sort=top');
  await expect(page.locator('.router-result a')).toHaveAttribute('target', '_blank');
});
