// Exercise native Penpot import/export in a disposable isolated stack.
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {readFile,writeFile,rm} from 'node:fs/promises';
const metadata=JSON.parse(execFileSync('python3',['deployment/expanded/prepare-penpot-roundtrip.py'],{encoding:'utf8',env:{...process.env,UTILIBRE_PENPOT_BACKEND_IMAGE:'utilibre-penpot-backend:libraries-security-20261011'}}));
assert.match(metadata.report,/^\/opt\/utilibre\/reports\/penpot-native-roundtrip-[a-z0-9_]+$/);
const compose=['compose','-f',metadata.report+'/compose.json'];
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:120000});
let relay;
try{
 docker(...compose,'up','-d','--pull','never');
 const ip=docker('inspect',metadata.name+'-penpot-frontend-1','--format','{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}').trim();
 relay=spawn('socat',[`TCP4-LISTEN:${metadata.port},bind=127.0.0.1,reuseaddr,fork`,`TCP4:${ip}:8080`],{detached:true,stdio:'ignore'});
 let ready=false;for(let i=0;i<120;i++){try{if((await fetch(`http://127.0.0.1:${metadata.port}/readyz`,{signal:AbortSignal.timeout(1500)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready,'Backend readiness');
 execFileSync('node',['deployment/expanded/check-penpot-roundtrip.mjs',metadata.report],{stdio:['ignore','pipe','pipe'],timeout:120000});
 console.log(JSON.stringify({status:'passed',report:metadata.report,checks:'Two fictional accounts, editable file export/import/reload, isolation and deletion'}));
}catch(e){await writeFile(metadata.report+'/candidate-error.txt',String(e.stderr||e.message),{mode:0o600});throw Error('Candidate failed; inspect private '+metadata.report+'/candidate-error.txt');}
finally{
 if(relay?.pid)try{process.kill(-relay.pid,'SIGTERM');}catch{}
 docker(...compose,'down','--volumes');
 assert.match(metadata.ram,/^\/dev\/shm\/utilibre-penpot-roundtrip-[a-z0-9_]+$/);await rm(metadata.ram,{recursive:true});
 await writeFile(metadata.report+'/cleanup.json',JSON.stringify({date:new Date().toISOString(),containersRemoved:true,relayStopped:true,syntheticRamRemoved:true}));
}
