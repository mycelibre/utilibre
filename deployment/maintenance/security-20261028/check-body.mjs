// Existing runtime packages, isolated before/after behavior and dependency contracts.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),semver=require('../../../portal/node_modules/semver');
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261028/body',data=JSON.parse(fs.readFileSync(new URL('./body-inputs.json',import.meta.url)));
const keys=process.argv.slice(2);assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>data.rows.some(s=>s.key===k)));
const inspect=`const fs=require('fs'),path=require('path'),{createRequire}=require('module');const rows=[],targets=JSON.parse(process.argv[2]),seen=new Set();for(const target of targets){if(seen.has(target))continue;seen.add(target);if(seen.size>500)throw Error('Dependency bound');const p=JSON.parse(fs.readFileSync(target+'/package.json')),r=createRequire(target+'/package.json');for(const [name,range]of Object.entries(p.dependencies||{})){let file;try{file=r.resolve(name+'/package.json');}catch(e){if(e.code!=='ERR_PACKAGE_PATH_NOT_EXPORTED')throw e;let dir=path.dirname(r.resolve(name));while(dir!=='/'&&!fs.existsSync(dir+'/package.json'))dir=path.dirname(dir);file=dir+'/package.json';}const dep=JSON.parse(fs.readFileSync(file));if(dep.name!==name)throw Error('Dependency identity mismatch');rows.push({target,name,range,version:dep.version,file});if(process.argv[3]==='recursive')targets.push(path.dirname(file));}}console.log(JSON.stringify(rows));`;
const limits=['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','256m','--memory-swap','256m','--pids-limit','64','--log-driver','none'];
for(const key of keys){
 const s=data.rows.find(s=>s.key===key),dir=root+'/'+key,b=JSON.parse(fs.readFileSync(dir+'/build.json'));assert(b.passed&&!fs.existsSync(dir+'/native.json'));
 const dependencies=JSON.parse(cp.execFileSync('docker',[...limits,'-i','--entrypoint','node',b.imageId,'-',JSON.stringify(Object.keys(b.versions)),s.dependencyBundle?'recursive':'direct'],{input:inspect,encoding:'utf8',timeout:30000,stdio:['pipe','pipe','pipe']}));
 for(const d of dependencies)assert(semver.satisfies(d.version,d.range),d.target+': incompatible '+d.name+' '+d.version+' '+d.range);
 const rows=[];
 for(const imageId of [s.base,b.imageId])for(const path of Object.keys(s.before).filter(p=>p.endsWith('/body-parser')))for(const mode of ['normal','regression']){
  const r=cp.spawnSync('docker',[...limits,'-v',new URL('./body-native.cjs',import.meta.url).pathname+':/test.cjs:ro','--entrypoint','node',imageId,'/test.cjs',path,mode],{encoding:'utf8',timeout:20000,maxBuffer:1024**2});
  fs.writeFileSync(dir+'/native-'+rows.length+'-'+Date.now()+'.log',r.stdout+r.stderr+String(r.error||''));assert(!r.error&&!r.signal,'Fixture timeout/error');
  const reproduced=mode==='regression'&&r.status===1&&r.stderr.includes("Unhandled 'error' event")&&r.stderr.includes('Z_DATA_ERROR');
  const passed=r.status===0&&(mode==='normal'?JSON.parse(r.stdout).normalChecks===7:r.stdout.trim()==='BODY_PARSER_TRAILING_BYTES_SURVIVED');
  if(imageId===b.imageId||mode==='normal')assert(passed,'Candidate or legitimate request failed');else assert(reproduced,'Unrelated baseline failure');
  rows.push({imageId,path,mode,exitCode:r.status,passed,regressionReproduced:reproduced});
 }
 fs.writeFileSync(dir+'/native.json',JSON.stringify({date:new Date().toISOString(),imageId:b.imageId,passed:true,dependencies,rows,network:'none; synthetic loopback only',source:'https://github.com/expressjs/body-parser/compare/1.20.8...1.20.9'},null,2)+'\n');console.log(key+': dependency contracts, legitimate requests and crash regression passed');
}
