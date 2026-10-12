// Reuse native font/media and full two-account checks. All state is fictional.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
const root='/var/lib/utilibre-maintenance/xlib-followup-20261012',here=new URL('.',import.meta.url).pathname;
const run=(cmd,args,o={})=>cp.execFileSync(cmd,args,{encoding:'utf8',timeout:600000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim(),docker=args=>run('docker',args);
const rows=['penpot-backend','penpot-exporter'].map(key=>JSON.parse(fs.readFileSync(root+'/images/'+key+'/build.json')));
const bounded=['--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','768m','--pids-limit','96','--ulimit','core=0','--log-driver','none','--tmpfs','/tmp:rw,size=96m,mode=1777'];
const manifest={schema:1,status:'passed',version:'2.18.3'},native=[];
for(const row of rows){
 assert.equal(JSON.parse(docker(['inspect',row.container]))[0].Image,row.base);
 const raster='for ext in png jpeg webp tiff; do magick -size 32x24 gradient:blue-red /tmp/fictional.$ext; test "$(magick identify -format "%w %h" /tmp/fictional.$ext)" = "32 24"; magick /tmp/fictional.$ext -depth 8 rgba:- | sha256sum; done';
 const check=(image,script)=>docker(['run',...bounded,'--entrypoint','sh',image,'-ec',script]);
 for(const prefix of ['', 'env -u LD_LIBRARY_PATH ']){
  const script=prefix+"sh -ec '"+raster.replaceAll("'","'\\''")+"'";
  assert.equal(check(row.imageId,script),check(row.base,script),'Native ImageMagick raster parity');
 }
 assert.equal(check(row.imageId,'magick -list format'),check(row.base,'magick -list format'),'Preserve native codecs');
 const key=row.key.replace('penpot-',''),tag='utilibre-penpot-'+key+':2.18.3-xlib-security-20261012';docker(['tag',row.imageId,tag]);manifest[key]={image:tag,imageId:row.imageId};
 native.push({key,imageId:row.imageId,systemAndPrivateRasterParity:true,codecSetPreserved:true});
}
const backend=rows[0];const font=JSON.parse(docker(['run',...bounded,'--mount','type=bind,src='+here+'../penpot-2.18.3/check-runtime-native.py,dst=/check.py,readonly','--entrypoint','python3',backend.imageId,'/check.py']));assert(font.fontforgeTtfOtf&&font.woffRoundtrip&&font.woff2Roundtrip);
const frontend=JSON.parse(docker(['inspect','utilibre-expanded-penpot-frontend-1']))[0],frontTag='utilibre-penpot-frontend:2.18.3-xlib-test-20261012';docker(['tag',frontend.Image,frontTag]);manifest.frontend={image:frontTag,imageId:frontend.Image};
const manifestPath='/var/lib/utilibre-maintenance/native-final/penpot-xlib-followup.json';fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
fs.writeFileSync(root+'/penpot-native.json',JSON.stringify({date:new Date().toISOString(),passed:true,native,font,deployed:false,limitation:'Native compatibility checks, not malicious-X-server protocol regression.'},null,2)+'\n');
const result=JSON.parse(run('node',[here+'../check-penpot-2.18.3.mjs','--manifest='+manifestPath]));assert.equal(result.status,'passed');
fs.writeFileSync(root+'/penpot-application.json',JSON.stringify({date:new Date().toISOString(),...result,manifest,deployed:false},null,2)+'\n');console.log(JSON.stringify(result));
