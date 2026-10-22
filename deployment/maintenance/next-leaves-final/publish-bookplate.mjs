// Publish only the verified software source; retain the previous archive.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
process.umask(0o077);
import {profile,current} from './profile.mjs';
const {dir}=profile;
const r=JSON.parse(fs.readFileSync(dir+'/bookplate-source.json'));
const release=JSON.parse(fs.readFileSync('/var/lib/utilibre-maintenance/'+(current?'security-20261022':'patch-leaves-final-20261012')+'/release.json'));
assert(r.passed&&release.groups.some(g=>g.key==='bookplate'&&g.status==='passed'&&g.newImage===r.imageId));
assert.equal(execFileSync('docker',['inspect','--format','{{.Image}}','utilibre-records-bookplate-1'],{encoding:'utf8'}).trim(),r.imageId);
assert.equal(r.destination,'/opt/utilibre/records/public/bookplate-utilibre.tar.gz');
assert.equal(r.publicURL,'https://bookplate.utilibre.org/utilibre-source/bookplate-utilibre.tar.gz');
const bytes=fs.readFileSync(dir+'/bookplate-utilibre.tar.gz');
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(bytes.length,r.archiveBytes);assert.equal(sha(bytes),r.archiveSha256);
if(!r.published){
 const previous=fs.readFileSync(r.destination),backup=dir+'/previous-bookplate-source-'+sha(previous)+'.tar.gz';
 if(!fs.existsSync(backup))fs.writeFileSync(backup,previous,{flag:'wx'});
 fs.writeFileSync(r.destination+'.new',bytes,{mode:0o644});fs.chmodSync(r.destination+'.new',0o644);fs.renameSync(r.destination+'.new',r.destination);
 r.published=true;r.publishedAt=new Date().toISOString();r.rollbackArchive=backup;
 fs.writeFileSync(dir+'/bookplate-source.json',JSON.stringify(r,null,2)+'\n');
}
const response=await fetch(r.publicURL,{redirect:'manual',signal:AbortSignal.timeout(30000)});
assert.equal(response.status,200);const actual=Buffer.from(await response.arrayBuffer());
assert.equal(actual.length,r.archiveBytes);assert.equal(sha(actual),r.archiveSha256);
r.publicVerifiedAt=new Date().toISOString();r.publicSHA256Verified=true;
fs.writeFileSync(dir+'/bookplate-source.json',JSON.stringify(r,null,2)+'\n');
console.log(JSON.stringify({url:r.publicURL,bytes:actual.length,sha256:r.archiveSha256,publicVerified:true}));
