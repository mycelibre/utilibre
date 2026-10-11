import assert from 'node:assert/strict';
import {execFileSync as exec} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,statfsSync} from 'node:fs';
assert.equal(process.argv[2], 'stage');
const directory = '/var/lib/utilibre-maintenance/proxyaddr-20261011';
mkdirSync(directory, {mode:0o700,recursive:true});
const docker = args => exec('docker', args, {timeout:180000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']});
for (const [name,key] of [['utilibre-expanded-actual-1','actual'],['utilibre-community-uptime-kuma-1','kuma'],['utilibre-records-grist-1','grist']]) {
  try {
    const free=statfsSync(directory);assert(free.bavail*free.bsize>8*1024**3);
    const old=JSON.parse(docker(['inspect',name]))[0];
    const ref='utilibre-'+key+':proxyaddr-security-20261011';
    assert.notEqual(old.Config.Image,ref,'Already deployed; preserve the original rollback receipt');
    assert.equal(JSON.parse(docker(['image','inspect',old.Config.Image]))[0].Id,old.Image);
    const receipt={date:new Date().toISOString(),name,oldImage:old.Image,oldRef:old.Config.Image,newRef:ref};
    writeFileSync(directory+'/'+key+'.json',JSON.stringify(receipt,null,2),{mode:0o600});
    docker(['build','--build-arg','ARTIFACT_IMAGE='+old.Config.Image,'-f','deployment/maintenance/Dockerfile.proxyaddr-security','-t',ref,'deployment/maintenance']);
    const result=exec('docker',['run','--rm','-i','--network','none','--read-only','--cap-drop','ALL','--memory','256m','--entrypoint','node',ref,'-'],{input:readFileSync('deployment/maintenance/check-proxyaddr.cjs'),maxBuffer:1024**2,timeout:30000});
    receipt.newImage=JSON.parse(docker(['image','inspect',ref]))[0].Id;
    receipt.checks=result.toString().trim();
    writeFileSync(directory+'/'+key+'.json',JSON.stringify(receipt,null,2),{mode:0o600});
    console.log(key+': staged patch and native Express regression passed');
  } catch(error) {
    writeFileSync(directory+'/last-error.log',String(error.stderr||error.message),{mode:0o600});
    throw Error('Candidate failed; inspect private '+directory+'/last-error.log');
  }
}
