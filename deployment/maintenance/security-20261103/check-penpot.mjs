// Reuse the established native raster/font checks for the Expat-only update.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261103/expat-debian';
const inputs=JSON.parse(fs.readFileSync(new URL('./expat-debian-inputs.json',import.meta.url)));
const limits=['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','768m','--memory-swap','768m','--pids-limit','96','--ulimit','core=0','--log-driver','none','--tmpfs','/tmp:rw,size=96m,mode=1777'];
const run=args=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe']}).trim();
for(const role of ['backend','exporter']){
 const key='debian-expanded-penpot-'+role,s=inputs.rows.find(r=>r.key===key),dir=root+'/'+key,b=JSON.parse(fs.readFileSync(dir+'/build.json'));
 assert(b.passed&&b.base===s.base&&b.candidate===s.candidate);
 const check=(image,script)=>run([...limits,'--entrypoint','sh',image,'-ec',script]);
 const raster='for ext in png jpeg webp tiff; do magick -size 32x24 gradient:blue-red /tmp/fictional.$ext; test "$(magick identify -format "%w %h" /tmp/fictional.$ext)" = "32 24"; magick /tmp/fictional.$ext -depth 8 rgba:- | sha256sum; done';
 for(const prefix of ['', 'env -u LD_LIBRARY_PATH ']){
  const script=prefix+"sh -ec '"+raster+"'";
  assert.equal(check(b.imageId,script),check(b.base,script),'Native raster parity');
 }
 assert.equal(check(b.imageId,'magick -list format'),check(b.base,'magick -list format'),'Native codec set');
 let font=null;
 if(role==='backend'){
  const fixture=new URL('../penpot-2.18.3/check-runtime-native.py',import.meta.url).pathname;
  font=JSON.parse(run([...limits,'--mount','type=bind,src='+fixture+',dst=/check.py,readonly','--entrypoint','python3',b.imageId,'/check.py']));
  assert(font.fontforgeTtfOtf&&font.woffRoundtrip&&font.woff2Roundtrip);
 }
 fs.writeFileSync(dir+'/application.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:b.imageId,base:b.base,systemAndPrivateRasterParity:true,codecSetPreserved:true,font,scope:'Four synthetic raster formats through both library paths; existing font roundtrips. Not a new complete collaboration test.'},null,2)+'\n');
 console.log(key+': native image and font consumers passed');
}
