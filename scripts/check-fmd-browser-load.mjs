// Read-only public browser navigation, one/shared-IP users. No GPS or accounts.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '../portal/node_modules/playwright-core/index.mjs';
const base='https://fmd.utilibre.org';
const report={at:new Date().toISOString(),scope:'Full cold browser homepage loads from one source IP; no registration, GPS, API writes or external load generator.',phases:[]};
const browser=await chromium.launch();
try {
  for(const users of [1,3,8]) {
    const contexts=[],responses=[],external=new Set(),errors=[],visits=[];
    await Promise.all(Array.from({length:users},async()=>{
      const context=await browser.newContext();contexts.push(context);
      const page=await context.newPage();
      page.on('response',r=>{const u=new URL(r.url());if(u.origin===base)responses.push({path:u.pathname,status:r.status()});});
      page.on('request',r=>{const u=new URL(r.url());if(/^https?:$/.test(u.protocol)&&u.origin!==base)external.add(u.origin);});
      page.on('pageerror',e=>errors.push(String(e.message).slice(0,160)));
      const start=performance.now();
      try {
        await page.goto(base,{waitUntil:'networkidle',timeout:25000});
        visits.push({ms:Math.round(performance.now()-start),formInputs:await page.locator('input').count()});
      } catch { visits.push({failed:true}); }
    }));
    const phase={users,requests:responses.length,statuses:responses.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{}),rejectedPaths:[...new Set(responses.filter(r=>r.status>=400).map(r=>r.path))],external:[...external],pageErrors:errors,visits};
    report.phases.push(phase);console.log(JSON.stringify(phase));
    await Promise.all(contexts.map(c=>c.close()));
    assert.equal(external.size,0,'Unexpected third-party browser request');
    if(process.argv.includes('--expect-clean')){
      assert(responses.every(r=>r.status===200),'All homepage assets must load');
      assert(visits.every(v=>!v.failed&&v.formInputs===3),'Every browser must finish the login form');
      assert.equal(errors.length,0,'No application JS errors');
    }
    // Drain the original 60-token / 5rps burst between independent stages.
    if(users!==8)await new Promise(r=>setTimeout(r,15000));
  }
} finally {
  await browser.close();
  const directory=`/opt/utilibre/reports/fmd-browser-${report.at.replace(/[:.]/g,'-')}`;
  mkdirSync(directory,{recursive:true,mode:0o700});
  writeFileSync(`${directory}/results.json`,JSON.stringify(report,null,2)+'\n',{mode:0o600});
  console.log(`REPORT ${directory}/results.json`);
}
