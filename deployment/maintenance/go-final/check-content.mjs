// Four finite read-only public-content requests after release; no crawler/loops.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/go-final-20261011',release=JSON.parse(fs.readFileSync(root+'/release.json'));
const tests=[
 {key:'rimgo',url:'http://10.10.1.43:3153/wG1nGfK',match:/<video\b/i},
 {key:'gothub',url:'http://10.10.1.43:3148/mycelibre/utilibre',match:/mycelibre[\s\S]*utilibre/i},
 {key:'safetwitch',url:'http://10.10.1.43:3146/api/users/jynxzi',json:true},
 {key:'anonymousoverflow',url:'http://10.10.1.43:3147/questions/927358/how-do-i-undo-the-most-recent-local-commits-in-git',match:/undo[\s\S]*commit/i},
];
const rows=[];
for(const t of tests){
 const g=release.groups.find(x=>x.key===t.key);assert.equal(g?.status,'passed');assert.equal(cp.execFileSync('docker',['inspect',g.name,'--format','{{.Image}}'],{encoding:'utf8'}).trim(),g.newImage);
 try{
  const r=await fetch(t.url,{headers:{Connection:'close'},redirect:'error',signal:AbortSignal.timeout(25000)});
  const reader=r.body?.getReader(),chunks=[];let size=0;
  if(reader)try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;assert(size<=2*1024**2,'Fixture body exceeded 2 MiB cap');chunks.push(Buffer.from(value));}}finally{await reader.cancel();}
  const body=Buffer.concat(chunks).toString();assert.equal(r.status,200);
  if(t.json){const parsed=JSON.parse(body);assert.equal(parsed.status,'ok');assert(parsed.data&&typeof parsed.data==='object');}else assert.match(body,t.match);
  rows.push({key:t.key,imageId:g.newImage,status:'passed',http:r.status,bytes:size,check:'one known public source item; no browser or media-decoding assertion'});
 }catch{rows.push({key:t.key,imageId:g.newImage,status:'failed',check:'single bounded public-content check; investigate provider/error separately, not a proven build regression'});}
}
fs.writeFileSync(root+'/content.json',JSON.stringify({date:new Date().toISOString(),status:rows.every(r=>r.status==='passed')?'passed':'limitations',rows,environment:'App LAN gateways, not a fresh public-edge or browser media test'},null,2)+'\n');console.log(rows);
