import assert from 'node:assert/strict';
import test from 'node:test';
import {absentComponent} from './review-binary-scope.mjs';

test('CUPS scheduler attribution never exempts the server or an included scheduler',()=>{
 const item={id:'CVE-2026-34980',package:'libcups2t64'};
 assert(absentComponent(item,['/.','/usr/lib/x86_64-linux-gnu/libcups.so.2']));
 assert.equal(absentComponent({...item,package:'cups-daemon'},['/.','/usr/sbin/cupsd']),null);
 assert.equal(absentComponent(item,['/.','/usr/sbin/cupsd']),null);
 assert.equal(absentComponent({...item,id:'CVE-2026-99999'},['/.','/usr/lib/libcups.so.2']),null);
});
const files=['/.','/usr/lib/libuuid.so.1'];
test('October SSH findings distinguish client, authentication server and subsystem',()=>{
 for(const id of ['CVE-2026-106553','CVE-2026-106555']){
  for(const pkg of ['openssh-client','openssh-sftp-server']){
   const item={id,package:pkg};assert.match(absentComponent(item,['/.','/usr/bin/ssh','/usr/lib/openssh/sftp-server']),/sshd server/);
   for(const p of ['/usr/sbin/sshd','/usr/lib/openssh/sshd-auth','/usr/lib/openssh/sshd-session'])assert.equal(absentComponent(item,[...files,p]),null);
  }
  assert.equal(absentComponent({id,package:'openssh-server'},files),null);
 }
 const item={id:'CVE-2026-106583',package:'openssh-server'};assert.match(absentComponent(item,['/.','/usr/sbin/sshd']),/client command-line/);
 assert.equal(absentComponent(item,['/.','/usr/bin/ssh']),null);assert.equal(absentComponent({...item,package:'openssh-client'},files),null);
});
test('Python SAX advisory never exempts the binding package or an included binding',()=>{
 const item={id:'CVE-2026-74860',package:'libxml2'};
 assert.match(absentComponent(item,['/.','/usr/lib/libxml2.so.2']),/Python SAX/);
 assert.equal(absentComponent({...item,package:'python3-libxml2'},files),null);
 for(const name of ['/usr/lib/python3/dist-packages/libxml2mod.so','/opt/libxml2.py'])assert.equal(absentComponent(item,[...files,name]),null);
 assert.equal(absentComponent({...item,id:'CVE-2026-86138'},files),null);
});
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
 for(const packageName of ['systemd','libsystemd-shared','systemd-cryptsetup','libnss-systemd']){
  assert.match(absentComponent({id:'CVE-2026-16742',package:packageName},files),/homed/);
  assert.equal(absentComponent({id:'CVE-2026-16742',package:packageName},[...files,'/usr/lib/systemd/systemd-homed']),null);
 }
 assert.equal(absentComponent({id:'CVE-2026-16742',package:'systemd-homed'},files),null);
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
 const proxy={id:'CVE-2026-8927',package:'curl'};
 assert.match(absentComponent(proxy,['/.','/usr/bin/curl']),/environment-proxy/);
 assert.equal(absentComponent({...proxy,package:'libcurl4t64'},['/.','/usr/lib/libcurl.so.4']),null);
 assert.equal(absentComponent(proxy,['/.','/usr/lib/libcurl.so.4']),null);
});
