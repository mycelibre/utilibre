// Native CryptPad export checks against disposable state, never a live drive.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomBytes, createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rm, chmod } from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';

process.umask(0o077);
const repo = '/home/ubuntu/freetools';
const require = createRequire(`${repo}/portal/package.json`);
const { chromium } = require('@playwright/test');
const source = "/var/lib/utilibre-maintenance/held-upgrades-20261111/cryptpad/source";
const JSZip = require(`${source}/www/components/jszip/dist/jszip.min.js`);
const pin = "fd2850ba0ccef87bfb82c195b149bb061f79c8bc";
const runtimeImage='sha256:ce2467088bf841400262efc8e995cdd28812e59c6a917e7ddcc05092dd33c1bc';
assert.equal(execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), pin);
const ram = await mkdtemp('/dev/shm/utilibre-cryptpad-export-');
const report = await mkdtemp('/var/lib/utilibre-maintenance/held-upgrades-20261111/cryptpad/native-');
const app = `utilibre-cryptpad-export-${process.pid}`;
const edge = `${app}-tls`, network = `${app}-net`;
const origin = 'https://pad.utilibre.org';
const hostPort = 4279, tlsPort = 8446;
const outside = new Set();
const browserDiagnostics = [];
const results = { sourcePin: pin, runtimeImage, checkedAt: new Date().toISOString(), checks: {}, limitations: ['Isolated exact-version instance; not a public edge test.', 'Not every document type, document history, permission or account-setting migration.'] };
const docker = args => execFileSync('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });
let browser, relay, phase = 'startup', current;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const body = 'Fictional museum workshop: the blue lantern opens at noon.';
const richBody = 'Fictional rich text: three paper boats beside the glass lake.';
const teamBody = 'Fictional team plan: seven wooden stars on the stage.';

function check(name, value = true) { results.checks[name] = value; console.log(`PASS ${name}`); }
async function context() {
  const c = await browser.newContext({ ignoreHTTPSErrors: true, acceptDownloads: true });
  await c.addInitScript(() => localStorage.setItem('CRYPTPAD_LANG', 'en'));
  await c.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (!['pad.utilibre.org', 'sandbox-pad.utilibre.org'].includes(u.hostname) && !['data:', 'blob:'].includes(u.protocol)) {
      outside.add(u.origin); return route.abort();
    }
    return route.continue();
  });
  return c;
}
async function register(c, suffix) {
  const p = await c.newPage(); current = p; p.setDefaultTimeout(45000);
  p.on('pageerror', e => browserDiagnostics.push({type:'error',message:e.message}));
  p.on('requestfailed', r => browserDiagnostics.push({type:'requestfailed',url:r.url().split('#')[0],error:r.failure()?.errorText}));
  p.on('response', r => {if(r.status()>=400)browserDiagnostics.push({type:'http',url:r.url().split('#')[0],status:r.status()});});
  const password = randomBytes(24).toString('hex');
  for (let attempt = 0; attempt < 3; attempt++) {
    try { await p.goto(`${origin}/register/`); break; }
    catch (error) { if (!String(error).includes('ERR_NETWORK_CHANGED') || attempt === 2) throw error; await pause(500); }
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    try { await p.waitForFunction(() => Boolean(document.getElementById('register') && window.jQuery && window.jQuery._data(document.getElementById('register'), 'events')?.click?.length), undefined, { timeout: 10000 }); break; }
    catch (error) {
      if (attempt === 2 || !browserDiagnostics.some(entry => entry.error === 'net::ERR_NETWORK_CHANGED')) throw error;
      await pause(1000); await p.reload();
    }
  }
  await p.locator('#username').fill(`fictional-export-${process.pid}-${suffix}`);
  await p.locator('#password').fill(password);
  await p.locator('#password-confirm').fill(password);
  await p.locator('[role=checkbox][aria-labelledby=accept-terms-label]').click();
  assert(await p.locator('#accept-terms').isChecked());
  await p.locator('#register').click();
  await p.getByText('I have written down my username and password, proceed', { exact: true }).click();
  await p.waitForURL('**/drive/**');
  await p.frameLocator('#sbox-iframe').getByRole('button', { name: 'New', exact: true }).first().waitFor();
  console.log('PASS native registration ' + suffix);
  return p;
}
async function createDocument(p, type, title, content, team = false) {
  current = p;
  await p.goto(`${origin}/${type}/`);
  const f = p.frameLocator('#sbox-iframe');
  await f.getByRole('button', { name: /^create$/i }).waitFor();
  if (team) {
    await f.locator('.cp-creation-teams button').click();
    await f.locator('.cp-creation-teams a').filter({ hasText: 'Fictional export team' }).click();
  }
  await f.getByRole('button', { name: /^create$/i }).click();
  if (type === 'code') {
    await f.locator('.CodeMirror-code').click(); await p.keyboard.type(content);
  } else {
    await f.getByText('Saved', { exact: true }).first().waitFor();
    const editor = f.frameLocator('.cke_wysiwyg_frame').locator('body[contenteditable=true]');
    await editor.click(); await p.keyboard.type(content);
  }
  await f.locator('.cp-toolbar-title-value').click();
  await f.locator('.cp-toolbar-title input').fill(title);
  await f.locator('.cp-toolbar-title input').press('Enter');
  await pause(1200);
  await p.reload();
  const text = type === 'code' ? f.locator('.CodeMirror-code') : f.frameLocator('.cke_wysiwyg_frame').locator('body');
  await text.filter({ hasText: content }).waitFor();
  return p.url();
}
async function personalExport(p, which) {
  await p.goto(`${origin}/settings/`);
  const f = p.frameLocator('#sbox-iframe');
  await f.locator('[data-category=drive]').click();
  await f.locator('.cp-settings-drive-backup button').nth(which === 'keys' ? 0 : 2).click();
  await f.locator('.alertify input').waitFor();
  const [download] = await Promise.all([p.waitForEvent('download', { timeout: 120000 }), f.locator('.alertify input').press('Enter')]);
  const file = `${ram}/${which === 'keys' ? 'keys.json' : 'personal.zip'}`;
  await download.saveAs(file); return file;
}

