// Additive complete source offer, using only checksum-verified build inputs.
import fs from 'node:fs';import cp from 'node:child_process';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);const here=new URL('.',import.meta.url).pathname,root='/var/lib/utilibre-maintenance/security-20261028/codec',read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex'),inputs=read(here+'codec-inputs.json');
const stage=fs.mkdtempSync(root+'/source-'),copy=(a,b)=>{fs.mkdirSync(path.dirname(b),{recursive:true});fs.copyFileSync(a,b);};
const run=(p,a,options={})=>cp.execFileSync(p,a,{encoding:'utf8',timeout:120000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],...options}).trim();
const apps=[];
for(const s of inputs.rows){
 const b=read(root+'/'+s.key+'/build.json');assert(b.passed&&b.native.passed&&b.regression.passed&&b.base===s.base);assert.equal(run('docker',['image','inspect','--format','{{.Id}}',s.candidate]),b.imageId);
 const target=stage+'/'+s.key;fs.mkdirSync(target);
 if(s.key==='rimgo'){
  for(const f of b.sourceFiles){assert(!path.isAbsolute(f.path)&&!f.path.split('/').some(p=>['..','.git','.env','secrets','node_modules'].includes(p)));const source=root+'/rimgo/source/'+f.path;assert(fs.lstatSync(source).isFile()&&!fs.lstatSync(source).isSymbolicLink());assert.equal(sha(fs.readFileSync(source)),f.sha256);copy(source,target+'/'+f.path);}
  assert.equal(sha(fs.readFileSync(root+'/rimgo/rimgo-app.css')),sha(fs.readFileSync('/var/lib/utilibre-maintenance/security-20261028/go/rimgo/rimgo-app.css')));copy(root+'/rimgo/rimgo-app.css',target+'/static/app.css');
 }else{
  assert.equal(s.key,'ferretdb');const archive='/var/lib/utilibre-maintenance/ferretdb-libraries-20261011/source.tar.gz';assert.equal(sha(fs.readFileSync(archive)),'7f17d04d55e272365208291473045cbc3d8e460033a94b8085c373b22a57f5c1');
  const entries=run('tar',['-tzf',archive]).split('\n');assert(entries.every(p=>!path.isAbsolute(p)&&!p.split('/').includes('..')));run('tar',['--no-same-owner','--strip-components=1','-xzf',archive,'-C',target]);
  run('patch',['--batch','--fuzz=0','-p1','-i',here+'../go-closure/ferretdb-mcp-v1.patch'],{cwd:target});copy(here+'../go-closure/mcp_contract_test.go',target+'/internal/mcp/utilibre_contract_test.go');
  for(const f of ['version','commit','branch','package'])copy(here+'../ferretdb-libraries/'+f+'.txt',target+'/build/version/'+f+'.txt');
 }
 for(const [f,h]of Object.entries(s.locks)){const source=here+'locks/codec/'+s.key+'/'+f;assert.equal(sha(fs.readFileSync(source)),h);copy(source,target+'/'+f);}
 const command=s.key==='rimgo'?'go test -p 1 ./...\ngo build -p 1 -trimpath -ldflags="-s -w -X codeberg.org/rimgo/rimgo/pages.VersionInfo=d2be8e2-utilibre-p3" -o rimgo .':'mkdir -p .git\ngo test -p 1 ./internal/mcp -run "^TestUtilibre" -count=1\ngo build -p 1 -trimpath -o ferretdb ./cmd/ferretdb';
 fs.writeFileSync(target+'/UTILIBRE-REBUILD.sh','#!/bin/sh\nset -eu\ntest "$(go version)" = "go version go1.26.10 linux/amd64"\nexport GOTOOLCHAIN=local GOTELEMETRY=off CGO_ENABLED=0 GOAMD64=v1 GOFLAGS=-mod=readonly\ngo mod verify\n'+command+'\n',{mode:0o755});apps.push({key:s.key,imageId:b.imageId,sourceRevision:s.key==='rimgo'?b.sourceCommit:'0d5eb3343a50b800634cc08ace608bb6f3a3f74b',locks:s.locks});
}
const zip=root+'/modules/cache/download/'+inputs.dependency+'/@v/'+inputs.version+'.zip';assert.equal(sha(fs.readFileSync(zip)),inputs.releaseZipSha256);copy(zip,stage+'/dependencies/compress-v1.20.2.zip');
for(const f of ['codec-inputs.json','codec-LICENSE.txt','codec-native.go','check-codec.mjs','codec-policy.mjs','codec-policy.test.mjs','codec.mjs','go.mjs','publish-codec.mjs'])copy(here+f,stage+'/recipes/'+f);
fs.writeFileSync(stage+'/README.txt','Complete Rimgo and FerretDB source trees, original licenses, retained patches and exact module locks. Only github.com/klauspost/compress changes to v1.20.2; Go 1.26.10 is unchanged. Download declared Go module dependencies using normal go mod download before offline builds; no latest resolution. See each UTILIBRE-REBUILD.sh and https://github.com/mycelibre/utilibre/tree/main/deployment/maintenance/security-20261028 for bounded native tests, runtime-parent identities, image assembly, release and rollback. No user data, runtime configuration, logs or credentials included. Original runtime image/files outside the application binary are unchanged.\n');
fs.writeFileSync(stage+'/SOURCES.json',JSON.stringify({applications:apps,dependency:inputs.dependency,version:inputs.version,releaseZipSha256:inputs.releaseZipSha256,compiler:'go1.26.10',compilerArchiveSha256:'ccfe7ae822d2c2f41f4fe7c956199967a4dac22d0ee0d2b2bfdb440aab3b20c5'},null,2)+'\n');
const filename='security-codec-20261028-source.tar.gz',archive=root+'/'+filename,destination='/opt/utilibre/toolbox-public/'+filename;assert(!fs.existsSync(destination),'Preserve published offer');
run('tar',['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',stage,'.']);fs.copyFileSync(archive,destination);fs.chmodSync(destination,0o644);
fs.writeFileSync(root+'/source-offer.json',JSON.stringify({date:new Date().toISOString(),published:true,filename,archive:destination,sha256:sha(fs.readFileSync(archive)),bytes:fs.statSync(archive).size,applications:apps},null,2)+'\n');console.log('Verified complete codec/application source offer published.');
