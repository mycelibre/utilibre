// Exercise the real Compose bind definition with a missing synthetic disk.
// No production container or data is changed; uses the already-pinned image.
import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {mkdtemp, mkdir, writeFile, access, rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

test('missing temporary volume never creates a root-disk fallback', async t => {
  const dir=await mkdtemp('/opt/utilibre/privatebin-mount-test-');
  const project=`privatebin-mount-test-${process.pid}`;
  const file=`${dir}/compose.json`;
  const run=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  t.after(async()=>{
    try {run('compose','-p',project,'-f',file,'down');} catch {}
    await rm(dir,{recursive:true});
  });
  const config=JSON.parse(run('compose','--env-file','/opt/utilibre/.env','-f',
    fileURLToPath(new URL('../compose.yaml',import.meta.url)),'config','--format','json'));
  const service=config.services.privatebin;
  const data=service.volumes.find(v=>v.target==='/srv/data');
  assert.equal(data.type,'bind');
  assert.equal(data.bind.create_host_path,false);
  assert(data.source.endsWith('/temporary/privatebin'));
  await mkdir(`${dir}/unmounted`);
  const missing=`${dir}/unmounted/privatebin`;
  await writeFile(file,JSON.stringify({services:{probe:{image:service.image,
    entrypoint:['/bin/true'],network_mode:'none',logging:{driver:'none'},
    volumes:[{...data,source:missing}]}}}));
  assert.throws(()=>run('compose','-p',project,'-f',file,'up','--abort-on-container-exit'),
    error=>error.status!==0 && /bind source path does not exist/.test(error.stderr.toString()));
  await assert.rejects(access(missing),{code:'ENOENT'});
});
