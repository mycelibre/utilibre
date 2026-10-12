import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/xlib-followup-20261012',here=new URL('.',import.meta.url).pathname;
const specs=JSON.parse(fs.readFileSync(here+'specs.json')),acquisition=JSON.parse(fs.readFileSync(root+'/acquisition.json'));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),trees=[];
for(const p of specs.sources){
 const base=root+'/sources/'+p.suite+'/'+p.package,tree=root+'/work/'+p.suite+'/'+p.package;
 assert.equal(sha(base+'/'+p.dsc),p.sha256);for(const f of acquisition.sources.find(x=>x.suite===p.suite&&x.package===p.package).files)assert.equal(sha(base+'/'+f.file),f.sha256);
 assert(!fs.existsSync(tree),'Do not overwrite an existing work tree');fs.mkdirSync(root+'/work/'+p.suite,{recursive:true});
 cp.execFileSync('dpkg-source',['-x',base+'/'+p.dsc,tree],{stdio:'pipe',timeout:30000});
 // Preserve the distributor series. The isolated native builder applies it
 // before these exact upstream patches; no host build dependencies are needed.
 const patchDir=tree+'/debian/patches';fs.mkdirSync(patchDir,{recursive:true});
 const series=patchDir+'/series';let text=fs.existsSync(series)?fs.readFileSync(series,'utf8'):'';
 const patches=specs.patches.filter(x=>x.repo===p.package);
 for(const fix of patches){
  const file=root+'/patches/'+fix.cve+'.patch';assert.equal(sha(file),fix.sha256);
  fs.copyFileSync(file,patchDir+'/utilibre-'+fix.cve+'.patch',fs.constants.COPYFILE_EXCL);text+='\nutilibre-'+fix.cve+'.patch\n';
 }
 fs.writeFileSync(series,text);
 const changelog=tree+'/debian/changelog',next=p.version+'+utilibre1';
 fs.writeFileSync(changelog,`${p.package} (${next}) ${p.suite==='bookworm'?'bookworm':'trixie'}; urgency=high\n\n  * Preserve native/vendor baseline; apply exact upstream security bounds.\n\n -- Utilibre Maintainers <admin@utilibre.org>  Mon, 12 Oct 2026 15:00:00 +0000\n\n`+fs.readFileSync(changelog,'utf8'));
 trees.push({...p,tree,version:next,patches,sourceChangedOnlyByExactPatches:true});
}
fs.writeFileSync(root+'/prepared.json',JSON.stringify({date:new Date().toISOString(),trees,productionChanged:false},null,2)+'\n');console.log(JSON.stringify({trees:trees.length,productionChanged:false}));
