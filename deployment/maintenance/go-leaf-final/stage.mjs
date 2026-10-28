// Build one immutable-binary overlay, preserving all original runtime settings.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const here=path.dirname(new URL(import.meta.url).pathname);
const oct28=process.argv.includes('--oct28');assert(process.argv.slice(3).every(a=>a==='--oct28'));
const root=oct28?'/var/lib/utilibre-maintenance/security-20261028/go-leaf':'/var/lib/utilibre-maintenance/go-leaf-final-20261011';
const specs=JSON.parse(fs.readFileSync(here+'/images.json'));
const key=process.argv[2];
const s=specs.find(s=>s.key===key);assert(s,'Unknown fixed target');
const name=key==='wakapi-healthcheck'?'wakapi':key;
if(oct28){const current=JSON.parse(fs.readFileSync(here+'/../security-20261028/go-helpers-inputs.json')).rows.find(s=>s.key===name);assert(current);Object.assign(s,{baseId:current.base,candidate:current.candidate,compiler:current.compilerVersion,binary:current.binary});}
const run=(cmd,args)=>cp.execFileSync(cmd,args,{encoding:'utf8',timeout:180000,stdio:['ignore','pipe','pipe']}).trim();
const output=root+'/output/'+name;
const size=fs.statSync(output).size;
const stat=fs.statfsSync(root);assert(stat.bavail*stat.bsize>8*1024**3+size*3,'8GiB free-space floor');
const info=fs.readFileSync(output+'-buildinfo.txt','utf8');
assert(info.split('\n')[0].match(new RegExp('go'+s.compiler.replaceAll('.','\\.')+'(?:-|$)')));assert(info.includes('golang.org/x/net\tv0.60.0\t'));
if(['ntfy','vikunja','opengist','anubis','wakapi'].includes(name)){
 const assets=JSON.parse(fs.readFileSync(output+'-assets.json'));
 assert(assets.passed);assert.equal(assets.binarySha256,createHash('sha256').update(fs.readFileSync(output)).digest('hex'));
}
const old=JSON.parse(run('docker',['image','inspect',s.baseId]))[0];
const frozen='maintenance-go-leaf-base:'+key;
run('docker',['tag',s.baseId,frozen]);
const dir=fs.mkdtempSync(root+'/stage-'+name+'-');
try{
 fs.linkSync(output,dir+'/binary');
 fs.copyFileSync(here+(name==='wakapi'?'/Dockerfile.wakapi':'/Dockerfile'),dir+'/Dockerfile');
 if(name==='wakapi')fs.linkSync(root+'/output/wakapi-healthcheck',dir+'/healthcheck');
 run('docker',['build','--network','none','--build-arg','BASE='+frozen,'--build-arg','DESTINATION='+s.binary,'-t',s.candidate,dir]);
 const next=JSON.parse(run('docker',['image','inspect',s.candidate]))[0];
 for(const setting of ['User','Entrypoint','Cmd','Env','WorkingDir','ExposedPorts','Volumes','Healthcheck'])assert.deepEqual(next.Config[setting],old.Config[setting],setting+' changed');
 const receipt={date:new Date().toISOString(),key,base:s.baseId,image:s.candidate,imageId:next.Id,compiler:s.compiler,binarySha256:createHash('sha256').update(fs.readFileSync(output)).digest('hex'),runtimeConfigurationUnchanged:true};
 fs.writeFileSync(output+'-image.json',JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify(receipt));
}finally{fs.rmSync(dir,{recursive:true});}
