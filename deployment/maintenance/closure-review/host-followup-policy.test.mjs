import test from 'node:test';
import assert from 'node:assert/strict';
import {hostFollowupStatus, hostFollowupReviews} from './host-followup-policy.mjs';
const ssh = {scope:'host-os',type:'debian',package:'openssh-server',installed:'1:10.0p1-7+deb13u4+utilibre2',id:'CVE-2026-59999'};
test('10.3 revalidation cannot clear unpatched GSSAPI extensions or another release', () => {
  const file='security-20261028/ssh-review.json';
  const current={...ssh,installed:'1:10.3p1-1~bpo13+1+utilibre1'};
  assert.equal(hostFollowupStatus(file,current),'mitigated');
  assert.equal(hostFollowupStatus(file,{...current,package:'openssh-client'}),'not-affected');
  assert.equal(hostFollowupStatus(file,{...current,package:'openssh-client',id:'CVE-2026-106583'}),'mitigated');
  for (const override of [{id:'CVE-2026-106553'},{id:'CVE-2026-106555'},{installed:'1:10.3p1-1~bpo13+1'},{scope:'runtime-image'}])
    assert.throws(()=>hostFollowupStatus(file,{...current,...override}));
});
test('SSH exact tested server/client split, including retained client fix', () => {
  for (const id of ['CVE-2026-59999','CVE-2026-60000','CVE-2026-60002']) {
    for (const pkg of ['openssh-server','openssh-client','openssh-sftp-server']) {
      const affected = id === 'CVE-2026-60002' ? 'openssh-client' : 'openssh-server';
      assert.equal(hostFollowupStatus(hostFollowupReviews[0], {...ssh,id,package:pkg}),pkg===affected?'mitigated':'not-affected');
    }
  }
});
test('host review refuses untested advisories, releases, packages and scopes', () => {
  for (const override of [{id:'CVE-2026-99999'},{installed:'1:10.0p1-7+deb13u4'},{package:'libssl3'},{scope:'runtime-image'},{type:'pip'}]) {
    assert.throws(() => hostFollowupStatus(hostFollowupReviews[0], {...ssh,...override}));
  }
  assert.throws(() => hostFollowupStatus('arbitrary/review.json', ssh));
});
test('vendored wheel acceptance is restricted to the verified host package', () => {
  const wheel={...ssh,package:'python3-setuptools-whl',installed:'78.1.1-0.1+utilibre1',id:'CVE-2026-23949'};
  assert.equal(hostFollowupStatus(hostFollowupReviews[1],wheel),'mitigated');
  assert.throws(() => hostFollowupStatus(hostFollowupReviews[1],{...wheel,package:'python3-setuptools'}));
  assert.throws(() => hostFollowupStatus(hostFollowupReviews[1],{...wheel,id:'CVE-2026-99999'}));
});
test('cryptography repair and component exclusion cannot substitute for each other', () => {
  const crypto={...ssh,package:'python3-cryptography',installed:'43.0.0-3+deb13u1+utilibre1',id:'CVE-2026-69249'};
  assert.equal(hostFollowupStatus(hostFollowupReviews[2],crypto),'mitigated');
  assert.throws(() => hostFollowupStatus(hostFollowupReviews[3],crypto));
  for (const id of ['CVE-2026-34073','CVE-2026-69248']) {
    assert.equal(hostFollowupStatus(hostFollowupReviews[3],{...crypto,id}),'not-affected');
    assert.throws(() => hostFollowupStatus(hostFollowupReviews[2],{...crypto,id}));
  }
  assert.throws(() => hostFollowupStatus(hostFollowupReviews[3],{...crypto,id:'CVE-2023-50782'}));
  assert.throws(() => hostFollowupStatus(hostFollowupReviews[2],{...crypto,installed:'43.0.0-3+deb13u1'}));
});
test('host Xserver review is restricted to the signed exact pair and three source fixes',()=>{
 const file='xserver-followup-20261012/host-review.json',base={scope:'host-os',artifact:'host-dpkg',type:'debian',package:'xvfb',installed:'2:21.1.25-1',id:'CVE-2026-88812',containers:[]};
 for(const packageName of ['xvfb','xserver-common'])for(const id of ['CVE-2026-88812','CVE-2026-93521','CVE-2026-93523'])assert.equal(hostFollowupStatus(file,{...base,package:packageName,id}),'mitigated');
 for(const patch of [{id:'CVE-2023-5574'},{id:'CVE-2026-93516'},{installed:'2:21.1.16-1.3+deb13u4+dhi1'},{package:'xserver-xorg-core'},{scope:'runtime-image'},{artifact:'sha256:other'},{containers:['penpot']}])assert.throws(()=>hostFollowupStatus(file,{...base,...patch}));
});
