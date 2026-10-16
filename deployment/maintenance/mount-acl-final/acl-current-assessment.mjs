// Read-only exposure inventory. Never turns hardening or CLI absence into a
// waiver of the legacy library API defect. No files/user mounts are traversed.
import fs from 'node:fs';import path from 'node:path';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {freshScan} from '../review-native-backports.mjs';
process.umask(0o077);const [out]=process.argv.slice(2);assert(process.argv.length===3&&path.isAbsolute(out));assert(!fs.existsSync(out));
const run=(cmd,args,input)=>cp.execFileSync(cmd,args,{encoding:'utf8',input,timeout:20000,maxBuffer:1024**2,stdio:['pipe','pipe','pipe']}).trim();
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const scan=read('/var/lib/utilibre-maintenance/security.json'),queue=read('/var/lib/utilibre-maintenance/security-queue.json');freshScan(queue,scan);
const script=`set -eu
dpkg-query -W -f='version=\${Version}\\n' libacl1
dpkg-query -L libacl1 | while IFS= read -r p; do
 case "$p" in */libacl.so.*) if test -f "$p" && ! test -L "$p"; then sha256sum "$p"; fi;; esac
done
for p in tar rsync acl; do
 dpkg-query -W -f='consumer=\${Package}|\${Version}|\${Status}\\n' "$p" 2>/dev/null || true
done
`;
const rows=[];
for(const i of queue.items.filter(i=>i.status==='needs-review'&&i.id==='CVE-2026-54369'&&i.package==='libacl1')){
 const locations=[];
 for(const name of i.scope==='host-os'?['host-dpkg']:i.containers){
  try{
   let boundary={host:true};
   if(name!=='host-dpkg'){
    const [s]=JSON.parse(run('docker',['inspect','--format','[{"image":{{json .Image}},"running":{{json .State.Running}},"user":{{json .Config.User}},"privileged":{{json .HostConfig.Privileged}},"readonly":{{json .HostConfig.ReadonlyRootfs}},"capDrop":{{json .HostConfig.CapDrop}},"capAdd":{{json .HostConfig.CapAdd}},"securityOpt":{{json .HostConfig.SecurityOpt}}}]',name]));assert.equal(s.image,i.artifact);assert(s.running);boundary=s;
   }
   const output=name==='host-dpkg'?run('sh',['-s'],script):run('docker',['exec','-i',name,'sh','-s'],script);
   assert(output.includes('version='+i.installed+'\n'));assert(/^[a-f0-9]{64}\s+.*libacl\.so\./m.test(output));
   locations.push({name,boundary,output});
  }catch(e){locations.push({name,status:'unverified',error:String(e.message).split('\n')[0].slice(0,150)})}
 }
 rows.push({key:i.key,artifact:i.artifact,installed:i.installed,locations,decision:'unresolved-caller-migration',reason:'Legacy acl_*_file behavior is retained upstream; library replacement alone is insufficient. Hardening is context, not proof that a vulnerable caller is unreachable.'});
}
const prior='/var/lib/utilibre-maintenance/mount-acl-final-20261012/acl-caller-boundary.json';
const report={date:new Date().toISOString(),scanDate:scan.completedAt,cve:'CVE-2026-54369',primary:'https://security-tracker.debian.org/tracker/CVE-2026-54369',priorNativeBoundary:{file:prior,sha256:sha(fs.readFileSync(prior)),historicalNotRerun:true},rows,productionChanged:false,decisions:[]};
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({records:rows.length,locations:rows.reduce((n,r)=>n+r.locations.length,0),unverified:rows.flatMap(r=>r.locations).filter(r=>r.status==='unverified').length,closed:0,productionChanged:false}));
