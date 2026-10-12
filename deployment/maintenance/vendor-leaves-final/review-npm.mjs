// Read-only actual-payload verification; does not install npm or change metadata.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {readIndexes,sha} from '../xserver-followup/authenticate-dhi.mjs';
import {payloadManifest,validatePayload} from './dhi-proof.mjs';
import {command} from '../component-followup/inventory.mjs';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
import {npmReview,npmContainer as container,npmVersion as version,npmArchive as archiveHash,npmEligible} from './npm-policy.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/vendor-leaves-final-20261011';
const read=p=>JSON.parse(fs.readFileSync(root+'/'+p));
const scan=read('security.json'),queue=read('security-queue.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const docker=(...args)=>command('docker',['exec',container,...args]);
const image=command('docker',['inspect','--format','{{.Image}}',container]);
assert.equal(command('docker',['inspect','--format','{{.State.Running}}',container]),'true');
assert.equal(scan.images.find(i=>i.id===image)?.status,'checked');
const indexes=readIndexes(),stanza=indexes[0].text.split(/\n\s*\n/).find(s=>s.startsWith('Package: npm\n')&&s.includes('\nVersion: '+version+'\n'));
assert(stanza?.includes('\nSHA256: '+archiveHash+'\n'));
const filename=stanza.match(/^Filename: (.+)$/m)?.[1];assert.equal(filename,'pool/trixie/main/n/np/npm_11.20.0-0/npm_11.20.0-0_all.deb');
const archive=dir+'/npm_11.20.0-0_all.deb';
if(!fs.existsSync(archive)){
 const response=await fetch('https://dhi.io/deb/debian/main/'+filename,{signal:AbortSignal.timeout(30000)});assert(response.ok);
 const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.length,2052396);assert.equal(sha(bytes),archiveHash);fs.writeFileSync(archive,bytes,{flag:'wx'});
}
assert.equal(sha(fs.readFileSync(archive)),archiveHash);assert.equal(command('dpkg-deb',['-f',archive,'Version']),version);
assert.equal(docker('dpkg-query','-W','-f=${Version}','npm'),version);
const temp=fs.mkdtempSync('/tmp/utilibre-npm-proof-');let expected,manifestHash;
try{
 command('dpkg-deb',['-x',archive,temp]);expected=payloadManifest(temp);
 assert.equal(JSON.parse(fs.readFileSync(temp+'/usr/lib/nodejs/npm/node_modules/pacote/package.json')).version,'21.5.1');
 // Batch checksum calls avoid command-line limits and per-file shell processes.
 const actual=[];
 for(const type of ['file','symlink']){
  const rows=expected.filter(r=>r.type===type);
  if(type==='file')for(let n=0;n<rows.length;n+=100){const batch=rows.slice(n,n+100),lines=docker('sha256sum','--',...batch.map(r=>r.path)).split('\n');assert.equal(lines.length,batch.length);lines.forEach((line,i)=>{assert.equal(line.slice(66),batch[i].path);actual.push({...batch[i],sha256:line.slice(0,64)});});}
  else for(const row of rows)actual.push({...row,target:docker('readlink','--',row.path)});
 }
 manifestHash=validatePayload(expected,actual.sort((a,b)=>a.path.localeCompare(b.path)));
 assert.equal(docker('readlink','-f','/usr/bin/npm'),'/usr/lib/nodejs/npm/bin/npm-cli.js');
}finally{assert(path.dirname(temp)==='/tmp'&&path.basename(temp).startsWith('utilibre-npm-proof-'));fs.rmSync(temp,{recursive:true});}
const items=queue.items.filter(npmEligible);assert(items.every(i=>i.artifact===image));
assert.equal(command('docker',['inspect','--format','{{.Image}}',container]),image);
assert.equal(read('security.json').completedAt,scan.completedAt);
const date=new Date().toISOString(),reason=`Actual npm ${version} contains fixed pacote 21.5.1. Every packaged file and symbolic link in the running Penpot exporter matches the exact authenticated DHI archive SHA256 ${archiveHash}; historical InRelease signature and complete index hashes reverified. Manifest SHA256 ${manifestHash}. /usr/bin/npm resolves to that package. CVE-2026-9496 affects pacote before 21.5.1: https://security-tracker.debian.org/tracker/CVE-2026-9496 . This reviews only the exact live image ${image}, npm and that CVE, including the stale status.d record. No runtime change, new exploit probe or exemption for other dependencies.`;
const decisions=items.map(i=>validateDecision({key:i.key,status:'not-affected',reason,expiresAt:new Date(Date.now()+7*86400000).toISOString()}));
fs.writeFileSync(root+'/'+npmReview,JSON.stringify({date,scanDate:scan.completedAt,decisions,applied:false,image,archiveHash,manifestHash,files:expected.length,authenticatedIndexes:indexes.map(({name,hash})=>({name,sha256:hash})),payload:expected},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,payloadFiles:expected.length,productionChanged:false,applied:false}));
