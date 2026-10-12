// Build only CPython's unchanged extension against the patched system Expat.
// No replacement interpreter, application code or third-party Python packages.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='/var/lib/utilibre-maintenance/closure-followup-20261012';
process.umask(0o077);
const versions=[['3.11.17','bfb74ad39efae27cda510f134ab408e00f9992c56851cfc0b1cdb5646da11599'],['3.13.16','f4b1bfb3c79b5bb11b8d228a12504163b4c0dab4d679828d8f5f26b6cb6ab35d'],['3.14.6','143b1dddefaec3bd2e21e3b839b34a2b7fb9842272883c576420d605e9f30c63']];
const results=[];
for(const [version,digest] of versions){
 const archive=root+'/sources/Python-'+version+'.tar.xz',src=root+'/sources/Python-'+version;
 assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),digest);
 cp.execFileSync('tar',['-xf',archive,'-C',root+'/sources']);
 const out=root+'/pyexpat-'+version;fs.mkdirSync(out,{recursive:true});
 const log=fs.openSync(out+'/build.log','w',0o600);
 const run=(p,args)=>cp.execFileSync(p,args,{cwd:src,timeout:240000,stdio:['ignore',log,log],env:{...process.env,EXPAT_CFLAGS:'-I'+root+'/sources/expat-2.9.0/expat/lib',EXPAT_LIBS:'-Wl,-l:libexpat.so.1'}});
 try{
  run('unshare',['-n','./configure','--enable-shared','--with-system-expat','--without-ensurepip']);
  const minor=version.split('.').slice(0,2).join(''),suffix='.cpython-'+minor.replace('.','')+'-x86_64-linux-gnu.so';
  // 3.11 still delegates extension builds to setup.py; compile the one
  // upstream translation unit with the configure-generated native headers.
  run('unshare',['-n','gcc','-shared','-fPIC','-O2','-fwrapv','-DNDEBUG','-I.','-IInclude','-IInclude/internal','-IModules','-I'+root+'/sources/expat-2.9.0/expat/lib','-IModules/expat','Modules/pyexpat.c','-Wl,-l:libexpat.so.1','-o','Modules/pyexpat'+suffix]);
  const target=out+'/pyexpat'+suffix;fs.copyFileSync(src+'/Modules/pyexpat'+suffix,target);fs.chmodSync(target,0o755);
  const dynamic=cp.execFileSync('readelf',['-d',target],{encoding:'utf8'});assert(dynamic.includes('libexpat.so.1'));
  results.push({version,source:'https://www.python.org/ftp/python/'+version+'/Python-'+version+'.tar.xz',sourceSha256:digest,file:target,sha256:createHash('sha256').update(fs.readFileSync(target)).digest('hex'),built:true,nativeTested:false});
  console.log(version+': system-Expat extension built');
 }finally{fs.closeSync(log);}
}
fs.writeFileSync(root+'/pyexpat-build.json',JSON.stringify({date:new Date().toISOString(),rows:results},null,2)+'\n');
