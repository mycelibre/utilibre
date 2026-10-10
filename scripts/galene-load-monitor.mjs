// Root-only aggregate telemetry during an explicitly scheduled media test.
import {readFileSync,appendFileSync,mkdirSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {hostSnapshot,containerInventory,containerSnapshots,containerMetrics} from './performance-monitor.mjs';
const directory=process.argv[2];
if (!/^\/opt\/utilibre\/reports\/galene-load-[a-zA-Z0-9-]+$/.test(directory||'')) throw Error('Expected private load report directory');
mkdirSync(directory,{recursive:true,mode:0o700});
const names=['utilibre-pack-galene-galene-1','utilibre-galene-turn-turn-1','public-utility-portal-1'];
function net(path) {
  const line=readFileSync(path,'utf8').split('\n').find(l=>/^\s*eth0:/.test(l));
  const fields=line.trim().split(/\s+/).slice(1).map(Number);
  return {rx:fields[0],tx:fields[8],rxDrop:fields[3],txDrop:fields[11]};
}
function ports(pid,uid,min,max) {
  const lines=readFileSync(`/proc/${pid}/net/udp`,'utf8').trim().split('\n').slice(1);
  return lines.filter(l=>{const f=l.trim().split(/\s+/),p=parseInt(f[1].split(':')[1],16);return Number(f[7])===uid&&p>=min&&p<=max}).length;
}
let previous,pressure=0;
function cancel(reason) {
  console.error('Stopping the external load: '+reason);
  const manifest=JSON.parse(readFileSync(directory+'/run.json','utf8'));
  if(manifest.runId)execFileSync('gh',['run','cancel',String(manifest.runId),'-R','mycelibre/utilibre'],{stdio:'ignore'});
  appendFileSync(directory+'/server.jsonl',JSON.stringify({at:Date.now(),stopped:reason})+'\n');
  process.exitCode=1;
}
try {
for(let n=0;n<900&&!existsSync(directory+'/stop');n++) {
  const inventory=containerInventory().filter(c=>names.includes(c.name));
  const host=hostSnapshot(), containers=containerSnapshots(inventory), network=net('/proc/net/dev');
  const galene=inventory.find(c=>c.name===names[0]), turn=inventory.find(c=>c.name===names[1]);
  const mediaNet=net(`/proc/${galene.pid}/net/dev`);
  const now={at:Date.now(),host,containers,network,mediaNet};
  const seconds=previous?(now.at-previous.at)/1000:0;
  const sample={at:now.at,hostCpu:previous?100*(1-(host.cpuIdle-previous.host.cpuIdle)/(host.cpuTotal-previous.host.cpuTotal)):null,
    availableMiB:host.availableMiB,containers:containers.map(c=>containerMetrics(c,previous?.containers.find(p=>p.name===c.name),seconds)),
    relaySockets:ports(turn.pid,4004,49160,49671),sfuSockets:ports(galene.pid,4003,47800,48311),
    network:previous?Object.fromEntries(['rx','tx'].map(k=>[k+'Mbps',8*(network[k]-previous.network[k])/seconds/1e6])):null,
    media:previous?Object.fromEntries(['rx','tx'].map(k=>[k+'Mbps',8*(mediaNet[k]-previous.mediaNet[k])/seconds/1e6])):null,
    dropped:previous?{rx:network.rxDrop-previous.network.rxDrop,tx:network.txDrop-previous.network.txDrop}:null};
  appendFileSync(directory+'/server.jsonl',JSON.stringify(sample)+'\n',{mode:0o600});
  const unsafe=sample.hostCpu>85||host.availableMiB<5120||sample.containers.some(c=>c.memoryPercent>=90||c.oomDelta>0||c.restartDelta>0||c.unavailable);
  pressure=unsafe?pressure+1:0;
  if(pressure>=3) {
    cancel('repeated server resource pressure');break;
  }
  previous=now;
  await new Promise(r=>setTimeout(r,2000));
}
} catch { cancel('server telemetry unavailable'); }
