import assert from 'node:assert/strict';
import fs from 'node:fs';
// Aggregate allocation-socket count only. Do not retain peer/network records.
export function boundRelaySockets(tables,min,max,owners){
 assert(Number.isInteger(min)&&Number.isInteger(max)&&min>0&&max<=65535&&min<=max);
 if(owners!==undefined)assert(owners instanceof Set&&owners.size>0&&[...owners].every(n=>/^[1-9][0-9]*$/.test(n)));
 let count=0;
 for(const text of tables){
  const lines=text.trim().split('\n');assert(lines[0].includes('local_address'));
  for(const line of lines.slice(1)){
   const f=line.trim().split(/\s+/);assert(f.length>=10&&/^[0-9A-F]+:[0-9A-F]{4}$/i.test(f[1]));
   assert(/^[0-9]+$/.test(f[9]));
   const port=parseInt(f[1].split(':')[1],16);if(port>=min&&port<=max&&(owners===undefined||owners.has(f[9])))count++;
  }
 }
 return count;
}

// Coturn shares the host network here. Port range alone also counts unrelated
// applications' ephemeral sockets. Attribute sockets to this exact process;
// retain only the aggregate count, never addresses, descriptors or peers.
export function ownedRelaySocketCount(pid,min,max){
 assert(Number.isSafeInteger(pid)&&pid>1);
 const base='/proc/'+pid;
 const identity=()=>{
  assert.equal(fs.readFileSync(base+'/comm','utf8').trim(),'turnserver');
  const stat=fs.readFileSync(base+'/stat','utf8');return stat.slice(stat.lastIndexOf(')')+2).split(/\s+/)[19];
 };
 const start=identity();assert(/^[0-9]+$/.test(start));
 const sockets=()=>{
  const values=new Set();
  for(const tid of fs.readdirSync(base+'/task')){
   assert(/^[0-9]+$/.test(tid));
   const task=base+'/task/'+tid;
   assert.equal(fs.readFileSync(task+'/children','utf8').trim(),'','Unreviewed relay subprocess');
   for(const fd of fs.readdirSync(task+'/fd')){
    let link;try{link=fs.readlinkSync(task+'/fd/'+fd);}catch(e){if(e.code==='ENOENT')continue;throw e;}
    const match=/^socket:\[([1-9][0-9]*)\]$/.exec(link);if(match)values.add(match[1]);
   }
  }
  return values;
 };
 const before=sockets();
 const tables=['udp','udp6','tcp','tcp6'].map(t=>fs.readFileSync(base+'/net/'+t,'utf8'));
 assert.deepEqual(sockets(),before,'Relay socket ownership changed during idle check');
 assert.equal(identity(),start,'Relay process changed during idle check');
 return boundRelaySockets(tables,min,max,before);
}
