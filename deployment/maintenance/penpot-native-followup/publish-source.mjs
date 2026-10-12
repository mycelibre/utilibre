// Additive complete corresponding source; never include production data/config.
import fs from 'node:fs';import path from 'node:path';import cp from 'node:child_process';
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {directory,liveNative} from './release-inputs.mjs';
process.umask(0o077);
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:8*1024**2});
const docker=(...args)=>run('docker',args);
const release=read(directory+'/penpot-release.json');assert.equal(release.status,'passed');
for(const row of release.rows){assert.equal(JSON.parse(docker('inspect',row.name))[0].Image,row.newImage);liveNative(docker,row.name);}
const filename='security-penpot-native-20261012-source.tar.gz',archive=directory+'/'+filename;
assert(!fs.existsSync(archive),'Never replace a previous source offer');
const temp=fs.mkdtempSync(directory+'/source-offer-'),files=[];
const copy=(from,to)=>{assert(!to.split('/').includes('..'));const dest=temp+'/'+to;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(from,dest);files.push({path:to,sha256:sha(dest)});};
try{
 for(const name of ['librsvg-2.60.3-vendored-source.tar.xz','debian-abi.patch','cargo-lock.sha256','toolchain.txt','build-packages.lock'])copy(directory+'/output/'+name,'librsvg/'+name);
 for(const name of ['tiff-4.7.2-native-source.tar.xz','build-packages.lock'])copy(directory+'/tiff/output/'+name,'tiff/'+name);
 for(const name of fs.readdirSync(directory+'/output/notices'))if(fs.statSync(directory+'/output/notices/'+name).isFile())copy(directory+'/output/notices/'+name,'librsvg/notices/'+name);
 for(const name of fs.readdirSync(directory+'/tiff/sources').filter(f=>/\.(dsc|tar\.xz|tar\.bz2)$/.test(f)))copy(directory+'/tiff/sources/'+name,'tiff/original/'+name);
 const here=new URL('.',import.meta.url).pathname;
 const recipes=base=>fs.readdirSync(base,{withFileTypes:true}).flatMap(e=>e.isDirectory()?recipes(base+e.name+'/'):e.isFile()?[base+e.name]:[]);
 for(const from of recipes(here))copy(from,'recipes/maintenance/penpot-native-followup/'+from.slice(here.length));
 for(const name of ['native-final/release-penpot.mjs','release-postgres-vendor-security.mjs','followup-overlays.mjs','check-penpot-2.18.3.mjs'])copy(here+'../'+name,'recipes/maintenance/'+name);
 fs.writeFileSync(temp+'/SHA256SUMS',files.map(f=>f.sha256+'  '+f.path).join('\n')+'\n');
 fs.writeFileSync(temp+'/SOURCE.json',JSON.stringify({date:new Date().toISOString(),files,versions:{librsvg:'2.60.3+utilibre1',tiff:'4.7.2-1~deb13u1+utilibre1'},reproduction:'Complete modified sources include upstream notices and vendored Rust dependencies. See recipes/maintenance/penpot-native-followup/README.md. Shared checker dependencies are in utilibre-integration.tar.gz. No user data, private receipts, logs, configuration or credentials.'},null,2)+'\n');
 run('tar',['-czf',archive,'-C',temp,'.']);
 const proof={date:new Date().toISOString(),filename,bytes:fs.statSync(archive).size,sha256:sha(archive)};
 for(const base of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){assert(!fs.existsSync(base+'/'+filename));fs.copyFileSync(archive,base+'/'+filename+'.tmp');fs.chmodSync(base+'/'+filename+'.tmp',0o644);fs.renameSync(base+'/'+filename+'.tmp',base+'/'+filename);}
 fs.writeFileSync(directory+'/source-offer.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}finally{assert(path.dirname(temp)===directory&&path.basename(temp).startsWith('source-offer-'));fs.rmSync(temp,{recursive:true});}
