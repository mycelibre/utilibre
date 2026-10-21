#!/usr/bin/env python3
"""Offline safety tests: no Docker, production configuration, or SMTP changes."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('maintain', Path(__file__).with_name('searxng-maintain.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
OLD = 'docker.io/searxng/searxng:2026.9.29-abc@sha256:' + 'a' * 64
NEW = 'docker.io/searxng/searxng:2026.10.4-def@sha256:' + 'b' * 64


class MaintenanceTests(unittest.TestCase):
    def test_only_exact_reviewed_ca_overlay_can_transition_to_upstream(self):
        runtime = {'reference': m.CA_REPAIR_PIN, 'image': m.CA_REPAIR_ID}
        image = {'id': m.CA_REPAIR_ID, 'digests': [], 'source': 'https://github.com/searxng/searxng'}
        m.validate_upstream_runtime(m.CA_REPAIR_PIN, runtime, image, '')
        self.assertEqual(m.upstream_identity(m.CA_REPAIR_PIN), m.CA_REPAIR_UPSTREAM)
        for changed in ['sha256:'+'a'*64, 'sha256:'+'b'*64]:
            with self.assertRaisesRegex(RuntimeError, 'identity'):
                m.validate_upstream_runtime(m.CA_REPAIR_PIN, {**runtime, 'image': changed}, {**image, 'id': changed}, '')

    def test_candidate_ca_failure_prevents_staging(self):
        with patch.object(m, 'check_candidate_trust', side_effect=RuntimeError('CA regression')), patch.object(m, 'command') as command:
            with self.assertRaisesRegex(RuntimeError, 'CA regression'):
                m.stage_candidate({}, {'image': NEW}, self.run)
            command.assert_not_called()

    def test_native_ca_guard_has_no_network_or_production_mounts(self):
        with patch.object(m, 'command') as command:
            m.check_candidate_trust(NEW)
        args = command.call_args.args[0]
        self.assertEqual(args[args.index('--network')+1], 'none')
        self.assertIn('--read-only', args)
        self.assertNotIn('--mount', args)
        self.assertNotIn('-v', args)
        self.assertIn('emSign ECC Root CA - G3', args[-1])

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.state = self.directory / 'state'
        self.state.mkdir()
        self.run = self.state / 'run-test'
        self.run.mkdir()
        for name, value in [('STATE', self.state), ('PUBLIC', self.directory / 'public'), ('ROOT', self.directory)]:
            p = patch.object(m, name, value)
            p.start()
            self.addCleanup(p.stop)
        runtime = patch.object(m, 'check_upstream_runtime')
        runtime.start()
        self.addCleanup(runtime.stop)

    def test_unmodified_official_runtime_is_allowed(self):
        image_id = 'sha256:' + 'c' * 64
        m.validate_upstream_runtime(OLD, {'reference': OLD, 'image': image_id},
            {'id': image_id, 'digests': ['searxng/searxng@sha256:' + 'a' * 64],
             'source': 'https://github.com/searxng/searxng'},
            'C /etc\nC /etc/ssl\nC /etc/ssl/certs\nC /etc/ssl/certs/ca-certificates.crt')

    def test_tagged_local_repair_and_missing_identity_are_blocked(self):
        image_id = 'sha256:' + 'c' * 64
        runtime = {'reference': OLD, 'image': image_id}
        image = {'id': image_id, 'digests': [], 'source': 'https://github.com/searxng/searxng'}
        with self.assertRaisesRegex(RuntimeError, 'preserve local repairs'):
            m.validate_upstream_runtime(OLD, runtime, image, '')
        image['digests'] = ['unrelated/image@sha256:' + 'a' * 64]
        with self.assertRaises(RuntimeError):
            m.validate_upstream_runtime(OLD, runtime, image, '')
        image['digests'] = ['searxng/searxng@sha256:' + 'a' * 64]
        image['id'] = 'sha256:' + 'd' * 64
        with self.assertRaisesRegex(RuntimeError, 'identity'):
            m.validate_upstream_runtime(OLD, runtime, image, '')

    def test_live_code_patch_is_not_discarded(self):
        image_id = 'sha256:' + 'c' * 64
        image = {'id': image_id, 'digests': ['searxng/searxng@sha256:' + 'a' * 64],
                 'source': 'https://github.com/searxng/searxng'}
        for change in ['C /usr/local/searxng/searx/webapp.py', 'A /repair', 'D /etc/ssl/certs/ca-certificates.crt']:
            with self.assertRaisesRegex(RuntimeError, 'writable-layer'):
                m.validate_upstream_runtime(OLD, {'reference': OLD, 'image': image_id}, image, change)

    def test_runtime_change_during_staging_prevents_mutation(self):
        with patch.object(m, 'check_upstream_runtime', side_effect=RuntimeError('local repair')), patch.object(m, 'apply_pin') as apply:
            with self.assertRaisesRegex(RuntimeError, 'local repair'):
                m.deploy_candidate(OLD, {'image': NEW}, self.run, 'https://search.utilibre.org/')
            apply.assert_not_called()
        self.assertFalse((self.state / 'pending.json').exists())

    def test_pin_validation_preserves_unrelated_settings(self):
        self.assertEqual(m.replace_image_setting('SECRET=keep\nOTHER=yes', NEW), 'SECRET=keep\nOTHER=yes\nSEARXNG_IMAGE=' + NEW + '\n')
        for image in ['searxng/searxng:latest', 'evil.invalid/searxng@sha256:' + 'a' * 64, NEW + '\nOTHER=no']:
            with self.assertRaises(ValueError):
                m.replace_image_setting('', image)
        with self.assertRaises(ValueError):
            m.replace_image_setting('SEARXNG_IMAGE=x\nexport SEARXNG_IMAGE=y\n', NEW)

    def test_private_env_replacement(self):
        path = self.directory / '.env'
        path.write_text('SECRET=preserved\n')
        path.chmod(0o600)
        m.persist_image(NEW)
        self.assertEqual(path.stat().st_mode & 0o777, 0o600)
        self.assertIn('SECRET=preserved\n', path.read_text())
        path.chmod(0o644)
        with self.assertRaises(RuntimeError):
            m.persist_image(OLD)

    def test_verified_deployment_clears_journal(self):
        with patch.object(m, 'apply_pin') as apply, patch.object(m, 'browser_check'), patch.object(m, 'persist_image') as persist:
            m.deploy_candidate(OLD, {'image': NEW}, self.run, 'https://search.utilibre.org/')
        apply.assert_called_once_with(NEW, self.run)
        persist.assert_called_once_with(NEW)
        self.assertFalse((self.state / 'pending.json').exists())
        public = self.directory / 'public/searxng.json'
        self.assertEqual(public.stat().st_mode & 0o777, 0o644)
        self.assertEqual(json.loads(public.read_text())['image'], NEW)

    def test_failed_search_rolls_back(self):
        with patch.object(m, 'apply_pin') as apply, patch.object(m, 'browser_check', side_effect=[RuntimeError('test failure'), None]), patch.object(m, 'persist_image') as persist:
            with self.assertRaisesRegex(RuntimeError, 'previous image restored'):
                m.deploy_candidate(OLD, {'image': NEW}, self.run, 'https://search.utilibre.org/')
        self.assertEqual([c.args[0] for c in apply.call_args_list], [NEW, OLD])
        persist.assert_called_once_with(OLD)
        self.assertFalse((self.state / 'pending.json').exists())
        self.assertFalse((self.directory / 'public/searxng.json').exists())

    def test_failed_rollback_keeps_recovery_journal(self):
        with patch.object(m, 'apply_pin', side_effect=[None, RuntimeError('rollback failed')]), patch.object(m, 'browser_check', side_effect=RuntimeError('bad candidate')), patch.object(m, 'persist_image'):
            with self.assertRaisesRegex(RuntimeError, 'rollback failed'):
                m.deploy_candidate(OLD, {'image': NEW}, self.run, 'https://search.utilibre.org/')
        self.assertEqual(json.loads((self.state / 'pending.json').read_text())['previousImage'], OLD)

    def test_recovery_refuses_manual_runtime_change(self):
        m.atomic_json(self.state / 'pending.json', {'previousImage': OLD, 'candidateImage': NEW, 'runDirectory': str(self.run)})
        with patch.object(m, 'running_image', return_value='operator-changed-image'), patch.object(m, 'apply_pin') as apply:
            with self.assertRaisesRegex(RuntimeError, 'outside this updater'):
                m.recover_interrupted({'services': {'searxng': {'image': OLD}}})
            apply.assert_not_called()

    def test_deadline_not_reset_by_new_latest(self):
        m.atomic_json(self.state / 'outstanding.json', {'firstSeen': '2020-01-01T00:00:00+00:00'})
        result = m.pending_age(OLD, {'image': NEW})
        self.assertEqual(result['updateDeadline'], 'overdue')
        m.pending_age(NEW, {'image': NEW})
        self.assertFalse((self.state / 'outstanding.json').exists())

    def test_zero_core_export_normalized_without_weakening_limits(self):
        service = {'ulimits': {'core': {}, 'nofile': {'soft': 128, 'hard': 256}}}
        m.normalize_stage_ulimits(service)
        self.assertEqual(service['ulimits'], {'core': 0, 'nofile': {'soft': 128, 'hard': 256}})
        for value in (0, 10, {'soft': 0, 'hard': 0}):
            service = {'ulimits': {'core': value}}
            m.normalize_stage_ulimits(service)
            self.assertEqual(service['ulimits']['core'], value)
        service = {}
        m.normalize_stage_ulimits(service)
        self.assertEqual(service, {})


if __name__ == '__main__':
    unittest.main()
