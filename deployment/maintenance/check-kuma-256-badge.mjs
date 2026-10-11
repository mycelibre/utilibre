// Reuse only the successfully tested, polling-disabled disposable SQLite copy.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const root = '/var/lib/utilibre-maintenance/kuma-256-20261011';
const proof = JSON.parse(fs.readFileSync(`${root}/result.json`, 'utf8'));
const candidate = 'utilibre-kuma:2.5.6-security-20261011';
assert.equal(proof.status, 'passed');
assert.equal(proof.candidate, candidate);
assert.equal(proof.applicationVersion, '2.5.6');
assert.match(proof.backup, /^\/var\/lib\/utilibre-maintenance\/kuma-256-20261011\/before-\d+\.db$/);
const stage = proof.backup.replace('/before-', '/stage-').replace(/\.db$/, '');
assert(fs.statSync(`${stage}/kuma.db`).isFile());
execFileSync('python3', ['-c', 'import sqlite3,sys; db=sqlite3.connect("file:"+sys.argv[1]+"?mode=ro",uri=True); assert db.execute("select count(*) from monitor where active != 0").fetchone()[0] == 0', `${stage}/kuma.db`]);
const name = 'maintenance-kuma-256-badge';
let started = false;
try {
  execFileSync('docker', ['run','-d','--name',name,'--network','none','--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','512m','--cpus','1','--log-driver','none','-e','UPTIME_KUMA_DB_TYPE=sqlite','-v',`${stage}:/app/data`,candidate], {stdio:'pipe'});
  started = true;
  const result = execFileSync('docker', ['exec',name,'node','-e', String.raw`
    const assert=require('node:assert/strict');
    let phase='status';
    (async()=>{
      let page;
      for(let attempt=0;attempt<30;attempt++) {
        try{const r=await fetch('http://127.0.0.1:3001/api/status-page/utilibre');if(r.ok){page=await r.json();break;}}catch{}
        await new Promise(resolve=>setTimeout(resolve,1000));
      }
      const id=page?.publicGroupList?.flatMap(group=>group.monitorList||[])[0]?.id;
      assert(Number.isInteger(id),'Native public monitor was not present');phase='public-badge';
      const response=await fetch('http://127.0.0.1:3001/api/badge/'+id+'/avg-response/24');
      assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/image\/svg\+xml/);
      assert.match(await response.text(),/<svg/);
      phase='missing-badge';const missing=await fetch('http://127.0.0.1:3001/api/badge/999999999/avg-response/24');
      assert.equal(missing.status,200);assert.match(await missing.text(),/N\/A/);
      phase='invalid-badge';const invalid=await fetch('http://127.0.0.1:3001/api/badge/invalid/avg-response/24');
      assert.equal(invalid.status,403); // Upstream sendHttpError uses 403.
      console.log(JSON.stringify({publicAverageResponseBadge:'passed',unknownMonitorNotDisclosed:'passed',invalidMonitorRejected:'passed'}));
    })().catch(e=>{console.error('Native badge regression gate failed: '+phase+' '+e.code+' '+(typeof e.actual==='number'?e.actual:''));process.exitCode=1});
  `], {encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:45000});
  const record={date:new Date().toISOString(),status:'passed',candidate,...JSON.parse(result),network:'none',liveDataChanged:false};
  fs.writeFileSync(`${root}/badge-result.json`,JSON.stringify(record,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify(record));
} finally {
  if(started)execFileSync('docker',['rm','-f',name],{stdio:'pipe'});
}
