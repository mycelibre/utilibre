// Reuse reviewed application fixtures, with exact bounded substitutions only.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash}from'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261103/js-nov',repo='/home/ubuntu/freetools',hash=x=>createHash('sha256').update(x).digest('hex');
const pins={'grist-decode':['deployment/maintenance/sandbox-final/check-grist.mjs','b5d2558a87182c80449464197d5d1d6e664653aff779cf29fd63c2bbb703e586'],rsshub:['deployment/maintenance/closure-review/check-kuma-rsshub.mjs','abae40b245d4cf1db19f02cea11747622313310b9dc122bfcfed84bc78c8d8fe'],admin:['deployment/maintenance/tanstack-20261021/check.mjs','b62665d9569f3a8fe6a2f1f622cfd9d6cb98d1bbcf77cf140a44d91a8f64a87e'],resume:['deployment/maintenance/security-20261028/check-zod-resume.mjs','7fcc5a0715cafc1798f6d1acc5cfe72884c2f66638a371376a1b5a8b327c7213'],gathio:['deployment/maintenance/go-closure/check-ferretdb.mjs','10ee66156e2e481b7eaeb79b24358e5cebb6593616537498d09a8cda9137b30a']};
const keys=process.argv.slice(2);assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>pins[k]));
for(const key of keys){const dir=root+'/'+key,b=JSON.parse(fs.readFileSync(dir+'/build.json'));assert(b.passed);assert(!fs.existsSync(dir+'/application.json'),'Preserve completed evidence');
 let source=fs.readFileSync(pins[key][0],'utf8');assert.equal(hash(source),pins[key][1]);const changes=[];
 const replace=(old,value,all=false)=>{const count=source.split(old).length-1;assert(all?count>0:count===1,'Fixture context changed: '+old);source=all?source.split(old).join(value):source.replace(old,value);changes.push({old,replacement:value,count});};
 if(key==='admin'){
  replace("import {base,candidate,target,sha,backport} from './backport.mjs';",`const base=${JSON.stringify(b.base)},candidate=${JSON.stringify(b.candidate)},target='/nitrate/apps/admin-console/.output/server/_ssr/ssr.mjs';`);
  replace("'/var/lib/utilibre-maintenance/tanstack-20261021'",JSON.stringify(dir));
  replace('maintenance-tanstack-','maintenance-js-nov-admin-',true);
  replace('rows[0].observations.every(r=>r.htmlInjected)','rows[0].observations.every(r=>!r.markerPresent&&r.status===401)');
  replace('Must reproduce actual GET/POST forged HTML, not count unrelated failure','Existing GET/POST authentication boundary must remain intact');
  replace('baselineReproduced:true','existingTanstackFixPreserved:true');
  replace("dir+'/native.json'","dir+'/application.json'");
  replace('Native forged-response baseline reproduced; patched GET/POST reject injection and normal server functions pass','Both states preserve forged-response rejection and legitimate server functions');
 }else if(key==='grist-decode'){
  replace("import {chromium} from '../../../portal/node_modules/playwright-core/index.mjs';", "import {chromium} from '/home/ubuntu/freetools/portal/node_modules/playwright-core/index.mjs';");
  replace("const oct28=['--oct28-body','--oct28-node'].includes(process.argv[3]),oct22=process.argv[3]==='--oct22',redirects=process.argv[4]==='--redirects';assert(process.argv.length<=5&&(!process.argv[3]||oct22||oct28)&&(!process.argv[4]||redirects));",'const oct28=true,oct22=false,redirects=false;');
  replace("const oct28Root='/var/lib/utilibre-maintenance/security-20261028/'+(process.argv[3]==='--oct28-body'?'body/grist-body':'node/grist');",'const oct28Root=__FIXTURE_ROOT__;');
  replace("const image=process.argv[2]||'utilibre-grist:1.7.21-deno297-security-20261011';",'const image=__APP_IMAGE__;');
  replace("const name='maintenance-grist-pyodide-stage';", "const name='maintenance-grist-decode-stage';");
 }else if(key==='resume')replace("'/var/lib/utilibre-maintenance/security-20261028/zod/resume'",JSON.stringify(dir));
 else if(key==='rsshub'){
  replace("import {specs,output} from '../js-closure/specs.mjs';","const specs=[],output='';");
  replace("const zod=process.argv[2]==='--zod'","const zod=true");
  replace("const postalRoot='/var/lib/utilibre-maintenance/security-20261028/'+(zod?'zod':markdown?'markdown':'postal');","const postalRoot=__FIXTURE_ROOT__;");
  replace("name='maintenance-closure-'+key","name='maintenance-js-nov-'+key");
 }else{
  replace("assert(process.argv.slice(2).every(a=>['--gathio-oct22','--oct28','--codec-oct28'].includes(a)));assert(process.argv.slice(2).length<=1);", "assert(process.argv.length===2);");
  replace("const gathioUpdate=process.argv.includes('--gathio-oct22');",'const gathioUpdate=true;');
  replace("const root=codec?'/var/lib/utilibre-maintenance/security-20261028/codec/ferretdb':oct28?'/var/lib/utilibre-maintenance/security-20261028/go-closure/ferretdb':gathioUpdate?'/var/lib/utilibre-maintenance/security-20261022/gathio':'/var/lib/utilibre-maintenance/go-closure-20261012/ferretdb';",'const root=__FIXTURE_ROOT__;');
  replace("prefix='maintenance-ferret-closure'","prefix='maintenance-js-nov-gathio'");
  replace("gathioUpdate?'utilibre-gathio:1.6.7-dom-toml-security-20261022':imageOf('utilibre-gathio-gathio-1')",'__APP_IMAGE__');
  replace("'cat','/tmp/gathio-fixture.json'","'node','-e',\"process.stdout.write(require('fs').readFileSync('/tmp/gathio-fixture.json','utf8'))\"");
  replace("'-e','FERRETDB_TELEMETRY=disable'","'-e','FERRETDB_TELEMETRY=disable','-e','FERRETDB_LISTEN_MCP_ADDR=','-e','OTEL_SDK_DISABLED=true'");
 }
 const environments=['gathio','rsshub','grist-decode'].includes(key)?[b.base,b.imageId]:[null],rows=[];
 for(const [i,image]of environments.entries()){
  const selected=dir+(image?'/app-'+i:'');fs.mkdirSync(selected,{recursive:true,mode:0o700});
  if(key==='grist-decode')fs.writeFileSync(selected+'/build.json',JSON.stringify({candidate:image,passed:true}));
  if(key==='rsshub'){fs.mkdirSync(selected+'/rsshub',{recursive:true});fs.writeFileSync(selected+'/rsshub/build.json',JSON.stringify({candidate:image}));}
  const adapted=image?source.replace('__FIXTURE_ROOT__',JSON.stringify(selected)).replace('__APP_IMAGE__',JSON.stringify(image)):source;
  const file=selected+'/application-fixture.mjs';fs.writeFileSync(file,adapted);
  fs.writeFileSync(selected+'/fixture-adapter.json',JSON.stringify({fixture:pins[key][0],sourceSha256:pins[key][1],adaptedSha256:hash(adapted),changes,image,scope:'Synthetic isolated native application workflows; no production credentials/data'},null,2)+'\n');
  const env={PATH:process.env.PATH,HOME:process.env.HOME,...(process.env.PLAYWRIGHT_BROWSERS_PATH?{PLAYWRIGHT_BROWSERS_PATH:process.env.PLAYWRIGHT_BROWSERS_PATH}:{})};
  const r=cp.spawnSync('node',[file],{cwd:repo,env,encoding:'utf8',timeout:600000,maxBuffer:4*1024**2});fs.writeFileSync(selected+'/application-command.log',String(r.stdout||'')+String(r.stderr||'')+String(r.error||''));
  assert(r.status===0&&!r.signal&&!r.error,key+': application gate failed; private diagnostics retained');
  if(image){const report=JSON.parse(fs.readFileSync(selected+(key==='grist-decode'?'/app.json':key==='rsshub'?'/rsshub/application.json':'/native.json')));assert(report.passed&&report.imageId===image);rows.push(report);}
 }
 if(['gathio','rsshub','grist-decode'].includes(key))fs.writeFileSync(dir+'/application.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:b.imageId,base:b.base,fixtureSha256:pins[key][1],network:'none/shared fictional loopback only',rows},null,2)+'\n');
 console.log(key+': existing native application checks passed before and after');
}
