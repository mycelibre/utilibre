#!/usr/bin/env python3
"""Offline policy/transaction tests: no Docker, upstream requests or live writes."""
import importlib.util
import io
import json
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('updater', Path(__file__).with_name('privatebin-maintain.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
OLD, NEW = 'sha256:' + 'a' * 64, 'sha256:' + 'b' * 64
POLICY = {'family': '2.1', 'minimum': '2.1.1'}
COMPOSE = 'services:\n  unrelated:\n    image: keep-me\n  privatebin:\n    image: old-pin\n    volumes:\n      - ./config/privatebin/bootstrap5-utilibre.php:/srv/tpl/bootstrap5-utilibre.php:ro\n      - ./temporary/privatebin:/srv/data\nnetworks:\n  frontend: {}\n'


class PolicyTests(unittest.TestCase):
    def test_patch_upgrade_and_noop(self):
        self.assertEqual(m.decide('2.1.1', '2.1.0', POLICY), 'candidate')
        self.assertEqual(m.decide('2.1.7', '2.1.6', POLICY), 'candidate')
        self.assertEqual(m.decide('2.1.7', '2.1.7', POLICY), 'up-to-date')

    def test_reject_release_family_prerelease_downgrade(self):
        for latest, current in [('2.2.0', '2.1.1'), ('3.0.0', '2.1.1'), ('2.1.0', '2.1.1'),
                                ('2.1.1', '2.1.2'), ('2.1.2-rc1', '2.1.1'), ('../../x', '2.1.1')]:
            with self.subTest(latest=latest), self.assertRaises(m.ReviewRequired):
                m.decide(latest, current, POLICY)

    def test_narrow_compose_change(self):
        out = m.replace_compose(COMPOSE, 'old-pin', NEW)
        self.assertIn('image: keep-me', out)
        self.assertIn('./temporary/privatebin:/srv/data', out)
        self.assertNotIn('bootstrap5-utilibre.php:', out)
        self.assertIn('image: ' + NEW, out)
        self.assertEqual(m.replace_compose(out, NEW, NEW), out)

    def test_unknown_pin_or_unpinned_candidate_rejected(self):
        for old, new in [('unexpected', NEW), ('old-pin', 'latest')]:
            with self.assertRaises(m.ReviewRequired):
                m.replace_compose(COMPOSE, old, new)

    def test_archive_paths_and_links(self):
        revision = 'a' * 40
        for name, link in [('PrivateBin-' + revision + '/../escape', False),
                           ('PrivateBin-' + revision + '/link', True), ('other/root', False)]:
            data = io.BytesIO()
            with tarfile.open(fileobj=data, mode='w:gz') as t:
                entry = tarfile.TarInfo(name)
                if link:
                    entry.type = tarfile.SYMTYPE
                    entry.linkname = '/etc/passwd'
                t.addfile(entry)
            with tempfile.TemporaryDirectory() as d, self.assertRaises(m.ReviewRequired):
                m.extract(data.getvalue(), Path(d), revision)

    def test_no_unapproved_download_host(self):
        with self.assertRaises(m.ReviewRequired):
            m.get('https://example.com/arbitrary')

    def test_application_advisory_change_requires_review(self):
        raw = [{'ghsa_id': 'GHSA-fixture', 'published_at': '2026-11-01',
                'updated_at': '2026-11-01', 'vulnerabilities': []}]
        normalized = [{'id': 'GHSA-fixture', 'updated': '2026-11-01', 'affected': []}]
        digest = m.sha(json.dumps(normalized, sort_keys=True, separators=(',', ':')).encode())
        policy = {'applicationAdvisorySnapshotSha256': digest}
        with patch.object(m, 'get', return_value=json.dumps(raw).encode()):
            self.assertEqual(m.advisory_snapshot(policy), digest)
        raw[0]['updated_at'] = '2026-11-02'
        with patch.object(m, 'get', return_value=json.dumps(raw).encode()), self.assertRaises(m.ReviewRequired):
            m.advisory_snapshot(policy)

    def test_scanner_failure_and_unsupported_input(self):
        for report in [{}, {'Results': []}, {'Results': [{'Class': 'os-pkgs', 'Type': 'alpine', 'Packages': []}]}]:
            with self.assertRaises(m.ReviewRequired):
                m.findings(report)

    def test_stable_findings_and_malformed_finding(self):
        rows = [{'Class': 'os-pkgs', 'Type': 'alpine', 'Packages': [{'Name': 'x', 'Version': '1'}],
                 'Vulnerabilities': [{'VulnerabilityID': 'CVE-fixture', 'PkgName': 'x', 'InstalledVersion': '1', 'Severity': 'LOW'}]},
                {'Class': 'lang-pkgs', 'Type': 'composer-vendor', 'Packages': [{'Name': 'p', 'Version': '1'}]}]
        self.assertEqual(m.findings({'Results': rows}), m.findings({'Results': list(reversed(rows))}))
        rows[0]['Vulnerabilities'][0].pop('Severity')
        with self.assertRaises(m.ReviewRequired):
            m.findings({'Results': rows})

    def test_missing_executable_and_timeout_fail(self):
        with self.assertRaises(FileNotFoundError):
            m.command(['/nonexistent/utilibre-fixture'])
        with self.assertRaises(TimeoutError):
            m.command([sys.executable, '-c', 'import time; time.sleep(10)'], timeout=0.01)

    def test_subprocess_does_not_inherit_secrets(self):
        with patch.dict('os.environ', {'UTILIBRE_SECRET_FIXTURE': 'must-not-pass'}):
            self.assertEqual(m.command([sys.executable, '-c', 'import os; print(os.getenv("UTILIBRE_SECRET_FIXTURE", "absent"))']).strip(), 'absent')

    def test_public_gate_failure_restores_only_configuration(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            live, repo, state, run = [root / p for p in ('live', 'repo', 'state', 'run')]
            for p in (live, repo / 'deployment/utilibre', state, run):
                p.mkdir(parents=True)
            paths = [live / 'compose.yaml', repo / 'deployment/utilibre/compose.yaml']
            for p in paths:
                p.write_text(COMPOSE)
            settings = {'image': 'old-pin', 'volumes': [{'target': '/srv/tpl/bootstrap5-utilibre.php'}, {'target': '/srv/data'}]}
            after = {'image': NEW, 'volumes': [{'target': '/srv/data'}]}
            calls = []
            def fake(args, **kwargs):
                calls.append(args)
                if 'config' in args:
                    return json.dumps({'services': {'privatebin': settings if 'old-pin' in paths[0].read_text() else after}})
                if 'inspect' in args:
                    return OLD
                if '--public' in args:
                    raise RuntimeError('Synthetic public gate failure')
                return ''
            with patch.multiple(m, ROOT=repo, LIVE=live, STATE=state), patch.object(m, 'configuration'), \
                 patch.object(m, 'inspect', return_value={'image': OLD}), patch.object(m, 'command', side_effect=fake), \
                 patch.object(m, 'health') as health:
                with self.assertRaisesRegex(RuntimeError, 'Synthetic public'):
                    m.deploy({'image': NEW}, OLD, run, {})
            self.assertTrue(all(p.read_text() == COMPOSE for p in paths))
            self.assertFalse((state / 'pending.json').exists())
            health.assert_called_with(OLD)
            self.assertEqual(sum('up' in c for c in calls), 2)
            self.assertFalse(any('down' in c or 'prune' in c for c in calls))


if __name__ == '__main__':
    unittest.main()
