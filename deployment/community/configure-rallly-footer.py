#!/usr/bin/env python3
"""Update only Rallly's supported footer setting; no user/admin impersonation."""
import datetime
import json
import os
from pathlib import Path
import secrets
import subprocess
from urllib.parse import urlsplit

os.umask(0o077)
out = Path('/opt/utilibre/reports/native-navigation-20261009')
out.mkdir(mode=0o700, parents=True, exist_ok=True)

def sql(query):
    return subprocess.check_output([
        'docker', 'exec', '-i', 'utilibre-community-rallly-db-1',
        'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'rallly', '-d', 'rallly',
    ], input=query, text=True)

before = json.loads(sql('SELECT row_to_json(s) FROM instance_settings s WHERE id=1;'))
links = before['footer_links']
assert isinstance(links, list) and len(links) <= 5
expected = [
    {'label': 'More tools from Utilibre', 'href': 'https://utilibre.org/en/'},
    {'label': 'Más herramientas de Utilibre', 'href': 'https://utilibre.org/es/'},
]
for link in links + expected:
    assert isinstance(link, dict) and set(link) == {'label', 'href'}
    assert 1 <= len(link['label'].strip()) <= 40
    assert 1 <= len(link['href'].strip()) <= 2048
    assert urlsplit(link['href']).scheme in ['http', 'https'] and urlsplit(link['href']).netloc
after_links = links + [link for link in expected if link not in links]
assert len(after_links) <= 5, 'Preserve existing links; do not exceed the native five-link limit'
if after_links == links:
    print('Both native catalog links already configured; no write performed.')
    raise SystemExit(0)
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
backup = out / ('rallly-instance-settings-before-' + stamp + '.json')
with backup.open('x') as stream:
    json.dump(before, stream, ensure_ascii=False, indent=2)
tag = '$utilibre_' + secrets.token_hex(12) + '$'
old_json = json.dumps(before, ensure_ascii=False)
new_json = json.dumps(after_links, ensure_ascii=False)
assert tag not in old_json + new_json
query = '''BEGIN;
DO $guard$
DECLARE current_row jsonb;
BEGIN
  SELECT to_jsonb(s) INTO current_row FROM instance_settings s WHERE id=1 FOR UPDATE;
  IF current_row IS DISTINCT FROM OLD_JSON::jsonb THEN
    RAISE EXCEPTION 'Instance settings changed concurrently; inspect before retrying';
  END IF;
  UPDATE instance_settings SET footer_links=NEW_JSON::jsonb, updated_at=now() WHERE id=1;
END;
$guard$;
COMMIT;
'''.replace('OLD_JSON', tag + old_json + tag).replace('NEW_JSON', tag + new_json + tag)
sql(query)
after = json.loads(sql('SELECT row_to_json(s) FROM instance_settings s WHERE id=1;'))
assert after['footer_links'] == after_links
assert {k: v for k, v in before.items() if k not in ['footer_links', 'updated_at']} == {
    k: v for k, v in after.items() if k not in ['footer_links', 'updated_at']
}
(out / 'rallly-footer-config.json').write_text(json.dumps({
    'previousLinksPreserved': len(links), 'newCatalogLinks': len(after_links) - len(links),
    'allOtherSettingsUnchanged': True, 'nativeUpdatedAtAdvanced': True,
    'cacheRefreshPending': True, 'rollbackRow': str(backup),
}, indent=2))
print('Existing footer links preserved; only the supported footer field and its modification timestamp changed.')
