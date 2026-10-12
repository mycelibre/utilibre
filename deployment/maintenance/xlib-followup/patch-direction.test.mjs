// Execute the actual option prefixes from the four production proof commands.
// Fixtures contain harmless text; no service, container or exploit is involved.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const here=new URL('.',import.meta.url);
const quoted=s=>[...s.matchAll(/'([^']+)'/g)].map(m=>m[1]);
function argumentsFor(file){
 const text=fs.readFileSync(new URL(file,here),'utf8');
 if(file==='inner.sh')return text.match(/^\s*patch (.+?) -i "\$patch"$/m)[1].split(/\s+/);
 if(file.startsWith('../'))return quoted(text.match(/subprocess\.run\(\['patch',(.+?)'-d'/)[1]);
 return quoted(text.match(/execFileSync\('patch',\[(.+?)'-i'/)[1]);
}
const before='# synthetic direction fixture\nmode=old\nend\n';
const after=before.replace('mode=old','mode=repaired');
for(const file of ['verify-source.mjs','review.mjs','inner.sh','../closure-review/review.mjs'])test(file+': absent repair fails, applied repair reverses',()=>{
 const args=argumentsFor(file);assert(args.includes('--reverse'));assert(args.includes('--force'));assert(args.includes('--fuzz=0'));
 const level=Number(args.find(a=>/^-p\d$/.test(a)).slice(2));assert([1,2].includes(level));
 const name='a/'.repeat(level)+'fixture.txt',patch=`--- ${name}\n+++ ${name}\n@@ -1,3 +1,3 @@\n # synthetic direction fixture\n-mode=old\n+mode=repaired\n end\n`;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'utilibre-patch-direction-'));
 const run=a=>spawnSync('patch',[...a,'-i',path.join(dir,'fix.patch')],{cwd:dir,encoding:'utf8',timeout:5000});
 try{
  fs.writeFileSync(path.join(dir,'fix.patch'),patch);
  fs.writeFileSync(path.join(dir,'fixture.txt'),before);
  // Demonstrate the former false success; use dry-run to preserve the fixture.
  const oldArgs=args.filter(a=>a!=='--force');if(!oldArgs.includes('--dry-run'))oldArgs.push('--dry-run');
  assert.equal(run(oldArgs).status,0,'Old batch reverse unexpectedly did not auto-flip');
  assert.equal(fs.readFileSync(path.join(dir,'fixture.txt'),'utf8'),before);
  assert.notEqual(run(args).status,0,'Unapplied security patch falsely accepted');
  assert.equal(fs.readFileSync(path.join(dir,'fixture.txt'),'utf8'),before,'Failed proof must not apply the repair');
  fs.writeFileSync(path.join(dir,'fixture.txt'),after);
  const result=run(args);assert.equal(result.status,0,result.stdout+result.stderr);
  assert.equal(fs.readFileSync(path.join(dir,'fixture.txt'),'utf8'),args.includes('--dry-run')?after:before);
 }finally{assert(path.basename(dir).startsWith('utilibre-patch-direction-'));fs.rmSync(dir,{recursive:true});}
});
