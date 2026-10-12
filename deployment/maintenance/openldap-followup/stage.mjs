#!/usr/bin/env node
// Prepare and verify exact library overlays only; never updates production pins.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
process.umask(0o077);
const here=new URL('.',import.meta.url).pathname, spec=JSON.parse(fs.readFileSync(here+'spec.json')),w=spec.work;
const sha=b=>createHash('sha256').update(b).digest('hex');
const run=a=>execFileSync(a[0],a.slice(1),{encoding:'utf8',timeout:300000,maxBuffer:16e6,stdio:['ignore','pipe','pipe'],env:{...process.env,DOCKER_BUILDKIT:'0'}}).trim();
const docker=a=>run(['docker',...a]), inspect=n=>JSON.parse(docker(['inspect',n]))[0];
const limits=['--rm','--network','none','--hostname','utilibre-ldap-fixture','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','256m','--pids-limit','64','--log-driver','none','--ulimit','core=0','--tmpfs','/tmp:rw,size=16m,mode=1777'];
const shell=(im,cmd)=>docker(['run',...limits,'--user','0','--entrypoint','sh',im,'-ec',cmd]);
const auth=JSON.parse(fs.readFileSync(w+'/source/authenticated.json'));
assert.equal(auth.sourceFiles['openldap_2.5.13+dfsg-5.dsc'],spec.sourceFiles['openldap_2.5.13+dfsg-5.dsc']);
const provenance=JSON.parse(fs.readFileSync(w+'/out/provenance.json'));
assert.equal(provenance.buildLogSha256,sha(fs.readFileSync(w+'/build.log')));
assert.equal(provenance.sourceLogSha256,sha(fs.readFileSync(w+'/source-build.log')));
assert(provenance.tests.filter(x=>x.status==='passed').length>30,'Missing native upstream tests');
const deb=w+'/out/libldap-2.5-0_'+spec.version+'_amd64.deb';
assert.equal(sha(fs.readFileSync(deb)),provenance.files[deb.split('/').at(-1)].sha256);
assert.equal(run(['dpkg-deb','-f',deb,'Package']),'libldap-2.5-0'); assert.equal(run(['dpkg-deb','-f',deb,'Version']),spec.version);
const fingerprints={
  application:'for d in /app /opt /usr/local /usr/lib/postgresql /usr/share/postgresql; do if test -d "$d"; then find "$d" -type f -exec sha256sum {} +; fi; done | sort | sha256sum',
  configuration:'find /etc -type f -exec sha256sum {} + | sort | sha256sum',
  otherLibraries:'find /usr/lib /lib -type f -name "*.so*" ! -name "libldap-2.5.so*" ! -name "liblber-2.5.so*" -exec sha256sum {} + | sort | sha256sum',
  otherPackages:"dpkg-query -W -f='${Package} ${Version}\\n' | sed '/^libldap-2.5-0 /d' | sort | sha256sum"
};
function abi(im,out){
  fs.mkdirSync(out,{recursive:true});
  const cid=docker(['create','--network','none','--entrypoint','true',im]);
  try{for(const lib of ['libldap','liblber']) docker(['cp',cid+':/usr/lib/x86_64-linux-gnu/'+lib+'-2.5.so.0.1.8',out+'/'+lib+'.so']);}
  finally{docker(['rm','-v',cid]);}
  return Object.fromEntries(['libldap','liblber'].map(lib=>{
    const f=out+'/'+lib+'.so';
    const symbols=run(['nm','-D','--defined-only','--format=posix',f]).split('\n').map(x=>x.split(/\s+/).slice(0,2).join(' ')).sort();
    const dynamic=run(['readelf','-d',f]);
    const dependencies=[...dynamic.matchAll(/\(NEEDED\).*\[([^\]]+)\]/g)].map(m=>m[1]).sort();
    const soname=dynamic.match(/\(SONAME\).*\[([^\]]+)\]/)?.[1];assert(soname);
    assert(!/\((?:RUNPATH|RPATH)\)/.test(dynamic),'Unexpected private runtime search path');
    return [lib,{sha256:sha(fs.readFileSync(f)),symbols,dependencies,soname}];
  }));
}
const bases=JSON.parse(fs.readFileSync(here+'bases.json')),requested=process.argv.slice(2);
assert(requested.every(key=>bases.some(s=>s.key===key)),'Select known roles only');
assert.equal(new Set(requested).size,requested.length,'Duplicate role requested');
for(const s of bases.filter(s=>!requested.length||requested.includes(s.key))){
  const out=w+'/images/'+s.key;fs.mkdirSync(out+'/packages',{recursive:true});
  assert(!fs.existsSync(out+'/build.json'),'Do not overwrite completed candidate evidence');
  assert.equal(inspect(s.baseRef).Id,s.base); assert.equal(inspect(s.container).Image,s.base,'Live base changed; rebase to retain intervening fixes');
  const disk=fs.statfsSync(w);assert(disk.bavail*disk.bsize>8*1024**3);
  fs.copyFileSync(deb,out+'/packages/'+deb.split('/').at(-1));
  const before=inspect(s.base);
  const log=docker(['build','--pull=false','--network=none','--memory','256m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE='+s.baseRef,'--build-arg','RESTORE_USER='+(before.Config.User||'root'),'-f',here+'../xml-final/Dockerfile','-t',s.candidate,out]);
  fs.writeFileSync(out+'/stage.log',log);
  const after=inspect(s.candidate),normal=c=>({...c,User:['','root','0',undefined].includes(c.User)?'root':c.User});assert.deepEqual(normal(after.Config),normal(before.Config));
  const hashes={};for(const[k,cmd]of Object.entries(fingerprints)){hashes[k]=shell(s.base,cmd);assert.equal(shell(s.candidate,cmd),hashes[k],k+' changed');}
  assert.equal(shell(s.candidate,"dpkg-query -W -f='${Version}' libldap-2.5-0"),spec.version);
  const oldAbi=abi(s.base,out+'/old'),newAbi=abi(s.candidate,out+'/new');
  for(const lib of ['libldap','liblber']){assert.deepEqual(newAbi[lib].symbols,oldAbi[lib].symbols,lib+' exported ABI changed');assert.deepEqual(newAbi[lib].dependencies,oldAbi[lib].dependencies,lib+' dependencies changed');assert.equal(newAbi[lib].soname,oldAbi[lib].soname);}
  const check=im=>docker(['run',...limits,'--user','0','--mount','type=bind,src='+w+'/out/native,dst=/check,readonly','--entrypoint','/check',im]);
  assert(check(s.base).includes('OPENLDAP_NATIVE_URL_IPV6_OPTIONS_GNUTLS_BER_LDIF_PASSED'));
  assert(check(s.candidate).includes('OPENLDAP_NATIVE_URL_IPV6_OPTIONS_GNUTLS_BER_LDIF_PASSED'));
  const scope=shell(s.candidate,'test ! -e /usr/sbin/slapd; test ! -e /etc/init.d/slapd; test ! -e /usr/lib/ldap/nops.so; test ! -e /usr/bin/mdb_load; echo LDAP_SERVER_COMPONENTS_ABSENT');
  assert.equal(scope,'LDAP_SERVER_COMPONENTS_ABSENT');
  fs.writeFileSync(out+'/build.json',JSON.stringify({...s,date:new Date().toISOString(),imageId:after.Id,passed:true,deployed:false,package:'libldap-2.5-0',version:spec.version,packageSha256:sha(fs.readFileSync(deb)),nativeFixtureSha256:sha(fs.readFileSync(w+'/out/native')),hashes,oldAbi,newAbi,nativePassedOldAndNew:true,serverComponentsAbsent:true,applicationRoundtrip:'not repeated; maintainer release gate required'},null,2)+'\n');
  console.log(s.key+': native old/new checks, exact ABI/dependencies and application/config preservation passed; candidate only.');
}
