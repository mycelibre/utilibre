// Reuse the installed application's existing synthetic account/export workflow.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261028/zod/resume';
const read=p=>JSON.parse(fs.readFileSync(p));
const build=read(root+'/build.json');
const fixture='deployment/expanded/check-resume-account-export.mjs';
const hash=createHash('sha256').update(fs.readFileSync(fixture)).digest('hex');
assert.equal(hash,'f69cf61d4b3b567075c40bc3653158f665efd8b2f25617d9210ad1e8de32d9e0');
assert(build.passed&&!fs.existsSync(root+'/application.json'));
const rows=[];
for(const [i,imageId] of [build.base,build.imageId].entries()){
 const space=fs.statfsSync('/');assert(space.bavail*space.bsize>8*1024**3);
 const dir=fs.mkdtempSync(root+'/account-'+i+'-');
 const env={PATH:process.env.PATH,HOME:process.env.HOME,
  UTILIBRE_RESUME_EXPORT_IMAGE:imageId,UTILIBRE_RESUME_EXPORT_REPORT:dir,
  UTILIBRE_RESUME_EXPORT_PORT:'3430'};
 if(process.env.PLAYWRIGHT_BROWSERS_PATH)env.PLAYWRIGHT_BROWSERS_PATH=process.env.PLAYWRIGHT_BROWSERS_PATH;
 const result=cp.spawnSync('node',[fixture],{env,encoding:'utf8',timeout:240000,maxBuffer:2*1024**2});
 fs.writeFileSync(dir+'/command.log',result.stdout+result.stderr+String(result.error||''));
 assert(!result.error&&!result.signal&&result.status===0,'Native Resume workflow failed; retained private evidence '+dir);
 const r=read(dir+'/result.json');assert.equal(r.result,'passed');assert.equal(r.imageId,imageId);
 assert.equal(r.cleanup.length,3);rows.push(r);
}
fs.writeFileSync(root+'/application.json',JSON.stringify({date:new Date().toISOString(),passed:true,
 imageId:build.imageId,nativeStartup:true,network:'internal; synthetic browser and disposable PostgreSQL',
 fixtureSha256:hash,applicationParity:rows,
 limitations:'Synthetic local accounts, not production OIDC. Native JSON/account export, not PDF rendering. Existing fixture limits retained.'},null,2)+'\n');
console.log('Resume: both states passed independent-account export/import, editable reload, access isolation and deletion.');
