// Finite source/frontend preparation. No activation, downloads or production mounts.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const repo=new URL('../../../',import.meta.url).pathname;
const root='/var/lib/utilibre-maintenance/held-upgrades-20261111/kitchenowl';
const inputs=JSON.parse(fs.readFileSync(new URL('./kitchenowl-build-inputs.json',import.meta.url)));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(cmd,args,options={})=>cp.execFileSync(cmd,args,{encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,...options});
assert.equal(process.argv.length,4);
const mode=process.argv[2],name=process.argv[3];
assert(['--source','--build'].includes(mode));assert(/^[a-z][a-z0-9-]{0,40}$/.test(name));
if(mode==='--source')assert.equal(name,'source-offer');
const out=root+'/'+name;assert(!fs.existsSync(out),'Never overwrite previous evidence');
assert.equal(run('git',['rev-parse','HEAD'],{cwd:root+'/source'}).trim(),inputs.sourceRevision);
assert.equal(hash(repo+'deployment/maintenance/releases-20261111/kitchenowl-0.8.1.patch'),inputs.patchSha256);
assert.equal(hash(root+'/source/kitchenowl/pubspec.lock'),inputs.applicationLockSha256);
if(mode==='--build'){
 for(const [tag,id]of Object.entries(inputs.images))assert.equal(run('docker',['image','inspect','--format','{{.Id}}',tag]).trim(),id,tag);
 assert.equal(run('git',['-c','safe.directory='+root+'/flutter-sdk','rev-parse','HEAD'],{cwd:root+'/flutter-sdk'}).trim(),inputs.flutterRevision);
 for(const [path,sha]of Object.entries(inputs.sdkFiles))assert.equal(hash(root+'/flutter-sdk/'+path),sha,path);
 const space=fs.statfsSync(root);assert(space.bavail*space.bsize>5*1024**3,'Keep at least 5 GiB free');
}
fs.mkdirSync(out);fs.mkdirSync(out+'/source');
run('git',['archive','--format=tar','--output='+out+'/source.tar',inputs.sourceRevision],{cwd:root+'/source'});
run('tar',['-xf',out+'/source.tar','-C',out+'/source']);
const patch=repo+'deployment/maintenance/releases-20261111/kitchenowl-0.8.1.patch';
run('git',['apply','--check',patch],{cwd:out+'/source'});
run('git',['apply',patch],{cwd:out+'/source'});
run('git',['apply','--reverse','--check',patch],{cwd:out+'/source'});
assert.equal(hash(out+'/source/kitchenowl/pubspec.lock'),inputs.applicationLockSha256);
assert.equal(hash(out+'/source/kitchenowl/lib/main.dart'),inputs.patchedMainSha256);
if(mode==='--build'){
 fs.mkdirSync(out+'/home');
 fs.mkdirSync(out+'/source/kitchenowl/.dart_tool');
 for(const [path,sha]of Object.entries(inputs.preparedDependencies)){
  assert.equal(hash(root+'/frontend-race-candidate-2/'+path),sha,path);
  fs.copyFileSync(root+'/frontend-race-candidate-2/'+path,out+'/source/kitchenowl/'+path);
 }
 run('chown',['-R','1000:1000',out]);
 // Only disposable source/home and the dedicated compiler caches are writable.
 // No host credentials, Docker socket or production data enter this container.
 const log=fs.openSync(out+'/build.log','wx',0o600);
 try{
  run('docker',['run','--rm','--network','none','--read-only','--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','6g','--memory-swap','6g','--cpus','2','--pids-limit','256','--tmpfs','/tmp:rw,size=256m,mode=1777','-e','HOME=/home/build','-e','PUB_CACHE=/work/pub-cache','-e','CI=true','-e','FLUTTER_SUPPRESS_ANALYTICS=true','-e','DART_SUPPRESS_ANALYTICS=true','-v',out+'/source/kitchenowl:/work/app','-v',out+'/home:/home/build','-v',root+'/flutter-sdk:/work/flutter','-v',root+'/flutter-pub-cache:/work/pub-cache','-w','/work/app','--entrypoint','sh',inputs.images['utilibre-kitchenowl-flutter-builder:20261111'],'-eu','-c','git config --global --add safe.directory /work/flutter; /work/flutter/bin/flutter build web --release --no-web-resources-cdn --no-pub --no-wasm-dry-run'],{timeout:600000,stdio:['ignore',log,log]});
 }finally{fs.closeSync(log);}
 assert.equal(hash(out+'/source/kitchenowl/pubspec.lock'),inputs.applicationLockSha256);
 assert(fs.statSync(out+'/source/kitchenowl/build/web/main.dart.js').size>0);
}
fs.writeFileSync(out+'/result.json',JSON.stringify({passed:true,mode,revision:inputs.sourceRevision,patchSha256:inputs.patchSha256,productionChanged:false,network:mode==='--build'?'none':'no commands requiring network',byteReproducibility:'not claimed'},null,2)+'\n');
if(mode==='--source'){
 assert.equal(name,'source-offer');
 assert(!fs.existsSync(root+'/source.tar.gz')&&!fs.existsSync(root+'/source-offer.json'));
 const spec=JSON.parse(fs.readFileSync(new URL('./held-inputs.json',import.meta.url))).applications.kitchenowl;
 assert.equal(spec.revision,inputs.sourceRevision);
 fs.mkdirSync(out+'/source/utilibre-integration');
 for(const [path,sha]of Object.entries(spec.recipes)){
  assert(path.startsWith('deployment/')&&!path.includes('..'));assert.equal(hash(repo+path),sha);
  fs.copyFileSync(repo+path,out+'/source/utilibre-integration/'+path.split('/').at(-1));
 }
 fs.writeFileSync(out+'/source/utilibre-integration/inputs.json',JSON.stringify(spec,null,2)+'\n');
 fs.copyFileSync(root+'/flutter-sdk/LICENSE',out+'/source/utilibre-integration/Flutter-LICENSE');
 run('tar',['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',root+'/source.tar.gz','-C',out+'/source','.']);
 fs.writeFileSync(root+'/source-offer.json',JSON.stringify({passed:true,revision:inputs.sourceRevision,archiveSha256:hash(root+'/source.tar.gz'),bytes:fs.statSync(root+'/source.tar.gz').size,productionChanged:false},null,2)+'\n');
}
console.log('KitchenOwl '+mode.slice(2)+' complete; production unchanged');
