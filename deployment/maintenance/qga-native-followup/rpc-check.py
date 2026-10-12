"""Only disposable Docker use: native RPC compatibility with a fictional account.

No host socket/device or existing home is mounted. No freeze/shutdown/time-setting
RPC exists in this program. SSH strings are deliberately unusable test text.
"""
import json
import os
import pathlib
import pwd
import socket
import subprocess
import sys
import tempfile
import time

assert pathlib.Path('/.dockerenv').is_file(), 'Container-only check'
assert not pathlib.Path('/dev/virtio-ports/org.qemu.guest_agent.0').exists()
assert os.geteuid() == 0
fixture = pathlib.Path(tempfile.mkdtemp(prefix='qga-native-fixture-', dir='/tmp'))
fixture.chmod(0o755)
home = fixture / 'home'
try:
    previous_account = pwd.getpwnam('qga_fixture')
except KeyError:
    previous_account = None
if previous_account is not None:
    assert previous_account.pw_uid == 24001 and previous_account.pw_dir.startswith('/tmp/qga-native-fixture-')
    subprocess.check_call(['userdel', 'qga_fixture'])
subprocess.check_call(['useradd', '--no-log-init', '--uid', '24001', '--home-dir', str(home), '--no-create-home', '--shell', '/usr/sbin/nologin', 'qga_fixture'])
account = pwd.getpwnam('qga_fixture')
home.mkdir(mode=0o700)
os.chown(home, account.pw_uid, account.pw_gid)
reports = []
commands = ['guest-ping', 'guest-info', 'guest-get-time', 'guest-get-osinfo', 'guest-fsfreeze-status',
            'guest-ssh-add-authorized-keys', 'guest-ssh-get-authorized-keys', 'guest-ssh-remove-authorized-keys']
def ids(pid):
    return {l.split(':')[0]: l.split(':')[1].split() for l in pathlib.Path('/proc/' + str(pid) + '/status').read_text().splitlines() if l.startswith(('Uid:', 'Gid:'))}
for label, binary in zip(['baseline', 'candidate'], sys.argv[1:3]):
    area = fixture / label
    area.mkdir()
    sockpath = area / 'socket'
    config = area / 'empty.conf'
    config.write_text('')
    env = {**os.environ, 'QGA_CONF': str(config)}
    default = subprocess.check_output([binary, '--dump-conf'], env=env, text=True)
    stderr = (area / 'stderr').open('w')
    process = subprocess.Popen([binary, '-m', 'unix-listen', '-p', str(sockpath), '-t', str(area), '-f', str(area / 'pid')], env=env, stdout=subprocess.DEVNULL, stderr=stderr)
    try:
        for _ in range(100):
            if sockpath.exists():
                break
            assert process.poll() is None
            time.sleep(0.05)
        connection = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        connection.settimeout(5)
        connection.connect(str(sockpath))
        stream = connection.makefile('rwb', buffering=0)
        def rpc(command, arguments=None, error=False):
            assert command in commands
            request = {'execute': command}
            if arguments is not None:
                request['arguments'] = arguments
            stream.write((json.dumps(request) + '\n').encode())
            response = json.loads(stream.readline())
            assert ('error' in response) == error, response
            assert ids(process.pid) == original_ids, 'Effective credentials were not restored'
            return response['error'] if error else response['return']
        original_ids = ids(process.pid)
        assert original_ids == {'Uid': ['0'] * 4, 'Gid': ['0'] * 4}
        assert rpc('guest-ping') == {}
        info = rpc('guest-info')
        assert isinstance(rpc('guest-get-time'), int)
        assert rpc('guest-get-osinfo')['id'] == 'debian'
        assert rpc('guest-fsfreeze-status') == 'thawed'
        key = 'ssh-ed25519 fictional-unusable-key utilibre-synthetic-test'
        assert rpc('guest-ssh-add-authorized-keys', {'username': account.pw_name, 'keys': [key]}) == {}
        file = home / '.ssh/authorized_keys'
        assert file.read_text() == key and file.stat().st_uid == 24001 and file.stat().st_mode & 0o777 == 0o600
        assert rpc('guest-ssh-get-authorized-keys', {'username': account.pw_name})['keys'] == [key]
        assert rpc('guest-ssh-remove-authorized-keys', {'username': account.pw_name, 'keys': [key]}) == {}
        assert rpc('guest-ssh-get-authorized-keys', {'username': account.pw_name})['keys'] == []
        rpc('guest-ssh-get-authorized-keys', {'username': 'utilibre_fixture_user_does_not_exist'}, error=True)
        assert rpc('guest-ping') == {}
        reports.append({'label': label, 'defaultConfig': default, 'commands': sorted(info['supported_commands'], key=lambda c: c['name']), 'normalRpcPassed': True, 'syntheticKeyAddReadRemove': True, 'effectiveIdentityRestored': True, 'missingUserErrorHandled': True, 'version': info['version']})
        file.unlink()
        (home / '.ssh').rmdir()
        stream.close()
        connection.close()
    finally:
        process.terminate()
        process.wait(timeout=10)
        stderr.close()
    assert process.returncode == 0
assert reports[0]['commands'] == reports[1]['commands'], 'RPC capability drift'
assert reports[0]['defaultConfig'] == reports[1]['defaultConfig'], 'Native default configuration drift'
pathlib.Path(sys.argv[3]).write_text(json.dumps({'passed': True, 'environment': 'network-disconnected disposable Debian container; no host devices or user data', 'commandCapabilityCount': len(reports[0]['commands']), 'nativeCapabilitiesPreserved': True, 'defaultConfigurationPreserved': True, 'reports': reports, 'limitations': 'This benign RPC check is not an exploit test; no actual VM freeze or Proxmox interaction tested.'}, indent=2) + '\n')
print('ISOLATED_NATIVE_QGA_RPC_PASSED')
