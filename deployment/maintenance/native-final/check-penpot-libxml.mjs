// Genuine package/private-library parity, old-header ABI and native consumers.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
const directory='/var/lib/utilibre-maintenance/native-final';
const backend='utilibre-penpot-backend:2.18.3-libxml-security-20261011';
const exporter='utilibre-penpot-exporter:2.18.3-libxml-security-20261011';
const frontend='utilibre-penpot-frontend:2.18.3-minimal-runtime-20261011';
const pairs=[['utilibre-penpot-backend:2.18.3-no-exr-20261011',backend],['utilibre-penpot-exporter:2.18.3-no-exr-20261011',exporter]];
const docker=(args,input)=>execFileSync('docker',args,{input,timeout:120000,maxBuffer:8*1024**2});
const bounded=['--rm','--network','none','--read-only','--cpus','1','--memory','512m','--pids-limit','96','--log-driver','none','--tmpfs','/tmp:rw,size=64m,mode=1777'];
const run=(image,script,input)=>docker(['run','-i',...bounded,'-v',directory+'/libxml2-output:/checks:ro','--entrypoint','bash',image,'-o','pipefail','-ec',script],input).toString();
const media=[];
for(const [base,image] of pairs){
 const before=JSON.parse(docker(['image','inspect',base]))[0],after=JSON.parse(docker(['image','inspect',image]))[0];
 for(const key of ['User','Cmd','Entrypoint','WorkingDir','Env','Volumes','ExposedPorts'])assert.deepEqual(after.Config[key],before.Config[key],key);
 const application='find /opt -type f ! -path "/opt/imagick/lib/deps/libxml2.so*" -print0 | sort -z | xargs -0 sha256sum | sha256sum';
 // Root is needed only for reading native application files, never production data.
 const hash=x=>docker(['run',...bounded,'--user','root','--entrypoint','bash',x,'-o','pipefail','-ec',application]).toString();
 assert.equal(hash(base),hash(image),'Only the private libxml payload may change in /opt');
 assert.equal(run(base,'cat /opt/imagick/etc/ImageMagick-7/policy.xml'),run(image,'cat /opt/imagick/etc/ImageMagick-7/policy.xml'));
 assert.equal(run(image,"dpkg-query -W -f='${Version}' libxml2").trim(),'2.12.7+dfsg+really2.9.14-2.1+deb13u3+utilibre1');
 run(image,'cmp /usr/lib/x86_64-linux-gnu/libxml2.so.2 /opt/imagick/lib/deps/libxml2.so.2; if ldd /opt/imagick/bin/magick | grep -E "not found|OpenEXR|libIex|libIlmThread"; then exit 1; fi; if find /opt /usr/lib -name "libOpenEXR*.so*" | grep .; then exit 1; fi');
 for(const mode of ['', 'env -u LD_LIBRARY_PATH ']){
   assert.match(run(image,mode+'/checks/old-abi-check'),/chunked parsing passed/);
   assert.match(run(image,mode+'/checks/new-abi-check'),/chunked parsing passed/);
   assert.match(run(image,mode+'/checks/rsvg-check'),/dimensions passed/);
 }
 const raster='for ext in png jpeg webp; do magick -size 32x24 gradient:blue-red /tmp/a.$ext; test "$(magick identify -format "%w %h" /tmp/a.$ext)" = "32 24"; magick /tmp/a.$ext -depth 8 rgba:- | sha256sum; done; printf \'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24"><rect width="32" height="24" fill="blue"/><circle cx="16" cy="12" r="8" fill="red"/></svg>\' > /tmp/example.svg; magick /tmp/example.svg -depth 8 rgba:- | sha256sum';
 assert.equal(run(image,raster),run(base,raster),'PNG/JPEG/WebP/SVG decoded pixel equivalence');
 media.push({image,imageId:after.Id,applicationAndRuntimeUnchanged:true,oldAndNewHeadersNativeAllocatorsPassed:true,systemAndPrivateLibraryEqual:true,librsvgPassed:true,rasterPixelEquivalence:true});
}
const font=run(backend,'fontforge -lang=py -script /dev/stdin',`import fontforge, os\nsvg='/tmp/glyph.svg'\nwith open(svg,'w') as f: f.write('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700"><path d="M100 100L300 600L500 100Z"/></svg>')\nf=fontforge.font(); f.fontname='UtilibreSynthetic'; f.familyname='Utilibre Synthetic'; f.fullname='Utilibre Synthetic'\ng=f.createChar(65); g.importOutlines(svg); assert len(g.foreground)>0; g.width=600\nf.generate('/tmp/fictional.ttf'); f.generate('/tmp/fictional.svg'); f.close()\nfor path in ['/tmp/fictional.ttf','/tmp/fictional.svg']:\n r=fontforge.open(path); assert 'A' in r; assert len(r['A'].foreground)>0; r.close()\nprint('FontForge SVG import, TTF export and SVG font reopen passed')\n`);
assert.match(font,/SVG font reopen passed/);
const fontResult=JSON.parse(docker(['run',...bounded,'-v',process.cwd()+'/deployment/maintenance/penpot-2.18.3/check-runtime-native.py:/check.py:ro','--entrypoint','python3',backend,'/check.py']));
assert.equal(fontResult.fontforgeTtfOtf,true);assert.equal(fontResult.woffRoundtrip,true);assert.equal(fontResult.woff2Roundtrip,true);
const record={schema:1,version:'2.18.3',status:'passed',date:new Date().toISOString(),backend:{image:backend,imageId:media[0].imageId},exporter:{image:exporter,imageId:media[1].imageId},frontend:{image:frontend,imageId:JSON.parse(docker(['image','inspect',frontend]))[0].Id},media,fontforgeSvg:true,fontResult,deployed:false,limitation:'Native package, ABI and consumer checks passed; full two-account application gate still required. This proves tested consumers, not ABI safety for unrelated programs allocating libxml structs themselves.'};
await writeFile(directory+'/penpot-libxml.json',JSON.stringify(record,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify(record));
