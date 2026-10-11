import {test} from 'node:test';
import assert from 'node:assert/strict';
import {imageInventory,summarize,registryFallback,scannerManifestName,imageScanStatus} from './security-review.mjs';
import {reportIssues,queueIssues,externalIssues,alertState} from './report-health.mjs';
import {validateDecision,applyDecisions} from './triage.mjs';
import {findingsQueue,retainUnrechecked,recheckedTarget} from './build-queue.mjs';
import {probe,validResponse,targets} from './check-external.mjs';
const now=Date.parse('2026-10-11T12:00:00Z');
test('reviewed replacement npm locks keep the scanner-recognized filename',()=>{
 assert.equal(scannerManifestName('deployment/bookplate/security-package-lock.json'),'package-lock.json');
 assert.equal(scannerManifestName('portal/package-lock.json'),'package-lock.json');
 assert.equal(scannerManifestName('example/yarn.lock'),'yarn.lock');
 assert.equal(scannerManifestName('deployment/maintenance/auth-python-requirements.txt'),'requirements.txt');
 assert.equal(scannerManifestName('deployment/maintenance/linkding-python-requirements.txt'),'requirements.txt');
});
test('runtime images deduplicate by immutable ID, exclude other projects and omit environment',()=>{
 const id='sha256:'+'a'.repeat(64);
 const rows=['/utilibre-a','/utilibre-b','/unrelated'].map(Name=>({Name,Image:id,Config:{Image:'test:v1',Env:['SECRET=no']}}));
 const result=imageInventory(rows);assert.equal(result.length,1);assert.equal(result[0].containers.length,2);assert(!JSON.stringify(result).includes('SECRET'));
 assert.throws(()=>imageInventory([{...rows[0],Image:'latest'}]));
});
test('scanner summaries retain unfixed findings and distinguish package inventory from vulnerabilities',()=>{
 const result=summarize({Metadata:{OS:{EOSL:true}},Results:[{Type:'debian',Packages:[{},{}],Vulnerabilities:[{VulnerabilityID:'CVE-test',Severity:'HIGH',PkgName:'x',InstalledVersion:'1'}]}]});
 assert.equal(result.packages,2);assert.equal(result.counts.HIGH,1);assert.equal(result.findings[0].fixed,null);assert(result.eosl);
});
test('language packages cannot conceal a missing identified distribution inventory',()=>{
 const partial=summarize({Metadata:{OS:{Family:'debian',Name:'13.7'}},Results:[{Class:'os-pkgs',Type:'debian'},{Class:'lang-pkgs',Type:'jar',Packages:[{}]}]});
 assert.equal(partial.packages,1);assert.equal(partial.os.inventory,'missing');assert.equal(imageScanStatus(partial),'incomplete');
 const complete=summarize({Metadata:{OS:{Family:'alpine'}},Results:[{Class:'os-pkgs',Packages:[{}]}]});
 assert.equal(imageScanStatus(complete),'checked');
 assert.equal(imageScanStatus(summarize({Results:[]})),'incomplete');
 const standalone=summarize({Results:[{Class:'lang-pkgs',Type:'gobinary',Packages:[{}]}]});
 assert.equal(standalone.os.inventory,'not-detected');assert.equal(imageScanStatus(standalone),'checked');
});
test('stale, future, missing and failed reports are not healthy',()=>{
 for(const report of [null,{status:'passed',date:'bad'},{status:'passed',date:'2026-10-01'},{status:'passed',date:'2026-10-12'},{status:'failed',date:new Date(now).toISOString()}])assert(reportIssues('Tasks',report,36,now).length);
 assert.deepEqual(reportIssues('Tasks',{status:'passed',date:new Date(now).toISOString(),results:[{id:'export',status:'passed'}]},36,now),[]);
});
test('empty inventory cannot pass a vulnerability scan',()=>{
 assert(reportIssues('Vulnerability scan',{status:'checked',date:new Date(now).toISOString(),images:[],host:{packages:0}},36,now).length);
});
test('stable failures still alert when unrelated checks flap',()=>{
 const first=alertState({},['A','B'],now);assert.equal(first.due,false);
 const second=alertState(first,['A','C'],now+300000);assert.equal(second.due,true);assert.deepEqual(second.confirmed,['A']);
 const acknowledged={...second,alertedFingerprint:second.fingerprint,sentAt:now+300000};
 assert.equal(alertState(acknowledged,['A'],now+600000).due,false);
 assert.equal(alertState(acknowledged,[],now+600000).recovered,true);
 assert.equal(alertState(acknowledged,['A'],now+13*3600000).due,true);
});
test('external monitor freshness and disabled schedules produce explicit alerts',()=>{
 const runs={workflow_runs:[{status:'completed',conclusion:'success',updated_at:new Date(now).toISOString()}]};
 assert.deepEqual(externalIssues({state:'active'},runs,now),[]);
 assert(externalIssues({state:'disabled_inactivity'},runs,now).length);
 assert(externalIssues({state:'active'},runs,now+2*3600000).length);
 assert(externalIssues({state:'active'},{workflow_runs:[{...runs.workflow_runs[0],conclusion:'failure'}]},now).length);
});
test('queue deduplicates findings and preserves first seen/deadlines across repeated scans',()=>{
 const f={id:'CVE-test',package:'x',installed:'1',severity:'HIGH',fixed:null};
 const report={status:'checked',images:[{id:'image',findings:[f,f]}]};
 const one=findingsQueue(report,undefined,new Date(now).toISOString());assert.equal(one.items.length,1);
 const two=findingsQueue(report,one,new Date(now+86400000).toISOString());assert.equal(two.items[0].firstSeen,one.items[0].firstSeen);assert.equal(two.items[0].reviewBy,one.items[0].reviewBy);
 assert.equal(Date.parse(one.items[0].reviewBy)-now,72*3600000);
});
test('partial scan retires an old finding only when every affected replacement was scanned',()=>{
 const old={key:'old',scope:'runtime-image',artifact:'old-image',containers:['app-a','app-b']};
 const report={status:'incomplete',images:[{id:'new-image',status:'checked',containers:['app-a','app-b']},{id:'unrelated',status:'failed',containers:['app-c']}]};
 assert.equal(recheckedTarget(old,report),true);
 assert.deepEqual(retainUnrechecked({items:[]},report,{items:[old]}),[]);
 for(const images of [[],[{id:'new-image',status:'checked',containers:['app-a']}],[{id:'new-image',status:'incomplete',containers:['app-a','app-b']}],[{id:'old-image',status:'failed',containers:['app-a','app-b']}]]){
  assert.equal(recheckedTarget(old,{images}),false);
  assert.equal(retainUnrechecked({items:[]},{images},{items:[old]})[0].status,'not-rechecked');
 }
});
test('host/source partial-scan reconciliation requires a checked matching scope and name',()=>{
 const source={scope:'tracked-build-input',targetName:'app/package-lock.json'};
 assert(recheckedTarget(source,{sources:[{name:source.targetName,scope:source.scope,status:'checked'}]}));
 assert(!recheckedTarget(source,{sources:[{name:source.targetName,scope:'mounted-runtime-code',status:'checked'}]}));
 assert(!recheckedTarget(source,{sources:[]}));
 assert(recheckedTarget({scope:'host-os'},{host:{status:'checked'}}));
 assert(!recheckedTarget({scope:'host-os'},{host:{status:'failed'}}));
});
test('review decisions require an exact key, evidence and bounded expiry',()=>{
 const good={key:'a'.repeat(64),status:'not-affected',reason:'Synthetic unit-test evidence only; never a live decision.',expiresAt:new Date(now+86400000).toISOString()};
 assert.equal(validateDecision(good,now).status,'not-affected');
 for(const changes of [{key:'*'},{status:'ignore'},{reason:'fine'},{expiresAt:new Date(now+31*86400000).toISOString()}])assert.throws(()=>validateDecision({...good,...changes},now));
 assert.equal(applyDecisions([{key:good.key,status:'needs-review'}],[validateDecision(good,now)],now)[0].status,'not-affected');
 assert.equal(applyDecisions([{key:good.key,status:'needs-review'}],[good],now)[0].status,'needs-review');
 assert.equal(applyDecisions([{key:good.key,status:'needs-review'}],[good],now+2*86400000)[0].status,'needs-review');
});
test('runtime rebuild changes the review key without resetting an unchanged finding deadline',()=>{
 const f={id:'CVE-test',package:'x',installed:'1',severity:'HIGH'};
 const report={status:'checked',images:[{id:'image-before',containers:['utilibre-synthetic'],findings:[f]}]};
 const before=findingsQueue(report,undefined,new Date(now).toISOString());
 const after=findingsQueue({...report,images:[{...report.images[0],id:'image-after'}]},before,new Date(now+86400000).toISOString());
 assert.notEqual(before.items[0].key,after.items[0].key);
 assert.equal(before.items[0].reviewBy,after.items[0].reviewBy);
 assert.equal(after.items[0].status,'needs-review');
});
test('changed source-manifest hash reopens review and preserves unchanged package deadline',()=>{
 const f={id:'CVE-test',package:'x',installed:'1',severity:'HIGH'};
 const report={status:'checked',sources:[{name:'synthetic/package-lock.json',sha256:'a'.repeat(64),findings:[f]}]};
 const before=findingsQueue(report,undefined,new Date(now).toISOString());
 const after=findingsQueue({...report,sources:[{...report.sources[0],sha256:'b'.repeat(64)}]},before,new Date(now+86400000).toISOString());
 assert.notEqual(before.items[0].key,after.items[0].key);
 assert.equal(before.items[0].reviewBy,after.items[0].reviewBy);
});
test('registry fallback cannot silently scan another image or registry',()=>{
 const id='sha256:ab9b4e8cc4ab3f8d1198d2db6aeea66bafea1963b3f2843589e0d163f97d9849';
 const item={id,references:['ghcr.io/goauthentik/server:2026.8.3']};
 assert.equal(registryFallback(item),'ghcr.io/goauthentik/server@'+id);
 assert.equal(registryFallback({...item,id:'sha256:'+'0'.repeat(64)}),null);
 assert.equal(registryFallback({...item,references:['evil.invalid/server:2026.8.3']}),null);
 const rss='sha256:967194b8f73a1251b2a566f91b457bc872c1bbaf343827a455ade760b9693bf6';
 assert.equal(registryFallback({id:rss,references:['ghcr.io/diygod/rsshub:2026-10-11@'+rss]}),'ghcr.io/diygod/rsshub@'+rss);
 assert.equal(registryFallback({id:rss,references:['ghcr.io/diygod/rsshub:latest']}),null);
});
test('expired exceptions alert again; an incomplete queue never clears alerts',()=>{
 const scan={date:new Date(now).toISOString()};
 const queue={scanDate:scan.date,status:'current',items:[{severity:'HIGH',status:'mitigated',decision:{expiresAt:new Date(now+60000).toISOString()},reviewBy:new Date(now+86400000).toISOString()}]};
 assert.deepEqual(queueIssues(queue,scan,now),[]);
 assert(queueIssues(queue,scan,now+120000).length);
 assert(queueIssues({...queue,status:'incomplete'},scan,now).length);
});
test('public checks require successful HTTP and expected content',()=>{
 assert.equal(validResponse({status:503},'BentoPDF',/BentoPDF/),false);
 assert.equal(validResponse({status:200},'Just a moment',/BentoPDF/),false);
 assert.equal(validResponse({status:200},'BentoPDF',/BentoPDF/),true);
 assert(targets.every(([,url])=>new URL(url).protocol==='https:'));
});
test('native identity redirect passes without following it or fetching other origins',async()=>{
 const result=await probe(['identity','https://auth.utilibre.org/',/authentik/],async()=>new Response(null,{status:302,headers:{location:'/flows/-/default/authentication/?next=/'}}));
 assert.equal(result.status,'passed');
});
test('external probe refuses unexpected redirect and bounds response data',async()=>{
 for(const request of [async()=>new Response(null,{status:302,headers:{location:'https://evil.invalid/'}}),async()=>new Response('x'.repeat(1024**2+1),{status:200})])assert.equal((await probe(['identity','https://auth.utilibre.org/',/x/],request)).status,'failed');
});
