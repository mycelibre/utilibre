// Full upstream Next build, not an in-place version-label or bundled-code edit.
import {execFileSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,statfsSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {profile,november} from './profile.mjs';
import {prepareFonts} from '../../bookplate/prepare-fonts.mjs';
const root='/home/ubuntu/freetools',{dir,base,next}=profile;
let source='/opt/utilibre/evaluation-src/bookplate-20261011';
const own=root+'/deployment/maintenance/next-leaves-final';
const compiler='node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1';
const name='maintenance-bookplate-next-final',resolve=process.argv.includes('--resolve');
const run=(cmd,args,options={})=>{try{return execFileSync(cmd,args,{encoding:'utf8',maxBuffer:4*1024*1024,stdio:['ignore','pipe','pipe'],...options});}catch(error){writeFileSync(dir+'/build-error.log',String(error.stdout||'')+String(error.stderr||''),{mode:0o600});throw Error('Bounded Bookplate build command failed; private diagnostic retained, no child output disclosed');}};
const floor=()=>{const s=statfsSync('/');assert(s.bavail*s.bsize>=8*1024**3,'8 GiB disk reserve');};
floor();mkdirSync(dir,{recursive:true,mode:0o700});
if(november){
 const spec=JSON.parse(readFileSync(new URL('../security-20261103/bookplate-inputs.json',import.meta.url))),sha=b=>createHash('sha256').update(b).digest('hex');
 assert(!existsSync(dir+'/build.json'),'Preserve completed build');assert.equal(spec.base,base);assert.equal(spec.compiler,compiler);
 assert.equal(sha(readFileSync(root+'/deployment/bookplate/fonts.json')),spec.fontManifestSha256);
 const archive=run('git',['-C',spec.sourceGit,'archive','--format=tar',spec.sourceCommit],{encoding:null});assert.equal(sha(archive),spec.sourceArchiveSha256);
 // Reconstruct the exact source on each invocation; never use dirty deployed source.
 source=mkdtempSync(dir+'/source-input-');{run('tar',['-xf','-','-C',source],{input:archive,stdio:['pipe','pipe','pipe']});
  const patch=new URL('../security-20261103/bookplate-privacy.patch',import.meta.url);assert.equal(sha(readFileSync(patch)),spec.privacyPatchSha256);run('git',['apply','--check',patch.pathname],{cwd:source});run('git',['apply',patch.pathname],{cwd:source});
  const p=JSON.parse(readFileSync(source+'/package.json'));p.dependencies.next=next;p.devDependencies['eslint-config-next']=next;p.overrides={vite:'8.3.3'};writeFileSync(source+'/package.json',JSON.stringify(p,null,2)+'\n');
  prepareFonts(source);
 }
 assert.equal(sha(readFileSync(source+'/package.json')),spec.packageSha256);assert.equal(sha(readFileSync(dir+'/package-lock.json')),spec.lockSha256);
 const old=run('git',['-C',root,'show',spec.baselineCommit+':deployment/bookplate/security-package-lock.json']);assert.equal(sha(old),spec.baselineLockSha256);
 const a=JSON.parse(old),b=JSON.parse(readFileSync(dir+'/package-lock.json'));assert.deepEqual(Object.keys(a.packages),Object.keys(b.packages));assert.deepEqual(Object.keys(b.packages).filter(k=>JSON.stringify(a.packages[k])!==JSON.stringify(b.packages[k])).sort(),spec.allowedLockChanges);
 for(const [k,v]of Object.entries(spec.packages))assert.equal(b.packages[k].version,v);
 for(const[k,p]of Object.entries(b.packages))if(k){assert(p.resolved.startsWith('https://registry.npmjs.org/'));assert(p.integrity);}
}else assert.equal(run('git',['rev-parse','HEAD'],{cwd:source}).trim(),'47e53a7aec56aa9e76d4cf425deb48102e4a2fd7');
assert.equal(run('docker',november?['image','inspect','--format','{{.Id}}',base]:['inspect','--format','{{.Image}}','utilibre-records-bookplate-1']).trim(),base);
const args=['run','--rm','--name',name,...(november?['--network',resolve?'bridge':'none','--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit','256','-v',dir+'/npm-cache:/cache','-e','MAINTENANCE_NOV4=1']:[]),'--cpus','2','--memory','4g','--memory-swap','4g','--log-driver','none','--read-only','--tmpfs','/work:rw,exec,size=3g','--tmpfs','/tmp:rw,size=32m','-v',source+':/source:ro','-v',own+':/recipe:ro','-v',dir+':/output','-v',dir+':/lock:ro','-e','NEXT_VERSION='+next,'-e','RESOLVE_LOCK='+(resolve?'1':'0'),compiler,'sh','/recipe/build-bookplate.sh'];
console.log(resolve?'Resolving exact Next patch lock in RAM':'Compiling and testing exact locked Next patch in RAM');
const out=run('docker',args,{timeout:20*60*1000});
writeFileSync(dir+(resolve?'/resolve.log':'/build.log'),out,{mode:0o600});
floor();
if(resolve){
 const before=JSON.parse(readFileSync(root+'/deployment/bookplate/security-package-lock.json')),after=JSON.parse(readFileSync(dir+'/package-lock.json'));
 const changed=Object.keys(after.packages).filter(k=>JSON.stringify(before.packages[k])!==JSON.stringify(after.packages[k]));
 const removed=Object.keys(before.packages).filter(k=>!(k in after.packages));
 writeFileSync(dir+'/lock-diff.json',JSON.stringify({changed,removed},null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({changed,removed,lockedDownloadOnly:november}));
}else{
 const archive=readFileSync(dir+'/app.tar.gz');
 const record={date:new Date().toISOString(),base,compiler,sourceCommit:'47e53a7aec56aa9e76d4cf425deb48102e4a2fd7',next,lockSha256:createHash('sha256').update(readFileSync(dir+'/package-lock.json')).digest('hex'),archiveSha256:createHash('sha256').update(archive).digest('hex'),archiveBytes:archive.length,unitTestsAndBuild:true};
 writeFileSync(dir+'/build.json',JSON.stringify(record,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(record));
}
