// Restore the complete historical indexes by their signed hashes. No APT/package
// or running-container writes. Network is used only by this explicit acquisition.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {keyHash,releaseHash} from './dhi-policy.mjs';
const dir='/var/lib/utilibre-maintenance/xserver-followup-20261012/dhi';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function authenticatedIndexes(){
 const key=dir+'/dhi-deb-main.gpg',release=dir+'/dhi.io_deb_debian_main_dists_trixie_InRelease';
 assert.equal(sha(fs.readFileSync(key)),keyHash);assert.equal(sha(fs.readFileSync(release)),releaseHash);
 const temporary=fs.mkdtempSync('/tmp/utilibre-dhi-signature-');let verified;
 try{cp.execFileSync('sqv',['--keyring',key,'--cleartext','--output',temporary+'/verified',release],{stdio:'pipe',timeout:15000});verified=fs.readFileSync(temporary+'/verified','utf8');}
 finally{assert(path.dirname(temporary)==='/tmp'&&path.basename(temporary).startsWith('utilibre-dhi-signature-'));fs.rmSync(temporary,{recursive:true});}
 const signed=verified.split('\nSHA256:\n')[1];assert(signed);
 return ['main/binary-amd64/Packages','main/source/Sources'].map(name=>{
  const line=signed.split('\n').find(l=>l.trim().endsWith(' '+name+'.gz'));assert(line);
  const [hash,size]=line.trim().split(/\s+/);return {name,hash,bytes:Number(size),file:dir+'/'+name.split('/').at(-1)+'.gz'};
 });
}
export function readIndexes(){return authenticatedIndexes().map(i=>{
 const compressed=fs.readFileSync(i.file);assert.equal(compressed.length,i.bytes);assert.equal(sha(compressed),i.hash);
 const bytes=gunzipSync(compressed,{maxOutputLength:40*1024**2});return {...i,text:bytes.toString()};
});}
if(process.argv[1]===new URL(import.meta.url).pathname){
 process.umask(0o077);
 for(const i of authenticatedIndexes()){
  if(fs.existsSync(i.file)){assert.equal(sha(fs.readFileSync(i.file)),i.hash);continue;}
  const url='https://dhi.io/deb/debian/main/dists/trixie/'+i.name.slice(0,i.name.lastIndexOf('/'))+'/by-hash/SHA256/'+i.hash;
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});assert(response.ok);assert.equal(Number(response.headers.get('content-length')),i.bytes);
  const b=Buffer.from(await response.arrayBuffer());assert.equal(b.length,i.bytes);assert.equal(sha(b),i.hash);fs.writeFileSync(i.file,b,{flag:'wx'});
 }
 console.log(JSON.stringify({authenticatedIndexes:readIndexes().map(i=>({name:i.name,sha256:i.hash,bytes:i.bytes})),productionChanged:false}));
}
