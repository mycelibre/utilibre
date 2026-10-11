// One-off same-application runtime refresh. No app build or data migration.
import assert from 'node:assert/strict';
import {execFileSync as exec} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
assert.equal(process.argv[2], 'stage', 'Explicit stage argument required; this is a rollout checker, not a CLI help command');
const dir='/var/lib/utilibre-maintenance/final-runtimes-20261011';
mkdirSync(dir,{recursive:true,mode:0o700});
const docker=args=>exec('docker',args,{encoding:'utf8',maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']});
const rows=[
 ['public-utility-portal-1','public-utility-portal:0.1.0-security-20261011','/app'],
 ['utilibre-expanded-jupyterlite-1','utilibre-jupyterlite:0.8.5-p5-nginx1305','/usr/share/nginx/html'],
];
const results=[];
for(const [name,image,path] of rows){
 const old=JSON.parse(docker(['inspect',name]))[0];
 assert.notEqual(old.Config.Image,image,'Candidate already deployed; do not overwrite the pre-release record');
 const hash=ref=>docker(['run','--rm','--network','none','--read-only','--cap-drop','ALL','--memory','128m','--cpus','.5','--entrypoint','sh',ref,'-c',`cd ${path} && find . -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum`]).trim().split(/\s+/)[0];
 const before=hash(old.Image),after=hash(image);assert.match(before,/^[a-f0-9]{64}$/);assert.equal(before,after);
 if(name.includes('jupyter'))docker(['run','--rm','--network','container:'+name,'--volumes-from',name+':ro','--read-only','--tmpfs','/tmp','--user',old.Config.User||'101','--cap-drop','ALL','--entrypoint','nginx',image,'-t']);
 else{
  const stage='utilibre-portal-security-stage';
  assert.equal(docker(['ps','-aq','--filter','name=^/'+stage+'$']).trim(),'');
  try{
   docker(['run','-d','--name',stage,'--log-driver','none','--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=16m','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','512m','--cpus','1','-p','127.0.0.1:33180:8080',...old.Config.Env.flatMap(e=>['-e',e]),image]);
   for(let i=0;i<20;i++){try{const r=await fetch('http://127.0.0.1:33180/en/');if(r.status===200){await r.body.cancel();break;}}catch{}await new Promise(r=>setTimeout(r,500));}
   const output=exec('node',['scripts/check-maintenance-journeys.mjs'],{encoding:'utf8',timeout:180000,maxBuffer:1024**2,env:{...process.env,PORTAL_CHECK_ORIGIN:'http://127.0.0.1:33180',UTILIBRE_JOURNEY_REPORT_DIR:dir+'/portal-stage'}});
   writeFileSync(dir+'/portal-stage.log',output,{mode:0o600});
  }finally{docker(['rm','-f',stage]);}
 }
 results.push({name,oldRef:old.Config.Image,oldImage:old.Image,newRef:image,newImage:JSON.parse(docker(['image','inspect',image]))[0].Id,applicationSha256:before,checks:'exact application bytes; staged native configuration or EN/ES browser journeys'});
 console.log(name+': candidate passed');
}
writeFileSync(dir+'/stage.json',JSON.stringify({date:new Date().toISOString(),results},null,2)+'\n',{mode:0o600});
