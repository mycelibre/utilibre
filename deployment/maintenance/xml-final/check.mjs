import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/xml-final-20261011',recipe=fileURLToPath(new URL('.',import.meta.url));
const built=JSON.parse(readFileSync(dir+'/build.json')),results=[];
const docker=(args,options={})=>execFileSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:4*1024**2,stdio:['pipe','pipe','pipe'],...options});
const selected=process.argv.slice(2);assert(selected.every(kind=>built.rows.some(row=>row.kind===kind)));
for(const row of built.rows.filter(row=>!selected.length||selected.includes(row.kind))){
 const name='maintenance-xml-'+row.kind;mkdirSync(dir+'/'+row.kind,{recursive:true});
 const artifacts=row.suite==='trixie'?'/var/lib/utilibre-maintenance/native-final/libxml2-output':dir+'/bookworm';
 try{
  assert.equal(docker(['image','inspect',row.candidate,'--format','{{.Id}}']).trim(),row.candidateId);
  docker(['run','-d','--name',name,'--network','none','--log-driver','none','--cpus','1','--memory','1g','--pids-limit','128','--read-only',
   '--cap-drop','ALL','--security-opt','no-new-privileges:true','--tmpfs','/tmp:rw,exec,size=96m,mode=1777',
   '--tmpfs','/data:rw,size=128m,mode=1777','-e','UTILIBRE_SECURITY_DISPOSABLE=yes','-e','DATA_PATH=/data',
   '-e','STORAGE_PATH=/data','-e','JWT_SECRET_KEY=fictional-test-key-with-at-least-thirty-two-bytes',
   '-e','COLLECT_METRICS=false','-e','DISABLE_ONBOARDING=true','-e','LITELLM_LOCAL_MODEL_COST_MAP=true','-e','LITELLM_TELEMETRY=false',
   '--mount','type=bind,src='+recipe.replace(/\/$/,'')+',dst=/fixture,readonly',
   '--mount','type=bind,src='+artifacts+',dst=/abi,readonly','--entrypoint','sleep',row.candidate,'420']);
  assert.equal(docker(['exec',name,'dpkg-query','-W','-f=${Version}','libxml2']).trim(),row.version);
  assert.equal(docker(['exec',name,'dpkg','--audit']).trim(),'');
  for(const binary of ['old-abi-check','new-abi-check'])assert.match(docker(['exec',name,'/abi/'+binary]),/passed/);
  const libraryHash=docker(['exec',name,'sha256sum','/usr/lib/x86_64-linux-gnu/libxml2.so.2.9.14']).split(/\s/)[0];
  const checks=['actual native package installed','old-header/new-library allocator and parser','new-header/new-library allocator and parser'];
  if(row.kind==='kitchenowl'){
   const out=docker(['exec','-e','PYTHONPATH=/usr/src/kitchenowl',name,'python','/fixture/kitchenowl.py']);
   assert.match(out,/KITCHENOWL_NATIVE_PASSED/);checks.push('fresh native login; two-account export isolation; household/recipe import/export/delete; lxml XML/HTML');
  }
  if(row.kind==='freshrss'){
   // FreshRSS writes only its disposable data root; immutable upstream code untouched.
   const cli=(...args)=>docker(['exec',name,'php','/var/www/FreshRSS/cli/'+args.shift(),...args]);
   cli('prepare.php');
   cli('do-install.php','--default-user','fictional','--db-type','sqlite','--auth-type','form','--environment','silent','--disable-update','true');
   cli('create-user.php','--user','fictional','--password','Fictional-only-not-production-2026','--no-default-feeds');
   assert.match(docker(['exec',name,'php','/fixture/freshrss.php']),/FRESHRSS_NATIVE_PASSED/);
   cli('create-user.php','--user','fictionalcleanup','--password','Fictional-only-not-production-2026','--no-default-feeds');
   cli('delete-user.php','--user','fictionalcleanup');
   checks.push('fresh native installation/account; SimplePie RSS XML; saved fictional feed/article; DOM-validated native OPML export; deletion');
  }
  if(row.kind==='rssbridge'){
   assert.match(docker(['exec',name,'php','-r',' $d=new DOMDocument(); if(!$d->loadXML("<feed><title>Fictional</title></feed>",LIBXML_NONET))exit(1); if((new DOMXPath($d))->evaluate("string(/feed/title)")!=="Fictional")exit(2); $s=simplexml_load_string("<feed><title>Fictional</title></feed>"); if((string)$s->title!=="Fictional")exit(3); echo "PHP_XML_PASSED";']),/PHP_XML_PASSED/);
   checks.push('native PHP DOM, XPath, SimpleXML');
  }
  const result={kind:row.kind,image:row.candidate,imageId:row.candidateId,version:row.version,librarySha256:libraryHash,checkedAt:new Date().toISOString(),passed:true,network:'none',checks,
   limitations:row.kind==='authentik'?'Full native auth/OAuth gate is a separate required report':row.kind==='gathio'?'Native PostGIS/DocumentDB dump/restore is a separate required gate':'Synthetic native component/API gates, not a real-device browser check'};
  writeFileSync(dir+'/'+row.kind+'/native.json',JSON.stringify(result,null,2)+'\n');results.push(result);console.log('XML native gate passed: '+row.kind);
 }catch(error){writeFileSync(dir+'/'+row.kind+'/native-error.log',String(error.stdout||'')+String(error.stderr||'')+String(error));throw Error('Isolated XML native test failed for '+row.kind+'; private diagnostic retained');}
 finally{try{docker(['rm','-f',name]);}catch{}}
}
writeFileSync(dir+'/native-summary.json',JSON.stringify(results,null,2)+'\n');
