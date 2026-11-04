// Reuse the offline Undici regression and the actual Markmap dependency lock.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
process.umask(0o077);assert.equal(process.argv.length,2);
const root='/var/lib/utilibre-maintenance/security-20261103/markmap',here=new URL('.',import.meta.url).pathname,read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const b=read(root+'/build.json'),c=read(root+'/client-build.json'),s=read(here+'markmap-inputs.json');assert(b.passed&&c.passed&&c.offlineBuild);assert.equal(c.lockSha256,sha(root+'/package-lock.json'));assert.equal(c.packageSha256,sha(root+'/package.json'));assert.equal(b.base,s.base);
const run=(p,a,o={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:90000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();}catch(e){fs.writeFileSync(root+'/dependencies-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Markmap dependencies failed; private evidence retained');}};
const inputs=read(root+'/dependency-inputs.json');assert.equal(inputs.length,4);
for(const i of inputs){assert.equal(sha(root+'/dependencies/'+i.file),i.sha256);const lock=read(root+'/dependencies/'+i.state+'/package-lock.json').packages['node_modules/'+i.name];assert.equal(i.integrity,lock.integrity);assert.equal(createHash('sha512').update(fs.readFileSync(root+'/dependencies/'+i.file)).digest('base64'),i.integrity.slice(7));}
const fixture=fs.mkdtempSync(root+'/tls-fixture-');
try{
 run('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','2','-keyout',fixture+'/key.pem','-out',fixture+'/cert.pem','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost']);
 const script=`set -eu
mkdir /work/app
cd /work/app
cp /input/package.json /input/package-lock.json .
npm ci --offline --ignore-scripts --no-audit --no-fund --cache=/cache >/work/install.log
mkdir node_modules/undici-baseline node_modules/markdown-it-baseline
tar -xzf /archives/undici-6.29.0.tgz --strip-components=1 -C node_modules/undici-baseline
tar -xzf /archives/markdown-it-14.3.2.tgz --strip-components=1 -C node_modules/markdown-it-baseline
node /undici.cjs /work/app/node_modules/undici-baseline > /work/old.json
node /undici.cjs /work/app/node_modules/undici > /work/new.json
node - <<'NODE'
const fs=require('fs'),assert=require('assert/strict');
const a=JSON.parse(fs.readFileSync('/work/old.json')),b=JSON.parse(fs.readFileSync('/work/new.json'));
assert(a.normalPassed&&b.normalPassed&&a.checks===7&&b.checks===7);
assert(!a.customTlsCallbackCalled&&!a.customTlsPinRejected);assert(b.customTlsCallbackCalled&&b.customTlsPinRejected);
const before=require('markdown-it-baseline')(),after=require('markdown-it')();
const samples=['# Fictional example\\n\\n- año, acción, ñ\\n- second item','[label]: /local "Title"\\n\\n[label]','**strong** and '+String.fromCharCode(96)+'code'+String.fromCharCode(96),'[a]: /u "'+'x\\n'.repeat(2048),'['+'a\\n'.repeat(2048)];
for(const text of samples)assert.equal(after.render(text),before.render(text));
assert(after.render(samples[1]).includes('href="/local"'));
console.log(JSON.stringify({passed:true,undici:[a,b],markdownCases:samples.length,markdownRegressionReproduced:false,limitation:'Bounded parser compatibility cases; no large-input timing or asymptotic-complexity claim.',network:'none'}));
NODE
`;
 const native=JSON.parse(run('docker',['run','--rm','--pull=never','--network=none','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--cpus=1','--memory=1g','--memory-swap=1g','--pids-limit=64','--log-driver=none','--tmpfs','/work:rw,exec,size=512m','--tmpfs','/tmp:rw,size=16m','-v',root+'/npm-cache:/cache:ro','-v',root+':/input:ro','-v',root+'/dependencies:/archives:ro','-v',fixture+':/fixture:ro','-v',here+'../security-20261028/undici-native.cjs:/undici.cjs:ro',s.compiler,'sh','-c',script]));
 assert(native.passed&&native.network==='none');
 const scans=[];for(const state of ['baseline','candidate']){
  const file=root+'/dependencies/'+state+'-scan.json';run('/opt/utilibre/maintenance/bin/trivy',['fs','--disable-telemetry','--cache-dir','/var/cache/utilibre-security','--cache-backend','memory','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','1m','--no-progress','--format','json','--output',file,root+'/dependencies/'+state],{env:{PATH:'/usr/bin:/bin',TRIVY_SKIP_VERSION_CHECK:'true'}});
  const r=read(file);assert(r.Results?.some(r=>r.Type==='npm'));const findings=r.Results.flatMap(r=>r.Vulnerabilities||[]);scans.push({state,sha256:sha(file),highCritical:findings.filter(v=>['HIGH','CRITICAL'].includes(v.Severity)).length,advisories:findings.map(v=>v.VulnerabilityID)});
 }
 assert(scans[0].highCritical>=4);assert.equal(scans[1].highCritical,0);assert(s.advisories.every(id=>scans[0].advisories.includes(id)&&!scans[1].advisories.includes(id)));
 fs.writeFileSync(root+'/dependencies.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:b.imageId,offlineBuild:true,packages:s.packages,lockSha256:c.lockSha256,sourceScanHighCritical:0,native,scans,dbSha256:sha('/var/cache/utilibre-security/db/trivy.db')},null,2)+'\n');console.log('Offline native TLS regression, legitimate parser cases and lockfile security comparison passed.');
}finally{fs.rmSync(fixture,{recursive:true});}
