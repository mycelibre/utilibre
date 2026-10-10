#!/usr/bin/env python3
"""Create/remove a network-none native-image authentication fixture. No real mail.

Usage: sudo python3 deployment/addy/rspamd/run-check.py PRIVATE_REPORT_DIRECTORY
Requires the existing pinned image, upstream checkout, Docker, nsenter and cryptography.
"""
import json
import os
from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent
NAME = 'utilibre-addy-auth-check'
IMAGE = 'sha256:47b07db6fcbf1618fdc178b696788ae01571094c94ef7fd61e48382f9cf4925a'
UPSTREAM = Path('/opt/utilibre/community-src/addy-docker')
REVISION = 'ec7934b4835518fe6a520dedf7ce97464cacd7cd'


def run(args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def inside(args, **kwargs):
    return run(['docker', 'exec', NAME, *args], **kwargs)


def put(path, content):
    run(['docker', 'exec', '-i', NAME, 'sh', '-c', 'cat > "$1"', 'sh', path],
        input=content.encode())


def main():
    if os.geteuid() != 0 or len(sys.argv) != 2:
        raise SystemExit('Run as root with a private report-directory argument')
    report = Path(sys.argv[1]).resolve()
    report.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(report, 0o700)
    actual = subprocess.check_output(['git', '-C', str(UPSTREAM), 'rev-parse', 'HEAD'], text=True).strip()
    assert actual == REVISION, 'Re-review changed upstream before testing'
    existing = subprocess.run(['docker', 'inspect', NAME], capture_output=True)
    assert existing.returncode != 0, 'Refusing to reuse/remove an existing named container'
    created = False
    try:
        run(['docker', 'run', '-d', '--name', NAME, '--network', 'none', '--cpus', '1',
             '--memory', '256m', '--pids-limit', '64', '--security-opt', 'no-new-privileges:true',
             '--log-driver', 'none', '--entrypoint', 'sh',
             '-v', str(HERE) + ':/review:ro',
             '-v', str(HERE.parent / 'reply-header-checks') + ':/reply-header-checks:ro',
             '-v', str(report) + ':/report', IMAGE, '-c', 'sleep 300'], stdout=subprocess.DEVNULL)
        created = True
        # Use the pinned image's unmodified native blocklist Lua, with a fictional secret.
        upstream = (UPSTREAM / 'rootfs/etc/cont-init.d/14-config-rspamd.sh').read_text()
        native = upstream.split('cat >/etc/rspamd/lua.local.d/addy_blocklist.lua <<EOL\n', 1)[1].split('\nEOL', 1)[0]
        native = native.replace('${BLOCKLIST_API_SECRET}', 'fixture-only-not-a-secret')
        inside(['mkdir', '-p', '/etc/rspamd/lua.local.d'])
        put('/etc/rspamd/lua.local.d/addy_blocklist.lua', native)
        inside(['sh', '-c', 'sh /review/install.sh > /report/configtest.txt 2>&1'])
        options = (HERE / 'override.d/options.inc').read_text()
        assert options.count('dns { timeout') == 1
        options = options.replace('dns { timeout', 'dns { nameserver = ["127.0.0.1:15353"]; timeout')
        put('/etc/rspamd/override.d/options.inc', options)
        inside(['sh', '-c', 'mkdir -p /run/rspamd; chown -R rspamd:rspamd /run/rspamd /var/log/rspamd /var/lib/rspamd'])
        run(['docker', 'exec', '-d', NAME, 'sh', '-c',
             'exec rspamd -i -f -u rspamd -g rspamd > /report/daemon.txt 2>&1'])
        pid = subprocess.check_output(['docker', 'inspect', '-f', '{{.State.Pid}}', NAME], text=True).strip()
        wait = """import socket,time
for _ in range(240):
 try:
  with socket.create_connection(('127.0.0.1',11333),.2): pass
  break
 except OSError: time.sleep(.25)
else: raise SystemExit('Rspamd did not start within 60 seconds')
"""
        run(['nsenter', '-t', pid, '-n', sys.executable, '-c', wait])
        inside(['sh', '/review/setup-fixture-postfix.sh'])
        env = dict(os.environ, ADDY_AUTH_REPORT=str(report))
        with (report / 'check-output.txt').open('w') as output:
            run(['nsenter', '-t', pid, '-n', sys.executable, str(HERE / 'check.py')], env=env, stdout=output)
        with (report / 'final-configdump.json').open('w') as output:
            inside(['rspamadm', 'configdump', '-j'], stdout=output)
        with (report / 'resources.txt').open('w') as output:
            run(['docker', 'stats', '--no-stream', '--format', '{{.MemUsage}} {{.CPUPerc}}', NAME], stdout=output)
        queue = subprocess.check_output(['docker', 'exec', NAME, 'postqueue', '-j'])
        assert not queue.strip(), 'Fictional queue was not cleaned'
        for kind, result in json.loads((report / 'result.json').read_text()).items():
            print(kind, json.dumps(result.get('smtp', result)))
    finally:
        if created:
            subprocess.run(['docker', 'cp', NAME + ':/var/log/rspamd/rspamd.log', str(report / 'rspamd.log')], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            run(['docker', 'rm', '-f', NAME], stdout=subprocess.DEVNULL)
            (report / 'cleanup.json').write_text(json.dumps({
                'container_removed': True, 'no_real_data_mounted': True,
                'network': 'none', 'no_published_ports': True,
                'fictional_private_keys_generated_in_memory_only': True,
            }, indent=2) + '\n')


if __name__ == '__main__':
    main()
