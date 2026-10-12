// Exact native media/FontForge checks before the existing isolated application gate.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const directory='/var/lib/utilibre-maintenance/native-final';
const backend='utilibre-penpot-backend:2.18.3-no-exr-20261011';
const exporter='utilibre-penpot-exporter:2.18.3-no-exr-20261011';
const frontend='utilibre-penpot-frontend:2.18.3-minimal-runtime-20261011';
const pairs=[['utilibre-penpot-backend:2.18.3-runtime-hardening-20261011',backend],['utilibre-penpot-exporter:2.18.3-runtime-hardening-20261011',exporter]];
const docker=(args,input)=>execFileSync('docker',args,{input,timeout:120000,maxBuffer:8*1024**2});
const bounded=['--rm','--network','none','--read-only','--cpus','1','--memory','512m','--pids-limit','96','--log-driver','none'];
const run=(image,script,input)=>docker(['run','-i',...bounded,'--tmpfs','/tmp:rw,size=64m,mode=1777','--entrypoint','sh',image,'-ec',script],input).toString();
const hash=(image,script)=>docker(['run',...bounded,'--user','root','--entrypoint','bash',image,'-o','pipefail','-ec',script]).toString();
const media=[];
// Real EXR from the original upstream binary. The current base denies EXR by
// policy; only this disposable network-none fixture overrides that policy.
const exr=docker(['run',...bounded,'--user','root','--read-only=false','--tmpfs','/tmp:rw,size=64m,mode=1777','--entrypoint','sh',pairs[0][0],'-ec',"sed -i '/pattern=\"EXR\"/d' /opt/imagick/etc/ImageMagick-7/policy.xml; magick -size 8x8 xc:blue exr:-"]);
assert.equal(exr.subarray(0,4).toString('hex'),'762f3101');
for(const [base,image] of pairs){
 const before=JSON.parse(docker(['image','inspect',base]))[0],after=JSON.parse(docker(['image','inspect',image]))[0];
 for(const key of ['User','Cmd','Entrypoint','WorkingDir','Env','Volumes','ExposedPorts'])assert.deepEqual(after.Config[key],before.Config[key],key);
 const application='find /opt -type f ! -path "/opt/imagick/*" -print0 | sort -z | xargs -0 sha256sum | sha256sum';
 assert.equal(hash(base,application),hash(image,application),'Application/JRE/browser bytes must remain unchanged');
 assert.equal(run(base,'cat /opt/imagick/etc/ImageMagick-7/policy.xml'),run(image,'cat /opt/imagick/etc/ImageMagick-7/policy.xml'));
 const delegates=x=>run(x,'magick -version').split('\n').find(line=>line.startsWith('Delegates')).split(': ').at(-1).trim().split(' ');
 assert.deepEqual(delegates(image),delegates(base).filter(value=>value!=='openexr'));
 assert.equal(run(image,'test "$(dpkg-query -W -f=\'${db:Status-Status}\' libopenexr-3-1-30 2>/dev/null || true)" != installed; ! find /opt /usr/lib /lib -name "libOpenEXR*.so*" -o -name "libIex*.so*" -o -name "libIlmThread*.so*" | grep .; ! ldd /opt/imagick/bin/magick | grep -E "not found|OpenEXR|libIex|libIlmThread"; echo removed').trim(),'removed');
 const raster='for ext in png jpeg webp; do magick -size 32x24 gradient:blue-red /tmp/a.$ext; test "$(magick identify -format "%w %h" /tmp/a.$ext)" = "32 24"; magick /tmp/a.$ext -depth 8 rgba:- | sha256sum; done; printf \'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24"><rect width="32" height="24" fill="blue"/><circle cx="16" cy="12" r="8" fill="red"/></svg>\' > /tmp/example.svg; magick /tmp/example.svg -depth 8 rgba:- | sha256sum';
 assert.equal(run(image,raster),run(base,raster),'PNG/JPEG/WebP/SVG decoded pixel equivalence');
 const denial=run(image,'cat > /tmp/mislabeled.png; cp /tmp/mislabeled.png /tmp/fictional.exr; for name in /tmp/mislabeled.png /tmp/fictional.exr; do if magick "$name" /tmp/result.png 2>/tmp/error; then exit 1; fi; done; echo denied',exr).trim();
 assert.equal(denial,'denied');
 media.push({image,imageId:after.Id,applicationBytesUnchanged:true,delegatesEqualExceptExr:true,rasterPixelEquivalence:true,normalSvgPassed:true,exrAndMislabeledExrDenied:true,openExrPackagesAndPayloadRemoved:true});
}
const fontResult=JSON.parse(docker(['run',...bounded,'--tmpfs','/tmp:rw,size=64m,mode=1777','-v',process.cwd()+'/deployment/maintenance/penpot-2.18.3/check-runtime-native.py:/check.py:ro','--entrypoint','python3',backend,'/check.py']));
assert.equal(fontResult.fontforgeTtfOtf,true);assert.equal(fontResult.woffRoundtrip,true);assert.equal(fontResult.woff2Roundtrip,true);
const record={schema:1,version:'2.18.3',status:'passed',date:new Date().toISOString(),backend:{image:backend,imageId:media[0].imageId},exporter:{image:exporter,imageId:media[1].imageId},frontend:{image:frontend,imageId:JSON.parse(docker(['image','inspect',frontend]))[0].Id},media,fontResult,deployed:false,limitation:'Full native two-account gate must still pass; libxml2 findings are not fixed by removing OpenEXR.'};
await mkdir(directory,{recursive:true,mode:0o700});
await writeFile(directory+'/penpot-no-exr.json',JSON.stringify(record,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify(record));
