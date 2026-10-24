// Complete, checked source bundles. Publication requires the exact tested image live.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const here=new URL('.',import.meta.url).pathname;
const followup=process.argv.includes('--batch=security-20261024');
const historical='/var/lib/utilibre-maintenance/go-leaf-final-20261011';
const root=followup?'/var/lib/utilibre-maintenance/security-20261024':historical;
const specs=JSON.parse(fs.readFileSync(new URL(followup?'../security-20261024/images.json':'./images.json',import.meta.url)));
const sha=b=>createHash('sha256').update(b).digest('hex');
const publish=process.argv.includes('--publish');
const targets=process.argv.slice(2).filter(x=>!['--publish','--batch=security-20261024'].includes(x));
const flags={
 'oauth2-proxy':'-X github.com/oauth2-proxy/oauth2-proxy/v7/pkg/version.VERSION=v7.15.5',
 mezzo:'-s -w -X main.version=1.4.0',
 opengist:'-X github.com/thomiceli/opengist/internal/config.OpengistVersion=v1.15.2',
 anubis:'-s -w -X github.com/TecharoHQ/anubis.Version=v1.27.0',
 wakapi:'-s -w',
 ntfy:'-linkmode=external -extldflags=-static -s -w -X main.version=2.28.0 -X main.commit=10cb6506f836dbb00bb77e3b52669f6ace37f555 -X main.date=2026-08-27T20:25:10Z',
 vikunja:'-linkmode=external -extldflags=-static -X code.vikunja.io/api/pkg/version.Version=v2.7.0 -X "main.Tags=osusergo netgo"',
};
const digest={'1.26.9':'3082400e369fa24d5fc60bca20edab3f6d604e0c5a690ec66b295eff4dd87ade','1.27.2':'f92b6ef800e499660581efdabdf25d9d817a9d124eaf900924f0504e7e27e12d'};
for(const key of targets){
 const s=specs.find(x=>x.key===key);assert(s,'Unknown source target');
 const name=key==='wakapi-healthcheck'?'wakapi':key;
 const prefix=root+'/output/'+name;
 const image=JSON.parse(fs.readFileSync(prefix+'-image.json'));
 for(const suffix of ['native','verify']){const gate=JSON.parse(fs.readFileSync(prefix+'-'+suffix+'.json'));assert(gate.passed&&gate.imageId===image.imageId);}
 const snapshot=JSON.parse(fs.readFileSync(historical+'/output/'+name+'-source-files.json'));
 const stage=fs.mkdtempSync(root+'/source-'+name+'-');
 for(const entry of snapshot.files){
  const dest=stage+'/'+entry.path;fs.mkdirSync(path.dirname(dest),{recursive:true});
  if(entry.symlink){fs.symlinkSync(entry.symlink,dest);continue;}
  const bytes=fs.readFileSync(snapshot.source+'/'+entry.path);assert.equal(sha(bytes),entry.sha256,'Source changed '+entry.path);
  fs.writeFileSync(dest,bytes,{mode:entry.executable?0o755:0o644});
 }
 for(const file of ['go.mod','go.sum'])fs.copyFileSync(here+'locks/'+name+'/'+file,stage+'/'+file);
 const copy=(from,to)=>{fs.mkdirSync(path.dirname(stage+'/'+to),{recursive:true});fs.cpSync(historical+'/input/'+from,stage+'/'+to,{recursive:true});};
 if(name==='opengist'){copy('opengist-embed/assets','public/assets');copy('opengist-embed/.vite','public/.vite');}
 if(name==='ntfy'){copy('ntfy-embed/site','server/site');copy('ntfy-embed/docs','server/docs');}
 if(name==='vikunja')copy('vikunja-embed/dist','frontend/dist');
 if(name==='anubis'){
  copy('anubis-assets/web/static','web/static');copy('anubis-assets/xess/static','xess/static');copy('anubis-assets/xess/xess.css','xess/xess.css');copy('anubis-assets/xess/xess.min.css','xess/xess.min.css');
  copy('anubis-assets/challenge/preact/static','lib/challenge/preact/static');copy('anubis-assets/challenge/proofofwork/static','lib/challenge/proofofwork/static');
 }
 const cgo=['ntfy','vikunja'].includes(name)?1:0;
 const tags=name==='opengist'?'fs_embed':name==='ntfy'?'sqlite_omit_load_extension,osusergo,netgo':name==='vikunja'?'osusergo,netgo':'';
 const experiment=name==='wakapi'?'jsonv2':name==='mezzo'?'nodwarf5':'';
 const target=name==='wakapi'?'main.go':name==='anubis'?'./cmd/anubis':name==='mezzo'?'./cmd/mezzo':'.';
 const script=`#!/bin/sh\nset -eu\ntest "$(go version)" = 'go version go${s.compiler} linux/amd64'\nexport GOTOOLCHAIN=local GOTELEMETRY=off CGO_ENABLED=${cgo} GOOS=linux GOARCH=amd64 GOEXPERIMENT=${experiment}\ngo mod verify\nmkdir -p utilibre-output\ngo build -mod=readonly -p 1 -trimpath ${tags?'-tags='+tags+' ':''}-ldflags '${flags[name]}' -o utilibre-output/${name} ${target}\n`+(name==='wakapi'?"CGO_ENABLED=0 GO111MODULE=off GOEXPERIMENT= go build -trimpath -ldflags '-s -w' -o utilibre-output/healthcheck scripts/healthcheck.go\n":'');
 fs.writeFileSync(stage+'/UTILIBRE-REBUILD.sh',script,{mode:0o755});
 if(followup){
  const inputs=JSON.parse(fs.readFileSync(root+'/'+name+'/inputs.json'));
  fs.writeFileSync(stage+'/UTILIBRE-TOOLCHAIN.json',JSON.stringify({imageId:inputs.compiler,goArchive:JSON.parse(fs.readFileSync(root+'/go-download.json')),note:'Local compiler image; not a public registry manifest. Compiler construction and dependencies are recorded separately. Byte-reproducible builds are not claimed.'},null,2)+'\n');
 }
 fs.writeFileSync(stage+'/UTILIBRE-SECURITY.json',JSON.stringify({sourceCommit:s.commit,application:name,image:s.candidate,imageId:image.imageId,binarySha256:image.binarySha256,compilerImage:'golang:'+s.compiler+'-alpine@sha256:'+digest[s.compiler],runtimeBase:s.base,runtimeBaseImageId:s.baseId,replaceOnly:name==='wakapi'?['/app/wakapi','/app/healthcheck']:[s.binary],instructions:'Run UTILIBRE-REBUILD.sh in the pinned Go image with source mounted at its working directory. CGO builds require Alpine gcc, musl-dev and binutils. Required precompiled frontend assets are included; original frontend source and lockfiles are also included. Preserve upstream licenses. Build-time module downloads are checksum-verified by go.sum; no runtime dependency download.',runtime:'Overlay only the resulting native binary/binaries on the identified pre-existing runtime image, preserving configuration, users, entrypoint and native access controls. Matching image recipes and test sources: https://github.com/mycelibre/utilibre/tree/main/deployment/maintenance/go-leaf-final',securityLimit:'This is a bounded compiler/module repair, not a claim of zero remaining vulnerabilities.'},null,2)+'\n');
 if(followup){
  const p=stage+'/UTILIBRE-SECURITY.json',m=JSON.parse(fs.readFileSync(p));
  m.compilerImage=JSON.parse(fs.readFileSync(root+'/'+name+'/inputs.json')).compiler;
  m.instructions='Use Go 1.27.3 (archive and SHA-256 in UTILIBRE-TOOLCHAIN.json), with gcc/musl-dev/binutils for Vikunja, then run UTILIBRE-REBUILD.sh. Source and current locks preserve prior fixes; no runtime dependency download. Compiler image ID is local, not a registry digest.';
  m.runtime=m.runtime.replace('go-leaf-final','security-20261024');
  fs.writeFileSync(p,JSON.stringify(m,null,2)+'\n');
 }
 const archive=root+'/output/'+name+'-utilibre.tar.gz';
 cp.execFileSync('tar',['-czf',archive,'-C',stage,'.']);
 cp.execFileSync('tar',['-tzf',archive],{stdio:['ignore','ignore','pipe']});
 const receipt={application:name,sourceCommit:s.commit,imageId:image.imageId,archive:path.basename(archive),sha256:sha(fs.readFileSync(archive)),bytes:fs.statSync(archive).size,published:false};
 if(publish){
  const live=cp.execFileSync('docker',['inspect',s.container,'--format','{{.Image}}'],{encoding:'utf8'}).trim();assert.equal(live,image.imageId,'Only publish matching live source');
  const destination='/opt/utilibre/toolbox-public/'+receipt.archive;
  if(fs.existsSync(destination)){
   const previous=fs.readFileSync(destination);
   const recovery=root+'/source-archive-recovery';fs.mkdirSync(recovery,{recursive:true,mode:0o700});
   const preserved=recovery+'/'+name+'-'+sha(previous)+'.tar.gz';
   if(!fs.existsSync(preserved))fs.writeFileSync(preserved,previous,{mode:0o600});
   assert.equal(sha(fs.readFileSync(preserved)),sha(previous));
   receipt.previousArchive=path.basename(preserved);
  }
  fs.copyFileSync(archive,destination+'.tmp');fs.chmodSync(destination+'.tmp',0o644);fs.renameSync(destination+'.tmp',destination);receipt.published=true;
 }
 fs.writeFileSync(prefix+'-source-published.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
 // Only this invocation's generated source copy; upstream working trees, binary
 // inputs and the independently retained old public archive remain untouched.
 assert(path.dirname(stage)===root&&path.basename(stage).startsWith('source-'+name+'-'));
 fs.rmSync(stage,{recursive:true});
}
