#!/usr/bin/env python3
"""Fetch pinned upstream MIT icon assets at build time, never in a visitor browser."""
import base64, hashlib, io, json, pathlib, sys, tarfile, urllib.request
out = pathlib.Path(sys.argv[1]) / 'static/vendor'
out.mkdir(parents=True, exist_ok=True)
def package(url, integrity):
    blob=urllib.request.urlopen(url, timeout=30).read()
    assert base64.b64encode(hashlib.sha512(blob).digest()).decode() == integrity
    return tarfile.open(fileobj=io.BytesIO(blob), mode='r:gz')
icon=package('https://registry.npmjs.org/iconify-icon/-/iconify-icon-2.2.0.tgz','PDYyUWgsI8tp5uTwRAfwfrmjkC9WEzWbUFuByAiZAIuCFigho7u+ApIYJ9fKoZyyp8SBCpnq/dVHewNv4or6bg==')
(out/'iconify-icon.min.js').write_bytes(icon.extractfile('package/dist/iconify-icon.min.js').read())
(out/'iconify-LICENSE.txt').write_bytes(icon.extractfile('package/license.txt').read())
ion=package('https://registry.npmjs.org/@iconify-json/ion/-/ion-1.2.7.tgz','ZJNG5kLCbTPr68mdP0jx6Q3lB9AMEQKO2+VvIjuJ2llGFICBLD+cvESn/qGDRIqSfk2D3PrFMf/Qg8WKIUV7cg==')
icons=json.load(ion.extractfile('package/icons.json'))
(out/'ion-info.json').write_bytes(ion.extractfile('package/info.json').read())
(out/'ion-collection.json').write_text(json.dumps({'uncategorized':list(icons['icons'])},separators=(',',':')))
(out/'ion-icons.js').write_text('customElements.get("iconify-icon").addCollection('+json.dumps(icons,separators=(',',':'))+');\n')
print('Pinned Iconify 2.2.0 and Ionicons collection 1.2.7 prepared locally.')
