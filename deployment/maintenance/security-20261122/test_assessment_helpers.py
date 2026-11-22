import unittest
from assessment_helpers import installed_packages, package_version, finding_identity


class InventoryTests(unittest.TestCase):
    def test_held_packages_are_installed(self):
        text = b'Package: openssl\nStatus: hold ok installed\nVersion: 3.5.7-1~deb13u3\n\nPackage: removed\nStatus: deinstall ok config-files\nVersion: 1\n'
        self.assertEqual(installed_packages(text), {'openssl': {'installed': '3.5.7-1~deb13u3', 'selection': 'hold'}})

    def test_duplicate_and_unexpected_selection_rejected(self):
        paragraph = b'Package: library\nStatus: install ok installed\nVersion: 2\n'
        with self.assertRaises(ValueError):
            installed_packages(paragraph + b'\n' + paragraph)
        with self.assertRaises(ValueError):
            installed_packages(paragraph.replace(b'install ok', b'purge ok'))

    def test_versions_preserve_epoch_and_revision(self):
        self.assertEqual(package_version({'Epoch': 2, 'Version': '6.3.0+dfsg', 'Release': '3'}), '2:6.3.0+dfsg-3')
        self.assertEqual(package_version({'Epoch': 0, 'Version': '2.41', 'Release': '12+deb13u5'}), '2.41-12+deb13u5')

    def test_vendor_upgrade_does_not_hide_new_or_escalated_findings(self):
        f = {'id': 'CVE-2026-6238', 'package': 'libc6', 'severity': 'HIGH', 'type': 'debian', 'target': 'old-image', 'installed': '2.41-12+deb13u4'}
        changed = {**f, 'installed': '2.41-12+deb13u5', 'target': 'new-image'}
        self.assertEqual(finding_identity(f, {'libc6'}), finding_identity(changed, {'libc6'}))
        self.assertNotEqual(finding_identity(f, set()), finding_identity(changed, set()))
        for update in ({'severity': 'CRITICAL'}, {'id': 'CVE-2026-115819'}, {'package': 'libc-bin'}):
            self.assertNotEqual(finding_identity(f, {'libc6'}), finding_identity({**changed, **update}, {'libc6'}))

    def test_language_package_version_and_target_remain_distinct(self):
        f = {'id': 'GHSA-fixture', 'package': 'library', 'severity': 'LOW', 'type': 'npm', 'target': '/app/lock', 'installed': '1'}
        self.assertNotEqual(finding_identity(f, {'library'}), finding_identity({**f, 'installed': '2'}, {'library'}))
        self.assertNotEqual(finding_identity(f, {'library'}), finding_identity({**f, 'target': '/other/lock'}, {'library'}))


if __name__ == '__main__':
    unittest.main()
