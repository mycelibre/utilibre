// Prepare the complete corresponding-source archive. Publishing and production
// deployment remain separate reviewed root-maintainer actions.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
process.umask(0o077);
const task='/var/lib/utilibre-maintenance/sudo-followup-20261012';
const recipe=path.dirname(new URL(import.meta.url).pathname);
assert([undefined,'--publish'].includes(process.argv[2])&&process.argv.length<=3);
if(process.argv[2]==='--publish'){
 const archive=task+'/security-sudo-native-20261012-source.tar.gz';
 const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 assert.equal(hash(archive),'0f26666dd28dc3b9a99b83e1752f28723409f19b8b1a7ac49f7676d6a745d26c');
 assert.equal(fs.statSync(archive).size,10632747);
 const entries=execFileSync('tar',['-tzf',archive],{encoding:'utf8'}).trim().split('\n');
 const recipes=['README.md','acquire.sh','build.sh','inner.sh','native.mjs','prepare-source-offer.mjs','release-host.mjs','review.sources','verify-source.mjs'];
 const allowed=new Set(['sudo-native/','sudo-native/manifest.json','sudo-native/recipes/','sudo-native/trixie/','sudo-native/bookworm/',...recipes.map(p=>'sudo-native/recipes/'+p)]);
 for(const [suite,version,upstream]of [['trixie','1.9.16p2-3+deb13u2+utilibre1','1.9.16p2'],['bookworm','1.9.13p3-1+deb12u4+utilibre1','1.9.13p3']]){
  for(const file of [`sudo_${version}.dsc`,`sudo_${version}.debian.tar.xz`,`sudo_${upstream}.orig.tar.gz`,`sudo_${upstream}.orig.tar.gz.asc`])allowed.add(`sudo-native/${suite}/${file}`);
  const proof=JSON.parse(fs.readFileSync(`${task}/${suite}/output/native.json`));assert.equal(proof.version,version);assert.equal(proof.productionChanged,false);
 }
 assert.deepEqual(new Set(entries),allowed,'Publish only complete source archives and named public recipes, never operational logs or config');
 const filename=path.basename(archive);
 for(const base of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){
  const dest=base+'/'+filename;
  if(fs.existsSync(dest)){assert(fs.lstatSync(dest).isFile());assert.equal(hash(dest),hash(archive));continue;}
  const temporary=fs.mkdtempSync(base+'/.sudo-source-');
  try{fs.copyFileSync(archive,temporary+'/'+filename);fs.chmodSync(temporary+'/'+filename,0o644);fs.renameSync(temporary+'/'+filename,dest);}finally{fs.rmdirSync(temporary);}
 }
 const result={date:new Date().toISOString(),filename,archive,bytes:fs.statSync(archive).size,sha256:hash(archive),published:true};
 fs.writeFileSync(task+'/source-offer.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));process.exit(0);
}
const stage=fs.mkdtempSync(task+'/source-offer-');
const root=stage+'/sudo-native';fs.mkdirSync(root);
const versions={trixie:'1.9.16p2-3+deb13u2+utilibre1',bookworm:'1.9.13p3-1+deb12u4+utilibre1'};
const sources=[];
for(const [suite,version]of Object.entries(versions)){
 const output=`${task}/${suite}/output`;const proof=JSON.parse(fs.readFileSync(output+'/native.json'));
 assert.equal(proof.version,version);assert.equal(proof.productionChanged,false);
 fs.mkdirSync(root+'/'+suite);
 for(const file of fs.readdirSync(output).filter(f=>/\.(dsc|tar\.(gz|xz)(\.asc)?)$/.test(f))){
  fs.copyFileSync(output+'/'+file,root+'/'+suite+'/'+file);
  sources.push({file:suite+'/'+file,sha256:createHash('sha256').update(fs.readFileSync(output+'/'+file)).digest('hex')});
 }
}
fs.cpSync(recipe,root+'/recipes',{recursive:true});
fs.writeFileSync(root+'/manifest.json',JSON.stringify({date:'2026-10-12',versions,sources,upstreamFixes:['https://github.com/sudo-project/sudo/commit/db669167ca599f2a94cd8a4c5fae9e473c81a2fd','https://github.com/sudo-project/sudo/commit/1820a349687522f51023d1ae5925125f59679a8c']},null,2)+'\n');
const archive=task+'/security-sudo-native-20261012-source.tar.gz';assert(!fs.existsSync(archive));
execFileSync('tar',['--sort=name','--mtime=2026-10-12T00:00:00Z','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',stage,'sudo-native']);
const result={archive,bytes:fs.statSync(archive).size,sha256:createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),published:false};
fs.writeFileSync(task+'/source-offer.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
