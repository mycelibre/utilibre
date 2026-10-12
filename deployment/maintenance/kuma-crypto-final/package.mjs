// Honest native package wrappers around the exact complete upstream wheels.
// No Python implementation/cryptography modifications or version spoofing.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,versions,sha,read,run} from './common.mjs';
process.umask(0o077);
const acquisition=read(root+'/acquisition.json');assert(!fs.existsSync(root+'/packages.json'));fs.mkdirSync(root+'/output',{recursive:true});
const out=root+'/packages';fs.mkdirSync(out);const records=[];
const manifest={
 'python3-cryptography':{project:'cryptography',prefix:['cryptography/','cryptography-50.0.2.dist-info/'],depends:'python3 (>= 3.11), python3 (<< 3.12), python3-cffi (>= 2.1.1)',arch:'amd64'},
 'python3-cffi-backend':{project:'cffi',prefix:['_cffi_backend.cpython-311-x86_64-linux-gnu.so'],depends:'python3 (>= 3.11), python3 (<< 3.12), libc6 (>= 2.17)',arch:'amd64'},
 'python3-cffi':{project:'cffi',prefix:['cffi/','cffi-2.1.1.dist-info/'],depends:'python3 (>= 3.11), python3 (<< 3.12), python3-cffi-backend (= 2.1.1+utilibre1), python3-pycparser (>= 3.11)',arch:'all'},
 'python3-pycparser':{project:'pycparser',prefix:['pycparser/','pycparser-3.11.dist-info/'],depends:'python3 (>= 3.11), python3 (<< 3.12)',arch:'all'},
};
for(const[name,spec]of Object.entries(manifest)){
 const source=acquisition.rows.find(r=>r.project===spec.project&&r.filename.endsWith('.whl'));assert(source);assert.equal(sha(fs.readFileSync(root+'/input/'+source.filename)),source.sha256);
 const dir=out+'/'+name,lib=dir+'/usr/lib/python3/dist-packages';fs.mkdirSync(lib,{recursive:true});fs.mkdirSync(dir+'/DEBIAN');
 const entries=run('unzip',['-Z1',root+'/input/'+source.filename]).split('\n');assert(entries.every(e=>!e.startsWith('/')&&!e.split('/').includes('..')));
 const chosen=entries.filter(e=>spec.prefix.some(p=>e.startsWith(p)));assert(chosen.length);run('unzip',['-q',root+'/input/'+source.filename,...chosen,'-d',lib]);
 const notices=entries.filter(e=>e.includes('.dist-info/licenses/')&&!e.endsWith('/'));assert(notices.length);const docs=dir+'/usr/share/doc/'+name;fs.mkdirSync(docs,{recursive:true});fs.writeFileSync(docs+'/copyright',notices.map(e=>'Upstream notice: '+e+'\n\n'+run('unzip',['-p',root+'/input/'+source.filename,e])).join('\n\n'));
 const control=`Package: ${name}\nVersion: ${versions[name]}\nArchitecture: ${spec.arch}\nMaintainer: Utilibre maintainers <admin@utilibre.org>\nSection: python\nPriority: optional\nDepends: ${spec.depends}\nDescription: Exact upstream ${spec.project} runtime packaged for Utilibre security maintenance\n Retains upstream files and notices. Local wrapper is not a Debian release.\n`;
 fs.writeFileSync(dir+'/DEBIAN/control',control);fs.chmodSync(dir+'/DEBIAN',0o755);fs.chmodSync(dir+'/DEBIAN/control',0o644);
 const walk=(p,relative='')=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>{const path=p+'/'+e.name;fs.chmodSync(path,e.isDirectory()?0o755:0o644);return e.isDirectory()?walk(path,relative+e.name+'/'):[relative+e.name];});const payload=walk(dir+'/usr','usr/').map(file=>({path:'/'+file,sha256:sha(fs.readFileSync(dir+'/'+file))}));
 const file=name+'_'+versions[name]+'_'+spec.arch+'.deb';run('dpkg-deb',['--root-owner-group','--build',dir,root+'/output/'+file]);records.push({name,version:versions[name],file,sha256:sha(fs.readFileSync(root+'/output/'+file)),wheel:source.filename,wheelSha256:source.sha256,depends:spec.depends,payload});
}
fs.writeFileSync(root+'/packages.json',JSON.stringify({date:new Date().toISOString(),records},null,2)+'\n');console.log(records.map(({name,version,file,sha256,payload})=>({name,version,file,sha256,files:payload.length})));
