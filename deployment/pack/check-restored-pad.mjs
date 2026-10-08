// One isolated native restore, never a copy over the live datastore.
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,mkdir,rm,chown} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import https from 'node:https';
const {chromium}=createRequire(new URL('../../portal/package.json',import.meta.url))('@playwright/test');
process.umask(0o077);
const snapshot=process.argv[2];
assert.match(snapshot||'',/^\/opt\/utilibre\/pack-backups\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/);
await readFile(`${snapshot}/COMPLETE`);
const temp=await mkdtemp('/opt/utilibre/pack-restore-browser-');
const docker=(args)=>execFileSync('docker',args,{stdio:['ignore','pipe','pipe']});
const app=`utilibre-pack-restore-${process.pid}`,edge=`${app}-tls`;
let browser;
try {
  for(const name of ['cryptpad','private-config'])execFileSync('openssl',['cms','-decrypt','-binary','-inform','DER','-in',`${snapshot}/${name}.tar.gz.cms`,'-inkey','/opt/utilibre/pack-backup-key/private.pem','-out',`${temp}/${name}.tar.gz`],{stdio:'ignore'});
  for(const name of ['cryptpad','private-config']){
    const paths=execFileSync('tar',['-tzf',`${temp}/${name}.tar.gz`],{encoding:'utf8'}).trim().split('\n');
    assert(paths.every(p=>!p.startsWith('/')&&!p.split('/').includes('..')));
    await mkdir(`${temp}/${name}`,{mode:0o700});
    execFileSync('tar',['-xzf',`${temp}/${name}.tar.gz`,'-C',`${temp}/${name}`],{stdio:'ignore'});
  }
  await chown(`${temp}/cryptpad`,4001,4001);
  const mounts=['blob','block','data','datastore'].flatMap(n=>['-v',`${temp}/cryptpad/${n}:/cryptpad/${n}`]);
  docker(['run','-d','--name',app,'--network','utilibre-pack-cryptpad_pad','--user','4001:4001','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','768m','--cpus','1','--pids-limit','192','--log-driver','none','--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=32m','-e','NODE_ENV=production','-e','NODE_OPTIONS=--max-old-space-size=192','-w','/cryptpad','-p','127.0.0.1:3179:3000','-v','/opt/utilibre/src/cryptpad:/cryptpad:ro','-v',`${temp}/private-config/deployment/pack/cryptpad/config.js:/cryptpad/config/config.js:ro`,'-v',`${temp}/private-config/deployment/pack/cryptpad/infra.js:/cryptpad/config/infra.js:ro`,...mounts,'node:24-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20','node','server.js']);
  // The upstream binary carries a NET_BIND_SERVICE file capability; preserve
  // that one capability even though this loopback listener uses a high port.
  docker(['run','-d','--name',edge,'--network','host','--read-only','--cap-drop','ALL','--cap-add','NET_BIND_SERVICE','--security-opt','no-new-privileges','--memory','96m','--cpus','0.25','--pids-limit','64','--log-driver','none','--tmpfs','/data','--tmpfs','/config','-v',`${process.cwd()}/deployment/pack/Caddyfile.restore:/etc/caddy/Caddyfile:ro`,'caddy:2-alpine@sha256:1a81ac3d1a49b2b385a5bfafb8bd39fb40fa1d717461d825ee0d65df91a6e97b']);
  for(let n=0;n<20;n++){try{if((await fetch('http://127.0.0.1:3179/',{signal:AbortSignal.timeout(1000)})).ok)break}catch{}await new Promise(r=>setTimeout(r,500))}
  const edgeReady=()=>new Promise(resolve=>{const r=https.get({hostname:'127.0.0.1',port:8444,path:'/',servername:'pad.utilibre.org',headers:{Host:'pad.utilibre.org'},rejectUnauthorized:false},res=>{res.resume();resolve(res.statusCode===200)});r.setTimeout(1000,()=>r.destroy());r.on('error',()=>resolve(false));});
  let ready=false;
  for(let n=0;n<30;n++){if(await edgeReady()){ready=true;break}await new Promise(r=>setTimeout(r,500))}
  assert(ready,'Isolated TLS test proxy not ready');
  browser=await chromium.launch({args:['--ignore-certificate-errors','--host-resolver-rules=MAP pad.utilibre.org 127.0.0.1:8444, MAP sandbox-pad.utilibre.org 127.0.0.1:8444']});
  const context=await browser.newContext({ignoreHTTPSErrors:true,storageState:`${temp}/private-config/pack-secrets/cryptpad-owner-state.json`});
  const page=await context.newPage();
  const url=(await readFile(`${temp}/private-config/pack-secrets/cryptpad-test-document-url.txt`,'utf8')).trim();
  await page.goto(url);await page.frameLocator('#sbox-iframe').getByText('A second participant edited this.',{exact:true}).first().waitFor({timeout:30000});
  console.log('PASS: encrypted snapshot restored into an isolated native CryptPad; recovered browser state decrypted the synthetic collaborative document.');
} catch(error) {
  // Native browser errors may contain document-key URLs: never log their stack.
  console.error('Restore browser check failed:',error instanceof assert.AssertionError ? error.message : error.name);
  process.exitCode=1;
} finally {
  await browser?.close();
  for(const name of [edge,app])try{docker(['rm','-f',name])}catch{}
  assert.match(temp,/^\/opt\/utilibre\/pack-restore-browser-[A-Za-z0-9]+$/);
  await rm(temp,{recursive:true});
}
