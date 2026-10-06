// Operator-only bootstrap. Generated credentials stay in the ignored secrets
// directory, never in command arguments, public files, logs, or source control.
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const credentialsFile = new URL('../../secrets/uptime-kuma-admin.json', import.meta.url);
mkdirSync(new URL('../../secrets/', import.meta.url), { recursive: true, mode: 0o700 });
const credentials = existsSync(credentialsFile)
  ? JSON.parse(readFileSync(credentialsFile, 'utf8'))
  : { username: 'utilibre-admin', password: randomBytes(32).toString('base64url') };
if (!existsSync(credentialsFile)) writeFileSync(credentialsFile, JSON.stringify(credentials) + '\n', { mode: 0o600, flag: 'wx' });
const monitors = [
  ['Utilibre', 'https://utilibre.org/en/'],
  ['SearXNG', 'https://search.utilibre.org/'],
  ['FreshRSS', 'https://rss.utilibre.org/i/'],
  ['PrivateBin', 'https://paste.utilibre.org/'],
  ['PDF / OCR', 'https://pdf.utilibre.org/'],
  ['VERT', 'https://convert.utilibre.org/'],
  ['OmniTools', 'https://tools.utilibre.org/'],
  ['IT Tools', 'https://dev.utilibre.org/'],
  ['hat.sh', 'https://hat.utilibre.org/'],
  ['draw.io', 'https://draw.utilibre.org/'],
  ['Mini QR', 'https://qr.utilibre.org/'],
  ['RSS-Bridge', 'https://bridge.utilibre.org/'],
  ['ntfy', 'https://notify.utilibre.org/v1/health'],
  ['Yopass', 'https://secret.utilibre.org/'],
  ['PairDrop', 'https://drop.utilibre.org/'],
];
const program = `
const {io}=require('socket.io-client');
const credentials=${JSON.stringify(credentials)};
const monitors=${JSON.stringify(monitors)};
const socket=io('http://127.0.0.1:3001',{transports:['websocket']});
const call=(name,...args)=>new Promise((resolve,reject)=>socket.timeout(15000).emit(name,...args,(error,result)=>error?reject(Error(name+': '+error.message)):result?.ok===false?reject(Error(name+': '+result.msg)):resolve(result)));
const timeout=setTimeout(()=>{console.error('Bootstrap timed out');process.exit(1)},60000);
socket.on('connect',async()=>{try{
  if(await call('needSetup')) await call('setup',credentials.username,credentials.password);
  await call('login',credentials);
  const current=await new Promise(resolve=>{socket.once('monitorList',resolve);socket.emit('getMonitorList');});
  const existing=Object.values(current??{});
  const monitorList=[];
  for(const [name,url]of monitors){
    const prior=existing.find(m=>m.name===name&&m.url===url);
    const id=prior?.id??(await call('add',{name,url,type:'http',method:'GET',interval:300,retryInterval:60,resendInterval:0,maxretries:2,timeout:20,active:true,accepted_statuscodes:['200-299'],maxredirects:5,ignoreTls:false,upsideDown:false,notificationIDList:{},conditions:[]})).monitorID;
    monitorList.push({id,sendUrl:false});
  }
  const page=await fetch('http://127.0.0.1:3001/api/status-page/utilibre');
  if(!page.ok) await call('addStatusPage','Utilibre','utilibre');
  await call('saveStatusPage','utilibre',{slug:'utilibre',title:'Utilibre',description:'Public HTTPS checks every five minutes. This monitor runs on the application VM and cannot independently report a complete VM outage. / Comprobaciones HTTPS cada cinco minutos; este monitor no es independiente de la VM de aplicaciones.',theme:'auto',autoRefreshInterval:300,showTags:false,footerText:'No uptime guarantee. Status history starts with this deployment.',customCSS:'',showPoweredBy:true,showOnlyLastHeartbeat:false,showCertificateExpiry:false,analyticsType:null,analyticsId:'',analyticsScriptUrl:'',domainNameList:[],rssTitle:'Utilibre status'},'', [{name:'Public services',monitorList}]);
  const settings=await call('getSettings');
  await call('setSettings',{...(settings.data??{}),keepDataPeriodDays:30},credentials.password);
  console.log('Kuma initialized; public HTTPS monitors configured; admin credentials saved locally.');
  clearTimeout(timeout);socket.disconnect();process.exit(0);
}catch(e){console.error(e.message);socket.disconnect();process.exit(1)}});
`;
const result = spawnSync('docker', ['exec', '-i', 'utilibre-community-uptime-kuma-1', 'node', '-'], { input: program, encoding: 'utf8', timeout: 75000 });
process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
process.exit(result.status ?? 1);