try {
  const infra = await readFile(`${repo}/deployment/pack/cryptpad/infra.js`, 'utf8');
  await writeFile(`${ram}/infra.js`, infra);
  await chmod(`${ram}/infra.js`, 0o644);
  await writeFile(`${ram}/Caddyfile`, `{\n admin off\n auto_https disable_redirects\n skip_install_trust\n log {\n  output stdout\n }\n}\nhttps://pad.utilibre.org:${tlsPort}, https://sandbox-pad.utilibre.org:${tlsPort} {\n bind 127.0.0.1\n tls internal\n reverse_proxy 127.0.0.1:${hostPort}\n}\n`);
  const subnet = '10.254.240.0/28';
  execFileSync('python3', ['-c', `import ipaddress,json,subprocess,sys
candidate=ipaddress.ip_network(sys.argv[1])
ids=subprocess.check_output(['docker','network','ls','-q'],text=True).split()
nets=json.loads(subprocess.check_output(['docker','network','inspect',*ids],text=True))
used=[ipaddress.ip_network(c['Subnet']) for n in nets for c in (n['IPAM'].get('Config') or []) if 'Subnet' in c]
used += [ipaddress.ip_network(r['dst']) for r in json.loads(subprocess.check_output(['ip','-j','route'],text=True)) if r.get('dst') not in [None,'default']]
assert not any(n.version==candidate.version and n.overlaps(candidate) for n in used),'Fixture subnet overlaps a current network/route'
`, subnet]);
  const listening = execFileSync('ss', ['-ltnH'], { encoding: 'utf8' });
  assert(![hostPort, tlsPort].some(port => listening.includes(':' + port + ' ')), 'Fixture ports must be free');
  docker(['network', 'create', '--internal', '--subnet', subnet, network]);
  const tmpfs = ['blob', 'block', 'data', 'datastore'].flatMap(n => ['--tmpfs', `/cryptpad/${n}:rw,nosuid,nodev,noexec,size=64m,uid=4001,gid=4001,mode=0700`]);
  const appArgs=['run', '-d', '--name', app, '--network', network, '--init', '--user', '4001:4001', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--memory', '1536m', '--cpus', '2', '--pids-limit', '192', '--log-driver', 'json-file', '--log-opt', 'max-size=256k', '--log-opt', 'max-file=1', '--tmpfs', '/tmp:rw,nosuid,nodev,noexec,size=32m', ...tmpfs, '-e', 'NODE_ENV=production', '-e', 'PACK_DIAGNOSTIC=1', '-e', 'NODE_OPTIONS=--max-old-space-size=192', '-w', '/cryptpad', '-v', `${source}:/cryptpad:ro`, '-v', `${repo}/deployment/pack/cryptpad/config.js:/cryptpad/config/config.js:ro`, '-v', `${ram}/infra.js:/cryptpad/config/infra.js:ro`, runtimeImage, 'node', 'server.js'];
  docker(appArgs.map(v=>v===`${source}:/cryptpad:ro`?'/opt/utilibre/src/cryptpad:/cryptpad:ro':v));
  const ip = docker(['inspect', app, '--format', '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}']).toString().trim();
  relay = spawn('socat', [`TCP-LISTEN:${hostPort},bind=127.0.0.1,reuseaddr,fork`, `TCP:${ip}:3000`], { stdio: 'ignore' });
  docker(['run', '-d', '--name', edge, '--network', 'host', '--read-only', '--cap-drop', 'ALL', '--cap-add', 'NET_BIND_SERVICE', '--security-opt', 'no-new-privileges', '--memory', '192m', '--cpus', '.5', '-e', 'GOMAXPROCS=2', '-e', 'GOMEMLIMIT=128MiB', '--pids-limit', '64', '--log-driver', 'json-file', '--log-opt', 'max-size=256k', '--log-opt', 'max-file=1', '--tmpfs', '/data', '--tmpfs', '/config', '-v', `${ram}/Caddyfile:/etc/caddy/Caddyfile:ro`, 'caddy:2-alpine@sha256:1a81ac3d1a49b2b385a5bfafb8bd39fb40fa1d717461d825ee0d65df91a6e97b']);
  let ready = false;
  for (let i = 0; i < 50; i++) {
    ready = await new Promise(resolve => { const r = https.get({ hostname: '127.0.0.1', port: tlsPort, path: '/', servername: 'pad.utilibre.org', headers: { Host: 'pad.utilibre.org' }, rejectUnauthorized: false }, res => { res.resume(); resolve(res.statusCode === 200); }); r.setTimeout(1000, () => r.destroy()); r.on('error', () => resolve(false)); });
    if (ready) break; await pause(500);
  }
  if (!ready) {
    for (const name of [app, edge]) await writeFile(`${report}/${name}-state.json`, docker(['inspect', name, '--format', '{{json .State}}']));
  }
  assert(ready, 'isolated instance not ready');
  await pause(5000); // Let fixture bridge/address notifications settle before Chromium starts.
  browser = await chromium.launch({ args: ['--ignore-certificate-errors', `--host-resolver-rules=MAP pad.utilibre.org 127.0.0.1:${tlsPort}, MAP sandbox-pad.utilibre.org 127.0.0.1:${tlsPort}`] });
  phase = 'register';
  const a = await context(), b = await context();
  const p = await register(a, 'a'), q = await register(b, 'b');
  check('twoDisposableNativeAccounts');
  phase = 'personal-documents';
  const codeUrl=await createDocument(p, 'code', 'Fictional personal Markdown', body);
  phase='old-office';await p.goto(origin+'/doc/');let f=p.frameLocator('#sbox-iframe');
  await f.getByRole('button',{name:/^create$/i}).click();await pause(12000);
  const oo=p.frames().find(fr=>fr.name()==='frameEditor');assert(oo);const got=oo.getByText('Got it',{exact:true});if(await got.isVisible())await got.click();
  await oo.locator('#area_id').focus();await p.keyboard.type('Fictional document saved before the upgrade.');await pause(2000);const officeUrl=p.url();
  await createDocument(p, 'pad', 'Fictional personal rich text', richBody);
  check('twoPersonalDocumentsSavedAndReopened');
  phase='upgrade-and-restore';
  await pause(3000);
  const recovery=report+'/synthetic-store';await mkdir(recovery);
  const snapshot=docker(['exec',app,'tar','cf','-','blob','block','data','datastore']);
  docker(['pause',app]);
  execFileSync('tar',['xf','-','-C',recovery],{input:snapshot});
  execFileSync('chown',['-R','4001:4001',recovery]);
  docker(['rm','-f',app]);
  const replacement=[];
  for(let i=0;i<appArgs.length;i++){
   if(appArgs[i]==='--tmpfs'&&/^\/cryptpad\//.test(appArgs[i+1])){const name=appArgs[++i].split(':')[0].split('/').at(-1);replacement.push('-v',recovery+'/'+name+':/cryptpad/'+name);}
   else replacement.push(appArgs[i]);
  }
  docker(replacement);
  const newIp=docker(['inspect',app,'--format','{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}']).toString().trim();
  assert.equal(newIp,ip,'Fixture relay address must remain stable');
  await pause(8000);
  for(let attempt=0;attempt<2;attempt++){
    await p.reload();
    try{await p.frameLocator('#sbox-iframe').frameLocator('.cke_wysiwyg_frame').locator('body').filter({hasText:richBody}).waitFor({timeout:15000});break;}
    catch(e){if(attempt||!browserDiagnostics.some(x=>x.error==='net::ERR_NETWORK_CHANGED'))throw e;await pause(3000);}
  }
  check('oldAccountAndRichTextRestoredOnNewVersion');
  phase='old-office-restored';await p.goto(officeUrl);await pause(12000);f=p.frameLocator('#sbox-iframe');
  await f.getByRole('button',{name:'File',exact:true}).click();await f.locator('.cp-toolbar-icon-export:visible').click();
  const downloaded=p.waitForEvent('download',{timeout:60000});await f.locator('.alertify input:visible').press('Enter');const doc=await downloaded;const output=report+'/old-office-after-upgrade.docx';await doc.saveAs(output);
  const zip=await JSZip.loadAsync(await readFile(output));const xml=await zip.file('word/document.xml').async('string');assert(xml.includes('Fictional document saved before the upgrade.'));check('oldOfficeDocumentRestoredAndExported');

  await p.goto(codeUrl);await p.frameLocator('#sbox-iframe').locator('.CodeMirror-code').filter({hasText:body}).waitFor();
  await p.frameLocator('#sbox-iframe').getByRole('button',{name:'Share',exact:true}).click();await pause(1000);
  const share=p.frames().find(fr=>fr.url().includes('/secureiframe/'));assert(share);
  await share.getByText('Edit',{exact:true}).click();const sharedUrl=await share.locator('#cp-share-link-preview').inputValue();assert(sharedUrl.includes('#'));
  await share.getByRole('button',{name:'Cancel',exact:true}).click();
  current=q;await q.goto(sharedUrl);const peer=q.frameLocator('#sbox-iframe');
  await peer.locator('body').waitFor();await pause(2500);
  const noStore=peer.getByRole('button',{name:/don't store/i});if(await noStore.isVisible())await noStore.click();
  await peer.locator('.CodeMirror-code').filter({hasText:body}).waitFor();
  await peer.locator('.CodeMirror-code').click();await q.keyboard.press('Control+End');await q.keyboard.type('\nA second fictional participant edited this.');
  await p.frameLocator('#sbox-iframe').getByText('A second fictional participant edited this.',{exact:true}).first().waitFor();
  await p.reload();await p.frameLocator('#sbox-iframe').getByText('A second fictional participant edited this.',{exact:true}).first().waitFor();
  check('twoClientEditingAndReloadAfterUpgrade');

  assert.deepEqual([...outside],[]);check('noThirdPartyRequests');results.completed=true;
} catch (error) {
  for (const name of [app, edge]) { try { await writeFile(`${report}/${name}.log`, docker(['logs', name])); } catch {} }
  await writeFile(`${report}/browser-diagnostics-private.json`, JSON.stringify(browserDiagnostics, null, 2));
  results.completed = false; results.failedPhase = phase; results.errorClass = error.name;
  await writeFile(`${report}/failure-private.txt`, String(error.stack));
  if (current) {
    await writeFile(`${report}/all-pages-private.json`,JSON.stringify(await Promise.all(browser.contexts().flatMap(c=>c.pages()).map(async page=>({body:await page.locator('body').innerText().catch(()=>''),frames:await Promise.all(page.frames().map(async f=>({body:await f.locator('body').innerText().catch(()=>''),code:await f.locator('.CodeMirror-code').allTextContents().catch(()=>[])})))})))));
    await current.screenshot({ path: `${report}/failure-private.png`, fullPage: true }).catch(() => {});
    await writeFile(`${report}/failure-dom-private.json`, JSON.stringify(await Promise.all(current.frames().map(async frame => ({ name: frame.name(), body: await frame.locator('body').innerText().catch(() => '') }))))).catch(() => {});
  }
  console.error(`Native CryptPad export check failed at ${phase}; private diagnostics retained.`); process.exitCode = 1;
} finally {
  await browser?.close();
  relay?.kill('SIGTERM');
  for (const name of [edge, app]) try { docker(['rm', '-f', name]); } catch {}
  try { docker(['network', 'rm', network]); } catch {}
  await rm(ram, { recursive: true, force: true });
  results.disposableStateRemoved = [edge, app].every(name => spawnSync('docker', ['inspect', name], { stdio: 'ignore' }).status !== 0) && spawnSync('docker', ['network', 'inspect', network], { stdio: 'ignore' }).status !== 0;
  if (!results.disposableStateRemoved) process.exitCode = 1;
  await writeFile(`${report}/result.json`, JSON.stringify(results, null, 2) + '\n');
  console.log(`Metadata evidence: ${report}/result.json`);
}
