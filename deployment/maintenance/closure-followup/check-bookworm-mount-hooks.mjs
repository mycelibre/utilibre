// Bounded legacy-code attribution, NOT a privileged mount exploit test.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {freshScan} from '../review-native-backports.mjs';
import {bookwormHookCase,repairedVersion,repairedBookwormEvidence,legacyAbsence} from './mount-component-policy.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',here=new URL('.',import.meta.url).pathname;
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:45000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const source=dir+'/sources/util-linux-2.38.1/libmount/src',sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p)),scan=read('/var/lib/utilibre-maintenance/security.json'),q=read('/var/lib/utilibre-maintenance/security-queue.json');freshScan(q,scan);assert.equal(scan.status,'checked');
const items=q.items.filter(i=>bookwormHookCase(i)&&i.package==='libmount1'&&i.id==='CVE-2026-76642');assert.equal(items.length,8);
// Validate completed release, actual repaired source and packages before any fixture runs.
const repairedProofs=items.filter(i=>i.installed===repairedVersion).map(i=>repairedBookwormEvidence(i,scan));
const pins={'context_mount.c':'09ded04a551e96ae05faca35bf9d56c995ecd7a77efc76f7d785ba6d358862dc','context.c':'b4bd89b9bdb8e52e8bd9ca79c00139f703fb646256866cc19527bda09d09b4f0'};
for(const [file,hash]of Object.entries(pins))assert.equal(sha(fs.readFileSync(source+'/'+file)),hash);
legacyAbsence(Object.fromEntries(fs.readdirSync(source).filter(f=>/\.(?:c|h)$/.test(f)).map(f=>[f,fs.readFileSync(source+'/'+f,'utf8')])));
const temp=fs.mkdtempSync('/dev/shm/utilibre-mount-legacy-'),out=dir+'/bookworm-mount-hooks';fs.mkdirSync(out,{recursive:true});
try{
 run('dpkg-deb',['-x',dir+'/util-linux-trixie/libmount-dev_2.41.5-0+deb13u1+utilibre2_amd64.deb',temp]);
 run('cc',['-Wall','-Wextra','-Werror','-O2','-I'+temp+'/usr/include',here+'mount-helper-regression.c','-l:libmount.so.1','-o',out+'/probe']);
 assert(!/GLIBC_2\.(?:3[7-9]|[4-9][0-9])\b/.test(run('readelf',['--version-info',out+'/probe'])),'Fixture must load on Bookworm');
 const rows=[];
 const controls=[...items.map(i=>({artifact:i.artifact,containers:i.containers,version:i.installed,legacy:true})),{artifact:JSON.parse(fs.readFileSync(dir+'/util-linux-release.json')).groups.flatMap(g=>g.rows).find(r=>r.name==='utilibre-expanded-ittools-1')?.newImage,containers:[],legacy:false}];
 // Use an exact already-verified stable image as the positive hook control.
 if(!controls.at(-1).artifact){const r=JSON.parse(fs.readFileSync(dir+'/util-linux-release.json'));controls.at(-1).artifact=r.groups.flatMap(g=>g.rows).find(r=>r.key!=='namespace-companion').newImage;}
 for(const item of controls){
  for(const name of item.containers){
   assert.equal(run('docker',['inspect',name,'--format','{{.Image}}']),item.artifact);
   assert.equal(run('docker',['exec',name,'dpkg-query','-W','-f=${Version}','libmount1']),item.version);
   if(item.version===repairedVersion){const proof=repairedProofs.find(p=>p.artifact===item.artifact&&p.container===name);assert(proof);assert.equal(run('docker',['exec',name,'sha256sum',proof.libraryPath]).split(/\s+/)[0],proof.librarySha256);}
  }
  for(const status of ['1','0']){
   const output=run('docker',['run','--rm','--network','none','--read-only','--user','0','--cpus','0.5','--memory','128m','--pids-limit','32','--cap-drop','ALL','--security-opt','no-new-privileges','--ulimit','core=0','--log-driver','none','--tmpfs','/tmp:rw,size=8m,mode=1777','--tmpfs','/run:rw,size=8m','--mount','type=bind,src='+out+'/probe,dst=/fixture,readonly','--mount','type=bind,src='+here+'mount.utilibrefixture,dst=/sbin/mount.utilibrefixture,readonly','--entrypoint','/fixture',item.artifact,status,...(item.legacy?['legacy']:[])]);
   assert(output.includes('mode='+(item.legacy||status==='1'?'755':'700')));rows.push({...item,helperExit:Number(status),passed:true});
  }
 }
 assert.equal(read('/var/lib/utilibre-maintenance/security.json').completedAt,scan.completedAt,'Scan changed during proof');
 const report={date:new Date().toISOString(),scanDate:scan.completedAt,passed:true,sourcePins:pins,repairedProofs,probeSha256:sha(fs.readFileSync(out+'/probe')),rows,limitations:'No real mount, CAP_SYS_ADMIN, SUID exploitation or privilege escalation. Checks absent owner/idmap hooks and existing helper-failure behavior in the exact original or repaired 2.38 packages. CVE-2026-53613 is a separate target-path defect; the +utilibre1 repair has its own source, regression and release review, not an absence waiver here.'};
 fs.writeFileSync(out+'/proof.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,checks:rows.length,legacyImages:items.length,positiveControl:true}));
}finally{fs.rmSync(temp,{recursive:true});}
