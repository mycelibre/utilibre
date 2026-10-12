// Build-only trial. Production is unchanged; signed upstream + Debian packaging.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',source=dir+'/sources',here=new URL('.',import.meta.url).pathname;
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const pins={
 'curl-8.22.0.tar.xz':'f7ef3ae8a22e521f289803fe93543eb64c329b58aa73a9e224dfd915a2a5f4f7',
 'curl_8.21.0-2.dsc':'86a8e0ce106d0bc28c3995f65fe73ac1b43f6660d3667477adda4e0affb8c6f4',
 'curl_8.21.0.orig.tar.gz':'d9b327997999045a24cda50f3983e69e51c516bd8be6ef9842fc7f99135e33bb',
 'curl_8.21.0-2.debian.tar.xz':'f767d84fa9827ccfa1fe1df68ca4cfc5b87f18d90631c0bb9d072eddda655922',
 'curl_8.22.0-1.dsc':'b4872ef4875931c852f0a919db53481395fad36a9c39c0a20917b8abfae9f10a',
 'curl_8.22.0.orig.tar.gz':'d54dd598bf05927a726deb38df31c6a255ba83ff1de57c5d1464dac3ed8f44a1',
 'curl_8.22.0-1.debian.tar.xz':'5c20c1b4eab8a991d1a4a543d36c96c56291bf36337452756796765506b8821c',
};
for(const [f,hash] of Object.entries(pins))assert.equal(sha(source+'/'+f),hash);
const signature=cp.execFileSync('sqv',['--keyring',source+'/curl-8.14.1/debian/upstream/signing-key.asc','--signature-file',source+'/curl-8.22.0.tar.xz.asc',source+'/curl-8.22.0.tar.xz'],{encoding:'utf8'}).trim();assert.equal(signature,'27EDEAF22F3ABCEB50DB9A125CC908FDB71E12C2');
assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
const context=dir+'/curl-build-context',out=dir+'/curl-trixie';assert(!fs.existsSync(out+'/SHA256SUMS'),'Never overwrite a completed native build');fs.mkdirSync(context,{recursive:true});fs.mkdirSync(out,{recursive:true});fs.chmodSync(out,0o777);
for(const f of Object.keys(pins).filter(f=>f.startsWith('curl_8.21.0')))fs.copyFileSync(source+'/'+f,context+'/'+f);
fs.copyFileSync(here+'Dockerfile.curl-builder',context+'/Dockerfile');
const image='utilibre-curl-native-builder:trixie-20261012';
const log=fs.openSync(out+'/builder.log','w',0o600);
try{cp.execFileSync('docker',['build','--memory','2g','--cpu-period','100000','--cpu-quota','150000','-t',image,context],{stdio:['ignore',log,log],timeout:900000,env:{...process.env,DOCKER_BUILDKIT:'0'}});}finally{fs.closeSync(log);}
fs.writeFileSync(out+'/source-authentication.json',JSON.stringify({date:new Date().toISOString(),signature,pins,builderImage:cp.execFileSync('docker',['image','inspect',image,'--format','{{.Id}}'],{encoding:'utf8'}).trim()},null,2)+'\n');
const runner=fs.openSync(out+'/runner.log','w',0o600);
try{cp.execFileSync('docker',['run','--rm','--name','maintenance-curl-trixie-build','--network','none','--cpus','2','--memory','3g','--memory-swap','3g','--pids-limit','512','--log-driver','none','--security-opt','no-new-privileges','--tmpfs','/work:rw,exec,nosuid,nodev,size=2g,mode=1777','--mount','type=bind,src='+source+',dst=/inputs,readonly','--mount','type=bind,src='+here+',dst=/recipe,readonly','--mount','type=bind,src='+out+',dst=/output','--entrypoint','sh',image,'/recipe/curl-inner.sh'],{stdio:['ignore',runner,runner],timeout:1800000});}finally{fs.closeSync(runner);fs.chmodSync(out,0o700);}
console.log('Native curl trial build completed; artifacts and genuine suite results retained. No production release.');
