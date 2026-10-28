// Actual native CLI encryption/decryption and isolated Valkey retention checks.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes,createHash} from 'node:crypto';
import {writeFile,statfs} from 'node:fs/promises';
const oct28=process.argv[2]==='--oct28';assert(!process.argv[2]||oct28);
const output=oct28?'/var/lib/utilibre-maintenance/security-20261028/go-runtime':'/var/lib/utilibre-maintenance/go-runtime-20261011';
const image=oct28?'utilibre-yopass:go-security-20261028':'utilibre-yopass:14.10.0-go-openssl-security-20261011';
const base=oct28?'utilibre-yopass:14.10.0-go-openssl-security-20261011':'jhaals/yopass:14.10.0@sha256:6c33d9c813f77bae70787e1bce76710840ff654f454998b01f8dacc0a7988fd3';
const name='maintenance-yopass-'+randomBytes(4).toString('hex'),cache=name+'-cache';
const docker=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',timeout:60000,maxBuffer:4*1024**2,stdio:['pipe','pipe','pipe']});
const disk=await statfs(output);assert(disk.bavail*disk.bsize>8*1024**3);
const [old,next]=JSON.parse(docker(['image','inspect',base,image]));
for(const k of ['Cmd','Entrypoint','User','Env','WorkingDir','ExposedPorts','Volumes'])assert.deepEqual(next.Config[k],old.Config[k],k);
const hashes=[];
for(const [i,ref] of [base,image].entries()){
 const id=docker(['create','--name',name+'-assets-'+i,ref]).trim();
 try{const data=execFileSync('docker',['cp',id+':/public','-'],{maxBuffer:64*1024**2});hashes.push(createHash('sha256').update(data).digest('hex'));}
 finally{docker(['rm',id]);}
}assert.equal(hashes[0],hashes[1],'Native browser assets unchanged');
let network=false;const created=[];
try{
 docker(['network','create','--internal',name]);network=true;
 docker(['run','-d','--name',cache,'--network',name,'--network-alias','secret-cache','--cpus','.5','--memory','96m','--pids-limit','64','--log-driver','none','--read-only','--tmpfs','/data:rw,size=8m,uid=999,gid=1000','--user','999:1000','utilibre-valkey:9.1.1-vendor-security-20261011','valkey-server','--save','','--appendonly','no','--maxmemory','64mb','--maxmemory-policy','noeviction','--loglevel','warning']);created.push(cache);
 const command=['--database=redis','--redis=redis://secret-cache:6379/0','--disable-upload','--force-onetime-secrets','--force-expiration=1h','--default-expiry=1h','--max-length=10000','--cors-allow-origin=https://secret.utilibre.org','--privacy-notice-url=https://utilibre.org/en/privacy'];
 docker(['run','-d','--name',name,'--network',name,'--cpus','1','--memory','256m','--pids-limit','96','--log-driver','none','--read-only','--security-opt','no-new-privileges:true',image,...command]);created.push(name);
 const ip=docker(['inspect',name,'--format','{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}']).trim();assert.match(ip,/^(?:172\.(?:1[6-9]|2[0-9]|3[01])|192\.168|10\.\d+)\.\d+\.\d+$/);const origin='http://'+ip+':1337';
 let ready=false;for(let n=0;n<60;n++){try{if((await fetch(origin+'/config',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}assert(ready,'Yopass ready');
 docker(['exec',name,'/yopass-server','--health-check','--database=redis','--redis=redis://secret-cache:6379/0']);
 const plaintext='Fictional Utilibre test — never a real secret.';
 const cli=(args,input)=>docker(['exec','-i',name,'/yopass','--api=http://127.0.0.1:1337','--url=http://127.0.0.1:1337',...args],input);
 const create=()=>{const url=cli(['--expiration=1h','--one-time=true'],plaintext).trim();const parsed=new URL(url);assert.equal(parsed.origin,'http://127.0.0.1:1337');assert.match(parsed.hash,/^#\/s\//);const id=parsed.hash.split('/')[2];assert.match(id,/^[a-zA-Z0-9]{22}$/);return {url,id};};
 const first=create();
 const redis=(...args)=>docker(['exec',cache,'valkey-cli','--raw',...args]).trim();
 const ttl=Number(redis('TTL',first.id));assert(ttl>3500&&ttl<=3600);
 const stored=redis('GET',first.id);assert(!stored.includes(plaintext));assert(stored.includes('BEGIN PGP MESSAGE'));
 assert.equal(cli(['--decrypt',first.url]),plaintext);
 assert.equal((await fetch(origin+'/secret/'+first.id)).status,404);
 assert.equal(redis('EXISTS',first.id),'0');
 const second=create();redis('EXPIRE',second.id,'1');await new Promise(r=>setTimeout(r,1200));assert.equal((await fetch(origin+'/secret/'+second.id)).status,404);
 const request=(body,path='/create/secret')=>fetch(origin+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
 const ciphertext=JSON.parse(stored).message;
 assert.equal((await request({message:ciphertext,one_time:false,expiration:3600})).status,400);
 assert.equal((await request({message:ciphertext,one_time:true,expiration:86400})).status,400);
 assert([400,413].includes((await request({message:'A'.repeat(11000),one_time:true,expiration:3600})).status));
 assert.equal((await request({},'/create/file')).status,404);
 const third=create();const race=await Promise.all([fetch(origin+'/secret/'+third.id),fetch(origin+'/secret/'+third.id)]);assert.deepEqual(race.map(r=>r.status).sort(),[200,404]);
 assert.equal(redis('DBSIZE'),'0');
 const report={status:'passed',date:new Date().toISOString(),deployed:false,image,imageId:next.Id,nativeConfigUnchanged:true,frontendAssetsUnchanged:true,nativeEncryptionAndDecryption:true,burnAfterRead:true,concurrentRetrievalSingleWinner:true,configuredOneHourTtlSeconds:ttl,acceleratedSyntheticExpiry:true,nonOnetimeRejected:true,LongExpiryRejected:true,uploadsDisabled:true,maxLengthEnforced:true,cacheEmptyAfterChecks:true,limits:'Native CLI/API synthetic tests; one-hour TTL measured, not a one-hour wall-clock wait. No real shared secret/cache touched.'};
 await writeFile(output+'/yopass-native.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(report));
}finally{for(const c of created.reverse())docker(['rm','-f',c]);if(network)docker(['network','rm',name]);await writeFile(output+'/yopass-cleanup.json',JSON.stringify({date:new Date().toISOString(),containersRemoved:true,syntheticCacheRemoved:true}));}
