// Reuse native FreshRSS restore + off-host Restic round trip, with synthetic input.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,writeFile,rename,open,readdir,readFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const exec=promisify(execFile),root=fileURLToPath(new URL('../../',import.meta.url));
const directory='/var/lib/utilibre-maintenance',reports=directory+'/recovery';
await mkdir(reports,{recursive:true,mode:0o700});
const results=[];
for(const [id,program,args]of [
 ['freshrss-native-restore','python3',['deployment/utilibre/tests/check-freshrss-restore.py']],
 ['storagebox-encrypted-roundtrip',process.execPath,['deployment/storagebox/test-restic.mjs','--remote','--maintenance']],
]){
 const log=await open(reports+'/'+id+'.log','w',0o600),started=Date.now();
 try{
  const {stdout,stderr}=await exec(program,args,{cwd:root,timeout:900000,maxBuffer:1024**2,env:{...process.env,UTILIBRE_RESTORE_EPHEMERAL:'1',UTILIBRE_RESTORE_REPORT_ROOT:reports}});
  await log.write(stdout+stderr);results.push({id,status:'passed',seconds:Math.round((Date.now()-started)/1000)});
 }catch(e){await log.write(String(e.stdout||'')+String(e.stderr||''));results.push({id,status:'failed'});}
 await log.close();console.log(id+': '+results.at(-1).status);
}
// Old *successful rehearsal artifacts only*: two weeks of synthetic evidence.
// Failed exercises are retained for cleanup review. Production backups excluded.
for(const entry of await readdir(reports,{withFileTypes:true})){
 if(!entry.isDirectory()||!/^freshrss-browser-restore-|^storagebox-remote-restore-/.test(entry.name))continue;
 try{
  const result=JSON.parse(await readFile(reports+'/'+entry.name+'/result.json','utf8'));
  if((result.passed||result.restoreBytes==='matched')&&Date.now()-Date.parse(result.checkedAt||result.date)>14*86400000)await rm(reports+'/'+entry.name,{recursive:true});
 }catch{/* A missing result never authorizes cleanup. */}
}
const report={date:new Date().toISOString(),status:results.every(x=>x.status==='passed')?'passed':'failed',results,limitations:['FreshRSS is the scheduled representative account restore, not every application or a whole-VM recovery.','Storage Box exercise restores only its own fictional snapshot; scheduled application uploads have separate freshness checks.','No real mobile hardware or human inbox delivery verification.']};
await writeFile(directory+'/recovery.json.tmp',JSON.stringify(report,null,2)+'\n',{mode:0o600});await rename(directory+'/recovery.json.tmp',directory+'/recovery.json');
if(report.status!=='passed')process.exitCode=1;
