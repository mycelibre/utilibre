// Only tracked upstream source and the three already approved Wakapi edits.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
const here=new URL('.',import.meta.url).pathname;
const root='/var/lib/utilibre-maintenance/go-leaf-final-20261011';
const specs=JSON.parse(fs.readFileSync(here+'images.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const key of process.argv.slice(2)){
 const s=specs.find(x=>x.key===key);assert(s);
 const name=key==='wakapi-healthcheck'?'wakapi':key;
 const source=key==='mezzo'?root+'/source/mezzo':s.source;
 if(key!=='mezzo'){
  assert.equal(cp.execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),s.commit);
  const dirty=cp.execFileSync('git',['-C',source,'diff','--name-only'],{encoding:'utf8'}).trim().split('\n').filter(Boolean).sort();
  assert.deepEqual(dirty,name==='wakapi'?['static/assets/js/login.js','static/assets/js/summary.js','views/summary.tpl.html']:[]);
 }
 const names=cp.execFileSync('git',['-C',s.source,'ls-tree','-r','--name-only','-z',s.commit]).toString().split('\0').filter(Boolean);
 const files=[];
 for(const rel of names){
  assert(!path.isAbsolute(rel)&&!rel.split('/').includes('..'));
  if(rel.split('/').some(p=>p==='.git'||p==='node_modules'||p==='.env'||p==='runtime.env'||p==='secrets'))continue;
  const file=path.join(source,rel);const stat=fs.lstatSync(file);
  if(stat.isSymbolicLink()){
   const link=fs.readlinkSync(file),resolved=path.resolve(path.dirname(file),link);
   assert(!path.isAbsolute(link)&&resolved.startsWith(path.resolve(source)+path.sep),'Source link escapes tree');
   files.push({path:rel,symlink:link});continue;
  }
  assert(stat.isFile(),'Unexpected nonregular source '+rel);
  files.push({path:rel,sha256:sha(fs.readFileSync(file)),executable:!!(stat.mode&0o111)});
 }
 fs.writeFileSync(root+'/output/'+name+'-source-files.json',JSON.stringify({source,commit:s.commit,files},null,2)+'\n',{mode:0o600});
 console.log(name+': '+files.length+' tracked source files snapshotted');
}
