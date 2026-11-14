import unittest
from assessment_policy import identity, git_assessment, GIT_IDS


class AssessmentPolicyTests(unittest.TestCase):
    def setUp(self):
        self.row = dict(id='CVE-2026-111760', package='git', severity='HIGH', type='debian', target='old-image (debian 13.7)', installed='old')

    def test_os_target_name_is_not_a_new_finding(self):
        self.assertEqual(identity(self.row), identity({**self.row, 'target':'new-image (debian 13.7)'}))

    def test_version_change_is_not_generally_waived(self):
        self.assertNotEqual(identity(self.row), identity({**self.row, 'installed':'new'}))

    def test_git_review_does_not_mask_another_package_change(self):
        a={**self.row,'package':'libssl3'}
        self.assertNotEqual(identity(a,'git'),identity({**a,'installed':'new'},'git'))

    def test_cve_and_severity_changes_remain_visible(self):
        for field,value in [('id','CVE-2026-999999'),('severity','CRITICAL')]:
            self.assertNotEqual(identity(self.row,'git'),identity({**self.row,field:value},'git'))

    def test_source_paths_are_not_collapsed(self):
        a={**self.row,'type':'gobinary'}
        self.assertNotEqual(identity(a),identity({**a,'target':'another-binary'}))

    def test_unknown_mode_rejected(self):
        with self.assertRaises(ValueError):identity(self.row,'guess')

    def test_exact_git_backport_retains_all_raw_records(self):
        rows=[{**self.row,'id':id} for id in GIT_IDS]
        self.assertEqual(git_assessment(rows,rows+rows,'1:2.54.1+utilibre1'),6)

    def test_wrong_candidate_or_new_advisory_rejected(self):
        rows=[{**self.row,'id':id} for id in GIT_IDS]
        with self.assertRaises(ValueError):git_assessment(rows,rows,'1:2.47.3')
        with self.assertRaises(ValueError):git_assessment(rows,[*rows,{**self.row,'id':'CVE-2026-999999'}],'1:2.54.1+utilibre1')


if __name__=='__main__':unittest.main()
