// Reviewed, scoped activation. Does not run live searches. The post-release
// browser gate is separate so it is never silently retried by this recipe.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { acquireReleaseLock } from '../../maintenance/security-20261103/release-lock.mjs';

const stage = process.argv[2];
assert(stage && stage.startsWith('/var/lib/utilibre-maintenance/degoog-repair-'));
const recipe = fileURLToPath(new URL('.', import.meta.url));
const root = '/home/ubuntu/freetools';
const compose = root + '/deployment/community/compose.evaluation.yaml';
const data = '/opt/utilibre/community-data/degoog';
const engines = '/opt/utilibre/community-src/degoog-searx-engines';
const build = JSON.parse(fs.readFileSync(stage + '/build.json'));
assert(build.passed && build.configurationUnchanged && build.baseLayersPreserved);
assert(JSON.parse(fs.readFileSync(stage + '/scan-comparison.json')).passed);
assert(JSON.parse(fs.readFileSync('/var/lib/utilibre-maintenance/degoog-repair-20261109/browser/result.json')).passed);
const run = (cmd, args, options = {}) => cp.execFileSync(cmd, args, {encoding:'utf8', timeout:120000, stdio:['ignore','pipe','pipe'], ...options});
const docker = args => run('docker', args);
const expected = process.argv[3] || build.base;
assert.equal(docker(['inspect','--format','{{.Image}}','utilibre-evaluation-degoog-1']).trim(), expected);
const previousTag = docker(['inspect','--format','{{.Config.Image}}','utilibre-evaluation-degoog-1']).trim();
assert.equal(docker(['image','inspect','--format','{{.Id}}',build.candidate]).trim(), build.imageId);
const unlock = acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');
const backup = stage + '/release-backup-' + Date.now();
const previousCompose = fs.readFileSync(compose, 'utf8');
const source = '/opt/utilibre/toolbox-public/degoog-utilibre.tar.gz';
let started = false;
try {
  fs.mkdirSync(backup, {mode:0o700});
  fs.writeFileSync(backup + '/compose.evaluation.yaml', previousCompose, {mode:0o600});
  for (const name of ['server-settings.json','plugin-settings.json']) {
    fs.cpSync(data + '/' + name, backup + '/' + name, {preserveTimestamps:true});
    fs.chmodSync(backup + '/' + name, 0o600);
  }
  fs.cpSync(engines, backup + '/engines', {recursive:true,preserveTimestamps:true});
  fs.copyFileSync(source, backup + '/previous-source.tar.gz');
  const oldImage = '    image: ' + previousTag;
  const oldHosts = '      DEGOOG_OUTGOING_ALLOWED_HOSTS: ';
  assert.equal(previousCompose.split(oldImage).length, 2);
  assert.equal(previousCompose.split(oldHosts).length, 2);
  let nextCompose = previousCompose.replace(oldImage, '    image: ' + build.candidate);
  const hostLine = nextCompose.split('\n').find(line=>line.startsWith(oldHosts));
  const hosts = hostLine.slice(oldHosts.length).split(',');
  for(const host of ['search.brave.com','imgs.search.brave.com']) if(!hosts.includes(host)) hosts.push(host);
  nextCompose = nextCompose.replace(hostLine,oldHosts+hosts.join(','));
  started = true;
  run('python3', [recipe + 'configure.py', stage + '/engines']);
  fs.writeFileSync(compose, nextCompose);
  docker(['compose','-f',compose,'config','--quiet']);
  console.log(docker(['compose','-f',compose,'up','-d','--no-deps','degoog']).trim());
  assert.equal(docker(['inspect','--format','{{.Image}}','utilibre-evaluation-degoog-1']).trim(), build.imageId);
  let ready = false;
  for (let attempt=0;attempt<20;attempt++) {
    await new Promise(r => setTimeout(r, 1000));
    try {const response=await fetch('http://127.0.0.1:3143/healthz',{signal:AbortSignal.timeout(2000)}); if(response.ok){ready=true;break;}} catch {}
  }
  assert(ready, 'Candidate readiness failed');
  const published = run('sh', [root + '/deployment/community/publish-degoog-source.sh'], {env:{...process.env,DEGOOG_SOURCE_IMAGE:build.imageId}});
  fs.writeFileSync(stage + '/source-publication.txt', published);
  const receipt = {activatedAt:new Date().toISOString(),imageId:build.imageId,candidate:build.candidate,base:build.base,backup,ready:true,publicSearchGate:'pending'};
  fs.writeFileSync(stage + '/activation.json', JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify(receipt));
  console.log(published.trim());
} catch(error) {
  if(started) {
    fs.writeFileSync(compose, previousCompose);
    for(const name of ['server-settings.json','plugin-settings.json']) {
      const st=fs.statSync(data+'/'+name);fs.copyFileSync(backup+'/'+name,data+'/'+name);fs.chmodSync(data+'/'+name,st.mode&0o777);fs.chownSync(data+'/'+name,st.uid,st.gid);
    }
    for(const name of ['brave.py','brave.traits.json']) if(!fs.existsSync(backup+'/engines/'+name)) fs.rmSync(engines+'/'+name,{force:true});
    fs.cpSync(backup+'/engines',engines,{recursive:true});
    fs.copyFileSync(backup+'/previous-source.tar.gz',source);fs.chmodSync(source,0o644);
    docker(['compose','-f',compose,'up','-d','--no-deps','degoog']);
  }
  throw error;
} finally { unlock(); }
