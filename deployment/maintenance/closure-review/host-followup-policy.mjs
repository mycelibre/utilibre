import assert from 'node:assert/strict';

export const hostFollowupReviews = [
  'ssh-server-followup-20261012/review.json',
  'host-python-vendor-followup-20261012/review.json',
  'host-cryptography-followup-20261012/review-mitigated.json',
  'host-cryptography-followup-20261012/review-not-affected.json',
];

// Mixed status is allowed only for the explicitly tested server/client split,
// not as a general exemption for an arbitrary reviewer or advisory.
export function hostFollowupStatus(file, item) {
  assert(hostFollowupReviews.includes(file));
  assert.equal(item.scope, 'host-os');
  assert.equal(item.type, 'debian');
  if (file.startsWith('host-cryptography-')) {
    assert.equal(item.package, 'python3-cryptography');
    assert.equal(item.installed, '43.0.0-3+deb13u1+utilibre1');
    if (file.endsWith('/review-mitigated.json')) {
      assert.equal(item.id, 'CVE-2026-69249');
      return 'mitigated';
    }
    assert(['CVE-2026-34073', 'CVE-2026-69248'].includes(item.id));
    return 'not-affected';
  }
  if (file.startsWith('host-python-vendor-')) {
    assert.equal(item.package, 'python3-setuptools-whl');
    assert.equal(item.installed, '78.1.1-0.1+utilibre1');
    assert.equal(item.id, 'CVE-2026-23949');
    return 'mitigated';
  }
  assert.equal(item.installed, '1:10.0p1-7+deb13u4+utilibre2');
  assert(['openssh-client', 'openssh-server', 'openssh-sftp-server'].includes(item.package));
  assert(['CVE-2026-59999', 'CVE-2026-60000', 'CVE-2026-60002'].includes(item.id));
  const affected = item.id === 'CVE-2026-60002' ? 'openssh-client' : 'openssh-server';
  return item.package === affected ? 'mitigated' : 'not-affected';
}
