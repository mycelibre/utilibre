// Reuse bounded upstream workflow checks; no universal test framework.
import {spawn} from 'node:child_process';
import {mkdir,open,writeFile,rename} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const checks=[
 ['portal-en-es-mobile','scripts/check-maintenance-journeys.mjs',180],
 ['pdf-merge-ocr-en-es','deployment/toolbox/check-pdf-tools.mjs',240],
 ['charts-export','deployment/toolbox/check-browser-tools.mjs',90,'charts'],
 ['image-export','deployment/toolbox/check-browser-tools.mjs',90,'paint'],
 ['zip-roundtrip','deployment/toolbox/check-browser-tools.mjs',90,'zip'],
 ['qr-export-offline-mobile','deployment/community/check-qr-offline.mjs',150],
 ['pairdrop-direct','deployment/community/check-pairdrop.mjs',180],
 ['poll-create-vote-export-delete','deployment/community/check-pollaris.mjs',180],
];
export async function run(){
 const directory='/var/lib/utilibre-maintenance',output=directory+'/journeys';
 await mkdir(output,{recursive:true,mode:0o700});
 const results=[];
 for(const [id,script,seconds,...args]of checks){
  const log=await open(output+'/'+id+'.log','w',0o600),start=Date.now();
  const result=await new Promise(resolve=>{
   const child=spawn(process.execPath,[script,...args],{cwd:root,detached:true,stdio:['ignore',log.fd,log.fd],env:{...process.env,UTILIBRE_JOURNEY_REPORT_DIR:output}});
   let timedOut=false;
   const timer=setTimeout(()=>{timedOut=true;try{process.kill(-child.pid,'SIGTERM');}catch{}},seconds*1000);
   const force=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL');}catch{}},(seconds+10)*1000);
   child.on('error',()=>{clearTimeout(timer);clearTimeout(force);resolve({status:'failed',reason:'could not start'});});
   child.on('exit',code=>{clearTimeout(timer);clearTimeout(force);resolve({status:code===0&&!timedOut?'passed':'failed',reason:timedOut?'timeout':code===0?'workflow completed':'workflow failed'});});
  });
  await log.close();results.push({id,...result,seconds:Math.round((Date.now()-start)/1000)});
  console.log(id+': '+result.status);
 }
 const report={date:new Date().toISOString(),status:results.every(r=>r.status==='passed')?'passed':'failed',results,environment:'Linux Chromium; clean profiles, desktop and 390px mobile emulation; requests from the application VM',limitations:['Not physical phones, all browsers, all tools or a whole-host external check.','Only synthetic data; a failing cleanup must be resolved from its private fixture manifest.','SearXNG search is already checked by its existing daily guarded updater.']};
 await writeFile(directory+'/journeys.json.tmp',JSON.stringify(report,null,2)+'\n',{mode:0o600});await rename(directory+'/journeys.json.tmp',directory+'/journeys.json');
 if(report.status!=='passed')process.exitCode=1;
 return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await run();
