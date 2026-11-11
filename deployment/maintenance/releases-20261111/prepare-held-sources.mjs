// Explicit corresponding-source preparation; no public writes or user data.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const repo=new URL('../../../',import.meta.url).pathname;
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 const inputs=JSON.parse(fs.readFileSync(new URL('./held-inputs.json',import.meta.url))).applications;
 for(const [key,s]of Object.entries(inputs)){
  const d='/var/lib/utilibre-maintenance/held-upgrades-20261111/'+key,source=d+'/source',stage=d+'/source-offer';
  assert.equal(cp.execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),s.revision);
  fs.mkdirSync(stage);fs.mkdirSync(stage+'/utilibre-integration');
  cp.execFileSync('git',['-c','filter.lfs.required=false','-c','filter.lfs.process=','-c','filter.lfs.smudge=','archive','--format=tar','--output='+d+'/upstream.tar',s.revision],{cwd:source});
  cp.execFileSync('tar',['-xf',d+'/upstream.tar','-C',stage]);
  if(key!=='wbo')cp.execFileSync('git',['apply',repo+'deployment/maintenance/releases-20261111/'+key+'-'+s.version.replace(/-p1$/,'')+'.patch'],{cwd:stage});
  if(key==='chhoto'){
   const vendor=repo+'deployment/chhoto/vendor';
   for(const a of JSON.parse(fs.readFileSync(vendor+'/SOURCES.json')))assert.equal(sha(vendor+'/'+a.file),a.sha256);
   fs.cpSync(vendor,stage+'/frontend/static/vendor',{recursive:true});
  }
  if(key==='bytestash')fs.copyFileSync(repo+'deployment/community/bytestash/utilibre-releases.json',stage+'/client/public/utilibre-releases.json');
  if(key==='wbo'){
   for(const f of ['index.html','utilibre.css','utilibre-notice.js'])fs.copyFileSync(repo+'deployment/community/wbo/'+f,stage+'/client-data/'+f);
   fs.copyFileSync(repo+'deployment/community/wbo/head.html',stage+'/utilibre-head.html');
  }
  for(const [p,h]of Object.entries(s.recipes)){
   assert.equal(sha(repo+p),h);fs.copyFileSync(repo+p,stage+'/utilibre-integration/'+p.split('/').at(-1));
  }
  fs.writeFileSync(stage+'/utilibre-integration/inputs.json',JSON.stringify(s,null,2)+'\n');
  fs.writeFileSync(stage+'/utilibre-integration/BUILD.txt','Source includes the recorded patch and local assets. Acquire exact lockfile dependencies separately; run the build without networking. Immutable image identities and repair inputs are in inputs.json; do not substitute a moving image. Chhoto optional documentation LFS files remain pointers. ByteStash retains the existing better-sqlite3 11.10.0 native binding: source and license are selected by the lockfile; rebuilding it needs fresh native compatibility review. No byte-identical build claim.\n');
  cp.execFileSync('tar',['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',d+'/source.tar.gz','-C',stage,'.'],{timeout:120000});
  fs.writeFileSync(d+'/source-offer.json',JSON.stringify({passed:true,revision:s.revision,archiveSha256:sha(d+'/source.tar.gz'),bytes:fs.statSync(d+'/source.tar.gz').size,productionChanged:false},null,2)+'\n');
  console.log(key+': complete source offer prepared privately');
 }
