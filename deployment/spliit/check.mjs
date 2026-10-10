// Fictional native workflow only. Set UTILIBRE_SPLIIT_PUBLIC=1 for actual public
// HTTPS, with no request override and no repeat of the isolated restore test.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '../../portal/node_modules/playwright/index.mjs';
const publicCheck = process.env.UTILIBRE_SPLIIT_PUBLIC === '1';
const runId = crypto.randomUUID();
const fixtureName = `Utilibre QA ${runId}`;
const report = `/opt/utilibre/reports/spliit-${publicCheck ? 'public-' : ''}20261009-${runId}`;
process.umask(0o077); await mkdir(report, { recursive: true, mode: 0o700 });
const origin = 'https://expenses.utilibre.org';
const browser = await chromium.launch();
const context = await browser.newContext({ locale: 'en-US', serviceWorkers: 'block' });
const external = [];
function observeExternalRequests(target) {
  const records = new WeakMap();
  target.on('request', request => {
    if (!/^https?:/.test(request.url()) || new URL(request.url()).origin === origin) return;
    const entry = { host:new URL(request.url()).hostname, failed:null, response:false };
    records.set(request,entry); external.push(entry);
  });
  target.on('requestfailed', request => { const entry=records.get(request); if(entry) entry.failed=request.failure()?.errorText; });
  target.on('response', response => { const entry=records.get(response.request()); if(entry) entry.response=true; });
}
observeExternalRequests(context);
if (!publicCheck) await context.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.origin !== origin) { external.push(url.hostname); await route.abort(); return; }
  const response = await route.fetch({ url: 'http://127.0.0.1:3190'+url.pathname+url.search });
  await route.fulfill({ response });
});
const page = await context.newPage(); page.setDefaultTimeout(15000);
let groupId;
try {
  await page.goto(origin+'/groups/create');
  await page.locator('input[name="name"]').fill(fixtureName);
  await page.waitForTimeout(250);
  for (const [i, name] of ['Ana Example', 'Bruno Example', 'Clara Example'].entries()) await page.locator(`input[name="participants.${i}.name"]`).fill(name);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.waitForURL(/\/groups\/[^/]+\/expenses$/);
  groupId = new URL(page.url()).pathname.split('/')[2];
  await writeFile(report+'/fixture.json', JSON.stringify({groupId,fixtureName}), { mode: 0o600 });
  await page.goto(`${origin}/groups/${groupId}/expenses/create`);
  await page.getByRole('button', { name: 'Create', exact: true }).waitFor();
  await page.locator('input[name="title"]').fill('Fictional museum tickets');
  await page.locator('input[name="amount"]').fill('60');
  await page.getByTestId('paid-by').click();
  await page.getByRole('option', { name: 'Ana Example', exact: true }).click();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.waitForURL(/\/groups\/[^/]+\/expenses$/);
  await page.getByTestId('expense-card').filter({hasText:'Fictional museum tickets'}).waitFor();
  await page.getByTitle('Export', {exact:true}).click();
  const exportLinks = await page.locator('a[title^="Export to"]').evaluateAll(items=>items.map(a=>a.getAttribute('href')));
  assert(exportLinks.some(x=>x.endsWith('/json')) && exportLinks.some(x=>x.endsWith('/csv')));
  const json = await page.evaluate(async path => (await fetch(path)).json(), `/groups/${groupId}/expenses/export/json`);
  const csv = await page.evaluate(async path => (await fetch(path)).text(), `/groups/${groupId}/expenses/export/csv`);
  assert.equal(json.expenses.length,1); assert.equal(json.expenses[0].amount,6000); assert.equal(json.participants.length,3);
  assert(csv.includes('Fictional museum tickets') && csv.includes('Ana Example'));
  await writeFile(report+'/export.json', JSON.stringify(json,null,2), {mode:0o600}); await writeFile(report+'/export.csv',csv,{mode:0o600});
  const recipient = await browser.newContext({ locale:publicCheck ? 'es' : 'en-US', viewport:{width:390,height:844}, serviceWorkers:'block' });
  if (!publicCheck) await recipient.route(origin+'/**', async route=>{const u=new URL(route.request().url());const response=await route.fetch({url:'http://127.0.0.1:3190'+u.pathname+u.search});await route.fulfill({response});});
  observeExternalRequests(recipient);
  const received=await recipient.newPage();await received.goto(`${origin}/groups/${groupId}/expenses`);
  await received.getByTestId('expense-card').filter({hasText:'Fictional museum tickets'}).waitFor();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Desktop must not overflow');
  assert(await received.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile must not overflow');
  await page.screenshot({path:report+'/desktop.png',fullPage:true});
  await received.screenshot({path:report+'/mobile.png',fullPage:true});
  await recipient.unrouteAll({behavior:'wait'}); await recipient.close();
  let restored;
  if (!publicCheck) {
  const snapshot=execFileSync(process.execPath,['deployment/spliit/backup.mjs'],{encoding:'utf8'}).trim();
  execFileSync(process.execPath,['deployment/spliit/verify-backup.mjs',snapshot],{stdio:'pipe'});
  restored=JSON.parse(await readFile(snapshot+'/RESTORE-VERIFIED.json','utf8'));
  assert.equal(restored.counts.groups,1);assert.equal(restored.counts.expenses,1);assert.equal(restored.counts.participants,3);
  }
  await page.goto(`${origin}/groups/${groupId}/expenses/${json.expenses[0].id}/edit`);
  await page.getByRole('button',{name:'Delete',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Yes',exact:true}).click();
  await page.waitForURL(/\/groups\/[^/]+\/expenses$/);
  assert.equal(await page.getByTestId('expense-card').count(),0);
  await writeFile(report+'/external-request-attempts.json',JSON.stringify(external,null,2)+'\n',{mode:0o600});
  assert(external.every(entry => !entry.response && ['csp','net::ERR_BLOCKED_BY_CSP'].includes(entry.failed)),'Any outside attempt must be blocked by CSP before transmission');
  await writeFile(report+'/result.json',JSON.stringify({checkedAt:new Date().toISOString(),passed:true,groupCreation:true,expenseCreation:true,sharedLinkRead:true,csv:true,json:true,restore:restored?.counts ?? 'not repeated; separate scheduled restore verified',nativeExpenseDeletion:true,externalRequestAttempts:external,externalResponses:external.filter(entry=>entry.response).length,publicEdgeTested:publicCheck,desktopMobile:true},null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({passed:true,publicEdgeTested:publicCheck,fictionalCreateShareJsonCsvDelete:true,desktopMobile:true,report}));
} catch (error) {
  await writeFile(report+'/failure.txt',String(error.stack),{mode:0o600});await page.screenshot({path:report+'/failure.png',fullPage:true});throw error;
} finally {
  await context.unrouteAll({behavior:'ignoreErrors'});await browser.close();
  if (groupId) {
    assert(/^[A-Za-z0-9_-]{21}$/.test(groupId), 'Unexpected fixture identifier; refuse cleanup');
    assert(/^Utilibre QA [a-f0-9-]{36}$/.test(fixtureName));
    // Native database administration for this app's missing whole-group UI.
    // Both exact ID and the randomly assigned ownership marker must match.
    const sql=`WITH removed AS (DELETE FROM "Group" WHERE id='${groupId}' AND name='${fixtureName}' RETURNING id) SELECT count(*) FROM removed;`;
    const count=execFileSync('docker',['exec','utilibre-spliit-db-1','psql','-U','spliit','-d','spliit','-At','-v','ON_ERROR_STOP=1','-c',sql],{encoding:'utf8'}).trim();
    assert.equal(count,'1','Only the exact owned fictional group may be removed');
    await writeFile(report+'/cleanup.json',JSON.stringify({exactOwnedGroupRemoved:true,nativeCascade:true,retentionChanged:false})+'\n',{mode:0o600});
  }
}
