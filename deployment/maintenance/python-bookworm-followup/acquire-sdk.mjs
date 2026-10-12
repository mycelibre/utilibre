// Download-only Debian trust path, not a host apt-source or package change.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const here=new URL('.',import.meta.url).pathname,dir='/var/lib/utilibre-maintenance/python-bookworm-followup-20261012';
const packages=JSON.parse(fs.readFileSync(here+'sdk-packages.json'));
assert(process.argv.slice(2).every(a=>a==='--sources'));
if(process.argv.includes('--sources')){
 const sources=JSON.parse(fs.readFileSync(here+'sdk-sources.json'));
 fs.mkdirSync(dir+'/sdk-sources',{recursive:true});
 for(const p of sources.filter(p=>p.file.endsWith('.dsc'))){
  if(sources.filter(s=>s.package===p.package).some(s=>!fs.existsSync(dir+'/sdk-sources/'+s.file)))
   cp.execFileSync('apt-get',['-o','Dir::Etc::sourcelist='+here+'review.sources','-o','Dir::Etc::sourceparts=-','-o','Dir::State::lists='+dir+'/apt-lists','source','--download-only',p.package+'='+p.version],{cwd:dir+'/sdk-sources',stdio:'pipe',timeout:120000});
 }
 for(const p of sources)assert.equal(createHash('sha256').update(fs.readFileSync(dir+'/sdk-sources/'+p.file)).digest('hex'),p.sha256);
 console.log('Complete corresponding SDK source packages match all nine signed-index checksums; host untouched.');
}
fs.mkdirSync(dir+'/sdk',{recursive:true});
for(const p of packages){
 if(!fs.existsSync(dir+'/sdk/'+p.file))cp.execFileSync('apt-get',['-o','Dir::Etc::sourcelist='+here+'review.sources','-o','Dir::Etc::sourceparts=-','-o','Dir::State::lists='+dir+'/apt-lists','download',p.name+'='+p.version],{cwd:dir+'/sdk',stdio:'pipe',timeout:120000});
 assert.equal(createHash('sha256').update(fs.readFileSync(dir+'/sdk/'+p.file)).digest('hex'),p.sha256);
}
console.log('Signed-index Debian SDK package downloads match all three pinned checksums; host untouched.');
