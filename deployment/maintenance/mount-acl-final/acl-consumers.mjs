import fs from 'node:fs';import assert from 'node:assert/strict';
import {root,work,sha,docker,inspect,limits} from './common.mjs';
process.umask(0o077);
const name='utilibre-gathio-postgres-1',live=inspect(name),library=work+'/acl-candidate/usr/lib/x86_64-linux-gnu/libacl.so.1.2.2400',bin=work+'/acl-candidate/usr/bin';
assert(fs.existsSync(library));assert(!fs.existsSync(root+'/acl-consumers.json'));
const script=`set -eu
export PATH=/acl-bin:/usr/bin:/bin
test "$(dpkg-query -W -f='\${Version}' rsync)" = '3.5.1+ds1-1~deb12u1+utilibre1'
test "$(dpkg-query -W -f='\${Version}' tar)" = '1.34+dfsg-1.2+deb12u1'
task_tmp=$(mktemp -d /tmp/acl-consumers-XXXXXX)
cd "$task_tmp"
mkdir source restored synced
printf 'Fictional ACL content\n' > source/example.txt
setfacl -m u:1:r source/example.txt
getfacl -cpn source/example.txt > expected
tar --acls -cf archive.tar -C source example.txt
tar --acls -xf archive.tar -C restored
rsync -aA --numeric-ids source/ synced/
for output in restored synced; do
 cmp source/example.txt "$output/example.txt"
 getfacl -cpn "$output/example.txt" > actual
 cmp expected actual
done
printf 'Native GNU tar and installed patched rsync: ACL/content copy, export and reopen passed.\n'
`;
const output=docker('run',...limits,'--read-only','--user','65534:65534','--tmpfs','/tmp:rw,nosuid,nodev,size=16m,mode=1777','--mount','type=bind,src='+library+',dst=/usr/lib/x86_64-linux-gnu/libacl.so.1.1.2301,readonly','--mount','type=bind,src='+bin+',dst=/acl-bin,readonly','--entrypoint','sh',live.Image,'-ec',script);
fs.writeFileSync(root+'/acl-consumers.json',JSON.stringify({schema:1,date:new Date().toISOString(),passed:true,image:live.Image,container:name,librarySha256:sha(fs.readFileSync(library)),output,scriptSha256:sha(Buffer.from(script)),network:'none',user:65534,limits:'Compatibility only. Existing tar/rsync pathname APIs are not claimed race-safe or migrated.',productionChanged:false},null,2)+'\n');console.log(output);
