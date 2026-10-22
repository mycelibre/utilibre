// Download authenticated native packages separately, then install offline over
// exact maintained images. No production configuration or service activation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {specs,output,candidate,advisories} from './specs.mjs';
import {sha256 as sha,verifyInputs,verifyPackageDelta} from './checks.mjs';
process.umask(0o077);
const keys=process.argv.slice(2);assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>specs.some(s=>s.key===k)));
fs.mkdirSync(output,{recursive:true,mode:0o700});
const publishedInputs=JSON.parse(fs.readFileSync(new URL('./inputs.v1.json',import.meta.url))).inputs;
let diagnostic=output+'/build-error.log';
const run=(exe,args,options={})=>{try{return cp.execFileSync(exe,args,{encoding:'utf8',timeout:180000,maxBuffer:24*1024**2,stdio:['pipe','pipe','pipe'],...options});}catch(e){fs.writeFileSync(diagnostic,String(e.stdout||'')+String(e.stderr||''));throw Error('Candidate operation failed; private diagnostic: '+diagnostic);}};
const docker=(...args)=>run('docker',args);
const inspect=id=>JSON.parse(docker('image','inspect',id))[0];
const safety=['--rm','--read-only','--user','0','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','512m','--memory-swap','512m','--cpus','1','--pids-limit','96','--log-driver','none'];
const native=(image,exe,args=[],extra=[])=>docker('run',...safety,'--network','none',...extra,'--entrypoint',exe,image,...args);
function packages(s,id){
 if(s.manager==='apk')return Object.fromEntries(native(id,'cat',['/lib/apk/db/installed']).split('\n\n').map(r=>Object.fromEntries(r.split('\n').filter(l=>/^[PVo]:/.test(l)).map(l=>[l[0],l.slice(2)]))).filter(p=>p.P).map(p=>[p.P,{version:p.V,origin:p.o}]));
 return Object.fromEntries(native(id,'dpkg-query',['-W','-f=${binary:Package}\t${source:Package}\t${Version}\t${db:Status-Status}\n']).trim().split('\n').map(l=>l.split('\t')).filter(p=>p[3]==='installed').map(p=>[p[0],{version:p[2],origin:p[1]}]));
}
function appHash(s,id){
 // Validate roots before entering the pipeline: a failed test on its left-hand
 // side must not be masked by a successful sha256sum on empty input.
 native(id,'sh',['-ec',`for d in ${s.roots.join(' ')}; do test -d "$d"; done`]);
 return native(id,'sh',['-ec',`for d in ${s.roots.join(' ')}; do find "$d" -type f ! -name '*.apk-new' -exec sha256sum {} +; done | sort | sha256sum`]).trim();
}
const check=`$e=get_loaded_extensions();sort($e); $s="Fictional café, año 123";if(json_decode(json_encode([$s]),true)!==[$s])exit(2);if(preg_match('/café/u',$s)!==1)exit(3);if(!password_verify($s,password_hash($s,PASSWORD_DEFAULT)))exit(4);$r=["version"=>PHP_VERSION,"extensions"=>$e,"jsonRegexPassword"=>true];if(extension_loaded("openssl")){$iv=random_bytes(16);$key=random_bytes(32);$ct=openssl_encrypt($s,"aes-256-cbc",$key,OPENSSL_RAW_DATA,$iv);if(openssl_decrypt($ct,"aes-256-cbc",$key,OPENSSL_RAW_DATA,$iv)!==$s)exit(5);$r["crypto"]=true;}if(extension_loaded("dom")){$d=new DOMDocument();if(!$d->loadXML("<fictional>café</fictional>",LIBXML_NONET)||$d->documentElement->textContent!=="café")exit(6);$r["xml"]=true;}if(extension_loaded("curl"))$r["curl"]=curl_version()["version"];echo json_encode($r);`;
for(const key of keys){
 const s=specs.find(x=>x.key===key),dir=output+'/'+key;fs.mkdirSync(dir,{recursive:true});diagnostic=dir+'/error.log';
 const base=inspect(s.base),before=packages(s,s.base),chosen=Object.entries(before).filter(([,p])=>p.origin===s.origin).map(([n])=>n).sort();
 assert.equal(base.Id,s.base,'Unsupported build input');
 assert(chosen.length>3&&chosen.every(n=>/^[a-z0-9_.+:-]+$/.test(n)));assert(chosen.every(n=>before[n].version!==s.version),'Baseline already correct');
 const sourceHash=appHash(s,s.base),normalBefore=JSON.parse(native(s.base,s.php,['-r',check]));
 if(fs.existsSync(dir+'/build.json')){
  const b=JSON.parse(fs.readFileSync(dir+'/build.json')),next=inspect(b.candidate);
  assert(b.passed&&b.base===s.base&&b.version===s.version&&next.Id===b.imageId);
  const lock=publishedInputs[key]||b;
  verifyInputs(s,lock,Object.fromEntries(Object.keys(b.packageHashes).map(n=>[n,fs.readFileSync(dir+'/packages/'+n)])));
  assert.deepEqual(next.Config,base.Config);verifyPackageDelta(s,before,packages(s,next.Id),chosen);
  assert.equal(appHash(s,next.Id),sourceHash);
  assert.deepEqual(JSON.parse(native(next.Id,s.php,['-r',check])),b.normalAfter);
  console.log(key+': existing exact candidate reverified; no download, rebuild or activation');continue;
 }
 const scratch=fs.mkdtempSync('/tmp/utilibre-php-packages-');fs.chmodSync(scratch,0o755);fs.mkdirSync(scratch+'/packages',{mode:0o755});
 // Keep download evidence and archives outside application trees. Downloaded
 // packages are verified by the native signed repository/package mechanism.
 try{
  const retained=fs.existsSync(dir+'/inputs.json')?JSON.parse(fs.readFileSync(dir+'/inputs.json')):null;
  const locked=publishedInputs[key]||retained;
  if(locked&&fs.existsSync(dir+'/packages')){
   const payloads=Object.fromEntries(fs.readdirSync(dir+'/packages').map(n=>[n,fs.readFileSync(dir+'/packages/'+n)]));
   verifyInputs(s,locked,payloads);for(const[n,bytes]of Object.entries(payloads))fs.writeFileSync(scratch+'/packages/'+n,bytes);
  }else if(s.manager==='apk'){
   assert(native(s.base,'cat',['/etc/alpine-release']).startsWith(s.branch+'.'));
   const repos=native(s.base,'cat',['/etc/apk/repositories']).trim().split('\n').filter(l=>l&&!l.startsWith('#'));
   assert(repos.every(r=>/^https?:\/\/(dl-cdn|dl-[0-9]+)\.alpinelinux\.org\/alpine\//.test(r)&&r.includes('/v'+s.branch+'/')),'Unreviewed repository');
   // apk3's fetch resolver also considers the maintained image's pinned world.
   // Fetch the explicitly named same-branch artifacts instead; native apk's
   // signature check remains mandatory during the subsequent offline install.
   for(const name of chosen){
    const filename=name+'-'+s.version+'.apk',url='https://dl-cdn.alpinelinux.org/alpine/v'+s.branch+'/community/x86_64/'+filename;
    const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000)});assert(r.ok,'Package download failed: '+filename);
    const bytes=Buffer.from(await r.arrayBuffer());assert(bytes.length<24*1024**2,'Package download bound');fs.writeFileSync(scratch+'/packages/'+filename,bytes);
   }
  }else{
   docker('run',...safety,'--network','bridge','--tmpfs','/var/lib/apt/lists:rw,size=128m,mode=0755','--tmpfs','/tmp:rw,size=64m,mode=1777','-v',scratch+'/packages:/out','--entrypoint','sh',s.base,'-ec','apt-get -o APT::Sandbox::User=root update >/dev/null; cd /out; apt-get -o APT::Sandbox::User=root download "$@"','download',...chosen.map(n=>n+'='+s.version));
  }
  const files=fs.readdirSync(scratch+'/packages').filter(n=>n.endsWith(s.manager==='apk'?'.apk':'.deb')).sort();assert.equal(files.length,chosen.length);
  const payloads=Object.fromEntries(files.map(n=>[n,fs.readFileSync(scratch+'/packages/'+n)]));
  const hashes=Object.fromEntries(files.map(n=>[n,sha(payloads[n])]));
  const lock=locked||{base:s.base,manager:s.manager,version:s.version,packageHashes:hashes};verifyInputs(s,lock,payloads);
  const bytes=Object.values(payloads).reduce((sum,b)=>sum+b.length,0);
  const disk=fs.statfsSync('/');assert(disk.bavail*disk.bsize>8*1024**3+32*1024**2+bytes*4,'8 GiB reserve plus bounded package/build headroom required');
  fs.mkdirSync(dir+'/packages',{recursive:true});for(const[n,b]of Object.entries(payloads))fs.writeFileSync(dir+'/packages/'+n,b);
  if(!retained)fs.writeFileSync(dir+'/inputs.json',JSON.stringify(lock,null,2)+'\n',{flag:'wx'});
  const restore=base.Config.User?'USER '+base.Config.User+'\n':'';
  const install=s.manager==='apk'?'apk add --no-network /tmp/utilibre-php-packages/*.apk':'DEBIAN_FRONTEND=noninteractive dpkg --force-confold --install /tmp/utilibre-php-packages/*.deb && test -z "$(dpkg --audit)"';
  const file=`FROM ${s.base}\n${base.Config.User?'USER 0\n':''}COPY packages/ /tmp/utilibre-php-packages/\nRUN ${install} && rm -r /tmp/utilibre-php-packages\n${restore}`;
  fs.writeFileSync(dir+'/Dockerfile',file);fs.writeFileSync(scratch+'/Dockerfile',file);
  run('docker',['build','--network','none','--pull=false','--memory','512m','--cpu-period','100000','--cpu-quota','100000','-t',candidate(s),scratch],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
  const next=inspect(candidate(s));assert.deepEqual(next.Config,base.Config,'Runtime image configuration changed');
  const after=packages(s,next.Id);verifyPackageDelta(s,before,after,chosen);
  assert.equal(appHash(s,next.Id),sourceHash,'Application or existing configuration changed');
  const normalAfter=JSON.parse(native(next.Id,s.php,['-r',check]));assert.equal(normalAfter.version,s.version.split('-')[0]);assert.deepEqual({...normalAfter,version:undefined},{...normalBefore,version:undefined});
  const receipt={date:new Date().toISOString(),...s,candidate:candidate(s),imageId:next.Id,advisories,packages:chosen,packageHashes:hashes,normalBefore,normalAfter,applicationHash:sourceHash,configurationUnchanged:true,applicationUnchanged:true,unrelatedPackagesUnchanged:true,passed:true,deployed:false,limitations:['Native runtime checks are not an exploit test or a complete application workflow. Application checks and release approval are separate.']};
  fs.writeFileSync(dir+'/build.json',JSON.stringify(receipt,null,2)+'\n');console.log(key+': candidate '+normalAfter.version+'; application/configuration/unrelated packages unchanged');
 }finally{assert(scratch.startsWith('/tmp/utilibre-php-packages-'));fs.rmSync(scratch,{recursive:true,force:true});}
}
