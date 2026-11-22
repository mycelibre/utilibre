"""Finite XML successor through existing offline build, scan and app fixtures."""
import hashlib
import json
import os
from pathlib import Path
import sys
from adapter_scope import relocate_directory

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/xml-successor')
mode, *args = sys.argv[1:]
if mode == 'bind-db':
    assert args == ['records-db', 'simplelogin-db']
    for key in args:
        out = ROOT / 'images' / key
        build = json.loads((out / 'build.json').read_text())
        consumer = json.loads((out / 'consumer.json').read_text())
        assert build['passed'] and consumer['passed'] and consumer['abiPreserved']
        assert consumer['profile'] == 'postgres-runtime' and consumer['imageId'] == build['imageId']
        assert consumer['base'] == build['base'] and all(r['nativeDumpRestore'] for r in consumer['rows'])
        assert not (out / 'application.json').exists()
        (out / 'application.json').write_bytes((out / 'consumer.json').read_bytes())
    print('Native PostgreSQL XML, data roundtrip and dump/restore evidence bound; no approval.')
    raise SystemExit(0)
names = {'prepare': 'prepare-nginx.py', 'scan': 'scan-nginx.py', 'app': 'check-vendor.py',
         'consumer': '../security-20261109/check-musl-runtimes.py', 'release': 'release-nginx.py', 'collect': 'collect-releases.py'}
assert mode in names and (args or mode == 'collect')
original = (HERE / names[mode]).resolve()
code = relocate_directory(original.read_text(), original.parent)


def replace(before, after):
    global code
    assert code.count(before) == 1, (mode, before)
    code = code.replace(before, after)


if mode == 'collect':
    assert not args
    args = ['--alpine']
    replace("Path('/var/lib/utilibre-maintenance/security-20261122')", 'Path(' + repr(str(ROOT)) + ')')
    replace("ROOT /= 'alpine-crypto'", "ROOT /= 'images'")
    replace("'alpine-crypto-inputs.json' if alpine", "'xml-successor-inputs.json' if alpine")
    replace("len(inputs['rows']) == 20", "len(inputs['rows']) == 5")
elif mode in ('prepare', 'scan', 'release'):
    if mode == 'scan':
        replace('ROOT=m.ROOT; inputs=m.INPUTS', 'ROOT=Path(' + repr(str(ROOT)) + "); inputs=json.loads((HERE/'xml-successor-inputs.json').read_text())")
    else:
        replace("Path('/var/lib/utilibre-maintenance/security-20261122')", 'Path(' + repr(str(ROOT)) + ')')
        code = code.replace("HERE/'nginx-inputs.json'", "HERE/'xml-successor-inputs.json'")
    code = code.replace("ROOT/'nginx'", "ROOT/'images'")
    if mode == 'prepare':
        replace("""        version=native(im,'nginx','-v').decode().strip()  # nginx prints version on stderr; checked below too.
        info=native(im,'sh','-ec','nginx -v 2>&1; nginx -V 2>&1').decode()
        assert 'nginx/1.30.' in info""", """        info=native(im,'sh','-ec','ldd /usr/lib/libxml2.so.2').decode()
        assert 'not found' not in info
        checks.append({'imageId':im,'sharedLibraryLoads':True})""")
        replace("'native':checks,", "'native':checks,'nativeRows':checks,")
    elif mode == 'release':
        replace("adapter=ROOT/'release-nginx-adapter-v3.mjs'", "adapter=ROOT/'release-xml-adapter.mjs'")
        # Reuse the already-established records and Wallabag network boundary.
        anchor = "for relative in ('../security-20261103/release-lock.mjs'"
        extra = '''replace("const unlock=acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');", """function boundary(g){
 const chain=g.project==='utilibre-wallabag'?'UTILIBRE-WALLABAG':g.project==='utilibre-records'?'UTILIBRE-RECORDS':null;
 if(!chain)return null;
 const rules=command('iptables',['-S',chain]);assert(rules.includes('-j DROP')&&rules.includes('--dport 3128'));
 command('iptables',['-C','DOCKER-USER','-j',chain]);
 if(g.project==='utilibre-wallabag')command('systemctl',['is-active','--quiet','utilibre-wallabag.service']);
 return hash(rules);
}
const unlock=acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');""")
replace('  const original=config(g),refs=new Set();','  g.boundarySha256=boundary(g);\\n  const original=config(g),refs=new Set();')
replace("await checkExistingGroup(previous.group,'new');","await checkExistingGroup(previous.group,'new');assert.equal(boundary(previous.group),previous.group.boundarySha256);")
replace('await checkExistingGroup(g,version);exactConfig(version);','await checkExistingGroup(g,version);assert.equal(boundary(g),g.boundarySha256);exactConfig(version);')
'''
        replace(anchor, extra + anchor)
        row = next(r for r in json.loads((HERE / 'xml-successor-inputs.json').read_text())['rows'] if r['key'] == args[-1])
        out = ROOT / 'images' / row['key']
        assert hashlib.sha256((out / 'consumer.json').read_bytes()).hexdigest() == row['xmlConsumerSha256']
        assert json.loads((out / 'consumer.json').read_text())['passed']
