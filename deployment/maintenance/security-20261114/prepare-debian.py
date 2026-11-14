"""Bind existing exact Debian overlay builder to this finite vendor batch."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261114')
INPUTS = json.loads((HERE/'inputs.json').read_text())
NODE = '/root/.nvm/versions/node/v24.22.3/bin/node'
assert sys.argv[1:] and all(next(r for r in INPUTS['rows'] if r['key']==k)['kind']=='debian' for k in sys.argv[1:])
original = HERE.parent/'security-20261109/vendor-debian.mjs'
sha = lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert sha(original) == INPUTS['fixtureHashes']['security-20261109/vendor-debian.mjs']
code = original.read_text()
start = code.index("const root='/var/lib/")
end = code.index('\nif(kerberos)',start)
code = code[:start]+"const root='"+str(ROOT)+"',here=new URL('"+HERE.as_uri()+"/'),inputs=JSON.parse(fs.readFileSync(new URL('inputs.json',here)));"+code[end:]
needle = '  assert(checks>0);nativeRows.push'
assert code.count(needle) == 1
checks = '''  if(s.packages.libpq5){
   const f=root+'/fixtures/libpq-native-glibc';
   assert.equal(sha(fs.readFileSync(f)),inputs.libpqFixture.glibc);
   const output=docker('run','--rm',...limits,'--user','65534:65534','-v',f+':/native:ro','--entrypoint','/native',image);
   assert.match(output,/^LIBPQ_NATIVE_PASSED version=17001[12] checks=5$/);checks+=5;
  }
  if(s.packages.apache2){
   assert(native(image,'sh',['-ec','. /etc/apache2/envvars; apache2 -v']).includes('Apache/2.4.'));
   native(image,'sh',['-ec','. /etc/apache2/envvars; apache2 -t']);checks+=2;
  }
'''
code = code.replace(needle,checks+needle)
code = code.replace("new URL('vendor-debian.mjs',here)", "new URL('"+original.as_uri()+"')")
adapter = ROOT/'prepare-debian-adapter.mjs'
if adapter.exists(): assert adapter.read_text() == code
else: adapter.write_text(code)
subprocess.run([NODE,str(adapter),*sys.argv[1:]],check=True)
