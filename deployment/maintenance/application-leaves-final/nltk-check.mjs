import fs from 'node:fs';import assert from 'node:assert/strict';
import {root,here,run,docker,json,save} from './common.mjs';
const weka=process.argv.includes('--weka-oct28'),d=weka?'/var/lib/utilibre-maintenance/security-20261028/nltk/kitchenowl':root+'/nltk',b=json(d+'/build.json'),results=[];assert(b.passed);
for(const[mode,image]of [['old',b.base],['new',b.imageId]]){
 const name='maintenance-nltk-'+mode;
 try{
 docker(['run','-d','--name',name,'--network','none','--read-only','--cpus','2','--memory','2g','--memory-swap','2g','--pids-limit','128','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--tmpfs','/tmp:rw,exec,size=96m,mode=1777','--tmpfs','/data:rw,size=128m,mode=1777','-e','HOME=/tmp','-e','UTILIBRE_SECURITY_DISPOSABLE=yes','-e','DATA_PATH=/data','-e','STORAGE_PATH=/data','-e','JWT_SECRET_KEY=fictional-test-key-with-at-least-thirty-two-bytes','-e','COLLECT_METRICS=false','-e','DISABLE_ONBOARDING=true','-v',here+':/checks:ro','-v',new URL('../xml-final/',import.meta.url).pathname+':/appchecks:ro','--entrypoint','sleep',image,'420']);
 const text=docker(['exec',name,'python','/checks/nltk-native.py',weka?'new':mode]);fs.writeFileSync(d+'/'+mode+'-native.log',text);const result=JSON.parse(text.split('NLTK_NATIVE_RESULT ')[1]);assert(result.passed);results.push({imageId:image,...result});
 if(mode==='new'){const app=docker(['exec','-e','PYTHONPATH=/usr/src/kitchenowl',name,'python','/appchecks/kitchenowl.py']);fs.writeFileSync(d+'/application.log',app);assert(app.includes('KITCHENOWL_NATIVE_PASSED'));}
 }catch(e){fs.writeFileSync(d+'/'+mode+'-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error(mode+': see private native error log');}
 finally{try{docker(['rm','-f',name])}catch{}}
}
save(d+(weka?'/application.json':'/checks.json'),{date:new Date().toISOString(),imageId:b.imageId,passed:true,results,nativeAccountIsolation:true,recipeImportExport:true,cleanedUp:true});console.log('NLTK old/new six-API regression, actual ingredient parser and isolated KitchenOwl workflow passed.');
