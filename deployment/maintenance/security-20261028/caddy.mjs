// Normalize existing Caddy native/application receipts into the shared gates.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261028/caddy',read=p=>JSON.parse(fs.readFileSync(p));
const specs=read(new URL('./caddy-inputs.json',import.meta.url)).rows,build=read(root+'/build.json'),checks=read(root+'/checks.json');assert.equal(checks.status,'passed');
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
 const dir=root+'/'+s.key;fs.mkdirSync(dir,{recursive:true});assert(!fs.existsSync(dir+'/build.json'));
 fs.writeFileSync(dir+'/build.json',JSON.stringify({date:new Date().toISOString(),passed:true,key:s.key,base:s.base,candidate:s.candidate,imageId:row.candidateId,configurationUnchanged:true,compilerVersion:s.compilerVersion,binaries:[{path:s.binary,binarySha256:build.binarySha256,unchangedModules:fs.readFileSync(notices+'/build-info.txt','utf8').split('\n').filter(l=>l.includes('dep\t')).length}],native:{...native,passed:true,imageId:row.candidateId},changedFiles:changed.sort(),scope:'Caddy compiler and corresponding build notices only; same Caddy/modules/application/configuration'},null,2)+'\n');
 console.log(s.key+': existing native checks and exact build recorded');
}
