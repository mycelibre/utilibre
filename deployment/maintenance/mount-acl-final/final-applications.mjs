// Thin adapters to the existing complete, isolated native application fixtures.
import fs from 'node:fs';import assert from 'node:assert/strict';import cp from 'node:child_process';
import {root,sha,read,inspect} from './common.mjs';
process.umask(0o077);
const repo='/home/ubuntu/freetools';
for(const key of process.argv.slice(2)){
 assert(['actual','resume','cryptpad'].includes(key));const dir=root+'/images/'+key,s=read(dir+'/stage.json');assert.equal(inspect(s.candidate).Id,s.image);assert(!fs.existsSync(dir+'/application.json'));
 let input,code,file,command,args,env={...process.env};
 if(key==='actual'){
  input=repo+'/deployment/maintenance/npm-leaves/check-actual.py';code=fs.readFileSync(input,'utf8')
   .replace('ROOT=Path(__file__).resolve().parents[3]','ROOT=Path('+JSON.stringify(repo)+')')
   .replace(/assert args.image in \[[^\n]+\]/,'assert args.image == '+JSON.stringify(s.candidate));
  command='python3';file=root+'/reused-fixtures/actual-native.py';args=[file,'--image',s.candidate];
 }else if(key==='resume'){
  input=repo+'/deployment/expanded/check-resume-account-export.mjs';code=fs.readFileSync(input,'utf8')
   .replace("'../../portal/node_modules/playwright-core/index.mjs'",JSON.stringify(repo+'/portal/node_modules/playwright-core/index.mjs'))
   .replace('>= 5 * 1024 ** 3','>= 8 * 1024 ** 3');
  command=process.execPath;file=root+'/reused-fixtures/resume-native.mjs';args=[file];
  env.UTILIBRE_RESUME_EXPORT_IMAGE=s.candidate;env.UTILIBRE_RESUME_EXPORT_REPORT=dir+'/native-account';
 }else{
  input=repo+'/deployment/pack/check-cryptpad-export.mjs';code=fs.readFileSync(input,'utf8')
   .replace("const repo = path.resolve(new URL('../..', import.meta.url).pathname);",'const repo='+JSON.stringify(repo)+';')
   .replace("const runtimeImage=process.env.UTILIBRE_CRYPTPAD_CHECK_IMAGE||'utilibre-cryptpad-node:debian-security-20261011';",'const runtimeImage='+JSON.stringify(s.candidate)+';');
  const line=code.split('\n').find(l=>l.startsWith('assert([')&&l.endsWith('.includes(runtimeImage));'));assert(line);code=code.replace(line,'assert.equal(runtimeImage,'+JSON.stringify(s.candidate)+');');
  command=process.execPath;file=root+'/reused-fixtures/cryptpad-native.mjs';args=[file];
 }
 const original=fs.readFileSync(input);assert.notEqual(code,original.toString());if(fs.existsSync(file))assert.equal(fs.readFileSync(file,'utf8'),code);else fs.writeFileSync(file,code);
 const provenance={upstream:input,upstreamSha256:sha(original),adaptedSha256:sha(Buffer.from(code)),changes:['exact image pin','evidence/import paths','8 GiB disk floor'],applicationBehaviorUnchanged:true};fs.writeFileSync(file+'.provenance.json',JSON.stringify(provenance,null,2)+'\n');
 let text;
 try{text=cp.execFileSync(command,args,{encoding:'utf8',env,timeout:600000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']});fs.writeFileSync(dir+'/application.log',text);}catch(e){fs.writeFileSync(dir+'/application-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error(key+' isolated fixture failed; private diagnostics retained.');}
 let path,result;
 if(key==='actual'){
  const last=text.trim().split('\n').at(-1);path=JSON.parse(last).report+'/result.json';result=read(path);assert(result.passed&&result.nativeBudgetCreated&&result.nativeZipExportAndImport&&result.nativeServerSyncAndDownload);
 }else if(key==='cryptpad'){
  path=text.match(/Metadata evidence: (.+\/result\.json)/)?.[1];assert(path);result=read(path);assert(result.completed&&result.disposableStateRemoved);
 }else{
  path=dir+'/native-account/result.json';result=read(path);assert.equal(result.result,'passed');assert.equal(result.imageId,s.image);
 }
 fs.writeFileSync(dir+'/application.json',JSON.stringify({schema:1,date:new Date().toISOString(),passed:true,imageId:s.image,evidence:path,provenance,checks:result,productionChanged:false},null,2)+'\n');console.log(key+': existing complete native journey passed.');
}
