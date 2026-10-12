#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, existsSync, mkdirSync, statfsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
process.umask(0o077);
const spec=JSON.parse(readFileSync(new URL('spec.json',import.meta.url)));
const w=spec.work, sha=b=>createHash('sha256').update(b).digest('hex');
const run=args=>execFileSync(args[0],args.slice(1),{encoding:'utf8',timeout:60000,maxBuffer:4e6,stdio:['ignore','pipe','pipe']});
mkdirSync(w+'/source',{recursive:true});
const disk=statfsSync(w); assert(disk.bavail*disk.bsize>10*1024**3,'Preserve eight GiB floor and two GiB build allowance');
assert.equal(run(['docker','inspect','--format','{{.Image}}',spec.builder]).trim(),spec.builderImage,'Unexpected compiler base');
async function download(url,file,hash){
  if(!existsSync(file)){const r=await fetch(url,{signal:AbortSignal.timeout(60000)});assert(r.ok);const b=Buffer.from(await r.arrayBuffer());assert.equal(sha(b),hash);writeFileSync(file,b);}
  assert.equal(sha(readFileSync(file)),hash);
}
for(const [file,hash]of Object.entries(spec.sourceFiles)) await download(spec.sourceBase+file,w+'/source/'+file,hash);
for(const [commit,hash]of Object.entries(spec.patches)) await download(`https://git.openldap.org/openldap/openldap/-/commit/${commit}.patch`,w+'/source/'+commit+'.patch',hash);
run(['docker','exec',spec.builder,'mkdir','-p',spec.builderWork]);
run(['docker','cp',w+'/source',spec.builder+':'+spec.builderWork+'/source']);
const signature=run(['docker','exec',spec.builder,'gpgv','--status-fd','1','--keyring','/usr/share/keyrings/debian-maintainers.gpg',spec.builderWork+'/source/openldap_2.5.13+dfsg-5.dsc']);
assert(signature.includes('[GNUPG:] VALIDSIG '+spec.sourceSigner+' '));
const dsc=readFileSync(w+'/source/openldap_2.5.13+dfsg-5.dsc','utf8');
for(const [file,hash]of Object.entries(spec.sourceFiles).filter(([file])=>!file.endsWith('.dsc'))) assert(dsc.includes(hash)&&dsc.includes(file));
writeFileSync(w+'/source/authenticated.json',JSON.stringify({date:new Date().toISOString(),...spec,signature},null,2)+'\n');
console.log('Debian source signature and exact upstream 2.5 patch checksums verified.');
