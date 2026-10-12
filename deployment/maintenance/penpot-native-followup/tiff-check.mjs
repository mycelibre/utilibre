import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='/var/lib/utilibre-maintenance/penpot-native-followup-20261012';
const stage=JSON.parse(await readFile(root+'/tiff/stage.json','utf8'));assert.equal(stage.status,'staged');
const docker=(args)=>execFileSync('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:8*1024**2});
const bounded=['--rm','--network','none','--read-only','--cpus','1','--memory','512m','--pids-limit','96','--log-driver','none','--hostname','utilibre-tiff-fixture','--tmpfs','/tmp:rw,size=96m,mode=1777'];
const run=(image,script,user)=>docker(['run',...bounded,...(user?['--user',user]:[]),'-v',root+'/tiff/output:/checks:ro','-v',root+'/output:/rsvg:ro','-v',process.cwd()+'/deployment/maintenance/penpot-native-followup/fixtures:/fixtures:ro','--entrypoint','bash',image,'-o','pipefail','-ec',script]);
const libraryDir=root+'/tiff/output/install/usr/lib/x86_64-linux-gnu';
const file=(await readdir(libraryDir)).find(f=>/^libtiff\.so\.6\.[0-9]+\.[0-9]+$/.test(f));assert(file);
const hash=createHash('sha256').update(await readFile(libraryDir+'/'+file)).digest('hex');
const records=[];
const checks={
 application:'find /opt -type f ! -path "/opt/imagick/lib/deps/libtiff.so*" -print0 | sort -z | xargs -0 sha256sum | sha256sum',
 libraries:'find /usr/lib /lib -type f ! -name "libtiff.so*" -print0 | sort -z | xargs -0 sha256sum | sha256sum',
 config:'find /etc -type f ! -path /etc/ld.so.cache ! -path /etc/hosts ! -path /etc/hostname ! -path /etc/resolv.conf -print0 | sort -z | xargs -0 sha256sum | sha256sum'
};
for(const row of stage.rows){
 assert.equal(JSON.parse(docker(['image','inspect',row.candidate]))[0].Id,row.imageId);
 assert.equal(JSON.parse(docker(['image','inspect',row.base]))[0].Id,row.baseId);
 const unchangedHashes={};for(const [key,command]of Object.entries(checks)){const old=run(row.baseId,command,'0').trim(),next=run(row.imageId,command,'0').trim();assert.equal(next,old,key);unchangedHashes[key]=old.split(' ')[0];}
 assert.equal(run(row.imageId,"dpkg-query -W -f='${Version}' libtiff6").trim(),stage.version);
 for(const path of ['/usr/lib/x86_64-linux-gnu/libtiff.so.6','/opt/imagick/lib/deps/libtiff.so.6'])assert.equal(run(row.imageId,'sha256sum '+path).split(' ')[0],hash);
 run(row.imageId,'if ldd /opt/imagick/bin/magick | grep -E "not found|OpenEXR|libIex|libIlmThread"; then exit 1; fi; for tool in tiffcrop tiff2pdf tiff2ps tiffmedian thumbnail tiffdither; do if command -v "$tool"; then exit 1; fi; done');
 const cases=[];
 for(const mode of ['', 'env -u LD_LIBRARY_PATH ']){
  assert.equal(run(row.imageId,mode+'/checks/tiff-native codecs'),run(row.baseId,mode+'/checks/tiff-native codecs'),'All native codecs retained');
  assert.match(run(row.baseId,mode+'/checks/tiff-native'),/native TIFF old-header codec roundtrips passed/);
  assert.match(run(row.imageId,mode+'/checks/tiff-native fixed'),/native TIFF old-header codec roundtrips passed/);
  assert.match(run(row.imageId,mode+'env LD_PRELOAD=/rsvg/entity-audit.so /rsvg/rsvg-native /fixtures/duplicate.svg 1'),/duplicate entity allocations: 1/);
  cases.push({mode:mode?'system':'private-overlay',eightCodecOldHeaderRoundtrips:true,codecInventoryUnchanged:true,newCompressionRatioGuardApi:true,rsvgSecurityRegressionStillPassed:true});
 }
 const raster='for ext in png jpeg webp tiff; do magick -size 32x24 gradient:blue-red /tmp/a.$ext; test "$(magick identify -format "%w %h" /tmp/a.$ext)" = "32 24"; magick /tmp/a.$ext -depth 8 rgba:- | sha256sum; done; magick /fixtures/plain.svg -depth 8 rgba:- | sha256sum';
 assert.equal(run(row.imageId,raster),run(row.baseId,raster),'ImageMagick TIFF/PNG/JPEG/WebP/SVG output pixels');
 records.push({...row,unchangedHashes,libraryHash:hash,cases,imageMagickPixelsUnchanged:true});
}
const backend=records.find(r=>r.name==='backend');
const fonts=JSON.parse(docker(['run',...bounded,'-v',process.cwd()+'/deployment/maintenance/penpot-2.18.3/check-runtime-native.py:/check.py:ro','--entrypoint','python3',backend.imageId,'/check.py']));
assert.equal(fonts.fontforgeTtfOtf,true);assert.equal(fonts.woffRoundtrip,true);assert.equal(fonts.woff2Roundtrip,true);
const record={schema:1,status:'passed',createdAt:new Date().toISOString(),version:stage.version,records,fonts,deployed:false,limitation:'Synthetic codec/ABI/native consumer checks; full two-account Penpot gate is still required.'};
await writeFile(root+'/tiff/native.json',JSON.stringify(record,null,2)+'\n',{mode:0o600});
const application=JSON.parse(await readFile('/var/lib/utilibre-maintenance/native-final/penpot-rsvg-followup.json','utf8'));
for(const row of records)application[row.name]={image:row.candidate,imageId:row.imageId};
await writeFile('/var/lib/utilibre-maintenance/native-final/penpot-rsvg-tiff-followup.json',JSON.stringify(application,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({status:'passed',rows:records.map(({name,imageId})=>({name,imageId})),next:'Full native-final/penpot-rsvg-tiff-followup.json application gate'}));
