import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const dir='/var/lib/utilibre-maintenance/gathio-20261011';await mkdir(dir,{recursive:true,mode:0o700});
const script=(await readFile('deployment/calendar/check-gathio-native.mjs','utf8'));
// Native synthetic create/view/ICS, then remove only the generated fixture.
const cleanup=`
const cleanup=await fetch(base+'/deleteevent/'+fixture.eventID+'/'+fixture.editToken,{method:'POST',redirect:'manual'});
assert.equal(cleanup.status,302,'Synthetic deletion failed; fixture retained privately in /tmp/gathio-fixture.json');
assert.equal((await fetch(base+'/'+fixture.eventID)).status,404);
console.log(JSON.stringify({nativeDelete:true,syntheticEventAbsent:true}));`;
const result=execFileSync('docker',['exec','-i','utilibre-gathio-gathio-1','node','--input-type=module'],{input:script+cleanup,encoding:'utf8',timeout:30000});
const response=await fetch('https://events.utilibre.org/',{signal:AbortSignal.timeout(15000)});
if(!response.ok||!(await response.text()).includes('Utilibre'))throw Error('Public Gathio homepage failed');
const report={date:new Date().toISOString(),status:'passed',checks:result.trim().split('\n').map(JSON.parse),publicHttps:true,scope:'Only a newly generated fictional event; no existing event inspected or changed.'};
await writeFile(dir+'/live.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(report));
