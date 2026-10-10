// Installed-image native checks with isolated fictional accounts and RAM data.
// No production identity, database, upload, mail or provider is accessed.
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, statfs } from 'node:fs/promises';
import { chromium } from '../../portal/node_modules/playwright/index.mjs';
const suffix = randomBytes(5).toString('hex');
const network = `utilibre-wishlist-check-${suffix}`, app = `${network}-app`;
const reportDir = `/opt/utilibre/reports/wishlist-image-claims-${suffix}`;
const image = 'sha256:14e15c6b3a5ae4d93cf857427ad5d91354dca32cef1d8f15cffce4c8e8046309';
const port = 3432, base = `http://127.0.0.1:${port}`;
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const report = { checkedAt: new Date().toISOString(), image, fictionalOnly: true, checks: {}, cleanup: false };
let browser, relay; const contexts = [], outside = new Set();
await mkdir(reportDir, { mode: 0o700 });
function query(sql, ...params) {
  assert(sql.startsWith('SELECT '));
  return JSON.parse(docker('exec', app, 'node', '--input-type=module', '-e',
    "import {DatabaseSync} from 'node:sqlite'; const db=new DatabaseSync('/usr/src/app/data/prod.db',{readOnly:true}); console.log(JSON.stringify(db.prepare(process.argv[1]).all(...JSON.parse(process.argv[2])))); db.close();", sql, JSON.stringify(params)));
}
async function context() {
  const c = await browser.newContext({ baseURL: base, serviceWorkers: 'block' }); contexts.push(c);
  await c.route('**/*', async r => {
    const u = new URL(r.request().url());
    if (u.origin !== base) { outside.add(u.origin); return r.abort(); }
    await r.continue();
  }); return c;
}
async function api(page, method, path, data, expected = 200) {
  const r = await page.evaluate(async ({method,path,data}) => {
    const res=await fetch(path,{method,headers:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
    return {status:res.status,text:await res.text()};
  }, {method,path,data});
  assert.equal(r.status, expected, `${method} ${path}: ${r.text.slice(0,180)}`);
  return r.text ? JSON.parse(r.text) : null;
}
try {
  const disk=await statfs('/'); assert(disk.bavail*disk.bsize>=5*1024**3);
  assert(!execFileSync('ss',['-ltnH'],{encoding:'utf8'}).includes(`:${port} `), 'Fixture port must be free');
  docker('image','inspect',image,'--format','{{.Id}}');
  const subnet='10.254.240.0/28';
  execFileSync('python3',['-c',`import ipaddress,json,subprocess,sys
candidate=ipaddress.ip_network(sys.argv[1])
ids=subprocess.check_output(['docker','network','ls','-q'],text=True).split()
nets=json.loads(subprocess.check_output(['docker','network','inspect',*ids],text=True))
used=[ipaddress.ip_network(c['Subnet']) for n in nets for c in (n['IPAM'].get('Config') or []) if 'Subnet' in c]
used += [ipaddress.ip_network(r['dst']) for r in json.loads(subprocess.check_output(['ip','-j','route'],text=True)) if r.get('dst') not in [None,'default']]
assert not any(n.version==candidate.version and n.overlaps(candidate) for n in used),'Fixture subnet overlaps a current network/route'
`,subnet]);
  docker('network','create','--internal','--subnet',subnet,network);
  docker('run','--pull=never','-d','--name',app,'--network',network,'--cpus','1','--memory','512m','--pids-limit','128',
    '--user','1000:1000','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true',
    '--log-driver','json-file','--log-opt','max-size=256k','--log-opt','max-file=1',
    '--tmpfs','/usr/src/app/data:rw,size=64m,uid=1000,gid=1000,mode=700',
    '--tmpfs','/usr/src/app/uploads:rw,size=16m,uid=1000,gid=1000,mode=700',
    '--tmpfs','/tmp:rw,size=64m,mode=1777',
    '-e',`ORIGIN=${base}`,'-e','DEFAULT_CURRENCY=USD','-e','MAX_IMAGE_SIZE=1048576','-e','LOG_LEVEL=warn',
    '-e','PRISMA_HIDE_UPDATE_MESSAGE=1','-e','CHECKPOINT_DISABLE=1','-e','XDG_CONFIG_HOME=/tmp/caddy-config','-e','XDG_DATA_HOME=/tmp/caddy-data',image);
  const ip=docker('inspect',app,'--format','{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}');
  relay=spawn('socat',[`TCP-LISTEN:${port},bind=127.0.0.1,reuseaddr,fork`,`TCP:${ip}:3280`],{stdio:'ignore'});
  let ready=false; for(let i=0;i<100;i++){try{const r=await fetch(base+'/login',{signal:AbortSignal.timeout(800)});if(r.ok){ready=true;break;}}catch{}await sleep(300);}
  assert(ready,'Isolated native app starts');
  browser=await chromium.launch();const a=await context(), b=await context();const pa=await a.newPage(),pb=await b.newPage();pa.setDefaultTimeout(15000);pb.setDefaultTimeout(15000);
  const password=randomBytes(30).toString('base64url');
  await pa.goto(base+'/setup-wizard/step/1');
  await pa.waitForTimeout(750);
  for(const [key,value] of Object.entries({name:'Fictional Owner',username:'fixture-owner',email:'owner@example.invalid',password}))await pa.locator(`[name="${key}"]`).fill(value);
  await pa.locator('#confirmpassword').fill(password);await pa.locator('#confirmpassword').press('Tab');await pa.locator('button[type="submit"]').click();await pa.waitForURL('**/setup-wizard/step/2');
  const settings=await pa.evaluate(async()=>{const r=await fetch('/admin/settings?/settings',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','x-sveltekit-action':'true'},body:new URLSearchParams({enableSuggestions:'true',suggestionMethod:'approval',claimsShowName:'true',claimsRequireEmail:'true',passwordStrength:'2'})});return {status:r.status,text:await r.text()};});assert.equal(settings.status,200);assert.match(settings.text,/success/);
  const group=(await api(pa,'PUT','/api/groups',{name:'Fictional gift circle'},201)).group;
  const owner=query('SELECT id FROM user WHERE username=?','fixture-owner')[0];
  await api(pa,'PATCH',`/api/users/${owner.id}/groups/${group.id}`,{active:true});
  const member=await api(pa,'PUT','/api/users',{name:'Fictional Member',username:'fixture-member',email:'member@example.invalid',password},201);
  const uid=member.id;assert(uid);
  await api(pa,'PUT',`/api/groups/${group.id}/users/${uid}`,{manager:false},201);
  await api(pa,'PATCH',`/api/users/${uid}/groups/${group.id}`,{active:true});
  await pb.goto(base+'/login');await pb.waitForTimeout(750);await pb.locator('[name="username"]').fill('fixture-member');await pb.locator('[name="password"]').fill(password);await pb.locator('form button.preset-filled-primary-500').click();await pb.waitForURL(u=>u.pathname!=='/login');
  await pa.goto(base+'/lists/create');await pa.locator('[name="name"]').fill('Fictional gift list');await pa.getByRole('button',{name:'Create',exact:true}).click();await pa.waitForURL(u=>/^\/lists\/[^/]+$/.test(u.pathname)&&!u.pathname.endsWith('/create'));const listId=new URL(pa.url()).pathname.split('/')[2];
  const png=await readFile(new URL('../../portal/public/examples/autoredact-fictional.png',import.meta.url));
  async function createItem(name){
    await pa.goto(`${base}/lists/${listId}/create-item`);await pa.locator('[name="name"]').fill(name);
    await pa.locator('input[type="file"]').setInputFiles({name:'fictional.png',mimeType:'image/png',buffer:png});
    await pa.getByRole('button',{name:'Create item',exact:true}).click();await pa.waitForURL(u=>u.pathname==='/lists'||u.pathname===`/lists/${listId}`);
    const rows=query('SELECT id, imageUrl FROM items WHERE name=?',name);assert.equal(rows.length,1);assert(rows[0].imageUrl);return rows[0];
  }
  const item=await createItem('Fictional illustrated notebook');
  const asset=new URL('/api/assets/'+item.imageUrl,base).href;assert.equal(new URL(asset).origin,base);
  assert.equal((await fetch(asset)).status,200);report.checks.unsignedImageAccessible=true;
  await pb.goto(`${base}/lists/${listId}`);await pb.getByText('Fictional illustrated notebook',{exact:true}).first().waitFor();
  await api(pb,'PUT',`/api/lists/${listId}/items/${item.id}/claims`,{claimedById:uid,quantity:1});
  const claim=query('SELECT id, claimedById, quantity, purchased FROM list_item_claim WHERE itemId=?',item.id)[0];assert.equal(claim.claimedById,uid);assert.equal(claim.quantity,1);
  await api(pb,'PATCH',`/api/claims/${claim.id}`,{purchased:true});assert.equal(query('SELECT purchased FROM list_item_claim WHERE id=?',claim.id)[0].purchased,1);
  const denied=await pb.request.delete(`/api/items/${item.id}`);assert.equal(denied.status(),401);report.checks.memberCannotDeleteOwnerItem=true;
  await api(pb,'DELETE',`/api/claims/${claim.id}`);assert.equal(query('SELECT id FROM list_item_claim WHERE itemId=?',item.id).length,0);report.checks.memberClaimPurchaseUnclaim=true;
  await api(pa,'DELETE',`/api/items/${item.id}`);assert.equal(query('SELECT id FROM items WHERE id=?',item.id).length,0);assert.equal((await fetch(asset,{headers:{'Cache-Control':'no-cache'}})).status,404);report.checks.directItemDeletionRemovesImage=true;
  const second=await createItem('Fictional retained image');const orphan=new URL('/api/assets/'+second.imageUrl,base).href;
  await api(pa,'DELETE',`/api/groups/${group.id}`);assert.equal(query('SELECT id FROM items WHERE id=?',second.id).length,0);
  report.checks.groupDeletionImageHttp=(await fetch(orphan,{headers:{'Cache-Control':'no-cache'}})).status;assert.equal(report.checks.groupDeletionImageHttp,200);report.checks.groupDeletionLeavesUpload=true;
  assert.equal(outside.size,0);report.externalBrowserRequests=[];report.result='passed';
}catch(e){report.result='failed';report.error=String(e.stack);try{await writeFile(reportDir+'/container-private.log',docker('logs',app));for(const [i,c] of contexts.entries())for(const [j,p] of c.pages().entries()){await p.screenshot({path:`${reportDir}/failure-${i}-${j}.png`});await writeFile(`${reportDir}/failure-${i}-${j}.txt`,p.url()+'\n'+await p.locator('body').innerText());}}catch{}throw e;
}finally{
  for(const c of contexts)await c.close().catch(()=>{});await browser?.close();relay?.kill('SIGTERM');
  try{docker('rm','-f',app);}catch{}try{docker('network','rm',network);}catch{}
  report.cleanup=spawnSync('docker',['inspect',app],{stdio:'ignore'}).status!==0 && spawnSync('docker',['network','inspect',network],{stdio:'ignore'}).status!==0;
  report.finishedAt=new Date().toISOString();await writeFile(reportDir+'/result.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(reportDir);
  assert(report.cleanup,'Temporary container/network removed');
}
