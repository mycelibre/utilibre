// Read-only native Composer gate for the reviewed release image. No app start,
// production mounts, account credentials, scripts, or automatic image updates.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
const image='wallabag/wallabag@sha256:4a527e027e0d59e87c14225ef11e005af3d4890374202ad319ce5e63dfc66709';
const run=spawnSync('docker',['run','--rm','--pull=never','--read-only',
  '--memory=512m','--cpus=1','--cap-drop=ALL','--security-opt=no-new-privileges',
  '--user','65534:65534','--tmpfs','/tmp:rw,nosuid,nodev,size=128m',
  '-e','COMPOSER_HOME=/tmp/composer','--entrypoint','php',image,
  '/usr/local/bin/composer','audit','--locked','--no-dev','--format=json'],
  {encoding:'utf8',timeout:90000,maxBuffer:4*1024*1024});
assert(!run.error && [0,1,2,3].includes(run.status),'Native audit unavailable; release remains blocked');
const result=JSON.parse(run.stdout);
assert(result.advisories && typeof result.advisories==='object','Invalid audit response');
const packages=Object.entries(result.advisories).map(([name,entries])=>({name,
  advisories:Object.values(entries).map(a=>({id:a.advisoryId,title:a.title,
    affected:a.affectedVersions,link:a.link,severity:a.severity}))}));
const report={checkedAt:new Date().toISOString(),release:'2.6.14',image,
  advisoryCount:packages.reduce((n,p)=>n+p.advisories.length,0),affectedPackages:packages.length,
  packages,abandonedPackages:Object.keys(result.abandoned||{}),
  status:packages.length?'BLOCKED':'Dependency check passed; privacy and functional release gates still required'};
if(process.argv[2]) await writeFile(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({release:report.release,status:report.status,
  advisoryCount:report.advisoryCount,affectedPackages:report.affectedPackages}));
process.exitCode=packages.length?1:0;
