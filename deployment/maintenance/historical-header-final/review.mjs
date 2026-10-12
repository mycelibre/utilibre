// Prepare exact package-only review; never edit the scanner, ledger, or live app.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {eligible,verifyPrimary,validateInventory,privateTokens,sha,cnaCommit,expectedStatus} from './policy.mjs';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
process.umask(0o077);assert.equal(process.argv.length,2);
const root='/var/lib/utilibre-maintenance',dir=root+'/historical-header-final-20261012';
fs.mkdirSync(dir,{recursive:true});
const read=p=>JSON.parse(fs.readFileSync(p)),run=(cmd,args,input)=>execFileSync(cmd,args,{encoding:'utf8',input,timeout:30000,maxBuffer:4*1024**2,stdio:['pipe','pipe','pipe']}).trim();
const queue=read(root+'/security-queue.json'),scan=read(root+'/security.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const script=fs.readFileSync(new URL('./inventory.py',import.meta.url),'utf8'),inventories=new Map,primary=new Map,decisions=[],skipped=[];
for(const item of queue.items.filter(eligible)){
 try{
  if(!primary.has(item.id)){
   const body=fs.readFileSync(dir+'/cna/'+item.id+'.json');
   const proof=verifyPrimary(item.id,body,f=>fs.readFileSync(dir+'/sources/'+f));
   const[,year,num]=item.id.split('-');proof.cnaUrl=`https://raw.githubusercontent.com/CVEProject/cvelistV5/${cnaCommit}/cves/${year}/${num.slice(0,-3)}xxx/${item.id}.json`;primary.set(item.id,proof);
  }
  const host=item.scope==='host-os';
  if(!host){
   assert.equal(scan.images.find(i=>i.id===item.artifact)?.status,'checked');
   for(const name of item.containers){assert.equal(run('docker',['inspect','--format','{{.Image}}',name]),item.artifact,'Live image changed; needs fresh scan');assert.equal(run('docker',['inspect','--format','{{.State.Running}}',name]),'true');}
  }
  // Inspect every running container's installed bytes; writable layers can differ.
  const locations=host?['host-dpkg']:item.containers,proofs=[];
  for(const location of locations){
   const key=item.artifact+'|'+item.installed+'|'+location;
   if(!inventories.has(key)){
    const args=['-',JSON.stringify(privateTokens)],raw=host?run('python3',args,script):run('docker',['exec','-i',location,'python3',...args],script);
    const inv=JSON.parse(raw);validateInventory(inv,item.installed);inventories.set(key,{artifact:item.artifact,location,...inv});
   }
   proofs.push(inventories.get(key));
  }
  const p=primary.get(item.id),hashes=[...new Set(proofs.map(p=>p.payloadSha256))];
  const reason=`Header-package attribution only: ${p.component}. Exact installed linux-libc-dev ${item.installed} payloads contain only UAPI headers/docs, no compiled kernel/module/archive; all installed header bytes were checked for the implicated private implementation symbols (absent). Inventory hashes: ${hashes.join(', ')}. CNA ${p.provider} and original supporting documents are checksum-pinned in historical-header-final-20261012/evidence.json; ${p.originalReference} . This is not a kernel fix: VM/Proxmox kernels, linux-image packages and isolation remain separate. No claim that UAPI names or available syscalls are absent. Raw scanner output unchanged.`;
  decisions.push(validateDecision({key:item.key,status:expectedStatus,reason,expiresAt:new Date(Date.now()+7*86400000).toISOString()}));
 }catch(error){skipped.push({key:item.key,id:item.id,artifact:item.artifact,reason:String(error.message).slice(0,320)});}
}
assert.equal(read(root+'/security.json').completedAt,scan.completedAt,'Concurrent scan invalidates this draft');
for(const inv of inventories.values())if(inv.location!=='host-dpkg')assert.equal(run('docker',['inspect','--format','{{.Image}}',inv.location]),inv.artifact,'Concurrent deployment invalidates evidence');
const date=new Date().toISOString();fs.writeFileSync(dir+'/evidence.json',JSON.stringify({date,scanDate:scan.completedAt,primary:[...primary.values()],inventories:[...inventories.values()]},null,2)+'\n');
fs.writeFileSync(dir+'/review.json',JSON.stringify({date,scanDate:scan.completedAt,applied:false,decisions,skipped,evidenceSha256:sha(fs.readFileSync(dir+'/evidence.json'))},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,primaryRecords:primary.size,inventoryGroups:inventories.size,skipped,applied:false,productionChanged:false}));
