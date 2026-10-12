import fs from 'node:fs';import assert from 'node:assert/strict';
import {root,work,builder,sha,docker,inspect,limits} from './common.mjs';
process.umask(0o077);assert(!fs.existsSync(root+'/acl-caller-boundary.json'));
const here=new URL('.',import.meta.url).pathname;
docker('cp',here+'acl-legacy-tripwire.c',builder+':/work/mount-acl-final/recipes/');
docker('exec',builder,'cc','-Wall','-Wextra','-Werror','-shared','-fPIC','-O2','-I/work/mount-acl-final/acl-candidate/usr/include','/work/mount-acl-final/recipes/acl-legacy-tripwire.c','-o','/work/mount-acl-final/acl-output/acl-legacy-tripwire.so');
const s=inspect('utilibre-gathio-postgres-1'),library=work+'/acl-candidate/usr/lib/x86_64-linux-gnu/libacl.so.1.2.2400';
const script=`set -eu
export PATH=/acl-bin:/usr/bin:/bin
task_tmp=$(mktemp -d /tmp/acl-callers-XXXXXX); cd "$task_tmp"
mkdir source synced
printf 'Fictional controlled caller fixture\n' > source/file
setfacl -m u:1:r source/file
setfacl -m d:u:1:r source
status=0; LD_PRELOAD=/tripwire.so rsync -aA --numeric-ids source/ synced/ 2>rsync-legacy.log || status=$?
test "$status" = 91
grep -q '^LEGACY_PATHNAME_ACL_ENTRY_REACHED$' rsync-legacy.log
status=0; LD_PRELOAD=/tripwire.so tar --acls -cf fixture.tar source 2>legacy.log || status=$?
test "$status" = 91
test "$(cat legacy.log)" = LEGACY_PATHNAME_ACL_ENTRY_REACHED
printf 'RSYNC_AND_GNU_TAR_LEGACY_ENTRIES_CONFIRMED\n'
`;
const output=docker('run',...limits,'--read-only','--user','65534:65534','--tmpfs','/tmp:rw,nosuid,nodev,size=16m,mode=1777','--mount','type=bind,src='+library+',dst=/usr/lib/x86_64-linux-gnu/libacl.so.1.1.2301,readonly','--mount','type=bind,src='+work+'/acl-candidate/usr/bin,dst=/acl-bin,readonly','--mount','type=bind,src='+work+'/acl-output/acl-legacy-tripwire.so,dst=/tripwire.so,readonly','--entrypoint','sh',s.Image,'-ec',script);
fs.writeFileSync(root+'/acl-caller-boundary.json',JSON.stringify({date:new Date().toISOString(),status:'checked',image:s.Image,output,tripwireSha256:sha(fs.readFileSync(work+'/acl-output/acl-legacy-tripwire.so')),scriptSha256:sha(Buffer.from(script)),upstreamRsyncSource:'Authenticated cached rsync3.5.1/lib/acl.c implements FD-relative operations, but actual native copy still reaches a legacy pathname API; that source file alone does not prove all caller paths migrated.',remaining:'GNU tar1.34 and rsync3.5.1 still reach a legacy ACL path. A library-only update does not change that. Upstream GNU tar08c3fc2e is a namespace/build compatibility rename, not migration to the safe libacl API. No blanket mitigation proposed.',network:'none',user:65534,productionChanged:false},null,2)+'\n');console.log(output);
