// Exact Debian GSSAPI backport. Preparation only; no host SSH commands.
import fs from 'node:fs';import cp from 'node:child_process';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const [input,out]=process.argv.slice(2);assert(process.argv.length===4&&path.isAbsolute(input)&&path.isAbsolute(out)&&!fs.existsSync(out));
const spec=JSON.parse(fs.readFileSync(new URL('./gssapi-inputs.json',import.meta.url))),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(cmd,args,opts={})=>cp.execFileSync(cmd,args,{stdio:'pipe',timeout:30000,...opts});
for(const [f,h]of Object.entries(spec.baselineArchives))assert.equal(sha(input+'/'+f),h,'Unsupported SSH input: '+f);
const patch=new URL('./gssapi-106553-106555.patch',import.meta.url);assert.equal(sha(patch),spec.patchSha256);
fs.mkdirSync(out,{mode:0o700});for(const f of Object.keys(spec.baselineArchives))fs.copyFileSync(input+'/'+f,out+'/'+f);
const tree=out+'/openssh-10.3p1';run('dpkg-source',['--no-check','-x',out+'/openssh_10.3p1-1~bpo13+1+utilibre1.dsc',tree]);
for(const [f,h]of Object.entries(spec.before))assert.equal(sha(tree+'/'+f),h);
run('git',['apply','--check',patch.pathname],{cwd:tree});run('git',['apply',patch.pathname],{cwd:tree});
for(const [f,h]of Object.entries(spec.after))assert.equal(sha(tree+'/'+f),h);
// An already-correct candidate must reverse exactly; never apply it twice.
run('git',['apply','--reverse','--check',patch.pathname],{cwd:tree});
const repeat=cp.spawnSync('git',['apply','--check',patch.pathname],{cwd:tree,stdio:'pipe',timeout:10000});assert.notEqual(repeat.status,0);
const c=tree+'/debian/changelog';fs.writeFileSync(c,'openssh ('+spec.candidate+') trixie-backports; urgency=high\n\n  * Backport Debian 10.6 GSSAPI credential authorization and attempt reset.\n  * Retain the four previously verified Utilibre repairs and native packaging.\n\n -- Utilibre Maintenance <maintenance@utilibre.local>  Wed, 04 Nov 2026 00:00:00 +0000\n\n'+fs.readFileSync(c,'utf8'));
fs.writeFileSync(out+'/preparation.json',JSON.stringify({date:new Date().toISOString(),status:'prepared-not-built',...spec,manifestSha256:sha(new URL('./gssapi-inputs.json',import.meta.url)),alreadyCorrectRecognized:true,productionChanged:false},null,2)+'\n');
console.log('Exact GSSAPI candidate prepared; no production change.');
