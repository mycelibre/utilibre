import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
const oct28=process.argv.includes('--oct28');assert(process.argv.slice(3).every(a=>a==='--oct28'));
const root=oct28?'/var/lib/utilibre-maintenance/security-20261028/go-closure':'/var/lib/utilibre-maintenance/go-closure-20261012';
const key=process.argv[2];assert(['ferretdb','anubis'].includes(key));
const container=key==='ferretdb'?'utilibre-gathio-ferretdb-1':'public-utility-anubis-1';
const spec=oct28?JSON.parse(fs.readFileSync(new URL('../security-20261028/go-helpers-inputs.json',import.meta.url))).rows.find(s=>s.key===key):null;
const ref=oct28?spec.candidate:key==='ferretdb'?'utilibre-ferretdb:2.7.0-mcp-closure-20261012':'utilibre-anubis:1.27.0-closure-20261012';
const target=key==='ferretdb'?'/ferretdb':'/ko-app/anubis';
const run=(...args)=>cp.execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:180000,env:{...process.env,DOCKER_BUILDKIT:'0'}}).trim();
const build=JSON.parse(fs.readFileSync(root+'/'+key+'/build.json'));assert.equal(build.status,'passed');
const binary=root+'/'+key+'/'+key;assert.equal(createHash('sha256').update(fs.readFileSync(binary)).digest('hex'),build.artifacts[key]);
const base=run('inspect','--format','{{.Image}}',container),old=JSON.parse(run('image','inspect','--format','{{json .Config}}',base));
if(oct28)assert.equal(base,spec.base,'Running baseline changed');
const context=fs.mkdtempSync(root+'/stage-'+key+'-');
try{
 fs.copyFileSync(binary,context+'/binary');fs.chmodSync(context+'/binary',0o555);
 fs.writeFileSync(context+'/Dockerfile',`FROM ${base}\nCOPY binary ${target}\n`);
 run('build','--network','none','--pull=false','-t',ref,context);
 const id=run('image','inspect',ref,'--format','{{.Id}}');assert.deepEqual(JSON.parse(run('image','inspect',id,'--format','{{json .Config}}')),old);
 const result={date:new Date().toISOString(),key,container,base,candidate:ref,imageId:id,binary:target,binarySha256:build.artifacts[key],configurationUnchanged:true,passed:true};
 fs.writeFileSync(root+'/'+key+'/image.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{fs.rmSync(context,{recursive:true});}
