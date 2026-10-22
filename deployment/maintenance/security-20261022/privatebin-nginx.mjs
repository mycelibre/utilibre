// Finite Alpine vendor repair over the already verified PHP/application image.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';
export const output='/var/lib/utilibre-maintenance/security-20261022/privatebin-nginx';
export const spec={key:'privatebin-nginx',container:'utilibre-services-privatebin-1',base:'sha256:65239f579a0fb33c97cd9e71b989c0dd212c63a06bfc950a23715d5254958e52',candidate:'utilibre-privatebin:nginx1306-security-20261022'};
export const pin={file:'nginx-1.30.6-r0.apk',sha256:'8ac5cfd9e66d1dff5eaaf38a187ca3a6d9162b35afc96d225d1612f1a91ccbdb',url:'https://dl-cdn.alpinelinux.org/alpine/v3.24/main/x86_64/nginx-1.30.6-r0.apk'};
const sha=b=>createHash('sha256').update(b).digest('hex');
async function main(){
 process.umask(0o077);fs.mkdirSync(output,{recursive:true});assert(!fs.existsSync(output+'/build.json'),'Preserve completed evidence');
 const run=(p,a,opt={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:240000,maxBuffer:16*1024**2,stdio:['pipe','pipe','pipe'],...opt});}catch(e){fs.writeFileSync(output+'/error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('PrivateBin candidate failed; private evidence retained');}};
 const docker=(...a)=>run('docker',a),native=(id,p,a)=>docker('run','--rm','--network','none','--read-only','--user','0','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','256m','--pids-limit','64','--log-driver','none','--entrypoint',p,id,...a);
 const cfg=id=>JSON.parse(docker('image','inspect',id))[0];
 const inv=id=>Object.fromEntries(native(id,'cat',['/lib/apk/db/installed']).split('\n\n').map(t=>Object.fromEntries(t.split('\n').filter(l=>/^[PV]:/.test(l)).map(l=>[l[0],l.slice(2)]))).filter(x=>x.P).map(x=>[x.P,x.V]));
 const app=id=>native(id,'sh',['-ec','for d in /srv /var/www /etc/nginx /etc/php85; do test -d "$d"; done; find /srv /var/www /etc/nginx /etc/php85 -type f ! -name "*.apk-new" -exec sha256sum {} + | sort | sha256sum']).trim();
 assert.equal(docker('inspect','--format','{{.Image}}',spec.container).trim(),spec.base);const before=inv(spec.base),appHash=app(spec.base),old=cfg(spec.base);assert.equal(before.nginx,'1.30.4-r1');assert.equal(native(spec.base,'cat',['/etc/alpine-release']).trim(),'3.24.2');
 if(!fs.existsSync(output+'/'+pin.file)){const r=await fetch(pin.url,{redirect:'error',signal:AbortSignal.timeout(30000)});assert(r.ok);fs.writeFileSync(output+'/'+pin.file,Buffer.from(await r.arrayBuffer()));}
 assert.equal(sha(fs.readFileSync(output+'/'+pin.file)),pin.sha256);
 const scratch=fs.mkdtempSync('/tmp/utilibre-privatebin-nginx-');
 try{
  fs.copyFileSync(output+'/'+pin.file,scratch+'/'+pin.file);fs.chmodSync(scratch+'/'+pin.file,0o644);
  const recipe=`FROM ${spec.base}\nUSER 0\nCOPY ${pin.file} /tmp/${pin.file}\nRUN apk add --no-network /tmp/${pin.file} && rm /tmp/${pin.file}\nUSER ${old.Config.User}\n`;
  fs.writeFileSync(scratch+'/Dockerfile',recipe);fs.writeFileSync(output+'/Dockerfile',recipe);
  run('docker',['build','--network','none','--pull=false','--memory','256m','--cpu-period','100000','--cpu-quota','100000','-t',spec.candidate,scratch],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
 }finally{fs.rmSync(scratch,{recursive:true});}
 const next=cfg(spec.candidate),after=inv(next.Id);assert.deepEqual(next.Config,old.Config);assert.equal(after.nginx,'1.30.6-r0');assert.deepEqual({...after,nginx:before.nginx},before);assert.equal(app(next.Id),appHash);assert.equal(native(next.Id,'php',['-r','echo PHP_VERSION;']),'8.5.12');
 fs.writeFileSync(output+'/build.json',JSON.stringify({date:new Date().toISOString(),passed:true,...spec,imageId:next.Id,pin,applicationHash:appHash,applicationUnchanged:true,configurationUnchanged:true,unrelatedPackagesUnchanged:true,php:'8.5.12',nginx:'1.30.6'},null,2));
 const text=run(process.execPath,['deployment/utilibre/tests/check-privatebin-uploads.mjs'],{timeout:300000,env:{...process.env,PRIVATEBIN_TEST_IMAGE:spec.candidate}}),n=JSON.parse(text.trim().split('\n').at(-1));assert(n.passed&&n.imageId===next.Id);fs.writeFileSync(output+'/native.json',JSON.stringify(n,null,2));
 const db='/var/cache/utilibre-security/db/trivy.db',dbSha256=sha(fs.readFileSync(db)),rows=[];
 for(const id of [spec.base,next.Id]){
  const file=output+(id===spec.base?'/before-scan.json':'/after-scan.json');
  run('/opt/utilibre/maintenance/bin/trivy',['image','--disable-telemetry','--cache-dir','/var/cache/utilibre-security','--cache-backend','memory','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','3m','--no-progress','--format','json','--image-src','docker','--output',file,id],{env:{...process.env,TRIVY_SKIP_VERSION_CHECK:'true',GOMAXPROCS:'1',GOMEMLIMIT:'1GiB'}});
  const scan=JSON.parse(fs.readFileSync(file));assert.equal(scan.Metadata.ImageID,id);
  const findings=scan.Results.flatMap(r=>(r.Vulnerabilities||[]).filter(v=>['HIGH','CRITICAL'].includes(v.Severity)).map(v=>({id:v.VulnerabilityID,package:v.PkgName,severity:v.Severity})));
  rows.push({imageId:id,findings});
 }
 assert.equal(sha(fs.readFileSync(db)),dbSha256);assert(rows[0].findings.some(x=>x.package==='nginx'));assert.deepEqual(rows[1].findings,[]);
 fs.writeFileSync(output+'/scan-gate.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:next.Id,dbSha256,rows},null,2));console.log('PrivateBin: same-branch signed NGINX repair; original PHP, privacy/upload settings and native 25 MB encrypted upload pass; zero critical/high findings.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
