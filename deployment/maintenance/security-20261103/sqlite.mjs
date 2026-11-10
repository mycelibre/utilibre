// Package-only overlays using the existing native tests and release interface.
// This prepares candidates; it never changes running services or configuration.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {proveSqlite} from './sqlite-policy.mjs';
import {proveSqliteFollowup} from '../security-20261109/sqlite-policy.mjs';
process.umask(0o077);
const followup=process.argv[2]==='--batch-20261109',profile=followup?'sqlite-followup':'sqlite',root='/var/lib/utilibre-maintenance/'+(followup?'security-20261109':'security-20261103'),input=JSON.parse(fs.readFileSync(new URL(followup?'../security-20261109/sqlite-followup-inputs.json':'./sqlite-inputs.json',import.meta.url)));
const keys=process.argv.slice(followup?3:2);assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>input.rows.some(s=>s.key===k)));
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const limits=['--rm','--network','none','--read-only','--cap-drop','ALL','--cap-add','DAC_OVERRIDE','--security-opt','no-new-privileges','--cpus','1','--memory','512m','--memory-swap','512m','--pids-limit','64','--log-driver','none','--ulimit','core=0'];
for(const key of keys){
 const s=input.rows.find(s=>s.key===key),dir=root+'/'+profile+'/'+key,output=root+'/'+profile+'/'+s.suite+'/output',pin=input.packages[s.suite];
 fs.mkdirSync(dir,{recursive:true});assert(!fs.existsSync(dir+'/build.json'),'Preserve completed evidence');
 const run=(p,a,o={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:240000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();}catch(e){fs.writeFileSync(dir+'/error-'+Date.now()+'.log',String(e.stdout||'')+String(e.stderr||e.message));throw Error(key+': bounded SQLite preparation failed; private evidence retained');}};
 const docker=(...a)=>run('docker',a),native=(im,exe,args=[])=>docker('run',...limits,'--entrypoint',exe,im,...args);
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
 for(const name of s.containers)assert.equal(docker('inspect','--format','{{.Image}}',name),s.base);
 assert.equal(sha(fs.readFileSync(output+'/build.json')),pin.receiptSha256);
 const source=read(output+'/build.json');assert(source.passed&&source.baselineReproduced&&source.afterSanitizersPassed);
 const cfg=id=>JSON.parse(docker('image','inspect','--format','{{json .Config}}',id)),old=cfg(s.base);
 const inventory=id=>Object.fromEntries(native(id,'dpkg-query',['-W','-f=${Package}\t${Version}\n']).split('\n').map(l=>l.split('\t'))),before=inventory(s.base);
 for(const [pkg,v]of Object.entries(s.packages))assert.equal(before[pkg],v);
 assert(Object.keys(s.packages).every(p=>['libsqlite3-0','sqlite3'].includes(p)),'Unreviewed coupled SQLite package');
 const scripts={application:'for d in /app /opt /usr/local /usr/src /usr/lib/python3 /usr/lib/postgresql /usr/share/postgresql /priviblur /upstream /grist /var/www; do if test -d "$d"; then find "$d" -type f -exec sha256sum {} +; fi; done | sort | sha256sum',configuration:'find /etc -type f ! -path /etc/hosts ! -path /etc/hostname ! -path /etc/resolv.conf ! -name ld.so.cache -exec sha256sum {} + | sort | sha256sum',libraries:'find /usr/lib /usr/bin /usr/sbin -type f ! -name "libsqlite3.so*" ! -path /usr/bin/sqlite3 -exec sha256sum {} + | sort | sha256sum'};
 const hashes=Object.fromEntries(Object.entries(scripts).map(([k,v])=>[k,native(s.base,'sh',['-ec',v]).split(' ')[0]]));
 const context=dir+'/context';fs.mkdirSync(context,{recursive:true});const packages=[];
 for(const name of Object.keys(s.packages)){
  const p=source.packages[name];assert(p&&p.version===s.version);assert.equal(sha(fs.readFileSync(output+'/'+p.file)),p.sha256);
  fs.copyFileSync(output+'/'+p.file,context+'/'+name+'.deb');fs.chmodSync(context+'/'+name+'.deb',0o644);packages.push({name,...p});
 }
 assert(/^[A-Za-z0-9_:.-]*$/.test(old.User));
 const rootUser=['','0','root'].includes(old.User);
 const fragment=s.statusFragment;if(fragment)assert.equal(native(s.base,'sha256sum',[fragment.path]).split(' ')[0],fragment.beforeSha256);
 const recipe=`FROM ${s.base}\n${rootUser?'':'USER 0\n'}COPY *.deb /tmp/utilibre-sqlite/\nRUN dpkg --force-confold -i /tmp/utilibre-sqlite/*.deb && test -z "$(dpkg --audit)" && rm -r /tmp/utilibre-sqlite\n${fragment?'RUN dpkg-query -s libsqlite3-0 > '+fragment.path+'\n':''}${rootUser?'':'USER '+old.User+'\n'}`;
 fs.writeFileSync(context+'/Dockerfile',recipe);
 run('docker',['build','--pull=false','--network','none','--memory','512m','--cpu-period','100000','--cpu-quota','100000','-t',s.candidate,context],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
 const imageId=docker('image','inspect','--format','{{.Id}}',s.candidate);assert.deepEqual(cfg(imageId),old);
 const after=inventory(imageId);for(const pkg of Object.keys(s.packages)){assert.equal(after[pkg],s.version);after[pkg]=before[pkg];}assert.deepEqual(after,before);
 for(const [k,v]of Object.entries(scripts))assert.equal(native(imageId,'sh',['-ec',v]).split(' ')[0],hashes[k],k+' changed');
 const fixture=root+'/'+profile+'/'+s.suite+'/fixture',rows=[],abi=[],options=[];
 for(const [file,expected]of Object.entries(source.fixtures))assert.equal(sha(fs.readFileSync(fixture+'/'+file)),expected);
 for(const im of [s.base,imageId]){
  const bytes=cp.execFileSync('docker',['run',...limits,'--entrypoint','cat',im,'/usr/lib/x86_64-linux-gnu/libsqlite3.so.0'],{timeout:30000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']});
  const file=dir+'/'+(im===s.base?'before':'after')+'.so';fs.writeFileSync(file,bytes);
  const symbols=run('readelf',['--dyn-syms','--wide',file]).split('\n').map(l=>l.trim().split(/\s+/)).filter(f=>['GLOBAL','WEAK'].includes(f[4])&&f[6]!=='UND').map(f=>f[7]).sort();assert(symbols.length>1000);
  const needed=run('readelf',['-d',file]).split('\n').filter(l=>/\((?:SONAME|NEEDED)\)/.test(l)).map(l=>l.slice(l.indexOf('('))).sort();abi.push({imageId:im,sha256:sha(bytes),symbols,needed});
  const check=(exe,args=[])=>docker('run',...limits,'--tmpfs','/tmp:rw,size=16m,mode=1777','-v',fixture+':/fixtures:ro','--entrypoint','/fixtures/'+exe,im,...args);
  const result=cp.spawnSync('docker',['run',...limits,'--tmpfs','/tmp:rw,size=16m,mode=1777','-v',fixture+':/fixtures:ro','--entrypoint','/fixtures/rowid',im],{encoding:'utf8',timeout:30000,maxBuffer:1024**2});
  fs.writeFileSync(dir+'/'+(im===s.base?'before':'after')+'-rowid.log',String(result.stdout||'')+String(result.stderr||''));
  const negativePassed=result.status===0&&result.stdout.trim()==='SQLITE_NEGATIVE_ROWID_AND_NORMAL_SEARCH_PASSED checks=9';
  if(im===imageId)assert(negativePassed,'Candidate negative-rowid regression failed');
  else assert(negativePassed||[134,139].includes(result.status)&&/double free or corruption|malloc.*corrupt/.test(result.stderr),'Unrecognized baseline failure');
  assert.match(check('probe',[1,2,3,4,5].map(n=>'/fixtures/distinct-10.'+n+'.sql')),/native backup\/restore and integrity passed/);
  assert.match(check('fts',['/fixtures/fts-corrupt.db']),/rejected with SQLITE_CORRUPT/);
  options.push(check('probe',['--options']).split('\n').filter(x=>!x.startsWith('COMPILER=')).sort());
  let followupChecks={};
  if(followup&&im===imageId){
   assert.equal(check('session',['/fixtures/sqlite-session-corrupt.bin']),'SQLITE_SESSION_NORMAL_AND_CORRUPT_PASSED checks=5');
   if(s.suite==='trixie')assert.equal(check('secure-delete',['/fixtures/sqlite-secure-delete-corrupt.db']),'SQLITE_SECURE_DELETE_NORMAL_AND_CORRUPT_PASSED checks=3');
   followupChecks={sessionChecks:5,secureDeleteChecks:s.suite==='trixie'?3:0};
  }
  rows.push({imageId:im,passed:true,negativeRowidChecks:negativePassed?9:0,negativeRowidOutcome:negativePassed?'passed':'allocator-failure',previousDistinctChecks:5,syntheticBackupRestore:true,corruptFtsRejected:true,...followupChecks});
 }
 assert.deepEqual(abi[1].symbols,abi[0].symbols);assert.deepEqual(abi[1].needed,abi[0].needed);assert.deepEqual(options[1],options[0]);
 const b={...s,date:new Date().toISOString(),imageId,passed:true,packages,configurationUnchanged:true,unrelatedPackagesUnchanged:true,applicationSha256:hashes.application,etcSha256:hashes.configuration,unrelatedLibrariesSha256:hashes.libraries,librarySha256:abi[1].sha256,sourceReceiptSha256:pin.receiptSha256,nativeRows:rows,deployed:false};
 const n={date:new Date().toISOString(),passed:true,imageId,base:s.base,rows,abi,abiPreserved:true,neededPreserved:true,compileOptionsUnchanged:true,compileOptions:options,sourceReceiptSha256:pin.receiptSha256,network:'none',scope:'System SQLite library only; synthetic native database tests, not production data or all embedded SQLite copies'};
 proveSqlite(s,b,n,source);
 if(followup)proveSqliteFollowup(s,b,n,source);
 fs.writeFileSync(dir+'/build.json',JSON.stringify(b,null,2)+'\n');fs.writeFileSync(dir+'/native.json',JSON.stringify(n,null,2)+'\n');
 console.log(key+': native SQLite, previous repairs, ABI/options, backup/restore and unchanged application checks passed');
}
