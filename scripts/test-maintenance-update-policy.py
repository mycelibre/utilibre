#!/usr/bin/env python3
"""Offline update safety checks: no Docker, APT mutation or service restarts."""
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('policy', ROOT / 'scripts/maintenance-update-policy.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
POLICY = {'schemaVersion': 1, 'packages': {'python3-urllib3': 'closure-followup/urllib3-host.mjs'}}


class PolicyTests(unittest.TestCase):
    def test_future_backports_are_discovered_without_a_date_inventory(self):
        rows = m.protected_packages('new-library:amd64\t8.1+utilibre8\tinstalled\n'
                                    'normal\t1.0\tinstalled\n'
                                    'old-library\t1.0+utilibre1\tconfig-files\n'
                                    'python3-urllib3\t2.8.0-2\tinstalled\n', POLICY)
        self.assertEqual([row['package'] for row in rows], ['new-library:amd64', 'python3-urllib3'])
        self.assertEqual(rows[0]['reason'], 'local-version')

    def test_unknown_or_empty_policy_fails_closed(self):
        for policy in [{}, {'schemaVersion': 2, 'packages': {}},
                       {'schemaVersion': 1, 'packages': {'bad;name': 'recipe.mjs'}}]:
            with self.assertRaises(ValueError):
                m.protected_packages('python3-urllib3\t2.8.0-2\tinstalled\n', policy)
        with self.assertRaises(ValueError):
            m.protected_packages('', POLICY)
        with self.assertRaises(ValueError):
            m.protected_packages('malformed\n', POLICY)

    def test_actual_policy_covers_non_local_version_native_repair_families(self):
        policy = json.loads(m.POLICY.read_text())
        native = {'ncurses-bin': '6.5+20250216-2+dhi4', 'vim-tiny': '2:9.2.0858-1',
                  'libexpat1:amd64': '2.9.0-1', 'libsodium26:amd64': '1.0.22-2',
                  'libnghttp3-9:amd64': '1.15.0-1~bpo13+1',
                  'libngtcp2-16:amd64': '1.22.1-1~bpo13+1',
                  'libngtcp2-crypto-gnutls8:amd64': '1.22.1-1~bpo13+1',
                  'libngtcp2-crypto-ossl0:amd64': '1.22.1-1~bpo13+1'}
        installed = ''.join(f'{name}\t{version}\tinstalled\n' for name, version in native.items())
        self.assertEqual({row['package'] for row in m.protected_packages(installed, policy)}, set(native))
        self.assertNotIn('libc6', policy['packages'])
        self.assertNotIn('libnghttp2-14', policy['packages'])

    def test_blacklist_is_anchored_and_preserves_regex_escaping(self):
        text = m.blacklist_text([{'package': 'libpython3.13:amd64'}, {'package': 'libc++1'}])
        patterns = [json.loads(line.strip()[:-1]) for line in text.splitlines() if line.startswith('  ')]
        self.assertTrue(any(re.fullmatch(p, 'libpython3.13') for p in patterns))
        self.assertTrue(any(re.fullmatch(p, 'libpython3.13:arm64') for p in patterns))
        self.assertTrue(any(re.fullmatch(p, 'libc++1') for p in patterns))
        for wrong in ['libpython3x13', 'libpython3.13-other', 'libc1', 'prefixlibc++1']:
            self.assertFalse(any(re.fullmatch(p, wrong) for p in patterns))

    def test_guest_agent_stays_reviewed_after_vendor_version_replaces_local_suffix(self):
        policy = json.loads(m.POLICY.read_text())
        rows = m.protected_packages('qemu-guest-agent\t1:10.0.13+ds-0+deb13u2\tinstalled\n', policy)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['recipe'], 'qga-native-followup/release-host.mjs')
        self.assertEqual(rows[0]['reason'], 'reviewed-native-package')
        self.assertNotIn('qemu-utils', policy['packages'])

    def test_coupled_ssh_packages_remain_protected_without_local_version_suffix(self):
        policy = json.loads(m.POLICY.read_text())
        names = ['openssh-client', 'openssh-server', 'openssh-sftp-server']
        for version in ['1:10.3p1-1~bpo13+1', '1:10.3p1-1~bpo13+1+utilibre1']:
            inventory = ''.join(f'{name}\t{version}\tinstalled\n' for name in names)
            rows = m.protected_packages(inventory, policy)
            self.assertEqual({row['package'] for row in rows}, set(names))
            self.assertTrue(all(row['recipe'] == 'ssh-server-followup/username-release.mjs' for row in rows))
            patterns = [json.loads(line.strip()[:-1]) for line in m.blacklist_text(rows).splitlines()
                        if line.startswith('  ')]
            for name in names:
                self.assertTrue(any(re.fullmatch(pattern, name) for pattern in patterns))
                self.assertTrue(any(re.fullmatch(pattern, name + ':amd64') for pattern in patterns))
            self.assertFalse(any(re.fullmatch(pattern, 'openssh-client-extra') for pattern in patterns))
        self.assertNotIn('openssh-tests', policy['packages'])

    def test_actual_apt_parser_preserves_generated_regex(self):
        with tempfile.TemporaryDirectory() as directory:
            file = Path(directory) / 'configuration'
            file.write_text(m.blacklist_text([{'package': 'libpython3.13:amd64'}]))
            script = ('import apt_pkg,json,sys; c=apt_pkg.Configuration(); '
                      'apt_pkg.read_config_file(c,sys.argv[1]); '
                      'print(json.dumps(c.value_list("Unattended-Upgrade::Package-Blacklist")))')
            result = subprocess.run(['/usr/bin/python3', '-c', script, str(file)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            patterns = json.loads(result.stdout)
            self.assertTrue(any(re.fullmatch(p, 'libpython3.13:amd64') for p in patterns))
            self.assertFalse(any(re.fullmatch(p, 'libpython3x13') for p in patterns))

    def test_refresh_writes_atomically_without_removing_other_apt_files(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'protection'
            other = Path(directory) / 'existing-config'
            other.write_text('preserve')
            with patch.object(m, 'BLACKLIST', target), patch.object(m.os, 'geteuid', return_value=0):
                m.write_blacklist([{'package': 'library:amd64'}])
                self.assertEqual(other.read_text(), 'preserve')
                self.assertEqual(target.stat().st_mode & 0o777, 0o644)
                target.unlink()
                target.symlink_to(other)
                with self.assertRaisesRegex(RuntimeError, 'symlink'):
                    m.write_blacklist([{'package': 'library:amd64'}])
                self.assertEqual(other.read_text(), 'preserve')

    def test_legacy_helpers_refuse_before_any_docker_or_backup_command(self):
        for service in ['portal', 'redlib', 'anubis', 'valkey', 'unknown']:
            result = subprocess.run(['/bin/sh', str(ROOT / 'scripts/update.sh'), service],
                                    cwd='/tmp', env={'PATH': '/nonexistent'}, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertNotIn('not found', result.stderr)
        for service in ['freshrss', 'privatebin', 'valkey', 'unknown']:
            result = subprocess.run(['/bin/sh', str(ROOT / 'deployment/utilibre/scripts/update-apply.sh'),
                                     service, 'vendor/name@sha256:' + 'a' * 64],
                                    cwd='/tmp', env={'PATH': '/nonexistent'}, capture_output=True, text=True)
            self.assertEqual(result.returncode, 1)
            self.assertIn('no image, configuration or data was changed', result.stderr)

    def test_inventory_never_grants_unknown_images_automatic_updates(self):
        row = {'name': '/utilibre-example-app-1', 'image': 'sha256:' + 'a' * 64,
               'reference': 'brand-new-image:latest', 'project': 'utilibre-example',
               'service': 'app', 'composeFiles': '/repo/compose.yaml'}
        with patch.object(m, 'command', side_effect=['abc\n', json.dumps(row) + '\n']):
            rows = m.runtime_inventory()
        self.assertEqual(rows[0]['updateMode'], 'review-only')


if __name__ == '__main__':
    unittest.main()
