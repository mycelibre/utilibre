import assert from 'node:assert/strict';
import test from 'node:test';
import {absentComponent} from './review-binary-scope.mjs';
const files=['/.','/usr/lib/libuuid.so.1'];
test('mount-specific review covers an unrelated binary sibling, not the affected packages',()=>{
 const item={id:'CVE-2026-76642',package:'libuuid1'};
 assert.match(absentComponent(item,files),/mount/);
 for(const packageName of ['mount','libmount1'])assert.equal(absentComponent({...item,package:packageName},files),null);
 assert.equal(absentComponent(item,[...files,'/usr/lib/libmount.so.1']),null);
 assert.equal(absentComponent(item,[...files,'/usr/bin/mount']),null);
});
test('nsenter is reviewed separately from libmount and requires its absence',()=>{
 const item={id:'CVE-2026-78408',package:'libmount1'};
 assert.match(absentComponent(item,['/.','/usr/lib/libmount.so.1']),/nsenter/);
 assert.equal(absentComponent({...item,package:'util-linux'},files),null);
 assert.equal(absentComponent(item,[...files,'/usr/bin/nsenter']),null);
});
test('CLI-only defects do not exempt the client or CLI binary',()=>{
 assert.match(absentComponent({id:'CVE-2026-60002',package:'openssh-server'},['/.','/usr/sbin/sshd']),/client/);
 assert.equal(absentComponent({id:'CVE-2026-60002',package:'openssh-client'},files),null);
 assert.match(absentComponent({id:'CVE-2026-60002',package:'openssh-server'},['/.','/etc/ssh','/usr/sbin/sshd']),/client/);
 assert.equal(absentComponent({id:'CVE-2026-60002',package:'openssh-server'},[...files,'/usr/bin/ssh']),null);
 assert.equal(absentComponent({id:'CVE-2025-69720',package:'ncurses-bin'},files),null);
 assert.match(absentComponent({id:'CVE-2025-69720',package:'libtinfo6'},files),/infocmp/);
});
test('unknown CVEs, missing evidence and malformed paths never qualify',()=>{
 assert.equal(absentComponent({id:'CVE-2026-00000',package:'libuuid1'},files),null);
 for(const bad of [null,[],['/usr'],['relative','/usr']])assert.equal(absentComponent({id:'CVE-2026-76642',package:'libuuid1'},bad),null);
});
test('homed and Archive::Tar reviews preserve actual component packages',()=>{
 assert.match(absentComponent({id:'CVE-2026-16742',package:'libsystemd0'},files),/homed/);
 for(const packageName of ['systemd','systemd-homed','libsystemd-shared'])assert.equal(absentComponent({id:'CVE-2026-16742',package:packageName},files),null);
 assert.equal(absentComponent({id:'CVE-2026-16742',package:'libsystemd0'},[...files,'/usr/lib/systemd/systemd-homed']),null);
 assert.match(absentComponent({id:'CVE-2026-9538',package:'perl-base'},files),/Archive::Tar/);
 assert.equal(absentComponent({id:'CVE-2026-9538',package:'perl-modules-5.40'},files),null);
 assert.equal(absentComponent({id:'CVE-2026-9538',package:'perl-base'},[...files,'/usr/share/perl/Archive/Tar.pm']),null);
});
test('curl upstream distinguishes the tool from the library for two exact advisories',()=>{
 const cli={id:'CVE-2026-12064',package:'libcurl4t64'};
 assert.match(absentComponent(cli,['/.','/usr/lib/libcurl.so.4']),/CLI/);
 assert.equal(absentComponent({...cli,package:'curl'},['/.','/usr/bin/curl']),null);
 assert.equal(absentComponent(cli,['/.','/usr/bin/curl']),null);
 assert.equal(absentComponent({...cli,id:'CVE-2026-8286'},['/.','/usr/lib/libcurl.so.4']),null);
 const lib={id:'CVE-2026-6276',package:'curl'};
 assert.match(absentComponent(lib,['/.','/usr/bin/curl']),/easy-handle/);
 assert.equal(absentComponent({...lib,package:'libcurl4t64'},['/.','/usr/lib/libcurl.so.4']),null);
 assert.equal(absentComponent(lib,['/.','/usr/lib/libcurl.so.4']),null);
});
