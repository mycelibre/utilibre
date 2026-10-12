import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {readIndexes,sha} from '../xserver-followup/authenticate-dhi.mjs';
process.umask(0o077);
const here=new URL('.',import.meta.url).pathname,root='/var/lib/utilibre-maintenance/xlib-followup-20261012';
const specs=JSON.parse(fs.readFileSync(here+'specs.json'));
fs.mkdirSync(root,{recursive:true});fs.mkdirSync(root+'/patches',{recursive:true});
async function get(url,file,expected){
 if(!fs.existsSync(file)){const r=await fetch(url,{signal:AbortSignal.timeout(30000)});assert(r.ok);const b=Buffer.from(await r.arrayBuffer());assert.equal(sha(b),expected);fs.writeFileSync(file,b,{flag:'wx'});}
 assert.equal(sha(fs.readFileSync(file)),expected);
}
for(const p of specs.patches)await get('https://gitlab.freedesktop.org/xorg/lib/'+p.repo+'/-/commit/'+p.commit+'.patch',root+'/patches/'+p.cve+'.patch',p.sha256);
const dhiIndex=readIndexes()[1].text;
const evidence=[];
for(const p of specs.sources){
 const dir=root+'/sources/'+p.suite+'/'+p.package;fs.mkdirSync(dir,{recursive:true});
 let index,base;
 if(p.suite==='dhi'){index=dhiIndex;base='https://dhi.io/deb/debian/main/';}
 else{
  const family=p.suite==='trixie'?'xserver-followup':'python-bookworm-followup';
  const opts=['-o','Dir::Etc::sourcelist='+here+'../'+family+'/review.sources','-o','Dir::Etc::sourceparts=-','-o','Dir::State::lists=/var/lib/utilibre-maintenance/'+family+'-20261012/apt-lists'];
  index=cp.execFileSync('apt-cache',[...opts,'showsrc',p.package],{encoding:'utf8'});base='https://deb.debian.org/debian/';
 }
 const stanza=index.split(/\n\s*\n/).find(s=>s.startsWith('Package: '+p.package+'\n')&&s.includes('\nVersion: '+p.version+'\n'));assert(stanza);
 const directory=stanza.match(/^Directory: (.+)$/m)[1];assert(!directory.includes('..'));
 const entries=stanza.match(/^Checksums-Sha256:\n((?: .+\n?)+)/m)[1].trim().split('\n').map(s=>s.trim().split(/\s+/));
 for(const [digest,size,file]of entries){assert(/^[\w.+:-]+$/.test(file));await get(base+directory+'/'+file,dir+'/'+file,digest);assert.equal(fs.statSync(dir+'/'+file).size,Number(size));}
 assert.equal(sha(fs.readFileSync(dir+'/'+p.dsc)),p.sha256);
 fs.writeFileSync(dir+'/source-index.txt',stanza+'\n');evidence.push({...p,files:entries.map(([sha256,bytes,file])=>({file,sha256,bytes:Number(bytes)}))});
}
fs.writeFileSync(root+'/acquisition.json',JSON.stringify({date:new Date().toISOString(),sources:evidence,patches:specs.patches,productionChanged:false},null,2)+'\n');
console.log(JSON.stringify({sources:evidence.length,patches:specs.patches.length,productionChanged:false}));
