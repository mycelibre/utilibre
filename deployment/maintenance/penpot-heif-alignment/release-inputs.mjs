import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,sha,current} from './stage.mjs';
export const directory=root;
const read=p=>JSON.parse(fs.readFileSync(p));
export function inputs(){
 const manifest=read('/var/lib/utilibre-maintenance/native-final/penpot-heif-alignment.json'),stage=read(root+'/stage.json'),native=read(root+'/native.json'),source=read(root+'/source.json'),offer=read(root+'/source-offer.json'),app=read(root+'/application-run.log');
 for(const r of [stage,native,source,app])assert.equal(r.status,'passed');assert(offer.published);assert.equal(sha(fs.readFileSync(offer.archive)),offer.sha256);for(const base of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public'])assert.equal(sha(fs.readFileSync(base+'/'+offer.filename)),offer.sha256);
 assert.equal(native.stageSha256,sha(fs.readFileSync(root+'/stage.json')));assert.equal(source.binary.librarySha256,current);
 assert.match(app.report,/^\/opt\/utilibre\/reports\/penpot-native-roundtrip-[a-z0-9_]+$/);
 const config=read(app.report+'/compose.json'),result=read(app.report+'/result.json');assert(Date.now()-Date.parse(result.checkedAt)<86400000);
 for(const key of ['isolated','nativeExportImport','independentAccount','editableBrowserReopen','editSavedAfterReload','otherAccountDenied','nativeFileDeletion'])assert.equal(result[key],true,key);
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.outside,[]);
 for(const name of ['membership','exporter','backend-media'])assert.equal(read(app.report+'/'+name+'.json').status,'passed');
 for(const key of ['containersRemoved','relayStopped','syntheticRamRemoved'])assert.equal(read(app.report+'/cleanup.json')[key],true);
 for(const role of ['backend','exporter','frontend'])assert.equal(config.services['penpot-'+role].image,manifest[role].image);
 const originals={};for(const row of stage.rows){assert.equal(manifest[row.role].imageId,row.image);const n=native.rows.find(x=>x.role===row.role);assert(n?.allOldPublicCExportsPreserved&&n.privateTemplateSymbolsNotReferenced&&n.existingDependenciesResolve&&n.pngJpegWebpTiffSvgPixelsUnchanged);originals[row.role]={image:row.baseRef,imageId:row.base};}
 const evidence=Object.fromEntries(['native.json','stage.json','source.json','source-offer.json','application-run.log'].map(p=>[p,sha(fs.readFileSync(root+'/'+p))]));evidence.applicationResults=Object.fromEntries(['result','membership','exporter','backend-media','cleanup','compose'].map(p=>[p,sha(fs.readFileSync(app.report+'/'+p+'.json'))]));
 return {...manifest,originals,evidence,fullApplicationGate:{status:'passed',report:app.report}};
}
export function liveNative(docker,name){for(const path of ['/usr/lib/x86_64-linux-gnu/libheif.so.1','/opt/imagick/lib/deps/libheif.so.1'])assert.equal(docker('exec',name,'sha256sum',path).split(/\s/)[0],current);assert.equal(docker('exec',name,'dpkg-query','-W','-f=${Version}','libheif1').trim(),'1.23.4-1~deb13u1');}
