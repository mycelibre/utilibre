// Additive publication of the reviewed source-only allowlist; no index rewrite.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
assert.deepEqual(process.argv.slice(2),['--publish']);
const root='/var/lib/utilibre-maintenance/ssh-server-followup-20261012';
const file='utilibre-openssh-server-followup-20261012.tar.gz';
const expected='19e3e41adb6d41ea4193ca4d6d758353bb5756316cf27526725acdf08a0f5ed6';
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(JSON.parse(fs.readFileSync(root+'/release.json')).status,'passed');
const bytes=fs.readFileSync(root+'/'+file);assert.equal(sha(bytes),expected);
for(const dir of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){
 const dest=dir+'/'+file;
 if(fs.existsSync(dest))assert.equal(sha(fs.readFileSync(dest)),expected,'Do not overwrite an existing distinct public offer');
 else {fs.writeFileSync(dest,bytes,{flag:'wx',mode:0o644});fs.chmodSync(dest,0o644);}
 assert.equal(sha(fs.readFileSync(dest)),expected);
}
const publicChecks=[];
for(const host of ['tools.utilibre.org','candlr.utilibre.org']){
 const url='https://'+host+'/utilibre-source/'+file;
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,200);assert.equal(sha(Buffer.from(await response.arrayBuffer())),expected);
 publicChecks.push({url,status:200,sha256:expected});
}
const proof={date:new Date().toISOString(),filename:file,bytes:bytes.length,sha256:expected,published:true,publicChecks};
fs.writeFileSync(root+'/source-offer.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
