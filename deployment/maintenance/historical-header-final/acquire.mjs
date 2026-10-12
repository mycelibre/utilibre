// Read only primary text. Never download/mount the linked reproducer images.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {documents,components,cnaCommit} from './policy.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/historical-header-final-20261012';fs.mkdirSync(root+'/sources',{recursive:true});
fs.mkdirSync(root+'/cna',{recursive:true});
const inputs=Object.entries(documents).map(([file,d])=>({file:'sources/'+file,...d}));
for(const[id,s]of Object.entries(components)){const[,year,num]=id.split('-');inputs.push({file:'cna/'+id+'.json',url:`https://raw.githubusercontent.com/CVEProject/cvelistV5/${cnaCommit}/cves/${year}/${num.slice(0,-3)}xxx/${id}.json`,sha256:s.sha256,cached:'/var/lib/utilibre-maintenance/closure-followup-20261012/cna/'+id+'.json'});}
const rows=[];
for(const{file,url,sha256,cached}of inputs){
 const p=root+'/'+file;let b;
 if(fs.existsSync(p))b=fs.readFileSync(p);
 else if(cached&&fs.existsSync(cached))b=fs.readFileSync(cached);
 else{const r=await fetch(url,{signal:AbortSignal.timeout(20000)});assert(r.ok);b=Buffer.from(await r.arrayBuffer());}
 assert(b.length<1024**2);assert.equal(createHash('sha256').update(b).digest('hex'),sha256,'Changed primary input needs manual review');
 if(!fs.existsSync(p))fs.writeFileSync(p,b,{flag:'wx'});
 rows.push({file,url,sha256,bytes:b.length});
}
fs.writeFileSync(root+'/sources.json',JSON.stringify({date:new Date().toISOString(),rows},null,2)+'\n');console.log(JSON.stringify(rows,null,2));
