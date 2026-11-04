// Consume the existing isolated Penpot checks; exercise Closure's shaded Guava.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261103/guava/penpot';
const read=p=>JSON.parse(fs.readFileSync(p));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const inputs=read(new URL('./guava-inputs.json',import.meta.url)),build=read(root+'/build.json');
assert(build.passed);
const log=read(root+'/application.log');assert.equal(log.status,'passed');
assert.match(log.report,/^\/opt\/utilibre\/reports\/penpot-native-roundtrip-[a-z0-9_]+$/);
const r=log.report,result=read(r+'/result.json'),cleanup=read(r+'/cleanup.json');
const compose=read(r+'/compose.json');assert.equal(compose.services['penpot-backend'].image,build.candidate);
assert.equal(cp.execFileSync('docker',['image','inspect','--format','{{.Id}}',build.candidate],{encoding:'utf8'}).trim(),build.imageId);
assert(result.isolated&&result.nativeExportImport&&result.independentAccount&&result.editableBrowserReopen&&result.editSavedAfterReload&&result.otherAccountDenied&&result.nativeFileDeletion);
assert.deepEqual(result.errors,[]);assert.deepEqual(result.outside,[]);
assert.equal(read(r+'/membership.json').status,'passed');
const exporter=read(r+'/exporter.json'),media=read(r+'/backend-media.json');
assert(exporter.status==='passed'&&exporter.nativeRoute&&exporter.isolatedNetwork&&exporter.format==='PNG');
assert(media.status==='passed'&&media.otherAccountFileDenied&&media.nativeThumbnail.format==='JPEG');
assert(cleanup.containersRemoved&&cleanup.relayStopped&&cleanup.syntheticRamRemoved);
const fixture=root+'/closure-fictional.js';
fs.writeFileSync(fixture,'function total(a, b) { return a + b; } console.log(total(2, 3));\n');
const outputs=[];
for(const [state,jar]of [['baseline','/var/lib/utilibre-maintenance/penpot-2.18.3-20261011/penpot.jar'],['fixed',root+'/penpot.jar']]){
 const p=cp.spawnSync('docker',['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','512m','--memory-swap','512m','--pids-limit','64','--log-driver','none','--tmpfs','/tmp:rw,size=32m','-v',jar+':/app.jar:ro','-v',fixture+':/example.js:ro','--entrypoint','java',inputs.compiler,'-Xmx256m','-XX:ActiveProcessorCount=1','-cp','/app.jar','com.google.javascript.jscomp.CommandLineRunner','--js','/example.js','--compilation_level','SIMPLE'],{encoding:'utf8',timeout:60000,maxBuffer:1024**2});
 fs.writeFileSync(root+'/closure-'+state+'-verified.log',String(p.stdout||'')+String(p.stderr||''));
 assert.equal(p.status,0,'Closure compiler failed; inspect private log');
 assert.match(p.stdout,/console\.log/);assert(p.stdout.length>10);outputs.push(p.stdout);
}
assert.equal(outputs[0],outputs[1]);
const evidence=['result.json','membership.json','exporter.json','backend-media.json','cleanup.json','compose.json'].map(file=>({file,sha256:sha(r+'/'+file)}));
const receipt={date:new Date().toISOString(),passed:true,version:'2.18.3',network:'isolated-internal',imageId:build.imageId,twoAccounts:true,nativeExportImport:true,membershipChecks:true,pngExport:true,backendMedia:true,cleanupVerified:true,closureCompilerParity:true,closureNetwork:'none',report:r,evidence};
fs.writeFileSync(root+'/application.json',JSON.stringify(receipt,null,2)+'\n');
console.log('Existing Penpot workflow evidence and native Closure compilation passed; no production change.');
