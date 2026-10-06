// Preserve operator settings, accounts, existing monitors and public groups.
// Add only verified launches; the private candidate readers are not included.
import { readFileSync, mkdirSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
const credentials = JSON.parse(readFileSync(new URL('../../secrets/uptime-kuma-admin.json', import.meta.url), 'utf8'));
const backup = `/opt/utilibre/community-backups/kuma-before-monitor-update-${Date.now()}`;
mkdirSync(backup, { mode: 0o700 });
execFileSync('python3', ['-c', `import sqlite3,sys,os
os.umask(0o077)
src=sqlite3.connect('file:/opt/utilibre/community-data/kuma/kuma.db?mode=ro',uri=True)
dst=sqlite3.connect(sys.argv[1]);src.backup(dst)
assert dst.execute('PRAGMA integrity_check').fetchall()==[('ok',)]
dst.close();src.close()`, `${backup}/kuma.sqlite`]);
const additions = [
  ['Redlib gateway', 'https://redlib.utilibre.org/'],
  ['JupyterLite', 'https://python.utilibre.org/'],
  ['Whisper Web', 'https://transcribe.utilibre.org/'],
  ['Wakapi', 'https://wakapi.utilibre.org/'],
  ['Reactive Resume', 'https://cv.utilibre.org/'],
  ['Penpot', 'https://design.utilibre.org/'],
  ['Actual Budget', 'https://budget.utilibre.org/'],
  ['Rallly', 'https://poll.utilibre.org/'],
  ['Priviblur', 'https://tumblr.utilibre.org/'],
  ['Mezzo', 'https://tenor.utilibre.org/'],
  ['FMD Server', 'https://fmd.utilibre.org/'],
  ['Pollaris', 'https://pollaris.utilibre.org/'],
  ['Utilibre login', 'https://auth.utilibre.org/'],
  ['GotHub', 'https://gothub.utilibre.org/'],
  ['TransLite', 'https://translate.utilibre.org/'],
  ['BiblioReads', 'https://biblioreads.utilibre.org/'],
  ['4get', 'https://4get.utilibre.org/'],
  ['AnonymousOverflow', 'https://overflow.utilibre.org/'],
  ['SafeTwitch', 'https://twitch.utilibre.org/'],
];
const program = `
const {io}=require('socket.io-client');
const socket=io('http://127.0.0.1:3001',{transports:['websocket']});
const call=(name,...args)=>new Promise((resolve,reject)=>socket.timeout(15000).emit(name,...args,(err,r)=>err?reject(Error(name+' timed out')):r?.ok===false?reject(Error(name+' failed')):resolve(r)));
const deadline=setTimeout(()=>process.exit(1),60000);
socket.on('connect',async()=>{try{
  await call('login',${JSON.stringify(credentials)});
  const current=await new Promise(resolve=>{socket.once('monitorList',resolve);socket.emit('getMonitorList')});
  const monitors=Object.values(current||{});
  const search=monitors.find(m=>m.url==='https://search.utilibre.org/'||m.url==='https://search.utilibre.org/healthz');
  if(!search)throw Error('Expected SearXNG monitor missing');
  await call('editMonitor',{...search,name:'SearXNG health · HTTPS via private edge',url:'https://search.utilibre.org/healthz',ignoreTls:false,accepted_statuscodes:['200-299']});
  const publicPage=await(await fetch('http://127.0.0.1:3001/api/status-page/utilibre')).json();
  const groups=publicPage.publicGroupList;
  if(!Array.isArray(groups)||!groups.length)throw Error('Existing public groups missing');
  const config=(await call('getStatusPage','utilibre')).config;
  let extra=groups.find(g=>g.name==='Additional services');
  if(!extra){extra={name:'Additional services',monitorList:[]};groups.push(extra)}
  for(const [name,url] of ${JSON.stringify(additions)}){
    const prior=monitors.find(m=>m.url===url);
    const id=prior?.id??(await call('add',{name,url,type:'http',method:'GET',interval:300,retryInterval:60,resendInterval:0,maxretries:2,timeout:20,active:true,accepted_statuscodes:['200-299'],maxredirects:5,ignoreTls:false,upsideDown:false,notificationIDList:{},conditions:[]})).monitorID;
    if(!groups.some(g=>g.monitorList.some(m=>m.id===id)))extra.monitorList.push({id,sendUrl:false});
  }
  config.description='HTTPS availability checks every five minutes from the application VM. SearXNG uses its /healthz endpoint through the private Caddy edge. These are not full workflow tests or independent outage monitoring. / Comprobaciones HTTPS cada cinco minutos desde la VM de aplicaciones. SearXNG usa /healthz a través del servidor Caddy privado. No son pruebas de uso completas ni monitoreo independiente de caídas.';
  await call('saveStatusPage','utilibre',config,config.icon||'',groups);
  console.log('Status page updated: verified public services reconciled; SearXNG private-edge liveness labeled; existing settings/history preserved.');
  clearTimeout(deadline);socket.disconnect();process.exit(0);
}catch(e){console.error(e.message);socket.disconnect();process.exit(1)}});
`;
const result=spawnSync('docker',['exec','-i','utilibre-community-uptime-kuma-1','node','-'],{input:program,encoding:'utf8',timeout:65000});
process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
if(result.error)console.error('Monitor update did not finish; the pre-update SQLite backup is retained.');
process.exit(result.status??1);
