// Isolated regression only: no downloads, deployment, bus calls or notifications.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';import {resetAdvisory,proofPath,shaFile,validateResetProof} from './expat-reset-proof.mjs';
process.umask(0o077);assert.equal(process.argv.length,2);
const root='/var/lib/utilibre-maintenance/security-20261103',dir='/var/lib/utilibre-maintenance/security-20261104';
const read=p=>JSON.parse(fs.readFileSync(p));const inputs=read(new URL('../security-20261103/expat-debian-inputs.json',import.meta.url));
const bwrap=root+'/bubblewrap/usr/bin/bwrap';assert.equal(shaFile(bwrap),'573236e5328ac2ebb08f59ae3a9805b4f8d12bdef14be8af4450d5463294985f');
const source=fileURLToPath(new URL('./expat-reset.c',import.meta.url));
const header=root+'/expat-bookworm/work/expat/expat/lib';
for(const [file,hash] of Object.entries({'expat.h':'71be1f9e24a8edf1c27038a28441c947c3d75f19cf36d3a17ce59f8bb7298317','expat_external.h':'24bed28e7cbc1cbc5f1cda6b918b978f252495c12ddf83fd792c9d6e67bc7119'}))assert.equal(shaFile(header+'/'+file),hash,'Authenticated Expat header changed');
const command=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:15000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']});
command('cc',['-Wall','-Wextra','-Werror','-O2','-DXML_DTD','-I',header,source,'-ldl','-o',dir+'/expat-reset']);
const rows=[],seen=new Set();
for(const s of inputs.rows){const d=root+'/expat-debian/'+s.key;const c=read(d+'/consumer.json'),b=read(d+'/build.json');
 for(const state of ['before','after'])for(const library of ['libexpat','libexpatw']){
  const file=d+'/'+state+'-'+library+'.so',hash=shaFile(file);
  const expected=c.abi.find(a=>a.library===library&&a.imageId===(state==='before'?b.base:b.imageId));assert.equal(hash,expected?.sha256);
  // One affected 2.9.0 control per width; the two distinct fixed Debian builds.
  if(state==='before'&&s.key!=='debian-kitchenowl-app')continue;
  if(seen.has(state+hash))continue;seen.add(state+hash);
  if(state==='after')assert.equal(hash,(inputs.librariesBySuite?.[s.suite]||inputs.libraries)[library+'.so.1']);
  const args=['--as=134217728','--cpu=10','--core=0','--',bwrap,'--unshare-all','--die-with-parent','--new-session','--ro-bind','/usr','/usr','--symlink','usr/lib','/lib','--symlink','usr/lib64','/lib64','--proc','/proc','--dev','/dev','--tmpfs','/tmp','--dir','/fixture','--ro-bind',dir+'/expat-reset','/fixture/test','--ro-bind',file,'/fixture/library.so','--clearenv','--setenv','PATH','/usr/bin:/bin','--chdir','/tmp','--uid','65534','--gid','65534','/fixture/test','/fixture/library.so'];
  const result=JSON.parse(command('prlimit',args));assert.equal(result.fixtureBytes,65536);
  rows.push({state,library,suite:s.suite,librarySha256:hash,result});
 }
}
const proof={date:new Date().toISOString(),status:'passed',advisory:resetAdvisory,sourceSha256:shaFile(source),binarySha256:shaFile(dir+'/expat-reset'),compiler:command('cc',['--version']).split('\n')[0],headers:Object.fromEntries(['expat.h','expat_external.h'].map(p=>[p,shaFile(header+'/'+p)])),network:'none',productionMounts:false,fixtureBytes:65536,rows};
assert.equal(rows.length,6);for(const r of rows.filter(r=>r.state==='after'))validateResetProof(proof,r.librarySha256);
fs.writeFileSync(proofPath,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({status:'passed',checks:rows.length,baselineFailures:2,fixedPasses:4,proofPath}));
