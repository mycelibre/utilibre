// Update the two complete, previously published source trees after exact release.
// Never traverse deployment settings, state, logs or credentials.
import fs from 'node:fs';import path from 'node:path';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);assert.deepEqual(process.argv.slice(2),['--oct28','--publish']);
const root='/var/lib/utilibre-maintenance',batch=root+'/security-20261028';
const read=f=>JSON.parse(fs.readFileSync(f)),sha=b=>createHash('sha256').update(b).digest('hex');
const previous=read(root+'/closure-source-offer-20261012.json'),archive=root+'/'+previous.filename;
assert.equal(sha(fs.readFileSync(archive)),previous.sha256);
const inputs=read(new URL('../security-20261028/go-helpers-inputs.json',import.meta.url));
const temp=fs.mkdtempSync(batch+'/go-closure/source-offer-'),records=[];
try{
 const entries=cp.execFileSync('tar',['-tzf',archive],{encoding:'utf8',maxBuffer:16*1024**2}).trim().split('\n');
 assert(entries.every(p=>!path.isAbsolute(p)&&!p.split('/').includes('..')));
 cp.execFileSync('tar',['--no-same-owner','-xzf',archive,'-C',temp,'./anubis','./ferretdb']);
 for(const key of ['anubis','ferretdb']){
  const s=inputs.rows.find(s=>s.key===key),b=read(batch+'/go-helpers/'+key+'/build.json'),parity=read(batch+'/go-helpers/'+key+'/inventory.json');
  assert(b.passed&&b.native.passed&&parity.passed&&parity.imageId===b.imageId);
  assert.equal(cp.execFileSync('docker',['inspect','--format','{{.Image}}',s.containers[0]],{encoding:'utf8'}).trim(),b.imageId);
  const tree=temp+'/'+(key==='anubis'?'anubis':'ferretdb/FerretDB-0d5eb3343a50b800634cc08ace608bb6f3a3f74b');
  for(const file of ['go.mod','go.sum'])fs.copyFileSync(batch+'/go-closure/'+key+'/'+key+'-'+file,tree+'/'+file);
  const script=fs.readFileSync(tree+'/UTILIBRE-REBUILD.sh','utf8');assert.equal(script.split('go1.26.9').length,2);fs.writeFileSync(tree+'/UTILIBRE-REBUILD.sh',script.replace('go1.26.9','go1.26.10'),{mode:0o755});
  fs.writeFileSync(tree+'/UTILIBRE-TOOLCHAIN.json',JSON.stringify(inputs.toolchains['1.26.10'],null,2)+'\n');
  const receipt={application:key,sourceCommit:s.sourceRevision,imageId:b.imageId,binarySha256:b.binaries[0].binarySha256,go:'1.26.10',instructions:'Run the included rebuild script with the exact Go archive in UTILIBRE-TOOLCHAIN.json. Source, embedded frontend and reviewed dependency repairs are retained. Compiler image identity is local, not a registry manifest. Byte-reproducible builds are not claimed.'};
  fs.writeFileSync(tree+'/UTILIBRE-SECURITY.json',JSON.stringify(receipt,null,2)+'\n');records.push(receipt);
 }
 fs.writeFileSync(temp+'/SOURCES.json',JSON.stringify({date:new Date().toISOString(),applications:records,recipes:'https://github.com/mycelibre/utilibre/tree/main/deployment/maintenance/go-closure',parentSourceArchive:previous.sha256,contents:'Complete patched application trees and original notices; no operational data'},null,2)+'\n');
 const filename='security-go-closure-20261028-source.tar.gz',output=batch+'/go-closure/'+filename;assert(!fs.existsSync(output));
 cp.execFileSync('tar',['-czf',output,'-C',temp,'.'],{timeout:120000});
 const proof={date:new Date().toISOString(),filename,bytes:fs.statSync(output).size,sha256:sha(fs.readFileSync(output)),applications:records,published:true};
 for(const dir of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){const dest=dir+'/'+filename;assert(!fs.existsSync(dest));fs.copyFileSync(output,dest+'.tmp');fs.chmodSync(dest+'.tmp',0o644);fs.renameSync(dest+'.tmp',dest);}
 fs.writeFileSync(batch+'/go-closure/source-offer.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({filename,bytes:proof.bytes,sha256:proof.sha256,published:true}));
}finally{assert(path.dirname(temp)===batch+'/go-closure'&&path.basename(temp).startsWith('source-offer-'));fs.rmSync(temp,{recursive:true});}
