"""Native anonymous notification gate in a no-network, empty ntfy fixture.

Uses the production *nonsecret* policy without modifying it. No production
topics, notifications, caches, credentials, or volumes are accessed.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import requests

HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/go-leaf-final-20261011/output')
if '--oct28' in sys.argv:
    assert '--baseline' not in sys.argv
    ROOT = Path('/var/lib/utilibre-maintenance/security-20261028/go-leaf/output')
if '--jose' in sys.argv:
    assert '--baseline' not in sys.argv
    ROOT = Path('/var/lib/utilibre-maintenance/security-20261028/jose/ntfy/output')
CONFIG = HERE.parents[1] / 'community/ntfy.yml'
BASE = 'http://127.0.0.1:8080'
TOPIC = '/fictional-native-security-test'


def inside(phase):
    session = requests.Session()
    session.trust_env = False
    for _ in range(100):
        try:
            if session.get(BASE + '/v1/health', timeout=1).status_code == 200:
                break
        except requests.RequestException:
            pass
        time.sleep(.2)
    else:
        raise AssertionError('Native health did not become ready')
    if phase == 'restart':
        response = session.get(BASE + TOPIC + '/json?poll=1&since=all', timeout=5)
        assert response.status_code == 200 and response.text.strip() == ''
        return {'ramCacheClearedOnRestart': True}
    response = session.post(BASE + TOPIC, data=b'Fictional maintenance notification', timeout=5)
    assert response.status_code == 200, response.status_code
    message = response.json()
    assert message['message'] == 'Fictional maintenance notification'
    assert message['expires'] - message['time'] == 3600
    response = session.get(BASE + TOPIC + '/json?poll=1&since=all', timeout=5)
    assert response.status_code == 200
    assert message['id'] in [json.loads(line)['id'] for line in response.text.splitlines()]
    uncached = session.post(BASE + TOPIC, data=b'Fictional uncached notification',
                            headers={'Cache': 'no'}, timeout=5)
    assert uncached.status_code == 200
    response = session.get(BASE + TOPIC + '/json?poll=1&since=all', timeout=5)
    assert uncached.json()['id'] not in [json.loads(line)['id'] for line in response.text.splitlines()]
    attachment = session.put(BASE + TOPIC, data=b'Fictional attachment',
                             headers={'Filename': 'fictional.txt'}, timeout=5)
    assert attachment.status_code == 400 and attachment.json()['code'] == 40014
    signup = session.post(BASE + '/v1/account', json={
        'username': 'fictional', 'password': 'Fixture-only-password-593!'}, timeout=5)
    assert signup.status_code == 404
    metrics = session.get(BASE + '/metrics', timeout=5)
    # The native web-app catch-all can return HTML for an unregistered route.
    assert 'ntfy_messages_published_success' not in metrics.text
    assert metrics.status_code == 404 or 'text/html' in metrics.headers.get('Content-Type', '')
    return {'anonymousPublishAndPoll': True, 'oneHourExpiry': True,
            'noCacheHonoured': True, 'attachmentsDisabled': True,
            'registrationDisabled': True, 'metricsDisabled': True}


def main():
    os.umask(0o077)
    baseline = '--baseline' in sys.argv
    stage = ({'imageId': next(s['baseId'] for s in json.loads((HERE / 'images.json').read_text()) if s['key'] == 'ntfy')}
             if baseline else json.loads((ROOT / 'ntfy-image.json').read_text()))
    name = 'maintenance-ntfy-native-' + str(os.getpid())
    run = lambda args: subprocess.check_output(args, text=True).strip()
    try:
        run(['docker', 'run', '-d', '--name', name, '--network', 'none',
             '--read-only', '--user', '1000:1000', '--cap-drop', 'ALL',
             '--security-opt', 'no-new-privileges', '--log-driver', 'none',
             '--cpus', '1', '--memory', '256m', '--pids-limit', '128',
             '--tmpfs', '/tmp:rw,size=16m,mode=1777',
             '-v', str(CONFIG) + ':/etc/ntfy/server.yml:ro', stage['imageId'], 'serve'])
        checks = {}
        for phase in ['initial', 'restart']:
            if phase == 'restart':
                run(['docker', 'restart', name])
            info = json.loads(run(['docker', 'inspect', name]))[0]
            assert info['Image'] == stage['imageId']
            assert info['HostConfig']['NetworkMode'] == 'none'
            result = run(['nsenter', '-t', str(info['State']['Pid']), '-n',
                          sys.executable, str(Path(__file__).resolve()), '--inside', phase])
            checks.update(json.loads(result))
        report = {'passed': True, 'imageId': stage['imageId'], 'date': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                  'configurationSha256': hashlib.sha256(CONFIG.read_bytes()).hexdigest(),
                  'networkIsolated': True, 'onlySyntheticData': True, **checks,
                  'limitations': ['No real-device UnifiedPush test; production registration and uploads remain disabled.']}
        (ROOT / ('ntfy-baseline-native.json' if baseline else 'ntfy-native.json')).write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report))
    finally:
        subprocess.run(['docker', 'rm', '-f', '-v', name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--inside':
        print(json.dumps(inside(sys.argv[2])))
    else:
        main()
