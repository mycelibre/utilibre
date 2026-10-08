// Private synthetic test only. Report event types, never payloads/identifiers.
import {spawn} from 'node:child_process';
const p=spawn('docker',['attach','--no-stdin','--sig-proxy=false','utilibre-pack-cryptpad-cryptpad-1']);
let buf='';const report=data=>{buf+=data;const rows=buf.split('\n');buf=rows.pop();for(const row of rows){try{const x=JSON.parse(row);if(Array.isArray(x))console.log(JSON.stringify([x[0],x[2],x[3]]));else console.log(JSON.stringify({level:x.level,tag:x.tag}))}catch{}}};
p.stdout.on('data',report);p.stderr.on('data',report);setTimeout(()=>p.kill('SIGKILL'),25000);
