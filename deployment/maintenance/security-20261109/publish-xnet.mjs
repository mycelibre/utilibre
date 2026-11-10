// Same complete-source publication procedure as go-final/publish-source.mjs.
// Only exact reviewed source, locks and recipes; no application state or secrets.
import fs from 'node:fs';import cp from 'node:child_process';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);const single=['--gothub','--mezzo','--anubis','--oauth2-proxy'].includes(process.argv[2])?process.argv[2].slice(2):null,followup=Boolean(single)||process.argv[2]==='--followup';assert(process.argv.length===(followup?3:2));
const here=new URL('.',import.meta.url).pathname,root='/var/lib/utilibre-maintenance/security-20261109/xnet',read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),m=read(here+'xnet-inputs.json');
const receipt=root+(single?'/published-'+single+'-source.json':followup?'/published-followup-source.json':'/published-source.json');
assert(!fs.existsSync(receipt),'Preserve completed source receipt');
const stage=fs.mkdtempSync(root+'/source-offer-'),rows=[];
const copy=(a,b)=>{fs.mkdirSync(path.dirname(b),{recursive:true});fs.copyFileSync(a,b);};
for(const s of m.rows.filter(s=>(single?[single]:followup?['safetwitch','galene']:['rimgo','anonymousoverflow']).includes(s.key))){
 const dir=root+'/'+s.key,b=read(dir+(followup?'/build.json':'/combined/candidate.json')),proof=read(dir+'/source-proof.json');assert(b.passed&&b.base===s.base);assert.equal(sha(dir+'/source-proof.json'),s.sourceProofSha256);
 if(followup){const n=read(dir+'/native.json'),scan=read(dir+'/scan-gate.json');assert(n.passed&&scan.passed&&scan.newHighCritical===0&&n.imageId===b.imageId&&scan.imageId===b.imageId&&b.allOtherFilesUnchanged);assert.equal(sha(here+'xnet-followup.py'),b.scopeCheckerSha256);}else assert(b.zlibOverlayProven&&b.nativeResponseParity&&b.newHighCritical===0);
 const out=stage+'/'+s.key;fs.mkdirSync(out);
 const omitted=[];
 for(const f of proof.sourceFiles){
  assert(!path.isAbsolute(f.path)&&!f.path.split('/').includes('..'));const from=dir+'/source/'+f.path;assert(fs.lstatSync(from).isFile()&&!fs.lstatSync(from).isSymbolicLink());assert.equal(sha(from),f.sha256);
  // These upstream Git-web integration fixtures are not runtime/build inputs.
  // Keep them in the assessed source, but do not redistribute private-key files.
  if(s.key==='anubis'&&['test/gitweb/secrets/id_rsa','test/gitweb/secrets/id_rsa.pub'].includes(f.path)){omitted.push(f.path);continue;}
  assert(!f.path.split('/').some(p=>['.git','.env','runtime.env','secrets','node_modules'].includes(p)));copy(from,out+'/'+f.path);
 }
 if(omitted.length)fs.writeFileSync(out+'/UTILIBRE-OMITTED-FIXTURES.txt','Only these upstream Git-web integration test key fixtures are omitted. They are not needed by the included production build or the tested native checks. They remain in the original upstream revision and in the private assessed source. No application source or scan exclusion was changed.\n'+omitted.join('\n')+'\n');
 for(const [f,h]of Object.entries(s.locks)){assert.equal(sha(here+'xnet-locks/'+s.key+'/'+f),h);assert.equal(sha(dir+'/source/'+f),h);copy(dir+'/source/'+f,out+'/'+f);}
 if(s.key==='rimgo'){const css=dir+'/rimgo-app.css';assert.equal(sha(css),sha('/var/lib/utilibre-maintenance/security-20261028/codec/rimgo/rimgo-app.css'));copy(css,out+'/static/app.css');}
 const flags=s.key==='oauth2-proxy'?'-X github.com/oauth2-proxy/oauth2-proxy/v7/pkg/version.VERSION=v7.15.5':'-s -w'+(s.key==='rimgo'?' -X codeberg.org/rimgo/rimgo/pages.VersionInfo=d2be8e2-utilibre-p3':s.key==='gothub'?' -X codeberg.org/gothub/gothub/utils.Branch=24bedc8-utilibre-p2':s.key==='mezzo'?' -X main.version=1.4.0':s.key==='anubis'?' -X github.com/TecharoHQ/anubis.Version=v1.27.0':'');
 const tests=s.key==='galene'?'./group ./token ./ice':s.key==='anubis'?'./lib/config ./lib/challenge/... ./web':s.key==='oauth2-proxy'?'./pkg/... ./providers':'./...';
 let prebuild='';
 if(['anubis','oauth2-proxy'].includes(s.key)){
  const repair='/var/lib/utilibre-maintenance/security-20261028/jose/regression/v3-fixed/jwk.go';assert.equal(sha(repair),s.joseV3Sha256);copy(repair,out+'/utilibre-recipes/jose-v3-jwk.go');
  const license=path.dirname(repair)+'/LICENSE';assert.equal(sha(license),'cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30');copy(license,out+'/utilibre-recipes/jose-v3-LICENSE');
  fs.writeFileSync(out+'/utilibre-recipes/jose-v3-NOTICE.txt','jose-v3-jwk.go is from github.com/go-jose/go-jose/v3 v3.0.5, under the accompanying Apache-2.0 licence. Original copyright notices remain in the source. Utilibre modified this file with its reviewed JOSE repair; see the pinned source hash and rebuild instructions.\n');
  copy(dir+'/build-adapter.sh',out+'/utilibre-recipes/build-adapter.sh');
  prebuild=`# Preserve the previously reviewed JOSE v3 source repair.\nrepair_work=$(mktemp -d)\ntrap 'rm -rf "$repair_work"' EXIT\ncp -R "$(go env GOMODCACHE)/github.com/go-jose/go-jose/v3@v3.0.5" "$repair_work/jose-v3"\n( cd "$repair_work/jose-v3"; echo '79f510a4b97fa2e34ec37932cab57e64dfdc9fa6c314654d1ccc2dd93898a532  jwk.go' | sha256sum -c - )\nchmod -R u+w "$repair_work/jose-v3"\ncp utilibre-recipes/jose-v3-jwk.go "$repair_work/jose-v3/jwk.go"\n( cd "$repair_work/jose-v3"; echo '${s.joseV3Sha256}  jwk.go' | sha256sum -c - )\ncp go.mod "$repair_work/build.mod"\ncp go.sum "$repair_work/build.sum"\ngo mod edit -modfile="$repair_work/build.mod" -replace=github.com/go-jose/go-jose/v3="$repair_work/jose-v3"\nexport GOFLAGS="-mod=readonly -modfile=$repair_work/build.mod"\ngo test -p 1 github.com/go-jose/go-jose/v3/...\n`;
 }
 fs.writeFileSync(out+'/UTILIBRE-REBUILD.sh',`#!/bin/sh\nset -eu\ntest "$(go version)" = "go version go${m.compilerVersion} linux/amd64"\nexport GOTOOLCHAIN=local GOTELEMETRY=off CGO_ENABLED=0 GOAMD64=v1 GOFLAGS=-mod=readonly${s.key==='mezzo'?' GOEXPERIMENT=nodwarf5':''}\ngo mod verify\n${prebuild}go test -p 1 ${tests}\ngo build -p 1 -trimpath -ldflags="${flags}" -o ${s.key} ${['mezzo','anubis'].includes(s.key)?'./cmd/'+s.key:'.'}\n`,{mode:0o755});
 if(s.key==='mezzo')copy(here+'../go-leaf-final/build-one.sh',out+'/utilibre-recipes/build-one.sh');
 for(const f of (followup?['xnet-inputs.json','xnet-LICENSE.txt','xnet-build.mjs','xnet-followup.py']:['xnet-inputs.json','xnet-LICENSE.txt','xnet-build.mjs','xnet-check.py','xnet-native.go','xnet-regression.sh','zlib-inputs.json']))copy(here+f,out+'/utilibre-recipes/'+f);
 const module=root+'/modules/cache/download/golang.org/x/net/@v/v0.62.0.zip';assert.equal(sha(module),m.moduleZipSha256);copy(module,out+'/utilibre-recipes/net-v0.62.0.zip');
 const source={sourceRevision:s.sourceRevision,imageId:b.imageId,compiler:m.compiler,compilerVersion:m.compilerVersion,locks:s.locks,binarySha256:b.binarySha256,moduleChanges:b.moduleChanges,zlib:followup?'Existing base library is unchanged by this binary-only overlay.':'Signed same-branch Alpine zlib 1.4-r0; see zlib-inputs.json',integration:'https://github.com/mycelibre/utilibre/tree/main/deployment/maintenance/security-20261109',limits:'Normal pinned module download is required before the offline build. No byte-for-byte reproducibility claim.'};
 fs.writeFileSync(out+'/UTILIBRE-SOURCES.json',JSON.stringify(source,null,2)+'\n');
 const name=(s.key==='safetwitch'?'safetwitch-backend':s.key)+'-utilibre.tar.gz',archive=stage+'/'+name,dest='/opt/utilibre/toolbox-public/'+name;
 cp.execFileSync('tar',['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',out,'.'],{timeout:120000});
 if(fs.existsSync(dest))copy(dest,stage+'/previous-'+name);
 copy(archive,dest+'.tmp');fs.chmodSync(dest+'.tmp',0o644);fs.renameSync(dest+'.tmp',dest);
 rows.push({key:s.key,imageId:b.imageId,archive:name,sha256:sha(dest),bytes:fs.statSync(dest).size,sourceRevision:s.sourceRevision});
}
assert.equal(rows.length,single?1:2);fs.writeFileSync(receipt,JSON.stringify({date:new Date().toISOString(),passed:true,rows,previousArchives:stage},null,2)+'\n');console.log(rows.length+' complete corresponding-source archives published; previous archives retained.');
