"""Read-only package boundary, trust-store regression and loopback TLS checks."""
import csv, hashlib, importlib.metadata, io, json, pathlib, ssl, sys
import certifi

root=pathlib.Path(sys.argv[1]); expected=sys.argv[2]
assert importlib.metadata.version('certifi') == expected
assert pathlib.Path(certifi.__file__).parent == root/'certifi'
dist=importlib.metadata.distribution('certifi')
for row in csv.reader(io.StringIO(dist.read_text('RECORD'))):
    p=(root/row[0]).resolve()
    assert p.is_relative_to(root/'certifi') or p.is_relative_to(root/f'certifi-{expected}.dist-info'), str(p)
ctx=ssl.create_default_context(cafile=certifi.where())
names={value for c in ctx.get_ca_certs() for rdns in c['subject'] for key,value in rdns if key=='commonName'}
blocked='emSign ECC Root CA - G3' in names
if expected == '2026.10.19':
    assert not blocked, 'Compromised CA trust remains'
    assert 'ISRG Root X1' in names and 'DigiCert Global Root G2' in names
    assert ctx.verify_mode == ssl.CERT_REQUIRED and ctx.check_hostname
manifest={}
for p in sorted(root.rglob('*')):
    if '__pycache__' in p.parts: continue
    if p.is_symlink(): manifest[str(p)]={'link':str(p.readlink())}
    elif p.is_file(): manifest[str(p)]={'sha256':hashlib.file_digest(p.open('rb'),'sha256').hexdigest(),'mode':p.stat().st_mode&511}
print(json.dumps({'version':expected,'blockedRootTrusted':blocked,'caCount':len(names),'files':manifest},sort_keys=True))
