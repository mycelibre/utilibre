#!/usr/bin/env node
// Read-only production assessment. Downloads authenticated original source into
// a private scratch tree and dry-runs official fixes; installs nothing.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/openldap-followup-20261012/next-assessment';fs.mkdirSync(dir,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const run=(cmd,args,opts={})=>cp.execFileSync(cmd,args,{encoding:'utf8',timeout:60000,maxBuffer:4e6,stdio:['ignore','pipe','pipe'],...opts});
async function download(url,file){if(!fs.existsSync(file)){const r=await fetch(url,{signal:AbortSignal.timeout(60000)});assert(r.ok,url);fs.writeFileSync(file,Buffer.from(await r.arrayBuffer()));}return fs.readFileSync(file);}
const specs=[['hdf5','h/hdf5','1.10.8+repack1-1'],['libheif','libh/libheif','1.15.1-1+deb12u1']];
const evidence=[];
for(const [name,pool,version]of specs){
 const target=dir+'/'+name;fs.mkdirSync(target,{recursive:true});const dsc=name+'_'+version+'.dsc',base='https://deb.debian.org/debian/pool/main/'+pool+'/';
 const bytes=await download(base+dsc,target+'/'+dsc),data=bytes.toString('utf8');
 run('docker',['cp',target+'/'+dsc,'maintenance-postgis-native-20261012:/work/openldap-followup/'+dsc]);
 const signed=run('docker',['exec','maintenance-postgis-native-20261012','gpgv','--status-fd','1','--keyring','/usr/share/keyrings/debian-keyring.gpg','--keyring','/usr/share/keyrings/debian-maintainers.gpg','/work/openldap-followup/'+dsc]);assert(signed.includes('[GNUPG:] VALIDSIG '));
 const rows=[...data.match(/Checksums-Sha256:\n([\s\S]*?)\nFiles:/)[1].matchAll(/^ ([a-f0-9]{64}) (\d+) ([^\n]+)$/gm)];assert(rows.length===2);
 const files=[{file:dsc,sha256:sha(bytes)}];for(const m of rows){const b=await download(base+m[3],target+'/'+m[3]);assert.equal(sha(b),m[1]);assert.equal(b.length,Number(m[2]));files.push({file:m[3],sha256:m[1]});}
 if(!fs.existsSync(target+'/tree'))run('dpkg-source',['--no-check','-x',target+'/'+dsc,target+'/tree']);
 // Signature checked above against Debian keyrings; dpkg-source repeats SHA
 // validation while --no-check avoids a host that lacks developer keyrings.
 evidence.push({name,version,files,signature:signed});
}
const fixes=[['hdf5','46cedc2eb03ad7cd6e8404f5e6b526588436f946','https://github.com/HDFGroup/hdf5/commit/'],['libheif','b8c12a7b70f46c9516711a988483bed377b78d46','https://github.com/strukturag/libheif/commit/'],['libheif','22b6266bf03a9f016f84a9b57b80e1dd7c79d64a','https://github.com/strukturag/libheif/commit/'],['libheif','6721f307ad684804b735e917dde7d372c5faae31','https://github.com/strukturag/libheif/commit/']];
for(const [name,commit,base]of fixes){
 const patch=dir+'/'+commit+'.patch',bytes=await download(base+commit+'.patch',patch);let exit=0,output;
 try{output=run('patch',['--dry-run','--batch','--fuzz=0','-p1','-i',patch],{cwd:dir+'/'+name+'/tree'});}catch(e){exit=e.status;output=String(e.stdout||'')+String(e.stderr||'');}
 evidence.push({name,commit,patchSha256:sha(bytes),dryRunExit:exit,output});
 if(['b8c12a7b70f46c9516711a988483bed377b78d46','22b6266bf03a9f016f84a9b57b80e1dd7c79d64a'].includes(commit)){
  const adjusted=bytes.toString('utf8').replaceAll('libheif/image/pixelimage.cc','libheif/heif_image.cc').replaceAll('libheif/pixelimage.cc','libheif/heif_image.cc'),file=dir+'/'+commit+'-path-only.patch';fs.writeFileSync(file,adjusted);
  let result;try{result={exit:0,output:run('patch',['--dry-run','--batch','--fuzz=0','-p1','-i',file],{cwd:dir+'/'+name+'/tree'})};}catch(e){result={exit:e.status,output:String(e.stdout||'')+String(e.stderr||'')};}
  evidence.push({name,commit,adaptation:'Path rename only: libheif/pixelimage.cc to libheif/heif_image.cc. All changed code bytes preserved.',adjustedSha256:sha(adjusted),...result});
 }
 if(name==='hdf5'){
  let source=null;const adjusted=bytes.toString('utf8').split('\n').map(line=>{
   if(line.startsWith('+++ b/'))source=fs.readFileSync(dir+'/hdf5/tree/'+line.slice(6),'utf8').split('\n');
   if(line.startsWith(' ')&&source){const text=line.slice(1);if(text.trim()==='FUNC_ENTER_PACKAGE')return ' '+text.replace('FUNC_ENTER_PACKAGE','FUNC_ENTER_STATIC');const matches=source.filter(x=>x.replace(/\s/g,'')===text.replace(/\s/g,''));if(matches.length===1)return ' '+matches[0];}
   return line;
  }).join('\n');
  const changes=p=>p.split('\n').filter(l=>/^[+-]/.test(l)).join('\n');assert.equal(changes(adjusted),changes(bytes.toString('utf8')),'Never alter upstream added/deleted fix code');
  const file=dir+'/'+commit+'-context-only.patch';fs.writeFileSync(file,adjusted);let result;
  try{result={exit:0,output:run('patch',['--dry-run','--batch','--fuzz=0','-p1','-i',file],{cwd:dir+'/hdf5/tree'})};}catch(e){result={exit:e.status,output:String(e.stdout||'')+String(e.stderr||'')};}
  evidence.push({name,commit,adaptation:'Only unchanged context: whitespace and existing FUNC_ENTER_STATIC rather than FUNC_ENTER_PACKAGE. Exact upstream added/deleted bytes preserved.',adjustedSha256:sha(adjusted),...result});
 }
}
fs.writeFileSync(dir+'/source-assessment.json',JSON.stringify({date:new Date().toISOString(),assessmentOnly:true,productionChanged:false,evidence},null,2)+'\n');
console.log(JSON.stringify(evidence.map(e=>({name:e.name,version:e.version,commit:e.commit,dryRunExit:e.dryRunExit,output:e.output})),null,2));
