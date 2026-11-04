// Revalidate the archived signed source and the four-file backport. No downloads.
import fs from 'node:fs';import path from 'node:path';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);const [archives,indexes,candidate]=process.argv.slice(2);assert(process.argv.length===5&&[archives,indexes,candidate].every(path.isAbsolute));
const spec=JSON.parse(fs.readFileSync(new URL('./gssapi-inputs.json',import.meta.url))),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(exe,args,opts={})=>cp.execFileSync(exe,args,{encoding:'utf8',stdio:'pipe',timeout:30000,maxBuffer:128*1024**2,...opts});
assert.equal(sha(indexes+'/InRelease'),spec.upstream.releaseSha256);assert.equal(sha(indexes+'/Sources.xz'),spec.upstream.sourceIndexSha256);
const temp=fs.mkdtempSync(archives+'/signed-source-check-');
try{
 run('sqv',['--keyring','/usr/share/keyrings/debian-archive-keyring.gpg','--cleartext','--output',temp+'/verified',indexes+'/InRelease']);
 assert(fs.readFileSync(temp+'/verified','utf8').split('\n').some(l=>l.trim().split(/\s+/)[0]===spec.upstream.sourceIndexSha256&&l.endsWith('main/source/Sources.xz')));
 const records=run('xz',['-dc',indexes+'/Sources.xz']).split('\n\n').filter(r=>r.startsWith('Package: openssh-gssapi\n'));assert.equal(records.length,1);const record=records[0];assert(record.includes('\nVersion: '+spec.upstream.version+'\n'));
 for(const p of spec.upstream.archives){assert.equal(sha(archives+'/'+p.file),p.sha256);assert.equal(fs.statSync(archives+'/'+p.file).size,p.size);assert(record.includes(' '+p.sha256+' '+p.size+' '+p.file));}
 const source=temp+'/source';run('dpkg-source',['--no-check','-x',archives+'/openssh-gssapi_10.6p1-1.dsc',source]);
 for(const[f,h]of Object.entries(spec.upstream.referenceFiles))assert.equal(sha(source+'/'+f),h);
 for(const[f,h]of Object.entries(spec.after))assert.equal(sha(candidate+'/'+f),h);
 for(const f of ['gss-serv.c','ssh-gss.h'])assert.equal(fs.readFileSync(candidate+'/'+f,'utf8').split('\n').slice(1).join('\n'),fs.readFileSync(source+'/'+f,'utf8').split('\n').slice(1).join('\n'));
 const fn=s=>{const start=s.indexOf('\nmm_answer_gss_setup_ctx(');assert(start>0);return s.slice(start,s.indexOf('\n}',start)+2)};
 assert.equal(fn(fs.readFileSync(candidate+'/monitor.c','utf8')),fn(fs.readFileSync(source+'/monitor.c','utf8')));
 const reset='#ifdef GSSAPI\n\tssh_gssapi_cleanup_global_client();\n\t/* XXX move to auth2_gssapi_stop() */';for(const d of [source,candidate])assert(fs.readFileSync(d+'/auth2.c','utf8').includes(reset));
 console.log(JSON.stringify({passed:true,signedDebianSource:true,sourceVersion:spec.upstream.version,exactNativeImplementation:true,productionChanged:false,network:'none'}));
}finally{fs.rmSync(temp,{recursive:true});}
