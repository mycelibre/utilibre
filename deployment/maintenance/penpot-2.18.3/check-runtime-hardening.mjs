// Three tiny runtime-only layers. No production data, network or credentials.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const directory='/var/lib/utilibre-maintenance/penpot-runtime-20261011';
await mkdir(directory,{recursive:true,mode:0o700});
const frontendBase='penpotapp/frontend:2.18.3@sha256:bb8abe27d53de84c95597f2c02c0e702b2779971fb0703e543f9ecf183e999f6';
const frontend='utilibre-penpot-frontend:2.18.3-minimal-runtime-20261011';
const backendBase='utilibre-penpot-backend:2.18.3-debian-inventory-20261011';
const backend='utilibre-penpot-backend:2.18.3-runtime-hardening-20261011';
const exporterBase='utilibre-penpot-exporter:2.18.3-vendor-security-20261011';
const exporter='utilibre-penpot-exporter:2.18.3-runtime-hardening-20261011';
const docker=(args,input)=>execFileSync('docker',args,{input,timeout:120000,maxBuffer:8*1024**2});
const bounded=['--rm','--network','none','--read-only','--cpus','1','--memory','256m','--pids-limit','96','--log-driver','none'];
const run=(image,script,input)=>docker(['run','-i',...bounded,'--tmpfs','/tmp:rw,size=64m,mode=1777','--entrypoint','sh',image,'-ec',script],input).toString();
const hashImage=(image,script)=>docker(['run',...bounded,'--user','root','--entrypoint','bash',image,'-o','pipefail','-ec',script]).toString();
const inspected=JSON.parse(docker(['image','inspect',frontendBase,frontend,backendBase,backend,exporterBase,exporter]));
for(let i=0;i<inspected.length;i+=2){
 for(const key of ['User','Cmd','Entrypoint','WorkingDir','Env','Volumes','ExposedPorts'])assert.deepEqual(inspected[i+1].Config[key],inspected[i].Config[key],key);
}
const hash='test -s /var/www/app/index.html; find /var/www/app /usr/share/nginx /etc/nginx /entrypoint.sh -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum';
assert.equal(hashImage(frontendBase,hash),hashImage(frontend,hash),'Frontend application bytes');
const awkProgram='BEGIN{ORS=" "} $1=="nameserver" { sub(/%.*$/,"",$2); print ($2 ~ ":")? "["$2"]": $2}';
const resolvers='# fictional input\nnameserver 127.0.0.11\nnameserver 2001:db8::53\nnameserver fe80::1%eth0\nsearch invalid.example\n';
const awk=(image,program)=>docker(['run','-i',...bounded,'--entrypoint',program,image,awkProgram],resolvers).toString();
assert.equal(awk(frontendBase,'/usr/bin/gawk'),awk(frontend,'/usr/bin/awk'));
assert.equal(awk(frontend,'/usr/bin/awk'),'127.0.0.11 [2001:db8::53] [fe80::1] ');
assert.equal(run(frontend,'test ! -e /usr/bin/gawk; test ! -e /usr/lib/x86_64-linux-gnu/gawk; test ! -e /var/lib/dpkg/status.d/gawk; test "$(readlink -f /usr/bin/awk)" = /usr/bin/mawk; test "$(dpkg-query -W -f=\'${db:Status-Status}\' gawk 2>/dev/null || true)" != installed; echo removed').trim(),'removed');
const policyPath='/opt/imagick/etc/ImageMagick-7/policy.xml';
const exr=docker(['run',...bounded,'--tmpfs','/tmp:rw,size=64m,mode=1777','--entrypoint','magick',backendBase,'-size','8x8','xc:#1248ac','exr:-']);
assert.equal(exr.subarray(0,4).toString('hex'),'762f3101');
const media=[];
for(const [base,image] of [[backendBase,backend],[exporterBase,exporter]]){
 const original=run(base,'cat '+policyPath);
 const expectedPolicy=original.replace('</policymap>','  <policy domain="coder" rights="none" pattern="EXR"/>\n</policymap>');
 assert.equal(run(image,'cat '+policyPath),expectedPolicy);
 const artifactHash='find /opt -type f ! -path '+policyPath+' -print0 | sort -z | xargs -0 sha256sum | sha256sum';
 assert.equal(hashImage(base,artifactHash),hashImage(image,artifactHash),'Application/JRE/browser/IM bytes');
 const normal=run(image,'for ext in png jpeg webp; do magick -size 32x24 xc:blue /tmp/a.$ext; test "$(magick identify -format "%w %h" /tmp/a.$ext)" = "32 24"; done; printf \'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24"><rect width="32" height="24" fill="blue"/></svg>\' > /tmp/example.svg; magick /tmp/example.svg /tmp/svg.png; test "$(magick identify -format "%w %h" /tmp/svg.png)" = "32 24"; echo passed').trim();
 assert.equal(normal,'passed');
 const denial=run(image,'cat > /tmp/mislabeled.png; cp /tmp/mislabeled.png /tmp/fictional.exr; for name in /tmp/mislabeled.png /tmp/fictional.exr; do if magick "$name" /tmp/result.png 2>/tmp/error; then exit 1; fi; grep -q "NotAuthorized.*EXR" /tmp/error; done; echo denied',exr).trim();assert.equal(denial,'denied');
 media.push({image,normalPngJpegWebpSvg:true,syntheticExrDenied:true,mislabeledExrDenied:true,onlyPolicyChanged:true});
}
const result={status:'passed',date:new Date().toISOString(),deployed:false,frontend:{image:frontend,imageId:inspected[1].Id,gawkActuallyRemoved:true,staleGawkFragmentRemoved:true,mawkResolverEquivalent:true,applicationBytesUnchanged:true},backend:{image:backend,imageId:inspected[3].Id},exporter:{image:exporter,imageId:inspected[5].Id},media,limits:'EXR denial is defense in depth, not a library patch. libxml2 and other OS findings remain. No production deployment.'};
await writeFile(directory+'/hardening.json',JSON.stringify(result,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(result));
