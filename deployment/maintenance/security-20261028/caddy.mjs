// Normalize existing Caddy native/application receipts into the shared gates.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const codec=process.argv[2]==='--codec',jose=codec||process.argv[2]==='--jose';assert(!process.argv[2]||jose);
const root='/var/lib/utilibre-maintenance/security-20261028/'+(codec?'codec-caddy':jose?'jose-caddy':'caddy'),read=p=>JSON.parse(fs.readFileSync(p));
const specs=read(new URL('./'+(codec?'codec-caddy':jose?'jose-caddy':'caddy')+'-inputs.json',import.meta.url)).rows,build=read(root+'/build.json'),checks=read(root+'/checks.json');assert.equal(checks.status,'passed');
const docker=(...a)=>cp.execFileSync('docker',a,{encoding:'utf8',timeout:60000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const s of specs){
 const row=build.rows.find(r=>r.key===s.key),native=checks.rows.find(r=>r.key===s.key);assert(row&&native&&native.status==='passed'&&native.candidateId===row.candidateId);
 assert.equal(docker('image','inspect','--format','{{.Id}}',s.candidate),row.candidateId);
 assert.equal(docker('image','inspect','--format','{{json .Config}}',s.base),docker('image','inspect','--format','{{json .Config}}',s.candidate));
 const cid=docker('create','--entrypoint','/bin/true',s.base),old=root+'/before-'+s.key;fs.mkdirSync(old,{recursive:true});
 try{docker('cp',cid+':/usr/local/share/utilibre-caddy-security/.',old);}finally{docker('rm',cid);}
 const notices=root+'/artifact/notices',changed=[s.binary];
 for(const f of fs.readdirSync(notices)){assert(fs.statSync(notices+'/'+f).isFile());if(!fs.existsSync(old+'/'+f)||sha(fs.readFileSync(old+'/'+f))!==sha(fs.readFileSync(notices+'/'+f)))changed.push('/usr/local/share/utilibre-caddy-security/'+f);}
 assert(fs.readdirSync(old).every(f=>fs.existsSync(notices+'/'+f)),'No undeclared notice removal');
 if(jose){const v3=read('/var/lib/utilibre-maintenance/security-20261028/jose/v3-regression.json');assert(v3.passed&&v3.rows.length===2&&!v3.rows[0].modulusBoundaryRejected&&v3.rows[1].modulusBoundaryRejected);const spec=read(new URL('./jose-v3-inputs.json',import.meta.url));assert.equal(v3.patchSha256,spec.patchSha256);assert.equal(sha(fs.readFileSync(root+'/input/jose-v3-jwk.go')),spec.afterSha256);assert.equal(sha(fs.readFileSync(root+'/input/jose-v3.patch')),spec.patchSha256);assert.equal(sha(fs.readFileSync(root+'/input/jose-v4.zip')),'62506f3369fc124682356bbe8eb442f982422401dda99ace200694efc962da76');}
 const dir=root+'/'+s.key;fs.mkdirSync(dir,{recursive:true});assert(!fs.existsSync(dir+'/build.json'));
 fs.writeFileSync(dir+'/build.json',JSON.stringify({date:new Date().toISOString(),passed:true,key:s.key,base:s.base,candidate:s.candidate,imageId:row.candidateId,configurationUnchanged:true,compilerVersion:s.compilerVersion,binaries:[{path:s.binary,binarySha256:build.binarySha256,unchangedModules:fs.readFileSync(notices+'/build-info.txt','utf8').split('\n').filter(l=>l.includes('dep\t')).length-(codec?1:0)}],native:{...native,passed:true,imageId:row.candidateId},changedFiles:changed.sort(),...(jose?{joseV3Backport:true,joseV4Release:'v4.1.6'}:{}),...(codec?{unrelatedDependenciesUnchanged:true,dependencyUpdate:{dependency:'github.com/klauspost/compress',from:'v1.20.1',to:'v1.20.2'}}:{}),scope:codec?'Compression v1.20.2 only; prior x/net/JOSE fixes, compiler, application and configuration preserved':jose?'Caddy JOSE v4 patch release and exact v3 RSA bounds; all other modules/application/configuration preserved':'Caddy compiler and corresponding build notices only; same Caddy/modules/application/configuration'},null,2)+'\n');
 console.log(s.key+': existing native checks and exact build recorded');
}
