import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root='/var/lib/utilibre-maintenance/closure-followup-20261012',here=fileURLToPath(new URL('..',import.meta.url));
process.umask(0o077);
const rows=JSON.parse(fs.readFileSync(root+'/expat-stage.json')).rows;
const docker=args=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const runNode=(script,image)=>cp.execFileSync(process.execPath,[here+'/'+script,image],{encoding:'utf8',timeout:300000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']});
const out=[];
for(const row of rows){
 const name='maintenance-expat-'+row.key;
 try{
  assert.equal(docker(['image','inspect',row.candidate,'--format','{{.Id}}']),row.imageId);
  if(row.key==='grist'){runNode('sandbox-final/check-grist.mjs',row.candidate);out.push({...row,application:'native document, formula, account isolation, export and synthetic restore passed'});continue;}
  if(row.key==='forms'){runNode('check-liberaforms-cairosvg.mjs',row.candidate);out.push({...row,application:'native accounts, private forms, encryption and image/PDF conversion passed'});continue;}
  docker(['run','-d','--name',name,'--network','none','--log-driver','none','--cpus','1','--memory','1g','--pids-limit','128','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges',
   '--tmpfs','/tmp:rw,exec,size=96m,mode=1777','--tmpfs','/data:rw,size=128m,mode=1777',
   '-e','UTILIBRE_SECURITY_DISPOSABLE=yes','-e','DATA_PATH=/data','-e','STORAGE_PATH=/data','-e','JWT_SECRET_KEY=fictional-test-key-with-at-least-thirty-two-bytes','-e','COLLECT_METRICS=false','-e','DISABLE_ONBOARDING=true',
   '-v',here+':/checks:ro',...['3.11.17','3.13.16','3.14.6'].flatMap(v=>['-v',root+'/sources/Python-'+v+'/Lib:/python-lib-'+v+':ro']),'--entrypoint','sleep',row.candidate,'420']);
  const exec=(...a)=>docker(['exec',name,...a]);let application='XML bounds and unchanged application gates; full journey unchanged and not repeated';
  if(row.key==='penpot-backend'){
   const result=exec('python3','/checks/penpot-2.18.3/check-runtime-native.py');assert(JSON.parse(result).woff2Roundtrip);application='native PNG/JPEG/WebP thumbnails, synthetic font TTF/OTF/WOFF round trips';
  }
  if(row.key==='kitchenowl'){
   assert(docker(['exec','-e','PYTHONPATH=/usr/src/kitchenowl',name,'python','/checks/xml-final/kitchenowl.py']).includes('KITCHENOWL_NATIVE_PASSED'));application='native account isolation, household/recipe import/export/delete and XML';
  }
  if(row.key==='freshrss'){
   const cli=(...args)=>exec('php','/var/www/FreshRSS/cli/'+args.shift(),...args);
   cli('prepare.php');cli('do-install.php','--default-user','fictional','--db-type','sqlite','--auth-type','form','--environment','silent','--disable-update','true');
   cli('create-user.php','--user','fictional','--password','Fictional-only-not-production-2026','--no-default-feeds');
   assert(exec('php','/checks/xml-final/freshrss.php').includes('FRESHRSS_NATIVE_PASSED'));application='native account, saved fictional feed/article and OPML export';
  }
  if(['kitchenowl','priviblur','breezewiki'].includes(row.key)){
   const version=exec('python','-c','import platform;print(platform.python_version())');
   const result=docker(['exec','-w','/tmp','-e','PYTHONPATH=/python-lib-'+version,name,'python','-m','test','-v','test_pyexpat','test_xml_etree','test_xml_etree_c','test_minidom','test_sax']);
   fs.writeFileSync(root+'/'+row.key+'-python-xml-tests.log',result);assert(result.includes('SUCCESS'));application+='; CPython XML/ElementTree/DOM/SAX suites';
  }
  out.push({...row,application});console.log(row.key+': isolated native application gate passed');
 }catch(e){fs.writeFileSync(root+'/'+row.key+'-application-error.log',String(e.stdout||'')+String(e.stderr||'')+String(e));throw Error('Application gate failed: '+row.key+'; private diagnostic retained');}
 finally{if(docker(['ps','-aq','--filter','name=^/'+name+'$']))docker(['rm','-f',name]);}
 fs.writeFileSync(root+'/expat-apps.json',JSON.stringify({date:new Date().toISOString(),rows:out},null,2)+'\n');
}
fs.writeFileSync(root+'/expat-apps.json',JSON.stringify({date:new Date().toISOString(),status:'passed',rows:out},null,2)+'\n');
