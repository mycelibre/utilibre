import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='/var/lib/utilibre-maintenance/penpot-native-followup-20261012';
const specs=JSON.parse(await readFile(new URL('./specs.json',import.meta.url)));
const stage=JSON.parse(await readFile(root+'/stage.json','utf8'));
assert.equal(stage.status,'staged');
const docker=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',timeout:120000,maxBuffer:8*1024**2});
const bounded=['--rm','--network','none','--read-only','--cpus','1','--memory','512m','--pids-limit','96','--log-driver','none','--hostname','utilibre-rsvg-fixture','--tmpfs','/tmp:rw,size=96m,mode=1777'];
const run=(image,script,input,user)=>docker(['run','-i',...bounded,...(user?['--user',user]:[]),'-v',root+'/output:/checks:ro','-v',process.cwd()+'/deployment/maintenance/penpot-native-followup/fixtures:/fixtures:ro','--entrypoint','bash',image,'-o','pipefail','-ec',script],input);
const nativeLibraryHash=createHash('sha256').update(await readFile(root+'/output/install/usr/lib/x86_64-linux-gnu/librsvg-2.so.2.60.3')).digest('hex');
const sonames=text=>[...text.matchAll(/\(NEEDED\).*\[([^\]]+)\]/g)].map(m=>m[1]).sort();
assert.deepEqual(sonames(await readFile(root+'/output/new-dynamic.txt','utf8')),sonames(await readFile(root+'/output/old-dynamic.txt','utf8')),'No new or removed native dependency');
assert.equal((await readFile(root+'/output/missing-symbols.txt','utf8')).trim(),'','Every old dynamic symbol retained');
const unchanged={
 application:'find /opt -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum',
 config:'find /etc -type f ! -path /etc/ld.so.cache ! -path /etc/hosts ! -path /etc/hostname ! -path /etc/resolv.conf -print0 | sort -z | xargs -0 sha256sum | sha256sum',
 libraries:'find /usr/lib /lib -type f ! -name "librsvg-2.so*" ! -name "libpixbufloader_svg.so" ! -path "*/gdk-pixbuf-2.0/*/loaders.cache" -print0 | sort -z | xargs -0 sha256sum | sha256sum'
};
const records=[];
for(const role of stage.rows){
 assert.equal(JSON.parse(docker(['image','inspect',role.base]))[0].Id,role.baseId);
 const after=JSON.parse(docker(['image','inspect',role.candidate]))[0];assert.equal(after.Id,role.imageId);
 assert.equal(JSON.parse(docker(['inspect',role.container]))[0].Image,role.baseId,'Production is unchanged during preparation');
 const before=JSON.parse(docker(['image','inspect',role.baseId]))[0];
 for(const key of ['User','Cmd','Entrypoint','Env','WorkingDir','Volumes','ExposedPorts'])assert.deepEqual(after.Config[key],before.Config[key],key);
 const unchangedHashes={};
 for(const [key,cmd] of Object.entries(unchanged)){const old=run(role.baseId,cmd,undefined,'0').trim(),next=run(role.imageId,cmd,undefined,'0').trim();assert.equal(next,old,key+' changed');unchangedHashes[key]=old.split(' ')[0];}
 assert.equal(run(role.imageId,"dpkg-query -W -f='${Version}' librsvg2-2").trim(),specs.version);
 assert.equal(run(role.imageId,'sha256sum /usr/lib/x86_64-linux-gnu/librsvg-2.so.2').split(' ')[0],nativeLibraryHash);
 run(role.imageId,'if ldd /usr/lib/x86_64-linux-gnu/librsvg-2.so.2 | grep "not found"; then exit 1; fi; if ldd /opt/imagick/bin/magick | grep -E "not found|OpenEXR|libIex|libIlmThread"; then exit 1; fi');
 const cases=[];
 for(const mode of ['', 'env -u LD_LIBRARY_PATH ']){
   const old=run(role.baseId,mode+'env LD_PRELOAD=/checks/entity-audit.so /checks/rsvg-native /fixtures/duplicate.svg 2');
   const fixed=run(role.imageId,mode+'env LD_PRELOAD=/checks/entity-audit.so /checks/rsvg-native /fixtures/duplicate.svg 1');
   assert.match(old,/duplicate entity allocations: 2/);assert.match(fixed,/duplicate entity allocations: 1/);
   const cmd=mode+'/checks/rsvg-native /fixtures/plain.svg; sha256sum /tmp/rsvg-native-result.png';
   assert.equal(run(role.imageId,cmd),run(role.baseId,cmd),'Old-header native render parity');
   cases.push({mode:mode?'system':'private-overlay',oldDuplicateAllocations:2,newDuplicateAllocations:1,oldHeaderParseDimensionsRender:true,pngBytesEqual:true});
 }
 const raster='for ext in png jpeg webp tiff; do magick -size 32x24 gradient:blue-red /tmp/a.$ext; test "$(magick identify -format "%w %h" /tmp/a.$ext)" = "32 24"; magick /tmp/a.$ext -depth 8 rgba:- | sha256sum; done; magick /fixtures/plain.svg -depth 8 rgba:- | sha256sum';
 assert.equal(run(role.imageId,raster),run(role.baseId,raster),'Native raster/SVG pixels changed');
 assert.equal(run(role.imageId,'magick -list format'),run(role.baseId,'magick -list format'),'ImageMagick codec set changed');
 if(role.common){
  assert.equal(run(role.imageId,"dpkg-query -W -f='${Version}' librsvg2-common").trim(),specs.version);
  run(role.imageId,"/usr/lib/x86_64-linux-gnu/gdk-pixbuf-2.0/gdk-pixbuf-query-loaders /usr/lib/x86_64-linux-gnu/gdk-pixbuf-2.0/2.10.0/loaders/libpixbufloader_svg.so | grep 'svg'");
 }
 records.push({...role,unchangedHashes,nativeLibraryHash,cases,allOldSymbolsRetained:true,nativeDependenciesUnchanged:true,imageMagickFormatsAndPixelsUnchanged:true});
}
const backend=records.find(r=>r.name==='backend');
const font=run(backend.imageId,'fontforge -lang=py -script /dev/stdin',`import fontforge\nsvg='/tmp/glyph.svg'\nwith open(svg,'w') as f: f.write('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700"><path d="M100 100L300 600L500 100Z"/></svg>')\nf=fontforge.font(); f.fontname='UtilibreSynthetic'; f.familyname='Utilibre Synthetic'; f.fullname='Utilibre Synthetic'\ng=f.createChar(65); g.importOutlines(svg); assert len(g.foreground)>0; g.width=600\nf.generate('/tmp/fictional.ttf'); f.generate('/tmp/fictional.svg'); f.close()\nfor path in ['/tmp/fictional.ttf','/tmp/fictional.svg']:\n r=fontforge.open(path); assert 'A' in r; assert len(r['A'].foreground)>0; r.close()\nprint('FontForge SVG import, TTF export and SVG font reopen passed')\n`);
assert.match(font,/SVG font reopen passed/);
const fonts=JSON.parse(docker(['run',...bounded,'-v',process.cwd()+'/deployment/maintenance/penpot-2.18.3/check-runtime-native.py:/check.py:ro','--entrypoint','python3',backend.imageId,'/check.py']));
assert.equal(fonts.fontforgeTtfOtf,true);assert.equal(fonts.woffRoundtrip,true);assert.equal(fonts.woff2Roundtrip,true);
const record={schema:1,status:'passed',createdAt:new Date().toISOString(),version:specs.version,records,fontforgeSvg:true,fonts,deployed:false,limitation:'Synthetic native/library regression only; independent full two-account application gate required before release.'};
await writeFile(root+'/native.json',JSON.stringify(record,null,2)+'\n',{mode:0o600});
assert.equal(JSON.parse(docker(['image','inspect',specs.frontend.base]))[0].Id,specs.frontend.baseId);
docker(['tag',specs.frontend.baseId,specs.frontend.testTag]);
const application={schema:1,status:'passed',version:'2.18.3',backend:{image:backend.candidate,imageId:backend.imageId},exporter:{image:records[1].candidate,imageId:records[1].imageId},frontend:{image:specs.frontend.testTag,imageId:specs.frontend.baseId}};
await writeFile('/var/lib/utilibre-maintenance/native-final/penpot-rsvg-followup.json',JSON.stringify(application,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({status:'passed',rows:records.map(({name,imageId})=>({name,imageId})),next:'Run existing check-penpot-2.18.3.mjs with native-final/penpot-rsvg-followup.json'}));
