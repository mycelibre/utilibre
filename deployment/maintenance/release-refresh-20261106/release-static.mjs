// Operator-only release of four exact, tested static applications. No build,
// downloads, account changes, shared dependency updates or automatic scheduling.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,cpSync,renameSync,existsSync,readdirSync,lstatSync,statfsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {existingComposeArgs,recreateExistingGroup,checkExistingGroup} from '../language-final/release.mjs';
process.umask(0o022);
const root='/var/lib/utilibre-maintenance/releases-20261106';
const specs={
 mapshaper:{source:'mapshaper-output',destination:'/opt/utilibre/pack-static/mapshaper-0.7.101-p1',old:'/opt/utilibre/pack-static/mapshaper-0.7.80-p1',name:'utilibre-pack-static-static-1',url:'https://maps.utilibre.org/',evidence:'mapshaper-checks/native.log'},
 calino:{source:'calino/dist',destination:'/opt/utilibre/calendar-static-0.42.0',old:'/opt/utilibre/calendar-static',name:'utilibre-calendar-calino-1',url:'https://calendar.utilibre.org/',evidence:'calino-checks/calino-browser-result.json'},
 'one-file-core':{source:'one-file-output',destination:'/opt/utilibre/toolbox-public/apps/one-file-core',url:'https://tools.utilibre.org/apps/one-file-core/',evidence:'one-file-checks/core-results.json'},
 'link-cleaner':{source:'link-cleaner/dist/site',destination:'/opt/utilibre/toolbox-public/apps/link-cleaner',url:'https://tools.utilibre.org/apps/link-cleaner/',evidence:'link-cleaner-checks/result.json'},
};
const key=process.argv[2],s=specs[key];assert(s&&process.argv[3]==='--apply');
const run=(cmd,args)=>execFileSync(cmd,args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:180000,maxBuffer:16*1024**2});
const inspect=n=>JSON.parse(run('docker',['inspect',n]))[0];
const digest=dir=>{const h=createHash('sha256');function visit(p){for(const n of readdirSync(dir+'/'+p).sort()){const f=p+n,st=lstatSync(dir+'/'+f);assert(!st.isSymbolicLink(),'Unexpected artifact symlink');if(st.isDirectory())visit(f+'/');else {assert(st.isFile());h.update(f).update('\0').update(readFileSync(dir+'/'+f)).update('\0');}}}visit('');return h.digest('hex');};
const evidence=JSON.parse(readFileSync(root+'/'+s.evidence));
if(key==='one-file-core'){assert(evidence.results.length===2);for(const r of evidence.results){assert(r.downloadEditSaveReopen&&r.scriptTextRoundTrip&&r.cspPreserved&&r.unsafeEncryptionCreationDisabled);assert.deepEqual(r.errors,[]);assert.deepEqual(r.externalRequests,[]);}}
else {assert.deepEqual(evidence.outside,[]);assert.deepEqual(evidence.errors,[]);if(key==='calino')assert(evidence.nativeConnection&&evidence.icsExport&&evidence.vcfExport);if(key==='link-cleaner')assert(evidence.profileRoundtrip&&evidence.redactedExport&&evidence.knownTrackersRemoved);if(key==='mapshaper')assert.equal(evidence.checks.length,3);}
const candidate=root+'/'+s.source,sha=digest(candidate),record=root+'/'+key+'-static-release.json';
const probe=()=>run('curl',['--fail','--silent','--show-error','--location','--max-time','20','--output','/dev/null',s.url]);
if(existsSync(record)){const r=JSON.parse(readFileSync(record));assert.equal(r.status,'passed');assert.equal(r.sha256,sha);assert.equal(digest(s.destination),sha);probe();console.log(key+': exact artifact already live; unchanged');process.exit(0);}
const fs=statfsSync(root);assert(fs.bavail*fs.bsize>5*1024**3);
let g,file,before,after;
if(s.name){const x=inspect(s.name),l=x.Config.Labels;g={project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),rows:[{name:s.name,service:l['com.docker.compose.service'],oldImage:x.Image,newImage:x.Image,oldContainerId:x.Id,oldRestartCount:x.RestartCount}],before:[]};assert.equal(g.files.length,1);file=g.files[0];before=readFileSync(file,'utf8');assert.equal(before.split(s.old+':').length,2);after=before.replace(s.old+':',s.destination+':');assert(!existsSync(s.destination));}
const staged=s.destination+'.candidate-20261106';assert(!existsSync(staged));cpSync(candidate,staged,{recursive:true});assert.equal(digest(staged),sha);
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
