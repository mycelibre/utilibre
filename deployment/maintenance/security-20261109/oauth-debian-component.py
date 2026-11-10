"""Inventory the installed 3.2.2 client-only device implementation; no token requests."""
import ast,hashlib,importlib.util,json,subprocess
from pathlib import Path
from urllib.parse import parse_qs
import oauthlib
from oauthlib.oauth2 import DeviceClient
assert oauthlib.__version__ == '3.2.2'
root=Path(oauthlib.__file__).parent
assert str(root) == '/usr/lib/python3/dist-packages/oauthlib'
files={}
for p in sorted(root.rglob('*.py')):
    assert not p.is_symlink()
    data=p.read_bytes();files[str(p.relative_to(root))]=hashlib.sha256(data).hexdigest()
    assert not any(isinstance(n,ast.ClassDef) and n.name=='DeviceCodeGrant' for n in ast.walk(ast.parse(data)))
packaged={str(Path(p).relative_to(root)) for p in subprocess.check_output(['dpkg-query','-L','python3-oauthlib'],text=True).splitlines() if p.startswith(str(root)+'/') and p.endswith('.py')}
assert packaged and set(files)==packaged
assert importlib.util.find_spec('oauthlib.oauth2.rfc8628.grant_types') is None
assert importlib.util.find_spec('oauthlib.oauth2.rfc8628.endpoints') is None
body=parse_qs(DeviceClient('fictional-client').prepare_request_body('approved-fictional-device',scope=['read'],include_client_id=True))
assert body['device_code']==['approved-fictional-device'] and body['client_id']==['fictional-client']
assert body['grant_type']==['urn:ietf:params:oauth:grant-type:device_code'] and body['scope']==['read']
print(json.dumps({'passed':True,'version':oauthlib.__version__,'serverGrantAbsent':True,'serverEndpointsAbsent':True,'completePackagedSource':True,'normalClientPreparation':True,'network':'none','files':files,'filesSha256':hashlib.sha256(json.dumps(files,sort_keys=True).encode()).hexdigest()}))
