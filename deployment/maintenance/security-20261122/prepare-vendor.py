"""Finite PHP/crypto batch using this release's exact signed overlay checks.

Only reviewed pinned APK inputs are installed, with no network or dependency
resolution. Existing libc, application files and configuration must not change.
"""
import hashlib
import json
from pathlib import Path
import sys

HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261122')
original=HERE/'prepare-nginx.py'
code=original.read_text()


def replace(old,new):
    global code
    assert code.count(old)==1, old
    code=code.replace(old,new)


replace("HERE = Path(__file__).resolve().parent", 'HERE = Path('+repr(str(HERE))+')')
replace("INPUTS = json.loads((HERE/'nginx-inputs.json').read_text())", "INPUTS = json.loads((HERE/'vendor-inputs.json').read_text())")
assert code.count("ROOT/'nginx'")==2
code=code.replace("ROOT/'nginx'", "ROOT/'vendor'")
replace("ROOT/'packages'/p['file']", "ROOT/'vendor-packages'/p['file']")
replace("re.fullmatch(r'[a-z0-9-]+', n)", "re.fullmatch(r'[a-z0-9_-]+', n)")
replace(" apk verify /usr/lib/utilibre-vendor/*.apk; apk add --no-network /usr/lib/utilibre-vendor/*.apk;", """ for f in /usr/bin/php /usr/sbin/php-fpm; do if test -L $f; then cp -a $f /usr/lib/utilibre-vendor/$(basename $f).link; fi; done; \\
 apk verify /usr/lib/utilibre-vendor/*.apk; apk add --no-network /usr/lib/utilibre-vendor/*.apk; \\
 for f in /usr/bin/php /usr/sbin/php-fpm; do if test -L /usr/lib/utilibre-vendor/$(basename $f).link; then cp -a /usr/lib/utilibre-vendor/$(basename $f).link $f; fi; done;""")
replace("    assert changed and set(changed) <= allowed,", "    for link in ('usr/bin/php','usr/sbin/php-fpm'):\n        if before.get(link,{}).get('type')=='2':assert before[link]==after.get(link), 'Existing PHP command link changed'\n    assert changed and set(changed) <= allowed,")
replace("    checks=[]\n", "    checks=[]\n    assert native(s['base'],'php','-m')==native(image,'php','-m'), 'PHP extension set changed'\n")
replace("""        version=native(im,'nginx','-v').decode().strip()  # nginx prints version on stderr; checked below too.
        info=native(im,'sh','-ec','nginx -v 2>&1; nginx -V 2>&1').decode()
        assert 'nginx/1.30.' in info""", """        version=native(im,'php','-r','echo PHP_VERSION;').decode().strip()
        assert version.startswith(('8.4.', '8.5.'))
        modules=native(im,'php','-m').decode()
        assert 'Warning' not in modules and 'Fatal' not in modules
        value=native(im,'php','-r', '$s="fictional café";$j=json_decode(json_encode([$s]),true);if($j!==[$s]||strlen(random_bytes(32))!==32||hash("sha256",$s)!==hash("sha256",$j[0]))exit(1);echo "PHP_NATIVE_PASSED";').decode()
        assert value=='PHP_NATIVE_PASSED'
        checks.append({'imageId':im,'phpVersion':version,'sameExtensions':True,'ordinaryDataAndRandomChecks':True})""")
adapter=ROOT/'prepare-vendor-adapter-v2.py'
if adapter.exists():assert adapter.read_text()==code
else:adapter.write_text(code)
(ROOT/'vendor-adapter.json').write_text(json.dumps({'originalSha256':hashlib.sha256(original.read_bytes()).hexdigest(),
 'adapterSha256':hashlib.sha256(adapter.read_bytes()).hexdigest(),
 'changes':['finite PHP/crypto inputs and evidence paths','ordinary PHP checks and exact extension set']},indent=2)+'\n')
exec(compile(code,str(adapter),'exec'),{'__file__':str(adapter),'__name__':__name__})
