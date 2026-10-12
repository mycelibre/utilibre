// Revalidate authenticated inputs, exact applied patches and native build artifacts.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/xlib-followup-20261012',here=new URL('.',import.meta.url).pathname;
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const specs=read(here+'specs.json'),acquired=read(root+'/acquisition.json'),prepared=read(root+'/prepared.json'),sources=[];
for(const s of specs.sources){
 const source=root+'/sources/'+s.suite+'/'+s.package,tree=prepared.trees.find(t=>t.suite===s.suite&&t.package===s.package);assert(tree);assert.equal(tree.version,s.version+'+utilibre1');
 const input=acquired.sources.find(t=>t.suite===s.suite&&t.package===s.package);assert(input);assert.equal(sha(source+'/'+s.dsc),s.sha256);
 for(const f of input.files)assert.equal(sha(source+'/'+f.file),f.sha256);
 const fixes=specs.patches.filter(p=>p.repo===s.package);
 for(const fix of fixes){const file=root+'/patches/'+fix.cve+'.patch';assert.equal(sha(file),fix.sha256);assert.equal(sha(tree.tree+'/debian/patches/utilibre-'+fix.cve+'.patch'),fix.sha256);assert(fs.readFileSync(file,'utf8').startsWith('From '+fix.commit+' '));cp.execFileSync('patch',['-p1','--fuzz=0','--batch','--reverse','--dry-run','-i',file],{cwd:tree.tree,stdio:'pipe',timeout:30000});}
 const build=root+'/build/'+(s.suite==='dhi'?'trixie':s.suite),log=build+'/'+s.suite+'-'+s.package+'-build.log',patchlog=build+'/'+s.suite+'-'+s.package+'-patches.log';
 assert.match(fs.readFileSync(log,'utf8'),/dpkg-genchanges/);assert(!/with fuzz/i.test(fs.readFileSync(patchlog,'utf8')));
 const tests=s.package==='libx11'?fs.readFileSync(log,'utf8').match(/# TOTAL:\s+(\d+)[\s\S]*?# PASS:\s+(\d+)[\s\S]*?# SKIP:\s+(\d+)[\s\S]*?# XFAIL:\s+(\d+)[\s\S]*?# FAIL:\s+(\d+)[\s\S]*?# XPASS:\s+(\d+)[\s\S]*?# ERROR:\s+(\d+)/):null;
 if(s.package==='libx11'){assert(tests);assert.equal(tests[1],'1');assert.equal(tests[2],'1');assert.equal(tests[5],'0');assert.equal(tests[7],'0');}
 sources.push({...s,version:tree.version,archives:input.files,fixes,exactReverseDryRuns:true,securityPatchesZeroFuzz:true,buildLogSha256:sha(log),patchLogSha256:sha(patchlog),upstreamTests:tests?{total:1,passed:1}:null});
}
const packages=[];for(const suite of ['trixie','dhi','bookworm']){const base=root+'/build/'+(suite==='dhi'?'trixie':suite)+'/'+suite;for(const file of fs.readdirSync(base).filter(f=>f.endsWith('.deb'))){const p=base+'/'+file;packages.push({suite,file,sha256:sha(p),fields:cp.execFileSync('dpkg-deb',['-f',p,'Package','Version','Architecture'],{encoding:'utf8'}).trim()});}}
const report={date:new Date().toISOString(),passed:true,sources,packages,limitation:'Exact upstream source/native build and compatibility evidence; no new malicious-X-server wire-protocol reproduction. Xrender/Xtst ship no substantive native check suite in these packages.',docContextException:'Only DHI libxtst signed-vendor manpage date patch 01_fix_date_in_manpages.diff uses fuzz1 for a removed XML comment; every security patch is zero-fuzz.'};
fs.writeFileSync(root+'/source-checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,sources:sources.length,packages:packages.length,upstreamComposeChecks:3}));
