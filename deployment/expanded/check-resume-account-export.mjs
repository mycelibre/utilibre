// Exact-image native export/import check. Only isolated fictional accounts are used.
// No production volumes, identity accounts, SMTP or external providers are configured.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, statfs, writeFile } from 'node:fs/promises';
import { chromium, request } from '../../portal/node_modules/playwright-core/index.mjs';

const suffix = randomBytes(5).toString('hex');
const network = `utilibre-cv-export-${suffix}`, db = `${network}-db`, app = `${network}-app`;
const reportDir = process.env.UTILIBRE_RESUME_EXPORT_REPORT || `/opt/utilibre/reports/resume-account-export-${suffix}`;
const port = process.env.UTILIBRE_RESUME_EXPORT_PORT || '3430';
assert.match(port, /^\d{4,5}$/);
const base = `http://127.0.0.1:${port}`;
const image = process.env.UTILIBRE_RESUME_EXPORT_IMAGE || 'utilibre-resume:6.0.0-p1';
const postgres = 'postgres@sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73';
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const sql = query => docker('exec', db, 'psql', '-U', 'review', '-d', 'review', '-At', '-c', query);
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const report = { date: new Date().toISOString(), image, postgres, fictionalOnly: true, result: 'running' };
let browser, relay;
const contexts = [], apiContexts = [];
const unexpectedOrigins = new Set();
await mkdir(reportDir, { recursive: true, mode: 0o700 });

async function createAccount(label) {
  const api = await request.newContext({ baseURL: base }); apiContexts.push(api);
  const username = `export${suffix}${label}`;
  const password = randomBytes(32).toString('hex');
  const response = await api.post('/api/auth/sign-up/email', {
    headers: { origin: base, referer: `${base}/auth/register` },
    data: { name: `Fictional Export ${label}`, email: `${username}@example.invalid`, password,
      username, displayUsername: username, callbackURL: '/dashboard' },
  });
  assert.equal(response.status(), 200, 'Native isolated account creation');
  const context = await browser.newContext({ baseURL: base, storageState: await api.storageState() });
  contexts.push(context);
  await context.route('**/*', async route => {
    const url = route.request().url();
    if (/^https?:/.test(url) && new URL(url).origin !== base) {
      unexpectedOrigins.add(new URL(url).origin);
      await route.abort(); return;
    }
    await route.continue();
  });
  return { api, context, username, password };
}

