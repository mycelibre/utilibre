// Consistent account snapshots, restore rehearsals and interrupted-run recovery.
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync, unlinkSync, statfsSync} from 'node:fs';
const root='/home/ubuntu/freetools';
const statePath='/run/utilibre-account-backup-state.json';
const stacks={identity:['server','worker'],expanded:['resume','penpot-frontend','penpot-backend','penpot-admin-console','penpot-exporter','actual','wakapi']};
const compose=name=>['compose','--env-file',`${root}/deployment/${name}/.env`,'-f',`${root}/deployment/${name}/compose.yaml`];
function recover(){
  if(!existsSync(statePath))return;
  const state=JSON.parse(readFileSync(statePath,'utf8'));
  for(const [name,services] of Object.entries(state)){
    if(!Object.hasOwn(stacks,name)||!Array.isArray(services)||services.some(s=>!stacks[name].includes(s)))throw Error('Invalid backup recovery state');
    if(services.length)execFileSync('docker',[...compose(name),'start',...services],{stdio:['ignore','ignore','pipe'],timeout:120000});
  }
  unlinkSync(statePath);
}
if(process.argv.includes('--recover')){recover();process.exit(0)}
try{
const disk=statfsSync('/opt/utilibre');
if(disk.bavail*disk.bsize<5*1024**3)throw Error('Less than 5 GiB free for account backup');
recover();
const running=Object.fromEntries(Object.keys(stacks).map(name=>[name,execFileSync('docker',[...compose(name),'ps','--status','running','--services'],{encoding:'utf8'}).trim().split('\n').filter(s=>stacks[name].includes(s))]));
writeFileSync(statePath,JSON.stringify(running),{flag:'wx',mode:0o600});
  for(const name of Object.keys(stacks)){
    const output=execFileSync(process.execPath,[`${root}/deployment/${name}/backup.mjs`],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:300000});
    const match=output.match(new RegExp(`/opt/utilibre/${name}-backups/[0-9TZ-]+`));
    if(!match)throw Error(`No ${name} snapshot returned`);
    execFileSync(process.execPath,[`${root}/deployment/${name}/verify-backup.mjs`,match[0]],{stdio:'inherit',timeout:180000});
    console.log(`Verified ${name} snapshot: ${match[0]}`);
  }
  recover();
  console.log('Scheduled account backups verified. Storage remains on this VM.');
}catch(error){
  try{recover()}catch{console.error('Account-service restart requires operator attention; recovery state retained.')}
  spawnSync('python3',['-c',`import smtplib,ssl,socket
from email.message import EmailMessage
class Relay(smtplib.SMTP):
 def _get_socket(self,host,port,timeout):
  return socket.create_connection(('10.10.1.20',port),timeout)
m=EmailMessage();m['From']='no-reply@utilibre.org';m['To']='admin@utilibre.org';m['Subject']='Utilibre account backup failed'
m.set_content('An identity/account snapshot or restore check failed. Inspect utilibre-account-backup.service. Existing backups were retained. No private data is included in this email.')
with Relay('mx.mailgt.dev',26,timeout=15) as s:
 s.starttls(context=ssl.create_default_context());s.send_message(m)
`],{stdio:'ignore',timeout:20000});
  console.error(`Account backup failed (${error.code||'operation error'}); inspect service status and retained snapshots.`);
  process.exitCode=1;
}
