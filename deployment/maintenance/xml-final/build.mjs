import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,copyFileSync,statfsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
process.umask(0o077);
const recipe=fileURLToPath(new URL('.',import.meta.url));
const directory='/var/lib/utilibre-maintenance/xml-final-20261011';
const packages={trixie:'/var/lib/utilibre-maintenance/native-final/libxml2-output',bookworm:directory+'/bookworm'};
const versions={trixie:'2.12.7+dfsg+really2.9.14-2.1+deb13u3+utilibre1',bookworm:'2.9.14+dfsg-1.3~deb12u6+utilibre1'};
const sha=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
function docker(args){try{return execFileSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']});}catch(e){writeFileSync(directory+'/build-error.log',String(e.stdout||'')+String(e.stderr||''));throw Error('XML layer build failed; private diagnostic retained');}}
const rows=JSON.parse(readFileSync(recipe+'images.json'));
mkdirSync(directory,{recursive:true,mode:0o700});
for(const row of rows){
 const s=statfsSync(directory);assert(s.bavail*s.bsize>=8*1024**3,'Preserve 8GiB disk recovery floor');
 assert.equal(JSON.parse(docker(['image','inspect',row.base]))[0].Id,row.baseId);
 const context=directory+'/'+row.kind;mkdirSync(context+'/packages',{recursive:true});
 row.version=versions[row.suite];row.packages={};
 for(const pkg of ['libxml2',...(row.dev?['libxml2-dev']:[])]){
  const input=packages[row.suite]+'/'+pkg+'_'+row.version+'_amd64.deb';
  const checksum=readFileSync(packages[row.suite]+'/SHA256SUMS','utf8').split('\n').find(line=>line.endsWith('/'+pkg+'_'+row.version+'_amd64.deb'))?.split(/\s+/)[0];
  assert.equal(sha(input),checksum,'Native-reviewed package checksum');
  if(row.suite==='trixie'&&pkg==='libxml2')assert.equal(checksum,'b2ff4643de60160f0d80fbe617ce2aa6b92b9fa22d3f52cf02ab8cad7eb841e4');
  row.packages[pkg]=checksum;copyFileSync(input,context+'/packages/'+pkg+'.deb');
 }
 docker(['build','--pull=false','--network=none','-f',recipe+'Dockerfile','--build-arg','BASE='+row.base,'--build-arg','RESTORE_USER='+row.user,'-t',row.candidate,context]);
 const old=JSON.parse(docker(['image','inspect',row.base]))[0],fresh=JSON.parse(docker(['image','inspect',row.candidate]))[0];
 assert.equal(old.Id,row.baseId);row.candidateId=fresh.Id;
 // Empty, root and 0 all select the original UID0; preserve every other runtime field.
 const config=c=>({...c,User:[undefined,'','0','root'].includes(c.User)?'root':c.User});
 assert.deepEqual(config(fresh.Config),config(old.Config));
 console.log('Staged XML-only layer: '+row.kind);
}
writeFileSync(directory+'/build.json',JSON.stringify({date:new Date().toISOString(),status:'built-not-runtime-tested',deployed:false,rows},null,2)+'\n');
