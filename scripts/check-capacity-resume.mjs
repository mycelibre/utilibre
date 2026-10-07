// Synthetic signed-in CV round trips and PDF exports, two isolated QA users.
// All mutation targets must have been created by this invocation/run.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {chromium} from '../portal/node_modules/playwright-core/index.mjs';
const run=process.env.UTILIBRE_CAPACITY_CHECK_RUN;
assert.match(run||'',/^[a-z0-9]{1,12}$/);
const privateRoot='/opt/utilibre/identity-data/data/private/';
const users=JSON.parse(readFileSync(`${privateRoot}capacity-users-${run}.json`));
assert.equal(users.length,2);
for(const [i,u] of users.entries())assert.equal(u.username,`utilibre-cap-${i?'b':'a'}-${run}`);
const origin='https://cv.utilibre.org';
const report={at:new Date().toISOString(),scope:'Two synthetic real-SSO users; create, save/reopen, isolation, PDF export and cleanup. A workflow check, not an active-user capacity limit.',results:[],cleanup:[]};
const directory=`/opt/utilibre/reports/capacity-resume-${run}`;
mkdirSync(directory,{recursive:true,mode:0o700});
const save=()=>writeFileSync(`${directory}/results.json`,JSON.stringify(report,null,2)+'\n',{mode:0o600});
const browser=await chromium.launch();
const contexts=[],created=[];
async function call(index,path,method='GET',data){
  return contexts[index].request.fetch(origin+'/api/openapi'+path,{method,data,timeout:45000,headers:{origin}});
}
try{
  for(const user of users)contexts.push(await browser.newContext({storageState:`${privateRoot}${user.username}-browser.json`}));
  for(let i=0;i<2;i++){
    const name=`Utilibre capacity ${run} ${i}`;
    const response=await call(i,'/resumes','POST',{name,tags:[],withSampleData:false});
    assert.equal(response.status(),200,'Synthetic CV creation');
    const id=await response.json();assert.match(id,/^[a-zA-Z0-9_-]+$/);
    created.push({index:i,id,name});
    // Recovery manifest is private and contains ONLY this run's synthetic IDs.
    writeFileSync(`${privateRoot}capacity-records-${run}.json`,JSON.stringify(created),{mode:0o600});
    const own=await call(i,`/resumes/${id}`);assert.equal(own.status(),200);
    const document=await own.json();assert.equal(document.isPublic,false);
    document.data.basics.name=`Synthetic Candidate ${i}`;
    document.data.basics.headline='Capacity verification only; not a real applicant';
    const updated=await call(i,`/resumes/${id}`,'PUT',{data:document.data});assert.equal(updated.status(),200);
    const reopened=await call(i,`/resumes/${id}`);assert.equal((await reopened.json()).data.basics.name,`Synthetic Candidate ${i}`);
    const other=await call(1-i,`/resumes/${id}`);assert([403,404].includes(other.status()));
    report.results.push({user:i,created:true,savedAndReopened:true,privateByDefault:true,otherUserStatus:other.status()});save();
  }
  for(let round=1;round<=3;round++){
    const results=await Promise.all(created.map(async({index,id})=>{
      const start=performance.now(),response=await call(index,`/resumes/${id}/pdf`);
      assert.equal(response.status(),200,'PDF export must succeed');
      assert.match(response.headers()['content-type'],/application\/pdf/);
      const bytes=await response.body();assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
      assert(bytes.length>1000);
      return {user:index,round,pdfBytes:bytes.length,ms:Math.round(performance.now()-start)};
    }));
    report.results.push(...results);save();console.log(JSON.stringify({pdfExports:results}));
    if(round<3)await new Promise(r=>setTimeout(r,2000));
  }
  console.log('CV: two authenticated private documents saved/reopened; cross-user denial; six valid PDF exports.');
}catch(error){report.failed=String(error.message).replace(/https?:\/\/\S+/g,'[URL]').slice(0,200);process.exitCode=1;console.error(report.failed);}
finally{
  for(const {index,id,name} of created){
    try{
      const current=await call(index,`/resumes/${id}`);assert.equal(current.status(),200);assert.equal((await current.json()).name,name);
      assert.equal((await call(index,`/resumes/${id}`,'DELETE')).status(),200);
      assert.equal((await call(index,'/documents/purge','POST',{id,type:'resume'})).status(),200);
      assert.equal((await call(index,`/resumes/${id}`)).status(),404);
      report.cleanup.push({user:index,removed:true});
    }catch{report.cleanup.push({user:index,removed:false});process.exitCode=1;}
  }
  await browser.close();report.finishedAt=new Date().toISOString();save();
  console.log(`Synthetic CV cleanup: ${report.cleanup.filter(c=>c.removed).length}/${created.length}; REPORT ${directory}/results.json`);
}
