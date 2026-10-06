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


if __name__ == '__main__':
    unittest.main()
