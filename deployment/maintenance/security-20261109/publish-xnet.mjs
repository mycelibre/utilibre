// Same complete-source publication procedure as go-final/publish-source.mjs.
// Only exact reviewed source, locks and recipes; no application state or secrets.
import fs from 'node:fs';import cp from 'node:child_process';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);const gothub=process.argv[2]==='--gothub',followup=gothub||process.argv[2]==='--followup';assert(process.argv.length===(followup?3:2));
const here=new URL('.',import.meta.url).pathname,root='/var/lib/utilibre-maintenance/security-20261109/xnet',read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),m=read(here+'xnet-inputs.json');
const receipt=root+(gothub?'/published-gothub-source.json':followup?'/published-followup-source.json':'/published-source.json');
assert(!fs.existsSync(receipt),'Preserve completed source receipt');
const stage=fs.mkdtempSync(root+'/source-offer-'),rows=[];
const copy=(a,b)=>{fs.mkdirSync(path.dirname(b),{recursive:true});fs.copyFileSync(a,b);};
for(const s of m.rows.filter(s=>(gothub?['gothub']:followup?['safetwitch','galene']:['rimgo','anonymousoverflow']).includes(s.key))){
 const dir=root+'/'+s.key,b=read(dir+(followup?'/build.json':'/combined/candidate.json')),proof=read(dir+'/source-proof.json');assert(b.passed&&b.base===s.base);assert.equal(sha(dir+'/source-proof.json'),s.sourceProofSha256);
 if(followup){const n=read(dir+'/native.json'),scan=read(dir+'/scan-gate.json');assert(n.passed&&scan.passed&&scan.newHighCritical===0&&n.imageId===b.imageId&&scan.imageId===b.imageId&&b.allOtherFilesUnchanged);assert.equal(sha(here+'xnet-followup.py'),b.scopeCheckerSha256);}else assert(b.zlibOverlayProven&&b.nativeResponseParity&&b.newHighCritical===0);
 const out=stage+'/'+s.key;fs.mkdirSync(out);
 for(const f of proof.sourceFiles){assert(!path.isAbsolute(f.path)&&!f.path.split('/').some(p=>['..','.git','.env','runtime.env','secrets','node_modules'].includes(p)));const from=dir+'/source/'+f.path;assert(fs.lstatSync(from).isFile()&&!fs.lstatSync(from).isSymbolicLink());assert.equal(sha(from),f.sha256);copy(from,out+'/'+f.path);}
 for(const [f,h]of Object.entries(s.locks)){assert.equal(sha(here+'xnet-locks/'+s.key+'/'+f),h);assert.equal(sha(dir+'/source/'+f),h);copy(dir+'/source/'+f,out+'/'+f);}
 if(s.key==='rimgo'){const css=dir+'/rimgo-app.css';assert.equal(sha(css),sha('/var/lib/utilibre-maintenance/security-20261028/codec/rimgo/rimgo-app.css'));copy(css,out+'/static/app.css');}
 const flags='-s -w'+(s.key==='rimgo'?' -X codeberg.org/rimgo/rimgo/pages.VersionInfo=d2be8e2-utilibre-p3':s.key==='gothub'?' -X codeberg.org/gothub/gothub/utils.Branch=24bedc8-utilibre-p2':'');
 fs.writeFileSync(out+'/UTILIBRE-REBUILD.sh',`#!/bin/sh\nset -eu\ntest "$(go version)" = "go version go${m.compilerVersion} linux/amd64"\nexport GOTOOLCHAIN=local GOTELEMETRY=off CGO_ENABLED=0 GOAMD64=v1 GOFLAGS=-mod=readonly\ngo mod verify\ngo test -p 1 ${s.key==='galene'?'./group ./token ./ice':'./...'}\ngo build -p 1 -trimpath -ldflags="${flags}" -o ${s.key} .\n`,{mode:0o755});
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
assert.equal(rows.length,gothub?1:2);fs.writeFileSync(receipt,JSON.stringify({date:new Date().toISOString(),passed:true,rows,previousArchives:stage},null,2)+'\n');console.log(rows.length+' complete corresponding-source archives published; previous archives retained.');
