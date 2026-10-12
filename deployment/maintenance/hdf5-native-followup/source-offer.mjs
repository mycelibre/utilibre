// Source-only allowlist: no application records, credentials, or private logs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,spec,here,sha,read,run} from './common.mjs';
process.umask(0o077);assert([undefined,'--publish'].includes(process.argv[2])&&process.argv.length<=3);
const filename='security-hdf5-native-20261012-source.tar.gz',archive=root+'/'+filename,receipt=root+'/source-offer.json';
const originals=[...Object.keys(spec.sourceFiles),spec.commit+'.patch',spec.commit+'-context-only.patch'];
const outputs=['hdf5_'+spec.version+'.dsc','hdf5_'+spec.version+'.debian.tar.xz','hdf5_'+spec.version+'_amd64.buildinfo'];
const recipes=['spec.json','README.md','prepare.mjs','install-build-deps.sh','build.sh','resume-permission-check.sh','source.sh','native.c','common.mjs','collect.mjs','stage.mjs','application.mjs','release.mjs','review-policy.mjs','review-policy.test.mjs','review.mjs','source-offer.mjs'];
if(process.argv[2]==='--publish'){
 const proof=read(receipt);assert.equal(proof.filename,filename);assert.equal(sha(fs.readFileSync(archive)),proof.sha256);
 const expected=new Set(['hdf5-native/','hdf5-native/manifest.json','hdf5-native/sources/','hdf5-native/recipes/',...originals.map(f=>'hdf5-native/sources/'+f),...outputs.map(f=>'hdf5-native/sources/'+f),...recipes.map(f=>'hdf5-native/recipes/'+f)]);
 assert.deepEqual(new Set(run('tar',['-tzf',archive]).split('\n')),expected);
 for(const dir of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){
  const dest=dir+'/'+filename;if(fs.existsSync(dest)){assert(fs.lstatSync(dest).isFile());assert.equal(sha(fs.readFileSync(dest)),proof.sha256);continue;}
  const tmp=fs.mkdtempSync(dir+'/.hdf5-source-');try{fs.copyFileSync(archive,tmp+'/'+filename);fs.chmodSync(tmp+'/'+filename,0o644);fs.renameSync(tmp+'/'+filename,dest);}finally{fs.rmdirSync(tmp);}
 }
 proof.published=true;proof.publishedAt=new Date().toISOString();fs.writeFileSync(receipt,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}else{
 assert(!fs.existsSync(archive));const n=read(root+'/native-build.json');assert.equal(n.status,'passed');assert.equal(read(root+'/application.json').status,'passed');
 const tmp=fs.mkdtempSync(root+'/source-offer-'),dir=tmp+'/hdf5-native';fs.mkdirSync(dir+'/sources',{recursive:true});fs.mkdirSync(dir+'/recipes');
 for(const f of originals)fs.copyFileSync(root+'/source/'+f,dir+'/sources/'+f);
 for(const f of outputs)fs.copyFileSync(root+'/output/'+f,dir+'/sources/'+f);
 for(const f of recipes)fs.copyFileSync(here+f,dir+'/recipes/'+f);
 fs.writeFileSync(dir+'/manifest.json',JSON.stringify({date:'2026-10-12',version:spec.version,sourceFiles:spec.sourceFiles,packageFiles:n.files,patch:spec.commit,upstreamPatchSha256:spec.upstreamPatchSha256,adjustedPatchSha256:spec.adjustedPatchSha256,changes:'All upstream added/deleted code bytes preserved; unchanged patch context adjusted for Debian HDF5 1.10.8. Debian vendor patches retained; native serial build with original configuration and supported OMPIARCHS/MPICHARCHS exclusions for uninstalled MPI variants. Full corresponding source and notices included.'},null,2)+'\n');
 run('tar',['--sort=name','--mtime=2026-10-12T00:00:00Z','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',tmp,'hdf5-native']);
 const proof={date:new Date().toISOString(),filename,archive,bytes:fs.statSync(archive).size,sha256:sha(fs.readFileSync(archive)),published:false};fs.writeFileSync(receipt,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}
