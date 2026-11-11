// Operator-only release of four exact, tested static applications. No build,
// downloads, account changes, shared dependency updates or automatic scheduling.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,cpSync,renameSync,existsSync,readdirSync,lstatSync,statfsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {existingComposeArgs,recreateExistingGroup,checkExistingGroup} from '../language-final/release.mjs';
import {acquireReleaseLock} from '../security-20261103/release-lock.mjs';
process.umask(0o022);
const november9=process.argv.includes('--nov9');
const texlyre=process.argv.includes('--texlyre-nov11'),grid=process.argv.includes('--grid-nov11');assert([november9,texlyre,grid].filter(Boolean).length<=1);
if(texlyre||grid)process.on('exit',acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock'));
const root=grid?'/var/lib/utilibre-maintenance/upgrade-closure-20261111/grid':texlyre?'/var/lib/utilibre-maintenance/stabilization-20261111/texlyre':november9?'/var/lib/utilibre-maintenance/security-20261109':'/var/lib/utilibre-maintenance/releases-20261106';
const specs={
 mapshaper:{source:'mapshaper-output',destination:'/opt/utilibre/pack-static/mapshaper-0.7.101-p1',old:'/opt/utilibre/pack-static/mapshaper-0.7.80-p1',name:'utilibre-pack-static-static-1',url:'https://maps.utilibre.org/',evidence:'mapshaper-checks/native.log'},
 calino:{source:'calino/dist',destination:'/opt/utilibre/calendar-static-0.42.0',old:'/opt/utilibre/calendar-static',name:'utilibre-calendar-calino-1',url:'https://calendar.utilibre.org/',evidence:'calino-checks/calino-browser-result.json'},
 'one-file-core':{source:'one-file-output',destination:'/opt/utilibre/toolbox-public/apps/one-file-core',url:'https://tools.utilibre.org/apps/one-file-core/',evidence:'one-file-checks/core-results.json'},
 'link-cleaner':{source:'link-cleaner/dist/site',destination:'/opt/utilibre/toolbox-public/apps/link-cleaner',url:'https://tools.utilibre.org/apps/link-cleaner/',evidence:'link-cleaner-checks/result.json'},
 chartdb:{source:'chartdb-source/dist',destination:'/opt/utilibre/toolbox-public/apps/chartdb',url:'https://tools.utilibre.org/apps/chartdb/',evidence:'chartdb-checks/result.json'},
 drawdb:{source:'drawdb-source/dist',destination:'/opt/utilibre/toolbox-public/apps/drawdb',url:'https://tools.utilibre.org/apps/drawdb/',evidence:'drawdb-checks/result.json'},
 texlyre:{source:'source/dist',destination:'/opt/utilibre/toolbox-public/apps/texlyre',url:'https://latex.utilibre.org/',evidence:'browser/inspection.json'},
 grid:{source:'output',destination:'/opt/utilibre/creative-batch/sites/grid',url:'https://grid.utilibre.org/kiri/',evidence:'browser/grid-task.json'},
};
const key=process.argv[2],s=specs[key];assert(s&&process.argv[3]==='--apply');
assert(grid?key==='grid':texlyre?key==='texlyre':november9?['chartdb','drawdb'].includes(key):!['chartdb','drawdb','texlyre','grid'].includes(key));
const run=(cmd,args)=>execFileSync(cmd,args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:180000,maxBuffer:16*1024**2});
const inspect=n=>JSON.parse(run('docker',['inspect',n]))[0];
const digest=dir=>{const h=createHash('sha256');function visit(p){for(const n of readdirSync(dir+'/'+p).sort()){const f=p+n,st=lstatSync(dir+'/'+f);assert(!st.isSymbolicLink(),'Unexpected artifact symlink');if(st.isDirectory())visit(f+'/');else {assert(st.isFile());h.update(f).update('\0').update(readFileSync(dir+'/'+f)).update('\0');}}}visit('');return h.digest('hex');};
const evidence=JSON.parse(readFileSync(root+'/'+s.evidence));
if(grid){assert(!evidence.failure&&evidence.checks.length===1);assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.external,[]);assert.deepEqual(evidence.nonGet,[]);}
else if(key==='one-file-core'){assert(evidence.results.length===2);for(const r of evidence.results){assert(r.downloadEditSaveReopen&&r.scriptTextRoundTrip&&r.cspPreserved&&r.unsafeEncryptionCreationDisabled);assert.deepEqual(r.errors,[]);assert.deepEqual(r.externalRequests,[]);}}
else {assert.deepEqual(evidence.outside,[]);assert.deepEqual(evidence.errors,[]);if(key==='calino')assert(evidence.nativeConnection&&evidence.icsExport&&evidence.vcfExport);if(key==='link-cleaner')assert(evidence.profileRoundtrip&&evidence.redactedExport&&evidence.knownTrackersRemoved);if(key==='mapshaper')assert.equal(evidence.checks.length,3);}
const candidate=root+'/'+s.source,sha=digest(candidate),record=root+'/'+key+'-static-release.json';
if(grid){
 const proof=JSON.parse(readFileSync(new URL('../releases-20261111/grid-upgrade.json',import.meta.url)));
 assert(proof.approved&&proof.revision==='ff7692241c48c3495da0bb8eb7455f906f3abb2d');assert.equal(sha,proof.staticSha256);
 const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
 assert.equal(hash(root+'/source.tar.gz'),proof.sourceArchiveSha256);assert.equal(hash(root+'/source/package-lock.json'),proof.lockSha256);
 for(const [p,h]of Object.entries(proof.evidence)){assert(!p.includes('..')&&!p.startsWith('/'));assert.equal(hash(root+'/'+p),h);}
 for(const [p,h]of Object.entries(proof.recipes)){assert(p.startsWith('deployment/')&&!p.includes('..'));assert.equal(hash(new URL('../../../'+p,import.meta.url)),h);}
 const age=Date.now()-Date.parse(proof.databaseUpdatedAt);assert(age>=0&&age<48*3600000);
 const scan=JSON.parse(readFileSync(root+'/browser-source-scan.json'));assert(scan.Results.some(r=>r.Type==='npm'&&r.Packages.length===250));
 assert(!scan.Results.flatMap(r=>r.Vulnerabilities||[]).some(v=>['HIGH','CRITICAL'].includes(v.Severity)));
}
if(texlyre){
 const proof=JSON.parse(readFileSync(root+'/candidate.json'));
 assert(proof.passed&&proof.revision==='697759981a2a7291fdd3855ea6e09cc6ca5c7723');
 assert.equal(sha,proof.staticSha256);
 assert(Date.now()-Date.parse(proof.date)<86400000);
 assert(Date.now()-Date.parse(proof.databaseUpdatedAt)<48*3600000);
 for(const [path,hash]of Object.entries(proof.evidence)){
  assert(/^[a-zA-Z0-9/._-]+$/.test(path)&&!path.split('/').includes('..'));
  assert.equal(createHash('sha256').update(readFileSync(root+'/'+path)).digest('hex'),hash);
 }
 for(const p of [evidence,JSON.parse(readFileSync(root+'/migration/inspection.json'))]){
  assert(p.passed&&p.productionChanged===false);
  for(const k of ['guestProject','compiledPdfAccentsFormula','projectExportImport','localAccountUpgrade','reloadPersistence'])assert(p[k]);
  assert.deepEqual(p.outside,[]);assert.deepEqual(p.errors,[]);
 }
 assert(JSON.parse(readFileSync(root+'/migration/inspection.json')).migrationFrom013);
 assert(proof.npmCriticalHigh===0&&proof.otherLockAliasVerified);
}
if(key==='drawdb'){
 for(const k of ['nativeSqlImport','nativeSqlExport','jsonRoundtrip','reloadPersistence','sharingDisabled'])assert(evidence[k],k);
 assert(evidence.requests.every(r=>r.method==='GET'));
 assert.equal(evidence.storage.sentinel,'fictional-other-app-sentinel');
 assert.equal(evidence.storage.bookmarks,'["fictional-sentinel"]');
 const replay=JSON.parse(readFileSync(root+'/drawdb-replay.json'));
 assert(replay.passed&&replay.revision==='a249c7fb730c2de9b5c2ce6e863f2ea7344ac372');
 assert.equal(createHash('sha256').update(readFileSync(root+'/drawdb-source/package-lock.json')).digest('hex'),replay.lockSha256);
 assert.equal(createHash('sha256').update(readFileSync(new URL('../../toolbox/drawdb-local-source.patch',import.meta.url))).digest('hex'),replay.patchSha256);
 const scan=JSON.parse(readFileSync(root+'/drawdb-source-scan.json'));
 assert(scan.Results.some(r=>r.Type==='npm'));
 assert(!scan.Results.flatMap(r=>r.Vulnerabilities||[]).some(v=>['CRITICAL','HIGH'].includes(v.Severity)));
}
if(key==='chartdb'){
 assert.match(evidence.nativeSql,/CREATE TABLE "public"\."authors"/);
 assert.match(evidence.nativeSql,/FOREIGN KEY\("author_id"\)/);
 assert(evidence.backup.tables.length===2&&evidence.requests.every(r=>r.method==='GET'));
 const scan=JSON.parse(readFileSync(root+'/chartdb-source-scan.json'));
 assert(scan.Results.some(r=>r.Type==='npm'));
 assert(!scan.Results.flatMap(r=>r.Vulnerabilities||[]).some(v=>['CRITICAL','HIGH'].includes(v.Severity)));
}
const probe=()=>run('curl',['--fail','--silent','--show-error','--location','--max-time','20','--output','/dev/null',s.url]);
if(existsSync(record)){const r=JSON.parse(readFileSync(record));assert.equal(r.status,'passed');assert.equal(r.sha256,sha);assert.equal(digest(s.destination),sha);probe();console.log(key+': exact artifact already live; unchanged');process.exit(0);}
const fs=statfsSync(root);assert(fs.bavail*fs.bsize>5*1024**3);
let g,file,before,after;
if(s.name){const x=inspect(s.name),l=x.Config.Labels;g={project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),rows:[{name:s.name,service:l['com.docker.compose.service'],oldImage:x.Image,newImage:x.Image,oldContainerId:x.Id,oldRestartCount:x.RestartCount}],before:[]};assert.equal(g.files.length,1);file=g.files[0];before=readFileSync(file,'utf8');assert.equal(before.split(s.old+':').length,2);after=before.replace(s.old+':',s.destination+':');assert(!existsSync(s.destination));}
const staged=s.destination+'.candidate-'+(grid||texlyre?'20261111':november9?'20261109':'20261106');assert(!existsSync(staged));cpSync(candidate,staged,{recursive:true});assert.equal(digest(staged),sha);
const backup=root+'/'+key+'-previous-public-assets';let moved=false,wrote=false;
const receipt={date:new Date().toISOString(),key,sha256:sha,evidence:s.evidence,destination:s.destination,previous:s.old||backup,status:'applying'};
writeFileSync(record,JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
try{
 if(g){renameSync(staged,s.destination);writeFileSync(file,after);wrote=true;run('docker',[...existingComposeArgs(g),'config','--quiet']);await recreateExistingGroup(g);await checkExistingGroup(g,'new');}
 else {assert(!existsSync(backup));renameSync(s.destination,backup);moved=true;renameSync(staged,s.destination);}
 probe();assert.equal(digest(s.destination),sha);receipt.status='passed';
}catch(e){
 receipt.status='failed';receipt.rollback='attempted';
 if(g&&wrote){assert.equal(readFileSync(file,'utf8'),after);writeFileSync(file,before);await recreateExistingGroup(g);await checkExistingGroup(g,'old');}
 if(!g&&moved){if(existsSync(s.destination))renameSync(s.destination,staged);renameSync(backup,s.destination);}
 probe();receipt.rollback='verified';throw e;
}finally{writeFileSync(record,JSON.stringify(receipt,null,2)+'\n',{mode:0o600});}
console.log(key+': exact tested static files released; public route passed; previous files retained');
