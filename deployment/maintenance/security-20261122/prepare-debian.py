"""Finite vendor update using the existing offline Debian package builder.

All credentials, live mounts and network are absent. Full-image scope and
application checks remain separate required gates before release.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

os.umask(0o077)
HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261122')
original=HERE.parent/'security-20261109/vendor-debian.mjs'
code=original.read_text()
start=code.index("const root='/var/lib/");end=code.index('\nif(kerberos)',start)
code=code[:start]+'const root='+json.dumps(str(ROOT))+',here=new URL('+json.dumps(HERE.as_uri()+'/')+'),inputs=JSON.parse(fs.readFileSync(new URL("debian-inputs.json",here)));'+code[end:]
code=code.replace("new URL('vendor-debian.mjs',here)", 'new URL('+json.dumps(original.as_uri())+')')
needle='  assert(checks>0);nativeRows.push'
assert code.count(needle)==1
checks='''  if(s.packages.libc6){
   const fixture=root+'/fixtures/libc-native';
   assert.equal(sha(fs.readFileSync(fixture)),inputs.libcFixture.binarySha256);
   assert.equal(sha(fs.readFileSync(new URL('libc-native.c',here))),inputs.libcFixture.sourceSha256);
   assert.equal(docker('run','--rm',...limits,'--user','65534:65534','-v',fixture+':/native:ro','--entrypoint','/native',image),'LIBC_NATIVE_PASSED utf8-wide-scanf-regex-thread-address-loader-memory-time');checks+=9;
  }
  if(Object.keys(s.packages).some(n=>n.startsWith('php8.')||n.startsWith('libapache2-mod-php'))){
   const text=native(image,'php',['-r','$s="fictional café";if(json_decode(json_encode([$s]),true)!==[$s])exit(1);if(!password_verify($s,password_hash($s,PASSWORD_DEFAULT)))exit(2);$key=random_bytes(32);$iv=random_bytes(16);$ct=openssl_encrypt($s,"aes-256-cbc",$key,OPENSSL_RAW_DATA,$iv);if(openssl_decrypt($ct,"aes-256-cbc",$key,OPENSSL_RAW_DATA,$iv)!==$s)exit(3);echo "PHP_NATIVE_PASSED";']);
   assert.equal(text,'PHP_NATIVE_PASSED');checks+=3;
   assert.equal(native(image,'php',['-m']),native(s.base,'php',['-m']),'PHP module inventory changed');
  }
'''
code=code.replace(needle,checks+needle)
adapter=ROOT/'prepare-debian-adapter.mjs'
if adapter.exists():assert adapter.read_text()==code
else:adapter.write_text(code)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
(ROOT/'debian-build-adapter.json').write_text(json.dumps({'originalSha256':sha(original),'adapterSha256':sha(adapter),
 'changes':['finite pinned vendor inputs','ordinary libc/PHP fixtures']},indent=2)+'\n')
subprocess.run(['/root/.nvm/versions/node/v24.22.3/bin/node',str(adapter),*sys.argv[1:]],check=True)
