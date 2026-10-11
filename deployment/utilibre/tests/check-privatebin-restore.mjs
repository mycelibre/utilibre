// Recover only configuration into an EMPTY store, then create a fictional paste.
// No live paste is copied. The rehearsal cannot reach the Internet.
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm,mkdir,chown,access,chmod} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {randomBytes} from 'node:crypto';
const {chromium}=createRequire(new URL('../../../portal/package.json',import.meta.url))('playwright-core');
process.umask(0o077);
await mkdir('/opt/utilibre/reports',{recursive:true,mode:0o700});
const report=await mkdtemp('/opt/utilibre/reports/privatebin-restore-');
const temp=await mkdtemp('/opt/utilibre/privatebin-rehearsal-');
const name=`utilibre-privatebin-restore-${process.pid}`,network=`${name}-net`;
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const text=`Fictional restore check ${randomBytes(12).toString('hex')}`;
const started=performance.now();const browser=await chromium.launch();let snapshot,bridge,created=false,networkCreated=false;
try {
 snapshot=execFileSync('/opt/utilibre/scripts/backup.sh',['--no-prune'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 assert.match(snapshot,/^\/opt\/utilibre\/data\/backups\/daily-\d{8}-\d{6}$/);
 execFileSync('sha256sum',['-c','SHA256SUMS'],{cwd:snapshot,stdio:'ignore'});
 await assert.rejects(access(`${snapshot}/files/privatebin-data.tar.gz`), {code:'ENOENT'});
 const members=execFileSync('tar',['-tzf',`${snapshot}/files/configuration.tar.gz`],{encoding:'utf8'}).split('\n');
 assert(members.includes('config/privatebin/conf.php'));
 assert(!members.some(name=>/^(data|temporary)\//.test(name)));
 await mkdir(`${temp}/config`);
 await mkdir(`${temp}/privatebin`);await chown(`${temp}/privatebin`,65534,82);
 // Disposable synthetic store only. A real restore requires an excluded disk.
 await writeFile(`${temp}/privatebin/.utilibre-temporary-volume`,'utilibre-privatebin-temporary-v1\n');
 await chmod(`${temp}/privatebin/.utilibre-temporary-volume`,0o444);
 execFileSync('tar',['-xzf',`${snapshot}/files/configuration.tar.gz`,'-C',`${temp}/config`,'config/privatebin'],{stdio:'ignore'});
 // Preserve the supported custom template and static assets with its config.
 const restoredConfig=`${temp}/config/config/privatebin`;
 const selectedConfig=await readFile(`${restoredConfig}/conf.php`,'utf8');
 const templateMounts=selectedConfig.includes('template = "bootstrap5-utilibre"')
  ? [['bootstrap5-utilibre.php','/srv/tpl/bootstrap5-utilibre.php'],['robots.txt','/var/www/robots.txt'],['manifest.json','/var/www/manifest.json'],['brand','/var/www/utilibre-brand'],['brand/favicon.ico','/var/www/favicon.ico'],['discovery-server.conf','/etc/nginx/server.d/utilibre-discovery.conf'],['discovery-location.conf','/etc/nginx/location.d/utilibre-discovery.conf']].flatMap(([file,target])=>['-v',`${restoredConfig}/${file}:${target}:ro`]) : [];
 if (selectedConfig.includes('fileupload = true')) templateMounts.push(...[['upload-limit.js','/var/www/js/utilibre-upload-limit.js'],['upload-guard.php','/srv/cfg/upload-guard.php'],['uploads.ini','/etc/php85/conf.d/zz-utilibre-uploads.ini'],['uploads-pool.conf','/etc/php85/php-fpm.d/zzz-utilibre-uploads.conf']].flatMap(([file,target])=>['-v',`${restoredConfig}/${file}:${target}:ro`]));
 const image=docker('inspect','utilibre-services-privatebin-1','--format','{{.Image}}').trim();
 docker('network','create','--internal',network);networkCreated=true;
 docker('run','-d','--name',name,'--network',network,'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--cpus','0.5','--memory','768m','--pids-limit','96','--log-driver','none',
  '--tmpfs','/run:rw,exec,nosuid,nodev,size=16m,mode=0755,uid=65534,gid=82','--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=64m,mode=1777','--tmpfs','/var/lib/nginx/tmp:rw,nosuid,nodev,noexec,size=128m,mode=0755,uid=65534,gid=82',
  '-v',`${temp}/privatebin:/srv/data`,'-v',`${temp}/config/config/privatebin/conf.php:/srv/cfg/conf.php:ro`,...templateMounts,image);created=true;
 // Docker deliberately omits published ports on an internal network. A bounded
 // loopback bridge gives this browser access without giving the clone egress.
 const ip=JSON.parse(docker('inspect',name))[0].NetworkSettings.Networks[network].IPAddress;
 assert.match(ip,/^\d+\.\d+\.\d+\.\d+$/);
 bridge=spawn('socat',['TCP4-LISTEN:3184,bind=127.0.0.1,reuseaddr,fork,max-children=32',`TCP4:${ip}:8080`],{detached:true,stdio:'ignore'});
 let ready=false;for(let n=0;n<25;n++){try{ready=(await fetch('http://127.0.0.1:3184/',{signal:AbortSignal.timeout(1000)})).ok}catch{}if(ready)break;await new Promise(r=>setTimeout(r,500))}assert(ready);
 const restored=await browser.newPage();await restored.goto('http://127.0.0.1:3184/');
 await restored.locator('#message').fill(text);
 const sent=restored.waitForResponse(r=>r.request().method()==='POST'&&r.url().startsWith('http://127.0.0.1:3184/'));
 await restored.locator('#sendbutton').click();const receipt=await (await sent).json();assert.equal(receipt.status,0);
 await restored.waitForFunction(()=>location.hash.length>15);
 await restored.reload();
 await restored.waitForFunction(expected=>document.body.innerText.includes(expected),text,{timeout:15000});
 const stranger=await browser.newPage();await stranger.goto(`http://127.0.0.1:3184/?${receipt.id}`);
 assert(!(await stranger.locator('body').innerText()).includes(text));
 const result={checkedAt:new Date().toISOString(),passed:true,snapshot,elapsedSeconds:Math.round((performance.now()-started)/100)/10,checks:['new backup excludes PrivateBin data','configuration archive has no data tree','backup checksums pass without pruning old copies','configuration-only recovery starts with empty data','isolated native browser creates and decrypts a new synthetic paste','unkeyed browser does not display plaintext'],limitations:['configuration recovery only; pastes intentionally not recoverable','on-host isolated rehearsal; no host-loss test','earlier and whole-VM backups are outside this exclusion check']};
 await writeFile(`${report}/result.json`,JSON.stringify(result,null,2)+'\n',{mode:0o600});
 console.log(`PASS: PrivateBin configuration recovered without user content; new-paste workflow passed. Private report: ${report}/result.json`);
} catch(error){console.error('PrivateBin rehearsal failed:',error instanceof assert.AssertionError?error.message:error.name);process.exitCode=1;}
finally {
 await browser.close();if(bridge?.pid){try{process.kill(-bridge.pid,'SIGTERM')}catch{}}if(created)docker('rm','-f',name);if(networkCreated)docker('network','rm',network);
 assert.match(temp,/^\/opt\/utilibre\/privatebin-rehearsal-[A-Za-z0-9]+$/);await rm(temp,{recursive:true});
}
