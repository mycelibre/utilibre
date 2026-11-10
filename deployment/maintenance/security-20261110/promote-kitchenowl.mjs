// Join the existing OS-library and same-source driver candidates. No deployment.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);const mode=process.argv[2];assert(process.argv.length===3&&['prepare','verify'].includes(mode));
const root='/var/lib/utilibre-maintenance/security-20261110';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const inputs=read(new URL('./kerberos-inputs.json',import.meta.url)),s=inputs.rows.find(r=>r.key==='krb5-kitchenowl-app');
const dir=root+'/vendor-debian/'+s.key,driverFile=root+'/kerberos/kitchenowl/driver.json',driver=read(driverFile),b=read(dir+'/build.json');
assert(driver.passed&&driver.configurationUnchanged&&driver.unrelatedPackagesUnchanged);
assert.equal(driver.fixtureSha256,sha(new URL('./kerberos-driver.py',import.meta.url)));
assert.equal(driver.inventoryFixtureSha256,sha(new URL('../go-final/verify.py',import.meta.url)));
assert.equal(driver.newNativePackage.version,'17.11-0+deb13u1');assert.equal(driver.removedBundledLibraries.length,15);
const docker=(...args)=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:60000,maxBuffer:65536,stdio:['ignore','pipe','pipe']}).trim();
assert.equal(docker('image','inspect','--format','{{.Id}}',driver.imageId),driver.imageId);
if(b.imageId===driver.imageId){
 const os=read(dir+'/os-only/build.json');assert.equal(os.imageId,driver.base);assert.equal(os.base,s.base);
 assert.equal(b.osBuildSha256,sha(dir+'/os-only/build.json'));assert.equal(b.driverProofSha256,sha(driverFile));
 assert.equal(b.osImageId,os.imageId);assert.equal(docker('image','inspect','--format','{{.Id}}',s.candidate),b.imageId);
 assert.deepEqual(b.nativeRows.map(x=>x.imageId),[s.base,driver.imageId]);assert(b.nativeRows.every(x=>x.passed&&x.checks===15));
 console.log('Exact OS/driver promotion already recorded; no files, tags or services changed.');
}else{
 assert.equal(mode,'prepare','Candidate has not been joined');assert(!fs.existsSync(root+'/vendor-debian/release.json'),'Never replace evidence after release preparation');
 assert.equal(b.imageId,driver.base);assert.equal(b.base,s.base);assert(b.passed&&b.configurationUnchanged&&b.unrelatedPackagesUnchanged);
 assert.equal(b.fixtureSha256,sha(new URL('../security-20261109/vendor-debian.mjs',import.meta.url)));
 assert(!fs.existsSync(dir+'/os-only'),'Preserve prior evidence');assert.equal(docker('image','inspect','--format','{{.Id}}',s.candidate),b.imageId);
 const native=root+'/vendor-debian/kerberos-native';assert.equal(sha(native),inputs.fixture.binarySha256);
 const nativeRows=[s.base,driver.imageId].map(imageId=>{
  const out=docker('run','--rm','--pull=never','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--user','65534:65534','--memory','128m','--memory-swap','128m','--cpus','0.5','--pids-limit','32','--log-driver','none','--tmpfs','/tmp:rw,size=8m,mode=1777','--mount',`type=bind,src=${native},dst=/native,readonly`,'--entrypoint','/native',imageId);
  assert.equal(out,'KERBEROS_NATIVE_PASSED checks=15');return {imageId,passed:true,checks:15};
 });
 fs.mkdirSync(dir+'/os-only');fs.copyFileSync(dir+'/build.json',dir+'/os-only/build.json',fs.constants.COPYFILE_EXCL);
 const result={...b,date:new Date().toISOString(),imageId:driver.imageId,nativeRows,osImageId:b.imageId,osBuildSha256:sha(dir+'/os-only/build.json'),driverProofSha256:sha(driverFile),deployed:false,limitation:'System Kerberos plus same-version Psycopg2 native rebuild. Full-image driver scope and native application/database checks remain required.'};
 docker('image','tag',driver.imageId,s.candidate);fs.writeFileSync(dir+'/build.json',JSON.stringify(result,null,2)+'\n');
 console.log('Candidate joined locally. Rerun payload, ABI, application, database and scan gates before release preparation.');
}
