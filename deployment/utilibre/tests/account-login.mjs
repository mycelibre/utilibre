import { chromium } from '../../../portal/node_modules/playwright/index.mjs';

const required = [
  'APP_BIND_IP',
  'FRESHRSS_ADMIN_USERNAME',
  'FRESHRSS_ADMIN_PASSWORD',
];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`http://${process.env.APP_BIND_IP}:3106/i/?c=auth&a=login`, {
    waitUntil: 'networkidle',
  });
  await page.locator('input[name="username"]').fill(process.env.FRESHRSS_ADMIN_USERNAME);
  await page.locator('#passwordPlain').fill(process.env.FRESHRSS_ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL((url) => !url.searchParams.has('a') || url.searchParams.get('a') !== 'login'),
    page.locator('form button[type="submit"]').click(),
  ]);
  if (await page.locator('form#login-form, form.crypto-form').count()) {
    throw new Error('FreshRSS remained on its login form');
  }
  console.log('FreshRSS owner browser login PASS');
} finally {
  await browser.close();
}
