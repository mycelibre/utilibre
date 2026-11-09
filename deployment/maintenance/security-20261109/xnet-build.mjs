// Narrow candidate adapter around the existing, checksum-pinned go-final build.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const [key]=process.argv.slice(2),here=new URL('.',import.meta.url).pathname,root='/var/lib/utilibre-maintenance/security-20261109/xnet';
const manifest=JSON.parse(fs.readFileSync(here+'xnet-inputs.json')),spec=manifest.rows.find(s=>s.key===key);assert(spec&&process.argv.length===3);
const sha=b=>createHash('sha256').update(b).digest('hex'),dir=root+'/'+key,recipe=new URL('../go-final/',import.meta.url).pathname;
assert(fs.statfsSync(root).bavail*fs.statfsSync(root).bsize>=manifest.execution.minimumFreeBytes);
assert.equal(sha(fs.readFileSync(recipe+'build.sh')),manifest.buildRecipeSha256);
assert.equal(sha(fs.readFileSync(dir+'/source-proof.json')),spec.sourceProofSha256);
const proof=JSON.parse(fs.readFileSync(dir+'/source-proof.json'));
for(const f of proof.sourceFiles)assert.equal(sha(fs.readFileSync(dir+'/source/'+f.path)),f.sha256,f.path);
for(const [f,h]of Object.entries(spec.locks)){assert.equal(sha(fs.readFileSync(dir+'/source/'+f)),h);assert.equal(sha(fs.readFileSync(here+'xnet-locks/'+key+'/'+f)),h);}
assert.equal(sha(fs.readFileSync(dir+'/'+key+'-original')),spec.oldBinarySha256);
assert(!fs.existsSync(dir+'/'+key),'Preserve completed candidate');
const args=['run','--rm','--name','maintenance-xnet-'+key,'--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--cpus','1','--memory','3g','--memory-swap','3g','--pids-limit','256','--tmpfs','/work:rw,exec,size=2g,mode=1777','--tmpfs','/tmp:rw,size=16m','-e','EXPECTED_GO='+manifest.compilerVersion,'-e','UTILIBRE_PHASE=build','-e','UTILIBRE_MODULE_CACHE=/modules','-v',root+'/modules:/modules:ro','-v',dir+'/source:/source/'+key+':ro','-v',dir+':/input:ro','-v',dir+':/output','-v',recipe+':/recipe:ro','-v',here+'xnet-locks/'+key+':/recipe/locks/'+key+':ro',manifest.compiler,'sh','/recipe/build.sh',key];
const fd=fs.openSync(dir+'/build.log','wx',0o600);const result=cp.spawnSync('docker',args,{timeout:1200000,stdio:['ignore',fd,fd]});fs.closeSync(fd);assert.equal(result.status,0,'Build failed; private evidence retained');
const old=fs.readFileSync(dir+'/'+key+'-before-buildinfo.txt','utf8'),fresh=fs.readFileSync(dir+'/'+key+'-buildinfo.txt','utf8');
assert(fresh.split('\n')[0].endsWith('go'+manifest.compilerVersion));
const modules=t=>new Map(t.split('\n').filter(l=>/^\s+dep\s/.test(l)).map(l=>l.trim().split(/\s+/)).map(a=>[a[1],a.slice(2).join(' ')]));
const a=modules(old),b=modules(fresh),changed=[...new Set([...a.keys(),...b.keys()])].filter(k=>a.get(k)!==b.get(k));
const allowed=['golang.org/x/net','golang.org/x/crypto','golang.org/x/sys','golang.org/x/text','golang.org/x/sync','golang.org/x/tools','golang.org/x/term'];
assert(changed.includes(manifest.dependency)&&changed.every(k=>allowed.includes(k)),'Unexpected module change');assert(b.get(manifest.dependency)?.startsWith('v0.62.0 '));
const tests=fs.readFileSync(dir+'/'+key+'-tests.txt','utf8');assert(/^ok\s/m.test(tests)&&!/(^|\n)FAIL(?:\s|$)/.test(tests));
fs.writeFileSync(dir+'/compiled.json',JSON.stringify({date:new Date().toISOString(),passed:true,key,base:spec.base,candidate:spec.candidate,binary:spec.binary,binarySha256:sha(fs.readFileSync(dir+'/'+key)),compiler:manifest.compiler,compilerVersion:manifest.compilerVersion,moduleChanges:changed.map(k=>({module:k,before:a.get(k),after:b.get(k)})),sourceUnchanged:true,locks:spec.locks,network:'none',productionChanged:false},null,2)+'\n');
console.log(key+': existing tests/build passed with bounded explicit module delta');
