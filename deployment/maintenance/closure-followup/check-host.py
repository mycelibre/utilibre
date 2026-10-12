#!/usr/bin/env python3
"""Bounded candidate/live checks. Only fictional data; no daemon restart."""
import ctypes, hashlib, json, os, pathlib, subprocess, sys, tempfile
ROOT=pathlib.Path('/var/lib/utilibre-maintenance/closure-followup-20261012')
assert sys.argv[1:] in ([], ['--installed'])
installed=bool(sys.argv[1:]); prefix=pathlib.Path('/') if installed else ROOT/'candidate'
env={**os.environ,'LD_LIBRARY_PATH':str(prefix/'usr/lib/x86_64-linux-gnu'),
     'VIMRUNTIME':str(prefix/'usr/share/vim/vim92'), 'LC_ALL':'C.UTF-8'}
def run(args, **kw):
    return subprocess.run(args,check=True,capture_output=True,text=True,timeout=45,**kw).stdout.strip()
vim=prefix/'usr/bin/vim.basic'; tiny=prefix/'usr/bin/vim.tiny'
assert '9.2' in run([str(vim),'--version'],env=env)
for binary in (vim,tiny):
    linked=run(['ldd','-r',str(binary)],env=env)
    assert 'not found' not in linked and 'undefined symbol' not in linked
    with tempfile.TemporaryDirectory(prefix='utilibre-vim-') as fixture:
        file=pathlib.Path(fixture)/'fictional.txt'
        file.write_text('Fictional notice\nGuatemala: áéíóú ñ\n')
        run([str(binary),'-Nu','NONE','-n','-es',str(file),'-c','%s/notice/example/','-c','wq'],env=env)
        assert file.read_text()=='Fictional example\nGuatemala: áéíóú ñ\n'
script=r'''
import pyexpat
assert pyexpat.EXPAT_VERSION=='expat_2.9.0', pyexpat.EXPAT_VERSION
values=[]
p=pyexpat.ParserCreate();p.CharacterDataHandler=values.append
p.Parse('<notice>Fictional: áéíóú ñ</notice>'.encode(),True)
assert ''.join(values)=='Fictional: áéíóú ñ'
for xml in [b'<notice>', b'\xff\xfe'+('<n>'.encode('utf-16le'))+b'\x00\xd8'+('</n>'.encode('utf-16le'))]:
    try: pyexpat.ParserCreate().Parse(xml,True)
    except pyexpat.ExpatError: pass
    else: raise AssertionError('Invalid XML accepted')
assert pyexpat.ParserCreate().Parse(b'<n a="fictional"/>',True)==1
print('EXPAT_NATIVE_PASSED')
'''
assert run(['/usr/bin/python3','-I','-c',script],env=env)=='EXPAT_NATIVE_PASSED'
report={'date':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),
 'status':'passed','installed':installed,'vimVersion':'9.2.0858', 'expatVersion':'2.9.0',
 'checks':['ELF relocations for both editors','UTF-8 edit/save/reopen for both editors',
           'actual Python pyexpat binding','valid XML and malformed/UTF-16-surrogate rejection'],
 'limitations':['Bounded native regressions, not all editor commands or XML consumers.'],
 'payloads':{str(p.relative_to(prefix)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [vim,tiny,prefix/'usr/lib/x86_64-linux-gnu/libexpat.so.1.13.0']}}
(ROOT/('host-live.json' if installed else 'host-candidate.json')).write_text(json.dumps(report,indent=2)+'\n')
print('Host candidate/live native editor and XML checks passed; no service restart.')
