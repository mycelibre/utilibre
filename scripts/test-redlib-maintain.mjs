// Offline decisions and transactional release faults. No Docker/network/mail.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ROOT,command,sha,validateApproval,decide,normalizedFindings,checkScans,selectedLines,replaceLines,validateRuntimeDiff,validateJournal,activate} from './redlib-maintain.mjs';
import {redlibUpdateIssues} from '../deployment/maintenance/report-health.mjs';
const root=new URL('../',import.meta.url),bytes=readFileSync(new URL('config/redlib/recipe.json',root)),recipe=JSON.parse(bytes),policy=JSON.parse(readFileSync(new URL('config/redlib/update-policy.json',root)));
const readPatch=p=>readFileSync(new URL('config/redlib/'+p,root));
const check=(r=recipe,p=policy,b=bytes,read=readPatch)=>validateApproval(r,p,b,read);
test('exact recipe, ordered patches and source approval validate',()=>check());
test('changed recipe and patches require review',()=>{
 assert.throws(()=>check(recipe,policy,Buffer.concat([bytes,Buffer.from('\n')])));
 assert.throws(()=>check(recipe,policy,bytes,()=>Buffer.from('modified')));
 assert.throws(()=>check({...recipe,automaticDeployment:false}));
 assert.throws(()=>check(recipe,{...policy,approval:'proposed'}));
});
test('approval cannot choose another repository, scope or migration',()=>{
 for(const changes of [{source:{...recipe.source,origin:'https://evil.invalid/redlib'}},{deploymentScope:['redlib','portal']},{migration:'automatic'}]){
  const r={...recipe,...changes},b=Buffer.from(JSON.stringify(r));assert.throws(()=>check(r,{...policy,recipeSha256:sha(b)},b));
 }
});
test('unknown head stops; exact active image needs no deployment',()=>{
 assert.equal(decide(recipe.source.revision,recipe.candidate.imageId,recipe),'up-to-date');
 assert.equal(decide(recipe.source.revision,recipe.runtime.imageId,recipe),'approved-update');
 assert.equal(decide('f'.repeat(40),recipe.candidate.imageId,recipe),'review-required');
 assert.throws(()=>decide('main',recipe.candidate.imageId,recipe));assert.throws(()=>decide(recipe.source.revision,'sha256:'+'0'.repeat(64),recipe));
});
test('runtime init exception is exact, not a writable-layer exemption',()=>{
 const diff='C /usr\nC /usr/sbin\nA /usr/sbin/docker-init',h='a'.repeat(64);
 validateRuntimeDiff('',false,'','');validateRuntimeDiff(diff,true,h,h);
 for(const bad of [diff+'\nC /usr/local/bin/redlib',diff.replace('A /','C /'),'/arbitrary'])assert.throws(()=>validateRuntimeDiff(bad,true,h,h));
 assert.throws(()=>validateRuntimeDiff(diff,false,h,h));assert.throws(()=>validateRuntimeDiff(diff,true,h,'b'.repeat(64)));
});
const now=Date.parse('2026-10-29T12:00:00Z');
const vuln={VulnerabilityID:'CVE-fixture',PkgName:'synthetic',InstalledVersion:'1',FixedVersion:'2',Severity:'MEDIUM',Status:'affected'};
const scan=(type,v=[])=>({Results:[{Class:'lang-pkgs',Type:type,Packages:[{Name:'synthetic',Version:'1'}],Vulnerabilities:v}]});
const runtime=scan('os',[vuln]),cargo=scan('cargo'),security={maxDatabaseAgeHours:48,runtimePackages:1,cargoPackages:1,findingsSha256:sha(JSON.stringify(normalizedFindings([runtime,cargo])))};
const db={UpdatedAt:'2026-10-29T00:00:00Z'};
test('same recorded findings yield stable decisions',()=>{
 assert.equal(checkScans(runtime,cargo,security,db,now).findings,1);
 const a=scan('os',[vuln,{...vuln,VulnerabilityID:'CVE-second'}]);const b=scan('os',[...a.Results[0].Vulnerabilities].reverse());assert.deepEqual(normalizedFindings([a,cargo]),normalizedFindings([cargo,b]));
});
test('new or changed findings, even lower severity, block',()=>{
 assert.throws(()=>checkScans(scan('os',[{...vuln,Severity:'CRITICAL'}]),cargo,security,db,now));
 assert.throws(()=>checkScans(runtime,scan('cargo',[{...vuln,Severity:'LOW'}]),security,db,now));
});
test('missing/malformed scans, extraction loss and stale data cannot pass',()=>{
 for(const bad of [{},{Results:[]},{Results:[{Packages:[]}]},{Results:[{Packages:[{}],Vulnerabilities:'invalid'}]}])assert.throws(()=>checkScans(bad,cargo,security,db,now));
 assert.throws(()=>checkScans(runtime,cargo,{...security,cargoPackages:2},db,now));
 for(const date of ['invalid','2026-10-20T00:00:00Z','2026-11-01T00:00:00Z'])assert.throws(()=>checkScans(runtime,cargo,security,{UpdatedAt:date},now));
});
test('pin update and rollback preserve unrelated private settings exactly',()=>{
 const text='OTHER=synthetic\nREDLIB_IMAGE=utilibre-redlib:old\nAFTER=keep\n';const old=selectedLines(text);
 const next={REDLIB_IMAGE:'REDLIB_IMAGE=utilibre-redlib:new',REDLIB_BANNER:'REDLIB_BANNER=public-source'};const changed=replaceLines(text,next);
 assert(changed.includes('OTHER=synthetic\n'));assert(changed.includes('AFTER=keep\n'));assert.equal(replaceLines(changed,old),text);
 assert.equal(replaceLines(changed,next),changed);
});
test('environment duplicates, newline injection and unexpected keys rejected',()=>{
 assert.throws(()=>selectedLines('REDLIB_IMAGE=a\nexport REDLIB_IMAGE=b\n'));
 assert.throws(()=>replaceLines('X=y\n',{REDLIB_IMAGE:'REDLIB_IMAGE=a\nSECRET=x',REDLIB_BANNER:null}));
 assert.throws(()=>replaceLines('X=y\n',{REDLIB_IMAGE:'UNRELATED=change',REDLIB_BANNER:null}));
});
function transaction(fail){
 const events=[],j={group:{project:'isolated-test',status:'prepared'}};
 const ops={validate:async()=>{events.push('validate');if(fail==='validate')throw Error('drift');},save:async()=>events.push('save'),pin:async version=>{events.push('pin-'+version);if(fail==='rollback'&&version==='old')throw Error('rollback failure');},recreate:async()=>{events.push('recreate');},gate:async version=>{events.push('gate-'+version);if(version==='new'&&fail!=='none')throw Error('native browsing failed');}};
 return {events,j,ops};
}
test('passing exact artifact is deployed with only its scoped operations',async()=>{
 const {events,j,ops}=transaction('none');await activate(j,ops);assert.equal(j.group.status,'passed');assert.deepEqual(events,['validate','save','pin-new','save','recreate','gate-new','save']);
});
test('changed prerequisites prevent any mutation',async()=>{
 const {events,j,ops}=transaction('validate');await assert.rejects(activate(j,ops),/drift/);assert.deepEqual(events,['validate']);
});
test('native failure or timeout rolls back and checks predecessor',async()=>{
 for(const why of ['native failure','timeout']){
  const {events,j,ops}=transaction(why);await assert.rejects(activate(j,ops),/rollback verified/);assert.equal(j.group.rollback,'verified');assert.deepEqual(events.filter(e=>e.startsWith('pin-')),['pin-new','pin-old']);assert(events.includes('gate-old'));
 }
});
test('missing executable and actual command timeout fail closed',()=>{
 assert.throws(()=>command(['/nonexistent-utilibre-scanner']),/failed or timed out/);
 assert.throws(()=>command([process.execPath,'-e','setTimeout(()=>{},10000)'],{timeout:50}),/failed or timed out/);
 assert.throws(()=>JSON.parse(command([process.execPath,'-e','process.stdout.write("not JSON")'])));
 assert.equal(command([process.execPath,'-e','process.stdout.write("ok")']),'ok');
});
test('recovery journal cannot broaden deployment scope or mutate other settings',()=>{
 const h='a'.repeat(64),j={schemaVersion:1,group:{project:'public-utility',cwd:ROOT,files:[ROOT+'/compose.yaml'],before:[],rows:[{name:'public-utility-redlib-1',service:'redlib',oldRef:recipe.runtime.reference,oldImage:recipe.runtime.imageId,newRef:recipe.candidate.reference,newImage:recipe.candidate.imageId}]},beforeEnvSha256:h,afterEnvSha256:h,redlibConfigHash:h,otherConfigHashes:{portal:h},oldValues:{REDLIB_IMAGE:null,REDLIB_BANNER:null},newValues:{REDLIB_IMAGE:'REDLIB_IMAGE='+recipe.candidate.reference,REDLIB_BANNER:'REDLIB_BANNER=source'}};
 validateJournal(j);
 for(const change of [x=>x.group.project='utilibre-trip',x=>x.group.files=['/tmp/other.yaml'],x=>x.group.rows.push({...x.group.rows[0],service:'portal'}),x=>x.group.rows[0].namespaceParent='other',x=>x.group.mirrorFiles=['/tmp/file'],x=>x.oldValues.SECRET='bad',x=>x.newValues.REDLIB_IMAGE='REDLIB_IMAGE=x\nOTHER=y',x=>x.beforeEnvSha256='missing']){
  const bad=structuredClone(j);change(bad);assert.throws(()=>validateJournal(bad));
 }
});
test('failed rollback is not a success and retains journal state',async()=>{
 const {events,j,ops}=transaction('rollback');await assert.rejects(activate(j,ops),/rollback unverified/);assert.equal(j.group.rollback,'unverified');assert.equal(j.group.status,'failed');assert.equal(events.at(-1),'save');
});
test('journal is saved before changing any live pin',async()=>{
 const {events,j,ops}=transaction('none');ops.pin=async()=>{events.push('pin-new');throw Error('interrupted');};await assert.rejects(activate(j,ops),/interrupted/);assert.deepEqual(events,['validate','save','pin-new']);
});
test('daily checks distinguish review, failure, stale and manual results',()=>{
 const good={completedAt:new Date(now).toISOString(),mode:'--apply',status:'up-to-date',browsing:{passed:true}};assert.deepEqual(redlibUpdateIssues(good,now),[]);
 for(const change of [{mode:'--stage'},{status:'failed'},{status:'review-required'},{completedAt:'2026-10-20'},{browsing:{passed:false}}])assert(redlibUpdateIssues({...good,...change},now).length);
 assert(redlibUpdateIssues(null,now).length);
});
