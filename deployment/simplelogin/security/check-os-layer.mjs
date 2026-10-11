// Compare the finite vendor-only candidate without mounting production data.
// The separate networkless native regression is still required before rollout.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,statfsSync,writeFileSync} from 'node:fs';
process.umask(0o077);
const base='utilibre-simplelogin:4.82.4-p7';
const candidate='utilibre-simplelogin:4.82.4-p8-os-security-20261011';
const expectedBase='sha256:e9a4d98dfec85012d467db00f0f54d5d2c81b81692b2d59c0d745776bd7a9068';
const expectedCandidate='sha256:b983013c78bc71418ed8dbc38ba3fa8c9507344d99276f4269659f0b5bdab858';
const directory='/opt/utilibre/reports/simplelogin-os-20261011';
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']});
const space=statfsSync('/opt/utilibre');assert(space.bavail*space.bsize>=8*1024**3,'Keep 8 GiB free');
const images=[base,candidate].map(ref=>JSON.parse(docker('image','inspect',ref))[0]);
assert.equal(images[0].Id,expectedBase,'Base image changed; review the new artifact');
assert.equal(images[1].Id,expectedCandidate,'Candidate image changed; review the new artifact');
for(const property of ['User','Env','Cmd','Entrypoint','WorkingDir','ExposedPorts','Volumes','Healthcheck']){
 assert.deepEqual(images[1].Config[property],images[0].Config[property],`Preserve native configuration: ${property}`);
}
const run=(ref,command)=>docker('run','--rm','--name','maintenance-simplelogin-layer-check','--network','none','--read-only','--tmpfs','/tmp:rw,nosuid,nodev,size=32m,mode=1777','--memory','256m','--cpus','1','--pids-limit','64','--user','root','--entrypoint','sh',ref,'-c',command);
const hash=(ref,path)=>run(ref,`cd ${path} && find . -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum`).trim().split(/\s+/)[0];
const hashes={};
for(const path of ['/code','/root/.local/share/uv/python']){
 hashes[path]=hash(base,path);assert.match(hashes[path],/^[a-f0-9]{64}$/);
 assert.equal(hash(candidate,path),hashes[path],`Application/interpreter bytes unchanged: ${path}`);
}
const packages=ref=>Object.fromEntries(run(ref,"dpkg-query -W -f='${binary:Package} ${Version}\\n'").trim().split('\n').map(row=>row.split(' ')));
const before=packages(base),after=packages(candidate);
assert.deepEqual(Object.keys(after).sort(),Object.keys(before).sort(),'No OS packages added or removed');
assert.equal(after['linux-libc-dev:amd64'],'5.15.0-198.208');
assert.equal(after['libssl3:amd64'],'3.0.2-0ubuntu1.30');
const changes=Object.entries(after).filter(([name,version])=>before[name]!==version).map(([name,version])=>({name,before:before[name],after:version}));
assert.equal(changes.length,13,'Review unexpected vendor changes');
run(candidate,'UV_NO_CACHE=1 /usr/bin/uv pip check --python /code/.venv/bin/python');
const result={date:new Date().toISOString(),status:'passed',base,baseImage:images[0].Id,candidate,candidateImage:images[1].Id,applicationAndInterpreterSha256:hashes,preservedNativeConfiguration:true,dependencyCheck:true,changes,limits:'OS vendor backports only. No production data mounted, external mail sent, framework repair or public activation implied. Separate native regression required.'};
mkdirSync(directory,{recursive:true,mode:0o700});
writeFileSync(directory+'/layer.json',JSON.stringify(result,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify(result));
