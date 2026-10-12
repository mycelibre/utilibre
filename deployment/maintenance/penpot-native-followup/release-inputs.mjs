// Reuse the established Penpot snapshot/restore/rollback release, with exact evidence.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const directory='/var/lib/utilibre-maintenance/penpot-native-followup-20261012';
const read=p=>JSON.parse(readFileSync(p));
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
export function inputs(){
 const manifest=read('/var/lib/utilibre-maintenance/native-final/penpot-rsvg-tiff-followup.json');
 const svg=read(directory+'/native.json'),tiff=read(directory+'/tiff/native.json');
 assert.equal(svg.status,'passed');assert.equal(tiff.status,'passed');
 const logged=read(directory+'/application-run.log');assert.equal(logged.status,'passed');
 assert.match(logged.report,/^\/opt\/utilibre\/reports\/penpot-native-roundtrip-[a-z0-9_]+$/);
 const config=read(logged.report+'/compose.json'),result=read(logged.report+'/result.json');
 assert(Date.now()-Date.parse(result.checkedAt)<86400000,'Application evidence must be fresh');
 for(const key of ['isolated','nativeExportImport','independentAccount','editableBrowserReopen','editSavedAfterReload','otherAccountDenied','nativeFileDeletion'])assert.equal(result[key],true,key);
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.outside,[]);
 for(const name of ['membership','exporter','backend-media'])assert.equal(read(logged.report+'/'+name+'.json').status,'passed',name);
 const cleanup=read(logged.report+'/cleanup.json');
 for(const key of ['containersRemoved','relayStopped','syntheticRamRemoved'])assert.equal(cleanup[key],true,key);
 for(const role of ['backend','exporter','frontend'])assert.equal(config.services['penpot-'+role].image,manifest[role].image);
 const originals={};
 for(const row of tiff.records){
  assert.equal(row.imageId,manifest[row.name].imageId);assert.equal(row.candidate,manifest[row.name].image);
  const predecessor=svg.records.find(r=>r.name===row.name);assert(predecessor);
  assert.equal(predecessor.imageId,row.baseId);assert.equal(predecessor.baseId,row.productionBaseId);
  originals[row.name]={image:row.productionBase,imageId:row.productionBaseId};
 }
 const evidence=Object.fromEntries(['native.json','tiff/native.json','application-run.log'].map(p=>[p,sha(directory+'/'+p)]));
 evidence.applicationResults=Object.fromEntries(['result','membership','exporter','backend-media','cleanup','compose'].map(p=>[p,sha(logged.report+'/'+p+'.json')]));
 return {...manifest,originals,evidence,fullApplicationGate:{status:'passed',report:logged.report}};
}
export function liveNative(docker,name){
 const svg=read(directory+'/native.json'),tiff=read(directory+'/tiff/native.json');
 const role=name.includes('-backend-')?'backend':'exporter';
 const row=svg.records.find(r=>r.name===role),tr=tiff.records.find(r=>r.name===role);assert(row&&tr);
 assert.equal(docker('exec',name,'dpkg-query','-W','-f','${Version}','librsvg2-2').trim(),svg.version);
 assert.equal(docker('exec',name,'dpkg-query','-W','-f','${Version}','libtiff6').trim(),tiff.version);
 for(const [path,hash]of [
  ['/usr/lib/x86_64-linux-gnu/librsvg-2.so.2',row.nativeLibraryHash],
  ['/usr/lib/x86_64-linux-gnu/libtiff.so.6',tr.libraryHash],
  ['/opt/imagick/lib/deps/libtiff.so.6',tr.libraryHash],
 ])assert.equal(docker('exec',name,'sha256sum',path).split(' ')[0],hash);
}
