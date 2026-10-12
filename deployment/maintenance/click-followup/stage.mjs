// One signed pure-Python package; no live container or application-data writes.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
export const dir='/var/lib/utilibre-maintenance/click-followup-20261012';
export const spec={container:'utilibre-community-uptime-kuma-1',baseRef:'utilibre-kuma:openssl-dtls-security-20261012',base:'sha256:1b48578a4f658491aca111d9f271f3dc3d14582aa05bf7a1da009dd83890a102',candidate:'utilibre-kuma:click-security-20261012'};
export const packageName='python3-click_8.3.3-3_all.deb',packageHash='b8ce2b18bb602844e05c67d75cff576a91ca7727af2726175dba84536de04d12';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function run(cmd,args,input){try{return cp.execFileSync(cmd,args,{input,encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['pipe','pipe','pipe'],env:{...process.env,DOCKER_BUILDKIT:'0',APP_BIND_IP:'10.10.1.43'}}).trim();}catch(e){fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/command-error.log',String(e.stdout||'')+String(e.stderr||''));throw Error('Bounded maintenance command failed; private diagnostics retained');}}
export const docker=(...a)=>run('docker',a),inspect=n=>JSON.parse(docker('inspect',n))[0];
export const limits=['--rm','--network','none','--hostname','utilibre-click-fixture','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','384m','--pids-limit','64','--log-driver','none','--ulimit','core=0','--tmpfs','/tmp:rw,size=32m,mode=1777'];
const here=new URL('.',import.meta.url).pathname;
if(process.argv[1]===new URL(import.meta.url).pathname){
 fs.mkdirSync(dir+'/packages',{recursive:true});assert(!fs.existsSync(dir+'/build.json'),'Keep completed candidate evidence');
 const lists='/var/lib/utilibre-maintenance/xserver-followup-20261012/apt-lists',prefix=lists+'/deb.debian.org_debian_dists_sid_';
 const temporary=fs.mkdtempSync('/tmp/utilibre-click-signature-');let release;
 try{run('sqv',['--keyring','/usr/share/keyrings/debian-archive-keyring.pgp','--cleartext','--output',temporary+'/verified',prefix+'InRelease']);release=fs.readFileSync(temporary+'/verified','utf8');}
 finally{fs.rmSync(temporary,{recursive:true});}
 const index=fs.readFileSync(prefix+'main_binary-amd64_Packages');
 const line=release.split('\nSHA256:\n')[1]?.split('\n').find(l=>l.trim().endsWith(' main/binary-amd64/Packages'));assert(line);
 const [hash,size]=line.trim().split(/\s+/);assert.equal(sha(index),hash);assert.equal(index.length,Number(size));
 const paragraph=index.toString().split('\n\n').find(p=>p.startsWith('Package: python3-click\n')&&p.includes('\nVersion: 8.3.3-3\n'));assert(paragraph);assert(paragraph.includes('\nSHA256: '+packageHash));
 const url='https://deb.debian.org/debian/pool/main/p/python-click/'+packageName;
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});assert(response.ok);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(sha(bytes),packageHash);assert.equal(bytes.length,107484);fs.writeFileSync(dir+'/packages/'+packageName,bytes);
 assert.equal(inspect(spec.baseRef).Id,spec.base);assert.equal(inspect(spec.container).Image,spec.base);
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
 const before=inspect(spec.base);docker('build','--pull=false','--network=none','--memory','384m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE='+spec.baseRef,'--build-arg','RESTORE_USER='+(before.Config.User||'root'),'-f',here+'../xml-final/Dockerfile','-t',spec.candidate,dir);
 const after=inspect(spec.candidate),norm=c=>({...c,User:['','root','0',undefined].includes(c.User)?'root':c.User});assert.deepEqual(norm(after.Config),norm(before.Config));
 const fingerprint=(im,cmd)=>docker('run',...limits,'--user','0','--entrypoint','sh',im,'-ec',cmd);
 const commands={application:'for d in /app /opt /usr/local; do if test -d "$d"; then find "$d" -type f -exec sha256sum {} +; fi; done | sort | sha256sum',configuration:'find /etc -type f -exec sha256sum {} + | sort | sha256sum',libraries:'find /usr/lib /lib -type f -name "*.so*" -exec sha256sum {} + | sort | sha256sum',otherPython:'find /usr/lib/python3/dist-packages -type f ! -path "*/__pycache__/*" ! -path "*/click/*" ! -path "*/click-*.egg-info/*" ! -path "*/click-*.dist-info/*" -exec sha256sum {} + | sort | sha256sum'};
 const hashes={};for(const [k,c] of Object.entries(commands)){hashes[k]=fingerprint(spec.base,c);assert.equal(fingerprint(spec.candidate,c),hashes[k],k+' changed');}
 const query=im=>fingerprint(im,"dpkg-query -W -f='${binary:Package} ${Version}\\n'").split('\n').filter(l=>!l.startsWith('python3-click '));assert.deepEqual(query(spec.candidate),query(spec.base));
 assert.equal(fingerprint(spec.candidate,"dpkg-query -W -f='${Version}' python3-click"),'8.3.3-3');
 const native=JSON.parse(docker('run',...limits,'--user','1000:1000','--mount','type=bind,src='+here+'native.py,dst=/check.py,readonly','--entrypoint','python3',spec.candidate,'/check.py'));
 assert(native.passed&&native.noDelivery&&native.apprise==='1.10.0'&&native.click==='8.3.3');
 const imageId=after.Id,date=new Date().toISOString();
 fs.writeFileSync(dir+'/build.json',JSON.stringify({...spec,date,imageId,passed:true,configurationUnchanged:true,unrelatedPackagesUnchanged:true,hashes,packageName,packageHash,source:'https://github.com/pallets/click/tree/8.3.3',authenticatedIndex:{sha256:hash,releaseSha256:sha(Buffer.from(release))}},null,2)+'\n');
 fs.writeFileSync(dir+'/native.json',JSON.stringify({...native,date,imageId},null,2)+'\n');
 console.log(JSON.stringify({candidate:spec.candidate,imageId,checks:native.checks.length,productionChanged:false}));
}