try {
  const disk = await statfs('/');
  assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'Preserve the recovery free-space floor');
  report.imageId = docker('image', 'inspect', image, '--format', '{{.Id}}');
  docker('image', 'inspect', postgres, '--format', '{{.Id}}');
  docker('network', 'create', '--internal', network);
  report.networkInternal = docker('network', 'inspect', network, '--format', '{{.Internal}}') === 'true';
  assert(report.networkInternal);
  const dbPassword = randomBytes(32).toString('hex');
  docker('run', '--pull=never', '-d', '--name', db, '--network', network, '--memory', '256m', '--cpus', '1',
    '--pids-limit', '128', '--log-driver', 'none', '--tmpfs', '/var/lib/postgresql/data:rw,size=384m',
    '-e', 'PGDATA=/var/lib/postgresql/data', '-e', 'POSTGRES_USER=review', '-e', 'POSTGRES_DB=review',
    '-e', `POSTGRES_PASSWORD=${dbPassword}`, postgres);
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try { docker('exec', db, 'pg_isready', '-U', 'review'); ready = true; break; } catch { await pause(500); }
  }
  assert(ready, 'Disposable PostgreSQL starts');
  docker('run', '--pull=never', '-d', '--name', app, '--network', network, '--memory', '768m', '--cpus', '1',
    '--pids-limit', '128', '--log-driver', 'json-file', '--log-opt', 'max-size=256k', '--log-opt', 'max-file=1',
    '--tmpfs', '/app/data:rw,size=32m,uid=1000,gid=1000,mode=700',
    '-e', 'NODE_ENV=production', '-e', `APP_URL=${base}`,
    '-e', `DATABASE_URL=postgresql://review:${dbPassword}@${db}:5432/review`,
    '-e', `AUTH_SECRET=${randomBytes(32).toString('hex')}`, '-e', 'STORAGE_BACKEND=local',
    '-e', 'LOCAL_STORAGE_PATH=/app/data', '--entrypoint', 'node', image, '-e',
    "import('/app/apps/server/dist/index.mjs').then(({main})=>main())");
  const appIP = docker('inspect', app, '--format', '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}');
  assert.match(appIP, /^\d+\.\d+\.\d+\.\d+$/);
  // Docker does not publish ports for an internal network. This loopback-only
  // test relay has one fixed fictional container target and ends in finally.
  relay = spawn('socat', [`TCP-LISTEN:${port},bind=127.0.0.1,reuseaddr,fork`, `TCP:${appIP}:3000`], { stdio: 'ignore' });
  ready = false;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(`${base}/api/health`)).ok) { ready = true; break; } } catch { /* startup only */ }
    await pause(500);
  }
  assert(ready, 'Exact isolated application image starts');
  assert.equal(sql('SELECT count(*) FROM "user"'), '0', 'Blank test database');
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const a = await createAccount('a'), b = await createAccount('b');
  let response = await a.api.post('/api/openapi/resumes', {
    data: { name: 'Fictional account export', tags: ['fictional-export'], withSampleData: false },
  });
  assert.equal(response.status(), 200); const originalId = await response.json();
  response = await a.api.get(`/api/openapi/resumes/${originalId}`); assert.equal(response.status(), 200);
  const original = await response.json();
  original.data.basics.name = 'Fictional Export Person';
  original.data.basics.headline = 'Fictional archive round trip';
  original.data.basics.email = 'fictional-export@example.invalid';
  original.data.picture.url = ''; original.data.picture.hidden = true;
  response = await a.api.patch(`/api/openapi/resumes/${originalId}/metadata`, {
    data: { isPublic: true, showDownloadButtons: true, slug: `fictional-export-${suffix}`, data: original.data },
  });
  assert.equal(response.status(), 200);
  const page = await a.context.newPage();
  await page.goto('/dashboard/settings/account');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const download = await downloadEvent; assert.equal(await download.failure(), null);
  const zipPath = `${reportDir}/fictional-account.zip`; await download.saveAs(zipPath);
  const zipBytes = await readFile(zipPath);
  const archive = JSON.parse(execFileSync('python3', ['-c',
    'import json,sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print(json.dumps({n:json.loads(z.read(n)) for n in z.namelist()}))', zipPath], { encoding: 'utf8' }));
  const resumeName = Object.keys(archive).find(name => name.startsWith('resumes/'));
  assert(resumeName); assert.equal(Object.keys(archive).length, 3, 'One resume plus account and applications');
  assert.equal(archive['account.json'].user.username, a.username);
  assert.deepEqual(archive['applications.json'], []);
  assert.equal(archive[resumeName].data.basics.name, 'Fictional Export Person');
  assert.equal(archive[resumeName].isPublic, true, 'Archive preserves source sharing metadata');
  assert(!JSON.stringify(archive).includes(a.password));
  const allowedUser = ['createdAt', 'displayUsername', 'email', 'emailVerified', 'id', 'image', 'name', 'updatedAt', 'username'];
  assert.deepEqual(Object.keys(archive['account.json'].user).sort(), allowedUser.sort());
  await page.screenshot({ path: `${reportDir}/native-account-export.png`, fullPage: true });
  const resumePath = `${reportDir}/fictional-resume.json`;
  await writeFile(resumePath, JSON.stringify(archive[resumeName]), { mode: 0o600 });
  const target = await b.context.newPage(); await target.goto('/dashboard');
  await target.getByRole('button', { name: 'Choose a file', exact: true }).click();
  await target.getByLabel('Choose a file to import', { exact: true }).setInputFiles(zipPath);
  await target.getByText('Extract this account archive, then import a JSON file from its resumes or letters folder.', { exact: true }).waitFor();
  await target.getByLabel('Choose a file to import', { exact: true }).setInputFiles(resumePath);
  await target.getByRole('button', { name: 'Open in editor', exact: true }).click();
  await target.waitForURL(/\/builder\//);
  const importedId = new URL(target.url()).pathname.split('/').at(-1);
  assert.notEqual(importedId, originalId);
  response = await b.api.get(`/api/openapi/resumes/${importedId}`); assert.equal(response.status(), 200);
  const imported = await response.json();
  assert.equal(imported.data.basics.name, original.data.basics.name);
  assert.equal(imported.data.basics.email, original.data.basics.email);
  assert.deepEqual(imported.data.metadata, original.data.metadata, 'Design metadata preserved');
  assert.equal(imported.isPublic, false, 'Sharing permission is not migrated');
  assert.equal((await a.api.get(`/api/openapi/resumes/${importedId}`)).status(), 404);
  // Edit natively, then reopen in the browser and confirm the persisted editable value.
  imported.data.basics.name = 'Fictional Export Edited';
  response = await b.api.patch(`/api/openapi/resumes/${importedId}/metadata`, { data: { data: imported.data } });
  assert.equal(response.status(), 200); await target.reload();
  await target.getByText('Fictional Export Edited', { exact: true }).first().waitFor();
  await target.screenshot({ path: `${reportDir}/native-import-reopened.png`, fullPage: true });
  for (const account of [a, b]) {
    response = await account.api.delete('/api/openapi/auth/account'); assert.equal(response.status(), 200);
    assert.equal((await account.api.get('/api/openapi/auth/account/export')).status(), 401);
  }
  assert.equal(sql('SELECT count(*) FROM "user"'), '0');
  assert.equal(sql('SELECT count(*) FROM resume'), '0');
  assert.equal(unexpectedOrigins.size, 0, 'No external browser requests');
  Object.assign(report, { result: 'passed', archiveBytes: zipBytes.length,
    archiveSha256: createHash('sha256').update(zipBytes).digest('hex'),
    nativeAccountZip: true, accountFieldsAndEmptyApplicationsChecked: true,
    resumeJsonAndDesignImportedIntoIndependentAccount: true, fullZipRejectedWithNativeGuidance: true,
    sharingNotMigrated: true, originalAccountDeniedImportedDocument: true,
    nativeEditAndBrowserReload: true, nativeAccountDeletionAndTokenRejection: true,
    remainingFixtureUsers: 0, remainingFixtureResumes: 0,
    scope: 'One resume/account record; no letter, nonempty job application, image-byte, account-settings or version migration test.' });
} catch (error) {
  report.result = 'failed'; report.error = String(error);
  try { await writeFile(`${reportDir}/startup.log`, docker('logs', app), { mode: 0o600 }); } catch { /* no container */ }
  throw error;
} finally {
  for (const context of contexts) await context.close();
  for (const api of apiContexts) await api.dispose();
  await browser?.close();
  relay?.kill('SIGTERM');
  report.cleanup = [];
  for (const name of [app, db]) {
    try { docker('rm', '-f', name); report.cleanup.push(name); } catch { /* absent */ }
  }
  try { docker('network', 'rm', network); report.cleanup.push(network); } catch { /* absent */ }
  report.finishedAt = new Date().toISOString();
  await writeFile(`${reportDir}/result.json`, JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ result: report.result, reportDir, cleanupCount: report.cleanup.length }));
}
