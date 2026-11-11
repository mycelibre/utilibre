#!/usr/bin/env python3
"""Offline policy/transaction tests: no Docker, upstream requests or live writes."""
import importlib.util
import copy
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


def transition_fixture():
    source = {'version': '2.1.1', 'revision': 'c' * 40, 'archiveSha256': 'd' * 64,
              'publishedAt': '2026-11-04T00:00:00Z', 'tagObject': 'e' * 40,
              'tagVerification': 'Synthetic fixture, not an upstream signature'}
    hashes = {p: 'f' * 64 for p in ('/usr/share/doc/privatebin/utilibre-release.json',
                                   '/srv/tpl/bootstrap5-utilibre.php', '/srv/lib/Controller.php')}
    installed = {**source, 'image': OLD, 'runtimeImage': OLD, 'security': {'old': True}}
    policy = {**POLICY, 'runtimeImage': NEW, 'templatePatchSha256': 'a' * 64,
              'reviewedRuntimeTransition': {'approved': True, 'previousImage': OLD, 'image': NEW,
                  **{k: source[k] for k in ('version', 'revision', 'archiveSha256')},
                  'deployedAt': '2026-11-09T12:00:00Z', 'payloadHashes': hashes}}
    return policy, installed, source, hashes


class PolicyTests(unittest.TestCase):
    def test_reviewed_runtime_reconciliation_and_repeat(self):
        policy, installed, source, hashes = transition_fixture()
        record, changed = m.reconciliation_record(policy, installed, NEW, source, hashes)
        self.assertTrue(changed)
        self.assertEqual(record['version'], installed['version'])
        self.assertEqual(record['revision'], installed['revision'])
        self.assertEqual(record['image'], NEW)
        self.assertEqual(record['deployedAt'], policy['reviewedRuntimeTransition']['deployedAt'])
        self.assertNotIn('security', record, 'Do not relabel old scan evidence as current')
        repeated, changed = m.reconciliation_record(policy, record, NEW, source, hashes)
        self.assertFalse(changed)
        self.assertEqual(repeated, record)

    def test_reconciliation_rejects_unapproved_or_changed_inputs(self):
        changes = [
            lambda p, i, s, h: p['reviewedRuntimeTransition'].update(approved=False),
            lambda p, i, s, h: p.update(runtimeImage=OLD),
            lambda p, i, s, h: i.update(image='sha256:' + 'c' * 64),
            lambda p, i, s, h: s.update(version='2.1.2'),
            lambda p, i, s, h: s.update(revision='d' * 40),
            lambda p, i, s, h: s.update(archiveSha256='e' * 64),
            lambda p, i, s, h: h.update({'/srv/tpl/bootstrap5-utilibre.php': '0' * 64}),
            lambda p, i, s, h: h.pop('/srv/lib/Controller.php'),
        ]
        for change in changes:
            p, i, s, h = copy.deepcopy(transition_fixture())
            # The fixture intentionally shares its original approved hash map.
            h = dict(h)
            change(p, i, s, h)
            with self.subTest(change=change), self.assertRaises(m.ReviewRequired):
                m.reconciliation_record(p, i, NEW, s, h)

    def test_runtime_rebuild_does_not_skip_reverse_compatibility(self):
        self.assertFalse(m.reverse_compatibility_required('2.1.0'))
        self.assertTrue(m.reverse_compatibility_required('2.1.1'))
        self.assertTrue(m.reverse_compatibility_required('2.1.2'))
        with self.assertRaises(m.ReviewRequired):
            m.reverse_compatibility_required('unknown')
        with self.assertRaises(m.ReviewRequired):
            m.reverse_compatibility_required('2.0.0')

    def test_reconciliation_requires_preserved_evidence_before_docker(self):
        p, i, s, h = transition_fixture()
        p['reviewedRuntimeTransition']['evidence'] = {k: {'path': 'missing.json', 'sha256': 'a' * 64}
            for k in ('native', 'deployment', 'runtimeBuild', 'runtimeConsumer', 'runtimeScan', 'sourceReplay')}
        with tempfile.TemporaryDirectory() as d, patch.object(m, 'EVIDENCE', Path(d)), patch.object(m, 'command') as command:
            with self.assertRaises(m.ReviewRequired):
                m.reconcile_runtime(p, i, NEW, Path(d))
            command.assert_not_called()

    def test_reconciliation_writes_receipts_only_and_recovers_write_failure(self):
        for fail in (False, True):
            with self.subTest(fail=fail), tempfile.TemporaryDirectory() as d:
                root = Path(d)
                live, state, recipe, run, evidence = [root / p for p in ('live', 'state', 'recipe', 'run', 'evidence')]
                for directory in (live / 'update-public', state, recipe, run, evidence):
                    directory.mkdir(parents=True)
                p, i, s, h = transition_fixture()
                proofs = {k: {'path': 'proof.json', 'sha256': m.sha(b'{}')}
                    for k in ('native', 'deployment', 'runtimeBuild', 'runtimeConsumer', 'runtimeScan', 'sourceReplay')}
                p['reviewedRuntimeTransition']['evidence'] = proofs
                (evidence / 'proof.json').write_text('{}')
                (recipe / 'policy.json').write_text(json.dumps(p))
                template = root / 'template.patch'; template.write_text('fictional patch')
                p['templatePatchSha256'] = m.sha(template.read_bytes())
                (state / 'installed.json').write_text(json.dumps(i))
                public_path = live / 'update-public/privatebin.json'; public_path.write_text('{"old":true}')
                calls = []
                def fake(args, **kwargs):
                    calls.append(args)
                    if 'sha256sum' in args:
                        return '\n'.join(digest + '  ' + name for name, digest in h.items())
                    if '/srv/lib/Controller.php' in args:
                        return "const VERSION = '2.1.1';"
                    if '/usr/share/doc/privatebin/utilibre-release.json' in args:
                        return json.dumps(s)
                    if 'config' in args:
                        return json.dumps({'services': {'privatebin': {'image': 'approved-runtime'}}})
                    if 'inspect' in args:
                        return NEW
                    raise AssertionError('Unexpected command')
                original_save = m.save
                failed = False
                def save(path, value, mode=0o600):
                    nonlocal failed
                    if fail and not failed and path == state / 'installed.json':
                        failed = True
                        raise OSError('Synthetic receipt-write failure')
                    return original_save(path, value, mode)
                with patch.multiple(m, LIVE=live, STATE=state, RECIPE=recipe, PATCH=template, EVIDENCE=evidence), \
                     patch.object(m, 'configuration'), patch.object(m, 'inspect', return_value={'image': NEW}), \
                     patch.object(m, 'command', side_effect=fake), patch.object(m, 'save', side_effect=save):
                    if fail:
                        with self.assertRaises(OSError):
                            m.reconcile_runtime(p, i, NEW, run)
                        self.assertEqual(json.loads((state / 'installed.json').read_text()), i)
                        self.assertEqual(json.loads(public_path.read_text()), {'old': True})
                    else:
                        self.assertTrue(m.reconcile_runtime(p, i, NEW, run))
                        record = json.loads((state / 'installed.json').read_text())
                        before = (state / 'installed.json').read_bytes(), public_path.read_bytes()
                        self.assertFalse(m.reconcile_runtime(p, record, NEW, run))
                        self.assertEqual(before, ((state / 'installed.json').read_bytes(), public_path.read_bytes()))
                        self.assertEqual(json.loads((run / 'installed-before.json').read_text()), i)
                self.assertFalse(any('up' in c or 'run' in c or 'restart' in c or 'build' in c for c in calls))

    def test_ordinary_check_does_not_adopt_a_different_live_image(self):
        p, i, s, h = transition_fixture()
        p.update(schemaVersion=1, approved=True)
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); (root / 'policy.json').write_text(json.dumps(p)); (root / 'installed.json').write_text(json.dumps(i))
            with patch.multiple(m, STATE=root, RECIPE=root), patch.object(m, 'configuration'), \
                 patch.object(m, 'inspect', return_value={'image': NEW}), patch.object(m, 'release') as release, \
                 patch.object(sys, 'argv', ['privatebin-maintain.py', '--check']), patch('sys.stdout', new=io.StringIO()):
                self.assertEqual(m.main(), 1)
                release.assert_not_called()
            self.assertEqual(json.loads((root / 'installed.json').read_text()), i)
            self.assertEqual(json.loads((root / 'check.json').read_text())['reason'], 'Unreviewed live image')
            (root / 'installed.json').unlink()
            with patch.multiple(m, STATE=root, RECIPE=root), patch.object(m, 'configuration'), \
                 patch.object(m, 'inspect', return_value={'image': NEW}), patch.object(m, 'release') as release, \
                 patch.object(sys, 'argv', ['privatebin-maintain.py', '--check']), patch('sys.stdout', new=io.StringIO()):
                self.assertEqual(m.main(), 1)
                release.assert_not_called()
            self.assertIn('Installed receipt missing', json.loads((root / 'check.json').read_text())['reason'])

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
