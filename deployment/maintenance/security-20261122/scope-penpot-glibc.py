"""Reuse the retained full-image and library-ABI comparison for Penpot."""
import hashlib
import json
import os
from pathlib import Path
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
assert sys.argv[1:] in (['expanded-penpot-frontend-glibc'],
                         ['expanded-penpot-exporter-glibc'])
source = HERE / 'scope-debian.py'
code = source.read_text()


def replace(old, new):
    global code
    assert code.count(old) == 1, old
    code = code.replace(old, new)


replace('HERE=Path(__file__).resolve().parent', 'HERE=Path(' + repr(str(HERE)) + ')')
replace("HERE/'debian-inputs.json'", "HERE/'penpot-glibc-inputs.json'")
marker = "    assert changed and set(changed)<=allowed,'Unexpected file scope: '+repr(set(changed)-allowed)"
locale_gate = '''    if 'locales' in selected:
        from collections import Counter
        path='etc/locale.gen'
        prior=helper.image_file(old,'/'+path).decode().splitlines(keepends=True)
        current=helper.image_file(new,'/'+path).decode().splitlines(keepends=True)
        comment='# en_US.UTF-8 UTF-8\\n'; active='en_US.UTF-8 UTF-8\\n'
        assert prior.count(comment)==prior.count(active)==1
        expected=prior.copy();expected[prior.index(comment)]=active;expected[prior.index(active)]=comment
        assert current==expected, 'Locale selection changed beyond line placement'
        config='var/cache/debconf/config.dat'; backup='var/cache/debconf/config.dat-old'
        old_config=helper.image_file(old,'/'+config)
        new_config=helper.image_file(new,'/'+config)
        assert helper.image_file(new,'/'+backup)==old_config
        def entries(blob):
            result={}
            for paragraph in blob.decode().strip().split('\\n\\n'):
                lines=paragraph.splitlines()
                name=next(line[6:] for line in lines if line.startswith('Name: '))
                assert name not in result
                result[name]=Counter(lines)
            return result
        previous=entries(old_config);successor=entries(new_config)
        assert previous.keys()==successor.keys()
        special='locales/locales_to_be_generated'
        assert previous[special]['Value: ']==1
        assert successor[special]['Value: en_US.UTF-8 UTF-8']==1
        previous[special].subtract(['Value: ']);successor[special].subtract(['Value: en_US.UTF-8 UTF-8'])
        default='locales/default_environment_locale'
        assert previous[default][' locales = ']==1
        assert successor[default][' locales = en_US.UTF-8']==1
        previous[default].subtract([' locales = ']);successor[default].subtract([' locales = en_US.UTF-8'])
        assert all(previous[name]==successor[name] for name in previous), 'Debconf selections changed'
        allowed.update({path,config,backup})
'''
replace(marker, locale_gate + marker)
replace("p!='etc/ld.so.cache'", "p not in ('etc/ld.so.cache','etc/locale.gen')")
adapter = ROOT / 'scope-penpot-glibc-adapter.py'
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
(ROOT / 'scope-penpot-glibc-adapter.json').write_text(json.dumps({
    'sourceSha256': sha(source), 'adapterSha256': sha(adapter),
    'changes': ['exact DHI manifest only'],
}, indent=2) + '\n')
exec(compile(code, str(adapter), 'exec'),
     {'__file__': str(adapter), '__name__': '__main__'})
