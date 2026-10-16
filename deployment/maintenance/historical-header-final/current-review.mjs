// Explicit acquisition or offline, read-only preparation. Never applies decisions.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {records,tokens,eligible,url,primary,noOverlap} from './current-policy.mjs';
import {validateInventory,sha} from './policy.mjs';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
process.umask(0o077);
const [mode,dir]=process.argv.slice(2);
assert(['acquire','prepare'].includes(mode)&&dir&&path.isAbsolute(dir)&&process.argv.length===4,'Use acquire|prepare /absolute/private-output');
fs.mkdirSync(dir,{recursive:true,mode:0o700});assert.equal(fs.lstatSync(dir).mode&0o077,0);
if(mode==='acquire'){
 for(const id of Object.keys(records)){
  const file=path.join(dir,id+'.json');let body;
  if(fs.existsSync(file))body=fs.readFileSync(file);
  else {const r=await fetch(url(id),{signal:AbortSignal.timeout(20000),redirect:'error'});assert(r.ok);const chunks=[];let size=0;for await(const c of r.body){size+=c.length;assert(size<512*1024);chunks.push(c)}body=Buffer.concat(chunks);}
  primary(id,body);if(!fs.existsSync(file))fs.writeFileSync(file,body,{flag:'wx',mode:0o600});
 }
 console.log('Five checksum-pinned primary records acquired. No review applied.');
}else{
 const root='/var/lib/utilibre-maintenance',read=f=>JSON.parse(fs.readFileSync(f));
 assert(!fs.existsSync(dir+'/review.json'),'Preserve previous evidence; select a new report directory');
 const scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
 const run=(c,a,input)=>execFileSync(c,a,{encoding:'utf8',input,timeout:30000,maxBuffer:4*1024**2,stdio:['pipe','pipe','pipe']}).trim();
 const script=fs.readFileSync(new URL('./inventory.py',import.meta.url),'utf8'),inventories=new Map(),decisions=[],skipped=[],sources=[];
 for(const id of Object.keys(records)){primary(id,fs.readFileSync(dir+'/'+id+'.json'));sources.push({id,url:url(id),...records[id]});}
 for(const i of queue.items.filter(eligible))try{
  const proofs=[];
  for(const name of i.scope==='host-os'?['host-dpkg']:i.containers){
   const k=i.artifact+'|'+name;
   if(name!=='host-dpkg'){assert.equal(scan.images.find(v=>v.id===i.artifact)?.status,'checked');assert.equal(run('docker',['inspect','--format','{{.Image}}',name]),i.artifact);assert.equal(run('docker',['inspect','--format','{{.State.Running}}',name]),'true');}
   if(!inventories.has(k)){
    const args=['-',JSON.stringify(tokens)],text=name==='host-dpkg'?run('python3',args,script):run('docker',['exec','-i',name,'python3',...args],script);
    const inv=JSON.parse(text);validateInventory(inv,i.installed,tokens);inventories.set(k,{location:name,artifact:i.artifact,...inv});
   }
   const inv=inventories.get(k);noOverlap(i.id,inv);proofs.push(inv.payloadSha256);
  }
  decisions.push(validateDecision({key:i.key,status:'not-affected',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:`Header-package attribution only. Pinned Linux CNA names ${records[i.id].paths.join(', ')}. Every installed linux-libc-dev ${i.installed} header was read in each named target: no compiled code/module, affected path overlap or private implementation symbols. Payload identities: ${[...new Set(proofs)].join(',')}. ${url(i.id)} . This does NOT clear the VM/Proxmox kernel: CVE-2026-98260 needs separate running-kernel remediation. Raw findings retained; no package or service change.`}));
 }catch(e){skipped.push({key:i.key,id:i.id,error:String(e.message).slice(0,300)})}
 for(const inv of inventories.values())if(inv.location!=='host-dpkg')assert.equal(run('docker',['inspect','--format','{{.Image}}',inv.location]),inv.artifact);
 assert.equal(read(root+'/security.json').completedAt,scan.completedAt);
 const evidence={date:new Date().toISOString(),scanDate:scan.completedAt,sources,inventories:[...inventories.values()],collectorSha256:sha(script),kernel:run('uname',['-r']),kernelCleared:false};
 fs.writeFileSync(dir+'/evidence.json',JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(dir+'/review.json',JSON.stringify({date:evidence.date,scanDate:scan.completedAt,applied:false,decisions,skipped,evidenceSha256:sha(fs.readFileSync(dir+'/evidence.json'))},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({prepared:decisions.length,locations:inventories.size,skipped,applied:false,kernelCleared:false}));if(skipped.length)process.exitCode=1;
}
