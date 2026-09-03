import { chromium } from '../../../portal/node_modules/playwright/index.mjs';

const required = [
  'APP_BIND_IP',
  'FRESHRSS_ADMIN_USERNAME',
  'FRESHRSS_ADMIN_PASSWORD',
  'WAKAPI_ADMIN_USERNAME',
  'WAKAPI_ADMIN_PASSWORD',
];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

const browser = await chromium.launch({ headless: true });
const appBindIp = process.env.APP_BIND_IP;
try {
  const fresh = await browser.newPage();
  await fresh.goto(`http://${appBindIp}:3106/i/?c=auth&a=login`, { waitUntil: 'networkidle' });
  await fresh.locator('input[name="username"]').fill(process.env.FRESHRSS_ADMIN_USERNAME);
  await fresh.locator('#passwordPlain').fill(process.env.FRESHRSS_ADMIN_PASSWORD);
  await Promise.all([
    fresh.waitForURL((url) => !url.searchParams.has('a') || url.searchParams.get('a') !== 'login'),
    fresh.locator('form button[type="submit"]').click(),
  ]);
  if (await fresh.locator('form#login-form, form.crypto-form').count()) {
    throw new Error('FreshRSS remained on its login form');
  }
  console.log('FreshRSS owner browser login PASS');

  const wakapi = await browser.newPage({
    extraHTTPHeaders: { 'X-Forwarded-Proto': 'https' },
  });
  await wakapi.goto(`http://${appBindIp}:3109/login`, { waitUntil: 'networkidle' });
  await wakapi.locator('input[name="username"]').fill(process.env.WAKAPI_ADMIN_USERNAME);
  await wakapi.locator('input[name="password"]').fill(process.env.WAKAPI_ADMIN_PASSWORD);
  const responsePromise = wakapi.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/login'),
  );
  await wakapi.locator('form button[type="submit"]').click();
  const response = await responsePromise;
  if (![200, 302, 303].includes(response.status())) {
    throw new Error(`Wakapi login returned HTTP ${response.status()}`);
  }
  console.log(`Wakapi owner credentials accepted (HTTP ${response.status()}); secure-session dashboard check requires edge HTTPS`);
} finally {
  await browser.close();
}
