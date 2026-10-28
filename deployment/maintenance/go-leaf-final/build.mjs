// Serial, source-pinned native rebuilds. Caches and Go temporary files are RAM-only.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const here=new URL('.',import.meta.url).pathname;
const profile=process.argv.find(a=>['--oct28-download','--oct28-build'].includes(a)),phase=profile?.slice('--oct28-'.length),prior='/var/lib/utilibre-maintenance/go-leaf-final-20261011',root=profile?'/var/lib/utilibre-maintenance/security-20261028/go-leaf':prior;
if(profile){fs.mkdirSync(root+'/output',{recursive:true});fs.mkdirSync(root+'/modules',{recursive:true});}
const specs=JSON.parse(fs.readFileSync(here+'images.json'));
const compilers={'1.26.9':'sha256:3082400e369fa24d5fc60bca20edab3f6d604e0c5a690ec66b295eff4dd87ade','1.27.2':'sha256:f92b6ef800e499660581efdabdf25d9d817a9d124eaf900924f0504e7e27e12d'};
for(const key of process.argv.slice(2).filter(a=>a!==profile)){
 const spec=specs.find(s=>s.key===key);assert(spec,'Unknown target');
 const name=key==='wakapi-healthcheck'?'wakapi':key;
 if(profile){assert(['oauth2-proxy','mezzo','ntfy','wakapi'].includes(name));assert(!fs.existsSync(root+'/output/'+name+'-buildinfo.txt'),'Preserve completed build');spec.compiler=['ntfy','wakapi'].includes(name)?'1.27.3':'1.26.10';compilers['1.27.3']='sha256:942720fe0171599572cc00a947269179ed3eb7f0cfa5591dbb621766df35022b';compilers['1.26.10']='sha256:5bba7feafd0a05a85a6454714b44e5909beebda3dfda1018bb0f4fd5acc66d1f';}
 const source=name==='mezzo'?prior+'/source/mezzo':spec.source;
 const head=cp.execFileSync('git',['-C',spec.source,'rev-parse',name==='mezzo'?spec.commit+'^{commit}':'HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
 assert.equal(head,spec.commit,'Wrong source revision');
 if(profile){const manifest=JSON.parse(fs.readFileSync(prior+'/output/'+name+'-source-files.json'));assert.equal(manifest.commit,spec.commit);for(const f of manifest.files){const p=source+'/'+f.path;if(f.symlink)assert.equal(fs.readlinkSync(p),f.symlink);else assert.equal(createHash('sha256').update(fs.readFileSync(p)).digest('hex'),f.sha256,'Source drift '+f.path);}fs.writeFileSync(root+'/output/'+name+'-source-files.json',JSON.stringify(manifest,null,2)+'\n');}
 const stat=fs.statfsSync(root);assert(stat.bavail*stat.bsize>8*1024**3+220*1024**2,'Build disk reserve');
 // These native applications need extra RAM-only test and link space.
 const nativeLarge=['ntfy','vikunja','opengist','wakapi'].includes(name);
 const memory=nativeLarge?'4g':'3g', workSize=nativeLarge?'3g':'2g';
 const args=['run','--rm','--name','maintenance-'+name+'-compiler','--cpus','2','--memory',memory,'--memory-swap',memory,'--pids-limit','256',
  '--tmpfs','/work:rw,size='+workSize+',exec,mode=1777','-e','EXPECTED_GO='+spec.compiler,
  '-v',source+':/source:ro','-v',root+'/output:/output','-v',here+':/scripts:ro'];
 if(profile)args.push('--network',phase==='download'?'bridge':'none','--read-only','--tmpfs','/tmp:rw,size=64m,mode=1777','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','-e','UTILIBRE_PHASE='+phase,'-v',root+'/modules:/modules'+(phase==='build'?':ro':''));
 if(['ntfy','vikunja','opengist'].includes(name))args.push('-v',prior+'/input/'+name+'-embed:/assets:ro');
 if(name==='anubis')args.push('-v',prior+'/input/anubis-assets:/assets:ro');
 if(name==='mezzo'){
  const exact=cp.execFileSync('git',['-C',spec.source,'archive',spec.commit],{maxBuffer:16*1024**2});
  assert.equal(createHash('sha256').update(exact).digest('hex'),createHash('sha256').update(fs.readFileSync(prior+'/input/mezzo-source.tar')).digest('hex'));
  args.push('-v',prior+'/input/mezzo-source.tar:/source.tar:ro');
 }
 if(!profile&&name==='oauth2-proxy')args.push('--user','65532:65532');
 args.push(compilers[spec.compiler],'sh','-c',(!profile&&['ntfy','vikunja'].includes(name)?'apk add --no-cache gcc musl-dev binutils >/output/'+name+'-c-compiler.txt && ':'')+'cp /scripts/build-one.sh /work/build-one.sh && exec sh /work/build-one.sh '+name);
 console.log('Building '+name+' with pinned Go '+spec.compiler);
 const result=cp.spawnSync('docker',args,{stdio:'inherit',timeout:1500000});
 if(result.status!==0)throw new Error(name+' build failed ('+result.status+'); prior candidates remain unreleased');
}
