import { chromium } from '/home/ubuntu/freetools/portal/node_modules/playwright/index.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const target = process.env.PROJECTS_BROWSER_TARGET === 'app' ? 'app' : 'gateway';
const appIp = execFileSync('docker', ['inspect', `utilibre-projects-pilot-${target}-1`, '--format', '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'], { encoding: 'utf8' }).trim();
const base = 'http://projects.invalid:1337';
const apiBase = `http://${appIp}:1337`;
const env = Object.fromEntries((await readFile('/opt/utilibre/evaluation/projects-20261009/private/pilot.env', 'utf8')).trim().split('\n').map(line => {
  const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)];
}));
const browser = await chromium.launch({ args: [`--host-resolver-rules=MAP projects.invalid ${appIp}`] });
const report = { date: new Date().toISOString(), target, externalRequests: [], errors: [], consoleErrors: [], networkFailures: [], checks: [] };
try {
  for (const locale of ['en-US', 'es-ES']) {
    const context = await browser.newContext({ locale });
    await context.addInitScript(() => {
      window.utilibreCspViolations = [];
      document.addEventListener('securitypolicyviolation', event => {
        window.utilibreCspViolations.push({ directive: event.violatedDirective, blocked: event.blockedURI });
      });
    });
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin !== base) {
        report.externalRequests.push(route.request().url()); return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text().slice(0, 300)); });
    page.on('requestfailed', request => report.networkFailures.push({ path: new URL(request.url()).pathname, failure: request.failure()?.errorText }));
    page.on('websocket', socket => socket.on('socketerror', error => report.networkFailures.push({ path: new URL(socket.url()).pathname, failure: error })));
    const response = await page.goto(base, { waitUntil: 'networkidle' });
    if (target === 'gateway' && !(await response.headerValue('content-security-policy')).includes("img-src 'self' data: blob:")) throw new Error('Expected gateway CSP absent');
    await page.screenshot({ path: `/opt/utilibre/reports/planka-fork-20261009/login-${locale}.png` });
    const login = await context.request.post(apiBase + '/api/access-tokens', { data: {
      emailOrUsername: env.DEFAULT_ADMIN_USERNAME, password: env.DEFAULT_ADMIN_PASSWORD,
    }});
    if (!login.ok()) throw new Error('Native account API login failed');
    const token = (await login.json()).item;
    const auth = { Authorization: `Bearer ${token}` };
    const ownUser = (await (await context.request.get(apiBase + '/api/users/me', { headers: auth })).json()).item;
    const localeChange = await context.request.patch(`${apiBase}/api/users/${ownUser.id}`, { headers: auth, data: { language: locale } });
    if (!localeChange.ok()) throw new Error('Fictional account native language setting failed');
    await context.addCookies([
      { name: 'accessToken', value: token, url: base, sameSite: 'Strict' },
      { name: 'accessTokenVersion', value: '1', url: base, sameSite: 'Strict' },
    ]);
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByText(/Fictional pilot/).first().waitFor({ timeout: 10000 }).catch(async error => {
      report.authenticationFailure = { csp: await page.evaluate(() => window.utilibreCspViolations), body: await page.locator('body').innerText() };
      throw error;
    });
    await page.screenshot({ path: `/opt/utilibre/reports/planka-fork-20261009/home-${locale}.png` });
    const text = await page.locator('body').innerText();
    if (!text.includes('Fictional pilot')) throw new Error('Authenticated interface missing fictional user');
    const expectedLanguage = locale === 'es-ES' ? 'es' : 'en';
    if (await page.locator('html').getAttribute('lang') !== expectedLanguage) throw new Error('Native account locale was not selected');
    const create = async (path, data) => {
      const result = await context.request.post(apiBase + path, { headers: auth, data });
      if (!result.ok()) throw new Error(`Fictional setup failed: ${path} HTTP${result.status()}`);
      return (await result.json()).item;
    };
    const project = await create('/api/projects', { name: 'Fictional privacy review' });
    try {
      const board = await create(`/api/projects/${project.id}/boards`, { name: 'Fictional privacy board' });
      const list = await create(`/api/boards/${board.id}/lists`, { name: 'Fictional list', position: 65536 });
      const card = await create(`/api/lists/${list.id}/cards`, {
        name: 'Fictional image privacy', position: 65536,
        description: '![Fictional remote image](https://external.projects.invalid/pixel.png)',
      });
      await page.goto(`${base}/cards/${card.id}`, { waitUntil: 'networkidle' });
      await page.screenshot({ path: `/opt/utilibre/reports/planka-fork-20261009/card-${locale}.png` });
      await writeFile(`/opt/utilibre/reports/planka-fork-20261009/card-${locale}.txt`, await page.locator('body').innerText());
      await page.waitForFunction(() => window.utilibreCspViolations.some(value =>
        value.directive === 'img-src' && value.blocked === 'https://external.projects.invalid/pixel.png'), null, { timeout: 5000 });
      const violations = await page.evaluate(() => window.utilibreCspViolations);
      if (!violations.some(value => value.directive === 'img-src' && value.blocked === 'https://external.projects.invalid/pixel.png')) throw new Error('Native Markdown external image was not blocked by CSP');
      const cardText = await page.locator('body').innerText();
      const descriptionLabel = locale === 'es-ES' ? 'Descripción' : 'Description';
      if (!cardText.includes(descriptionLabel)) throw new Error('Native translated card label missing');
      report.checks.push({ locale, authenticatedInterface: true, nativeLocaleLabel: descriptionLabel, title: await page.title(), remoteMarkdownImageBlocked: true,
        emptyDashboardFallback: locale === 'es-ES' ? 'Some new dashboard strings fall back to English.' : null });
    } finally {
      await context.request.delete(`${apiBase}/api/projects/${project.id}`, { headers: auth });
    }
    await context.request.patch(`${apiBase}/api/users/${ownUser.id}`, { headers: auth, data: { language: ownUser.language } });
    await context.request.delete(apiBase + '/api/access-tokens/me', { headers: auth });
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile('/opt/utilibre/reports/planka-fork-20261009/browser.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
if (report.externalRequests.length || report.errors.length) process.exitCode = 1;
