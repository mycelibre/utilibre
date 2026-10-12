// Prepare (do not publish) the exact source offer. No credentials or account data.
import {execFileSync} from 'node:child_process';
import {copyFileSync,mkdirSync,mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='/home/ubuntu/freetools',source='/opt/utilibre/evaluation-src/bookplate-20261011';
const dir='/var/lib/utilibre-maintenance/next-leaves-final-20261012',commit='47e53a7aec56aa9e76d4cf425deb48102e4a2fd7';
const verify=JSON.parse(readFileSync(dir+'/bookplate-verify.json'));assert(verify.passed&&verify.next==='16.3.8');
const run=(cmd,args,options={})=>{try{return execFileSync(cmd,args,{maxBuffer:16*1024**2,stdio:['pipe','pipe','pipe'],...options});}catch{throw Error('Source preparation failed; child details suppressed');}};
assert.equal(run('git',['rev-parse','HEAD'],{cwd:source}).toString().trim(),commit);
const stage=mkdtempSync('/dev/shm/utilibre-bookplate-next-source-');
try{
 const archive=run('git',['archive','--format=tar','--prefix=bookplate/',commit],{cwd:source});
 run('tar',['-xf','-','-C',stage],{input:archive});
 const target=stage+'/bookplate/utilibre';mkdirSync(target);mkdirSync(target+'/next-leaves-final');
 for(const f of ['prepare.mjs','security-package-lock.json'])copyFileSync(root+'/deployment/bookplate/'+f,target+'/'+f);
 for(const f of ['build-bookplate.sh','build.mjs','Dockerfile.bookplate','stage.mjs','verify.py','check-bookplate.mjs'])copyFileSync(root+'/deployment/maintenance/next-leaves-final/'+f,target+'/next-leaves-final/'+f);
 writeFileSync(target+'/BUILD.txt',`Bookplate 1.1.0, upstream ${commit}. Apache-2.0 notices retained.\nUtilibre 12 October 2026: complete Next.js production build at 16.3.8.\nUse a Git checkout at this exact commit; run utilibre/prepare.mjs with that checkout path, then its Dockerfile. The checked lock is required. The original source tree, privacy-only preparation and exact lock are included. next-leaves-final records the bounded build and native gates used to preserve the already-patched production OS/npm image. Those operator scripts use Utilibre-specific paths; they are not required for a fresh generic upstream build.\nNo runtime secrets, uploads or account data are build inputs.\n`);
 const output=dir+'/bookplate-utilibre.tar.gz';run('tar',['-czf',output,'-C',stage,'bookplate']);
 const bytes=readFileSync(output);const receipt={date:new Date().toISOString(),passed:true,imageId:verify.imageId,sourceCommit:commit,archiveSha256:createHash('sha256').update(bytes).digest('hex'),archiveBytes:bytes.length,published:false,destination:'/opt/utilibre/records/public/bookplate-utilibre.tar.gz',publicURL:'https://bookplate.utilibre.org/utilibre-source/bookplate-utilibre.tar.gz'};
 writeFileSync(dir+'/bookplate-source.json',JSON.stringify(receipt,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(receipt));
}finally{assert(stage.startsWith('/dev/shm/utilibre-bookplate-next-source-'));rmSync(stage,{recursive:true,force:true});}
