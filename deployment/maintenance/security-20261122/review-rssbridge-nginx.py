"""Exact signed-binary attribution, preserving raw distribution findings.

Read-only live hashes and retained native tests; no probing or activation.
The existing triage interface must separately validate/apply the proposal.
"""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance')
OUT = ROOT / 'security-20261122'
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()


def fixed_record(html, advisory, version):
    records = [r for r in re.findall(r'<li>.*?</li>', html, re.S)
               if re.search(r'(?<![0-9])' + re.escape(advisory) + r'(?![0-9])', r)]
    assert len(records) == 1, 'Ambiguous or missing advisory'
    assert re.search(r'Not vulnerable:[^<]*' + re.escape(version) + r'\+', records[0])


def has_http2_listener(config):
    """Inspect effective nginx -T output, including expanded includes."""
    directives = re.findall(r'(?:^|[;{}])\s*listen\s+([^;]+);', config, re.M)
    assert directives, 'No listener in effective configuration'
    return any(re.search(r'\bhttp2\b', value) for value in directives) or bool(
        re.search(r'(?:^|[;{}])\s*http2\s+on\s*;', config, re.M))


def main():
    http2_only = sys.argv[1:] == ['--http2']
    assert http2_only or not sys.argv[1:], 'Use --http2 for the separate protocol review'
    spec = read(HERE / 'rssbridge-nginx-inputs.json')
    row = spec['rows'][0]
    assert row['releaseApproval'] == 'approved'
    directory = OUT / 'rssbridge-nginx/rssbridge'
    for name, digest in row['reviewedEvidence'].items():
        assert sha(directory / name) == digest
    b, scope, app, gate = [read(directory / name) for name in
                          ('build.json', 'scope.json', 'application.json', 'scan-gate.json')]
    assert all(v['passed'] for v in (b, scope, app, gate))
    assert b['packageMetadataPreserved'] and b['version'] == '1.30.7'
    assert b['binarySha256'] == spec['package']['binarySha256']
    assert b['pin'] == spec['package'] and b['base'] == row['base']
    assert scope['allUnrelatedImageFilesUnchanged'] and scope['configurationUnchanged']
    assert app['consumerUnchanged'] and len(app['rows']) == 2
    assert [r['imageId'] for r in app['rows']] == [b['base'], b['imageId']]
    assert all(r['passed'] and r['checks'] == 14 and r['nativeNginxPhp'] and
               r['privatePathsDenied'] and r['boundedRateLimit'] for r in app['rows'])
    assert gate['newFindings'] == [] and gate['databaseSha256'] == spec['database']['databaseSha256']
    scan, queue = read(ROOT / 'security.json'), read(ROOT / 'security-queue.json')
    assert scan['status'] == 'checked' and queue['status'] == 'current'
    assert scan['completedAt'] == queue['scanDate']
    assert dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(scan['completedAt'].replace('Z', '+00:00')) < dt.timedelta(days=1)
    release = read(directory / 'release-utilibre-community.json')
    assert release['status'] == release['group']['status'] == 'passed'
    assert release['buildSha256'] == sha(directory / 'build.json')
    assert release['completedAt'] < scan['completedAt']
    assert len(release['group']['rows']) == 1
    assert release['group']['rows'][0]['newImage'] == b['imageId']
    image = next(i for i in scan['images'] if i['containers'] == row['containers'])
    assert http2_only or image['id'] == b['imageId']
    assert image['status'] == 'checked' and image['containers'] == row['containers']
    primary = OUT / 'primary/nginx-advisories.html'
    assert sha(primary) == 'fa0e7636a9c4d97d27b6c3862ab5176e7f7a6b4511451038ed6f19584e79b009'
    fixes = {i: '1.30.7' for i in spec['advisories']}
    fixes.update({i: '1.30.6' for i in ('CVE-2026-15176', 'CVE-2026-93479', 'CVE-2026-97205')})
    for advisory, version in fixes.items():
        fixed_record(primary.read_text(), advisory, version)
    def docker(*args):
        return subprocess.check_output(['docker', *args], timeout=30, stderr=subprocess.STDOUT).decode().strip()
    name = row['containers'][0]
    c = json.loads(docker('inspect', name))[0]
    assert c['State']['Running'] and c['Image'] == image['id'] and c['Config']['User'] == '33:33'
    if http2_only:
        assert c['Config']['Image'] == 'utilibre-openssl-bookworm-community-rssbridge:20261122'
    assert not any('/usr/sbin/nginx' == m['Destination'] or '/usr/sbin/nginx'.startswith(m['Destination'] + '/') for m in c['Mounts'])
    assert docker('exec', name, 'sha256sum', '/usr/sbin/nginx').split()[0] == b['binarySha256']
    assert docker('exec', name, 'nginx', '-v') == 'nginx version: nginx/1.30.7'
    for filename, digest in app['configSha256'].items():
        assert sha(HERE.parent.parent / 'community' / filename) == digest
    if http2_only:
        live_config = docker('exec', name, 'nginx', '-T', '-c', '/etc/nginx/utilibre.conf')
        assert '# configuration file /etc/nginx/utilibre.conf:' in live_config
        assert docker('exec', name, 'sha256sum', '/etc/nginx/utilibre.conf').split()[0] == \
            sha(HERE.parent.parent / 'community/rssbridge-nginx.conf')
        assert not has_http2_listener(live_config)
        assert re.findall(r'(?m)^\s*listen\s+([^;]+);', live_config) == ['8080']
        assert 'nginx -c /etc/nginx/utilibre.conf' in docker('exec', name, 'ps', '-eo', 'args')
        fixes = {'CVE-2023-44487': 'configuration-disabled'}
    decisions = []
    for item in queue['items']:
        if not (item['status'] == 'needs-review' and item['scope'] == 'runtime-image' and
                item['artifact'] == image['id'] and item['type'] == 'debian' and
                item['package'] in ('nginx', 'nginx-common') and item['id'] in fixes):
            continue
        assert item['installed'] == '1.22.1-9+deb12u10' and item['containers'] == [name]
        assert docker('exec', name, 'dpkg-query', '-W', '-f=${Version}', item['package']) == item['installed']
        if http2_only:
            reason = ("RSS-Bridge's internal NGINX does not accept HTTP/2: the exact running "
                "1.30.7 binary and mounted configuration are verified; nginx -T -c "
                "/etc/nginx/utilibre.conf has one plain listen 8080 and no http2 on/listen http2. "
                "CVE-2023-44487 concerns HTTP/2 Rapid Reset. This assessment covers only the "
                "RSS-Bridge internal NGINX, not the separate public Caddy edge. Raw scanner "
                "finding retained. Evidence: security-20261122/rssbridge-nginx/rssbridge/ "
                "and live effective config; https://nginx.org/en/docs/http/ngx_http_v2_module.html")
        else:
            reason = f"Official signed upstream NGINX 1.30.7 executable, live SHA256 {b['binarySha256']}. Upstream explicitly fixes {item['id']} in {fixes[item['id']]}; archived advisory page SHA256 {sha(primary)}. Debian nginx/nginx-common labels still describe 1.22.1; raw findings and other CVEs remain. Complete image scope permits only executable and vendor license. Old/new native PHP-FPM, headers, methods, private paths, rate limit, HTTP/2 and fictional Atom checks pass; actual running image, config hashes and release verified. No exploit reproduction claimed. Evidence: security-20261122/rssbridge-nginx/rssbridge/ and primary/nginx-advisories.html; https://nginx.org/en/security_advisories.html"
        decisions.append({'key': item['key'], 'status': 'mitigated',
            'expiresAt': (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7)).isoformat(),
            'reason': reason})
    assert read(ROOT / 'security.json')['completedAt'] == scan['completedAt']
    destination = OUT / ('rssbridge-nginx-http2-reviewed-batch.json' if http2_only
                         else 'rssbridge-nginx-reviewed-batch.json')
    assert not destination.exists()
    destination.write_text(json.dumps({'schemaVersion': 1, 'scanDate': scan['completedAt'],
        'decisions': decisions, 'productionChanged': False, 'imageId': image['id'],
        'manifestSha256': sha(HERE / 'rssbridge-nginx-inputs.json')}, indent=2) + '\n')
    print(json.dumps({'prepared': len(decisions), 'applied': False}))


if __name__ == '__main__':
    main()
