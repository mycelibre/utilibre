// Explicit corresponding-source preparation; no public writes or user data.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const repo=new URL('../../../',import.meta.url).pathname;
const root='/var/lib/utilibre-maintenance/upgrade-closure-20261111';
const revisions={wakapi:'1157f203c8b646466b4e72563764738b10f0cd0d',grid:'ff7692241c48c3495da0bb8eb7455f906f3abb2d'};
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const [key,revision]of Object.entries(revisions)){
 const d=root+'/'+key,source=d+'/source',stage=d+'/source-offer';
 assert.equal(cp.execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),revision);
 fs.mkdirSync(stage);fs.mkdirSync(stage+'/utilibre');
 cp.execFileSync('git',['archive','--format=tar','--output='+d+'/upstream.tar',revision],{cwd:source});
 cp.execFileSync('tar',['-xf',d+'/upstream.tar','-C',stage]);
 const patch=key==='wakapi'?d+'/retained.patch':repo+'deployment/maintenance/releases-20261111/grid-browser-build.patch';
 fs.copyFileSync(patch,stage+'/utilibre/changes.patch');
 cp.execFileSync('git',['apply',stage+'/utilibre/changes.patch'],{cwd:stage});
 if(key==='grid'){
  fs.copyFileSync(source+'/package-lock.json',stage+'/package-lock.json');
  for(const f of ['grid-prepare.mjs','grid-publish.mjs'])fs.copyFileSync(repo+'deployment/creative-batch/'+f,stage+'/utilibre/'+f);
  fs.writeFileSync(stage+'/utilibre/BUILD.txt',`GridSpace 4.7.3, MIT, ${revision}.\nThe source already contains changes.patch. Browser-only package metadata omits the unused Electron, documentation and printer-server dependency graphs. Upstream browser build scripts and features are retained. All 250 installed build/runtime packages are assessed. The full upstream manifest remains available at this revision.\nNode 24.21.0; npm ci --ignore-scripts --no-audit --no-fund, then disconnect external networking and run npm run browser-build.\nUse the included grid-publish.mjs alias mapping to serve web/, src/ and WASM statically. No printer server is required. Runtime needs same-origin COOP and require-corp COEP. No byte-identical build claim.\n`);
 }else{
  const locks=repo+'deployment/maintenance/security-20261109/xnet-locks/wakapi';
  for(const f of ['go.mod','go.sum'])fs.copyFileSync(locks+'/'+f,stage+'/'+f);
  const fixed='/var/lib/utilibre-maintenance/security-20261028/jose/regression/v3-fixed/';
  assert.equal(sha(fixed+'jwk.go'),'7593d1576566ed8330ceb98c8f0d077a82e6ab2fa5801f60abd24533e1e9293b');
  fs.copyFileSync(fixed+'jwk.go',stage+'/utilibre/jose-v3-jwk.go');fs.copyFileSync(fixed+'LICENSE',stage+'/utilibre/jose-v3-LICENSE');
  fs.writeFileSync(stage+'/utilibre/NOTICE.txt','The modified JOSE v3 source retains its Apache-2.0 license and upstream copyright notices. This is the previously reviewed Utilibre backport, unchanged. Other source retains its upstream license.\n');
  fs.copyFileSync(d+'/build-adapter.sh',stage+'/utilibre/build-adapter.sh');
  fs.writeFileSync(stage+'/utilibre/BUILD.txt',`Wakapi 2.18.2, MIT, ${revision}. Source includes the local login/empty-state/copy changes and exact repaired dependency locks.\nUse Go 1.27.3, CGO_ENABLED=0, GOEXPERIMENT=jsonv2, GOTOOLCHAIN=local and GOTELEMETRY=off. Download the go.sum-verified modules separately, then use GOPROXY=off and GOSUMDB=off for build/test.\nRun go mod verify and go mod vendor. Verify vendor/github.com/go-jose/go-jose/v3/jwk.go has SHA256 79f510a4b97fa2e34ec37932cab57e64dfdc9fa6c314654d1ccc2dd93898a532; replace it with utilibre/jose-v3-jwk.go, SHA256 7593d1576566ed8330ceb98c8f0d077a82e6ab2fa5801f60abd24533e1e9293b.\nRun go test -mod=vendor -p 1 ./utils ./helpers ./config and go build -mod=vendor -p 1 -trimpath -ldflags '-s -w' -o wakapi main.go. The included adapter records the resource-bounded container build. No byte-identical build claim.\n`);
 }
 const archive=d+'/source.tar.gz';
 cp.execFileSync('tar',['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',stage,'.'],{timeout:120000});
 fs.writeFileSync(d+'/source-offer.json',JSON.stringify({passed:true,revision,archiveSha256:sha(archive),bytes:fs.statSync(archive).size,productionChanged:false},null,2)+'\n');
 console.log(key+': complete source offer prepared privately');
}
