// Serial, source-pinned native rebuilds. Caches and Go temporary files are RAM-only.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const here=new URL('.',import.meta.url).pathname;
const root='/var/lib/utilibre-maintenance/go-leaf-final-20261011';
const specs=JSON.parse(fs.readFileSync(here+'images.json'));
const compilers={'1.26.9':'sha256:3082400e369fa24d5fc60bca20edab3f6d604e0c5a690ec66b295eff4dd87ade','1.27.2':'sha256:f92b6ef800e499660581efdabdf25d9d817a9d124eaf900924f0504e7e27e12d'};
for(const key of process.argv.slice(2)){
 const spec=specs.find(s=>s.key===key);assert(spec,'Unknown target');
 const name=key==='wakapi-healthcheck'?'wakapi':key;
 const source=name==='mezzo'?root+'/source/mezzo':spec.source;
 const head=cp.execFileSync('git',['-C',spec.source,'rev-parse',name==='mezzo'?spec.commit+'^{commit}':'HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
 assert.equal(head,spec.commit,'Wrong source revision');
 const stat=fs.statfsSync(root);assert(stat.bavail*stat.bsize>8*1024**3+220*1024**2,'Build disk reserve');
 // These native applications need extra RAM-only test and link space.
 const nativeLarge=['ntfy','vikunja','opengist','wakapi'].includes(name);
 const memory=nativeLarge?'4g':'3g', workSize=nativeLarge?'3g':'2g';
 const args=['run','--rm','--name','maintenance-'+name+'-compiler','--cpus','2','--memory',memory,'--memory-swap',memory,'--pids-limit','256',
  '--tmpfs','/work:rw,size='+workSize+',exec,mode=1777','-e','EXPECTED_GO='+spec.compiler,
  '-v',source+':/source:ro','-v',root+'/output:/output','-v',here+':/scripts:ro'];
 if(['ntfy','vikunja','opengist'].includes(name))args.push('-v',root+'/input/'+name+'-embed:/assets:ro');
 if(name==='anubis')args.push('-v',root+'/input/anubis-assets:/assets:ro');
 if(name==='mezzo'){
  const exact=cp.execFileSync('git',['-C',spec.source,'archive',spec.commit],{maxBuffer:16*1024**2});
  assert.equal(createHash('sha256').update(exact).digest('hex'),createHash('sha256').update(fs.readFileSync(root+'/input/mezzo-source.tar')).digest('hex'));
  args.push('-v',root+'/input/mezzo-source.tar:/source.tar:ro');
 }
 if(name==='oauth2-proxy')args.push('--user','65532:65532');
 args.push(compilers[spec.compiler],'sh','-c',(['ntfy','vikunja'].includes(name)?'apk add --no-cache gcc musl-dev binutils >/output/'+name+'-c-compiler.txt && ':'')+'cp /scripts/build-one.sh /work/build-one.sh && exec sh /work/build-one.sh '+name);
 console.log('Building '+name+' with pinned Go '+spec.compiler);
 const result=cp.spawnSync('docker',args,{stdio:'inherit',timeout:1500000});
 if(result.status!==0)throw new Error(name+' build failed ('+result.status+'); prior candidates remain unreleased');
}