elif mode == 'app':
    assert all(k in ('wallabag', 'privatebin', 'translite') for k in args)
    replace("Path('/var/lib/utilibre-maintenance/security-20261122/vendor')", 'Path(' + repr(str(ROOT / 'images')) + ')')
    replace("'vendor-inputs.json'", "'xml-successor-inputs.json'")
else:
    replace("Path('/var/lib/utilibre-maintenance/security-20261109/musl')", 'Path(' + repr(str(ROOT / 'images')) + ')')
    replace("HERE / 'musl-inputs.json'", 'Path(' + repr(str(HERE / 'xml-successor-inputs.json')) + ')')
    replace('/lib/ld-musl-x86_64.so.1', '/usr/lib/libxml2.so.2')
    # Exercise the actual XML consumer through existing PHP/PostgreSQL APIs.
    # Existing ordinary native operations and database export/restore stay.
    anchor = 'CREATE TABLE example (id int PRIMARY KEY, label text, payload jsonb);'
    replace(anchor, '''DO $xml_check$ BEGIN
 IF (xpath('/note/text()', XMLPARSE(DOCUMENT '<note>fictional niño</note>')))[1]::text <> 'fictional niño' THEN
  RAISE EXCEPTION 'XML text roundtrip';
 END IF;
 IF xml_is_well_formed_document('<broken>') THEN RAISE EXCEPTION 'XML rejection'; END IF;
END $xml_check$;
''' + anchor)
    anchor = 'PHP = r"""'
    assert code.count(anchor) == 1
    replace(anchor, anchor + '''
$xml = '<note>fictional niño</note>';
$doc = new DOMDocument();
if (!$doc->loadXML($xml, LIBXML_NONET) || $doc->documentElement->textContent !== 'fictional niño') { exit(81); }
libxml_use_internal_errors(true);
if ($doc->loadXML('<broken>', LIBXML_NONET)) { exit(82); }
libxml_clear_errors();
''')
    if args == ['privatebin']:
        # PrivateBin ships SimpleXML, not DOM. Use its actual installed API;
        # never install an extension simply to satisfy a test fixture.
        replace("""$doc = new DOMDocument();
if (!$doc->loadXML($xml, LIBXML_NONET) || $doc->documentElement->textContent !== 'fictional niño') { exit(81); }
libxml_use_internal_errors(true);
if ($doc->loadXML('<broken>', LIBXML_NONET)) { exit(82); }""", """$doc = simplexml_load_string($xml, 'SimpleXMLElement', LIBXML_NONET);
if ($doc === false || (string)$doc !== 'fictional niño') { exit(81); }
libxml_use_internal_errors(true);
if (simplexml_load_string('<broken>', 'SimpleXMLElement', LIBXML_NONET) !== false) { exit(82); }""")
    code = code.replace('Library-only compatibility:', 'XML library ABI and actual PHP/PostgreSQL XML parsing; library-only compatibility:')
adapter = ROOT / ('run-' + mode + ('-privatebin' if mode == 'consumer' and args == ['privatebin'] else '') + '.py')
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
(ROOT / ('adapter-' + mode + ('-privatebin' if mode == 'consumer' and args == ['privatebin'] else '') + '.json')).write_text(json.dumps({'originalSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
    'adapterSha256': hashlib.sha256(code.encode()).hexdigest(), 'purpose': 'Exact XML package, retained native consumers and release boundaries'}, indent=2) + '\n')
sys.argv = [str(adapter), *args]
exec(compile(code, str(adapter), 'exec'), {'__file__': str(adapter), '__name__': '__main__'})
