// Authenticate acquired vendor payloads and verify official fixes in source.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/xserver-followup-20261012';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(c,a,o={})=>cp.execFileSync(c,a,{encoding:'utf8',timeout:60000,stdio:['ignore','pipe','pipe'],...o}).trim();
const blocks=fs.readFileSync(root+'/package-index.txt','utf8').trim().split(/\n\n+/);
const packages={};
for(const pkg of ['xvfb','xserver-common']){
 const b=blocks.find(b=>b.startsWith('Package: '+pkg+'\n'));assert(b);
 const fields=Object.fromEntries(b.split('\n').filter(l=>/^\S+: /.test(l)).map(l=>{const i=l.indexOf(': ');return[l.slice(0,i),l.slice(i+2)];}));
 assert.equal(fields.Version,'2:21.1.25-1');
 const name=pkg+'_2%3a21.1.25-1_'+(pkg==='xvfb'?'amd64':'all')+'.deb',file=root+'/packages/'+name;
 assert.equal(sha(file),fields.SHA256);assert.equal(fs.statSync(file).size,Number(fields.Size));
 packages[pkg]={file,version:fields.Version,sha256:fields.SHA256,depends:fields.Depends};
}
const src=fs.readFileSync(root+'/source-index.txt','utf8').split(/\n\n+/).find(b=>/^Version: 2:21\.1\.25-1$/m.test(b));assert(src);
const checksums=src.match(/^Checksums-Sha256:\n((?: .+\n?)+)/m)[1].trim().split('\n').map(s=>s.trim().split(/ +/));
for(const [digest,size,name] of checksums){const file=root+'/sources/'+name;assert.equal(sha(file),digest);assert.equal(fs.statSync(file).size,Number(size));}
const tree=root+'/source';assert(!fs.existsSync(tree));run('dpkg-source',['-x',root+'/sources/xorg-server_21.1.25-1.dsc',tree]);
const fixes=[['CVE-2026-88812','c724006ee76fb002add50fcb4d97e8c96c279f09'],['CVE-2026-93521','00ce692c7f6ea1900888a2a24aecf6cba5544ae1'],['CVE-2026-93523','aa56160fa213d8767e7da0c076b5c8242703313b']];
const records=[];
for(const [cve,commit] of fixes){
 const url='https://gitlab.freedesktop.org/xorg/xserver/-/commit/'+commit+'.patch';
 const response=await fetch(url);assert(response.ok);const patch=await response.text();
 assert(patch.startsWith('From '+commit+' '));assert(patch.includes(cve));
 const file=root+'/'+cve+'.patch';fs.writeFileSync(file,patch);
 run('patch',['-p1','--force','--batch','--fuzz=0','--reverse','--dry-run','-i',file],{cwd:tree});
 records.push({cve,commit,url,patchSha256:sha(file),fixedSourceReversePatchCheck:true});
}
const extract=root+'/candidate';fs.mkdirSync(extract);
for(const p of Object.values(packages))run('dpkg-deb',['-x',p.file,extract]);
assert(!run('ldd',[extract+'/usr/bin/Xvfb']).includes('not found'));
const simulation=run('apt-get',['-s','install',...Object.values(packages).map(p=>p.file)]);
assert(!/^Remv /m.test(simulation));assert.deepEqual(simulation.split('\n').filter(l=>l.startsWith('Inst ')).map(l=>l.split(' ')[1]).sort(),['xserver-common','xvfb']);
const report={date:new Date().toISOString(),version:'2:21.1.25-1',packages,sourceArchives:checksums.map(([sha256,bytes,file])=>({file,sha256,bytes:Number(bytes)})),fixes:records,hostDependenciesSatisfied:true,exactTwoPackageSimulation:true,libcUpgrade:false,xvfbSha256:sha(extract+'/usr/bin/Xvfb'),productionChanged:false};
fs.writeFileSync(root+'/stage.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({version:report.version,verifiedFixes:records.length,hostDependenciesSatisfied:true,exactTwoPackageSimulation:true,productionChanged:false}));
