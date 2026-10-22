// Source-package advisories can be assigned to unrelated binary subpackages.
// Review only named component-specific CVEs, with the real dpkg file inventory.
// Do not mark the affected sibling package, complete image or host as repaired.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {validateDecision} from './triage.mjs';

const mountIds=new Set(['CVE-2026-76642','CVE-2026-78409','CVE-2026-78410','CVE-2026-53613']);
const mountSiblings=new Set(['bsdutils','bsdextrautils','libblkid1','liblastlog2-2','libsmartcols1','libuuid1','login','util-linux','util-linux-extra','libfdisk1','eject','fdisk','uuid-runtime']);
const nsenterSiblings=new Set([...mountSiblings,'libmount1','mount']);
nsenterSiblings.delete('util-linux');
const ncursesSiblings=new Set(['libncursesw6','libncurses6','libncurses-dev','libtinfo6','ncurses-base']);
// Both fixes change src/home/homed-home.c. The v252/v257 src/home/meson.build
// compiles it into systemd-homed, not libshared or the system manager. Debian
// splits homed into its own package. Still check each installed file inventory;
// never waive systemd-homed or a package actually containing that component.
const homedSiblings=new Set(['libsystemd0','libudev1','udev','systemd-timesyncd','systemd-resolved','libnss-myhostname','libnss-resolve','libpam-systemd','systemd-sysv','systemd','libsystemd-shared','systemd-cryptsetup','libnss-systemd']);
export function absentComponent(item,files){
 if(!Array.isArray(files)||files.length<2||files.some(p=>!p.startsWith('/')))return null;
 // October MariaDB advisories concern SQL execution/serialization in the
 // server and (86047 only) mariadb-dump, not Connector/C or common config.
 // Keep the affected server/client-executable packages outside this rule.
 if(['CVE-2026-85746','CVE-2026-92262','CVE-2026-86047','CVE-2026-97380'].includes(item.id)&&['libmariadb3','mariadb-common'].includes(item.package)&&!files.some(p=>/\/(?:mariadbd|mysqld|mariadb-dump|mysqldump)(?:\.|$)|\/sql\//.test(p)))
  return 'MariaDB server ST_AsText / table-name encoding / GRANT PROXY / SHOW CREATE, and mariadb-dump SQL serialization; not Connector/C or the common configuration subpackage';
 if(item.id==='CVE-2026-12064'&&/^libcurl(?:3|4)(?:t64)?(?:-gnutls|-openssl-dev|-gnutls-dev)?$/.test(item.package)&&!files.some(p=>/\/(?:s?bin)\/curl$/.test(p)))
  return 'curl CLI --proto-default SSH option initialization; upstream explicitly excludes libcurl (https://curl.se/docs/CVE-2026-12064.html)';
 if(item.id==='CVE-2026-6276'&&item.package==='curl'&&!files.some(p=>/\/libcurl[^/]*\.(?:so|a)/.test(p)))
  return 'libcurl easy-handle custom-Host cookie reuse; upstream explicitly excludes the curl CLI (https://curl.se/docs/CVE-2026-6276.html)';
 if(item.id==='CVE-2026-8927'&&item.package==='curl'&&!files.some(p=>/\/libcurl[^/]*\.(?:so|a)/.test(p)))
  return 'libcurl reused-handle environment-proxy Digest authentication; upstream explicitly excludes the curl CLI (https://curl.se/docs/CVE-2026-8927.html)';
 if(mountIds.has(item.id)&&mountSiblings.has(item.package)&&!files.some(p=>/\/(?:mount|umount)$|\/libmount\.(?:so|a)/.test(p)))
  return 'mount(8) and libmount privileged mount-hook/path handling';
 if(item.id==='CVE-2026-78408'&&nsenterSiblings.has(item.package)&&!files.some(p=>/\/nsenter$/.test(p)))
  return 'the nsenter --join-cgroup executable implementation';
 if(item.id==='CVE-2025-69720'&&ncursesSiblings.has(item.package)&&!files.some(p=>/\/infocmp$/.test(p)))
  return 'infocmp progs/infocmp.c analyze_string';
 if(item.id==='CVE-2026-60002'&&['openssh-server','openssh-sftp-server'].includes(item.package)&&!files.some(p=>/\/(?:s?bin|libexec)\/ssh$/.test(p)))
  return 'the ssh client host-key re-exchange code (upstream says client-only)';
 if(item.id==='CVE-2026-106583'&&['openssh-server','openssh-sftp-server'].includes(item.package)&&!files.some(p=>/\/(?:s?bin|libexec)\/ssh$/.test(p)))
  return 'the ssh client command-line username validation in readconf.c, upstream 0c4c9a7b320bd7ff61c4a2dc345cb2e27e9663b2; not sshd or sftp-server';
 if(['CVE-2026-106553','CVE-2026-106555'].includes(item.id)&&['openssh-client','openssh-sftp-server'].includes(item.package)&&!files.some(p=>/\/(?:sshd|sshd-auth|sshd-session)$/.test(p)))
  return 'the sshd server GSSAPI authentication/credential state in auth2.c, monitor.c and gss-serv.c; upstream 670510d1e190b0f4e47066f24498c04ada1da0f0 and 6f9cd19af05aa828d7778cfb047faaed1679e8b7; not client-side GSSAPI or the SFTP subsystem';
 if(item.id==='CVE-2026-16742'&&homedSiblings.has(item.package)&&!files.some(p=>/\/(?:systemd-homed|systemd-homework|homectl)(?:\.|$)/.test(p)))
  return 'systemd-homed src/home/homed-home.c identity verification';
 if(item.id==='CVE-2026-9538'&&['perl-base','libperl5.36','libperl5.40'].includes(item.package)&&!files.some(p=>/\/Archive\/Tar(?:\.pm|\/)/.test(p)))
  return 'the separate Perl Archive::Tar module _read_tar function';
 if(item.id==='CVE-2026-34980'&&['libcups2','libcups2t64'].includes(item.package)&&!files.some(p=>/\/(?:cupsd|cups-exec)(?:\.|$)|\/scheduler\//.test(p)))
  return 'the cupsd scheduler job option/PPD control parsing, not the CUPS client library; upstream repair 8d0f51cac24cb5bf949c5b6a221e51a150d982e3 changes scheduler/job.c only';
 if(item.id==='CVE-2026-74860'&&['libxml2','libxml2-dev','libxml2-utils'].includes(item.package)&&!files.some(p=>/python|libxml2mod|libxml2\.py/i.test(p)))
  return 'the separate libxml2 Python SAX binding libxml_xmlSAXAttributeDecl (not the C library or lxml); upstream fix f41e1865781f74d1cadfe2fbdfeefed946026f12 changes python/libxml.c';
 return null;
}

export function run(){
 process.umask(0o077);
 const base='/var/lib/utilibre-maintenance/',queue=JSON.parse(fs.readFileSync(base+'security-queue.json')),scan=JSON.parse(fs.readFileSync(base+'security.json'));
 assert(Date.now()-Date.parse(scan.completedAt)<86400000,'Fresh scanner evidence required');
 const cache=new Map,rows=[],skipped=[];
 const exec=(name,args)=>execFileSync(name,args,{encoding:'utf8',timeout:10000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']}).trim();
 for(const item of queue.items){
  if(item.status!=='needs-review'||!['runtime-image','host-os'].includes(item.scope)||!['debian','ubuntu'].includes(item.type))continue;
  if(!absentComponent(item,['/.','/usr']))continue;
  const key=[item.artifact,item.package,item.installed].join('|');
  if(!cache.has(key)){
   try{
    let cmd='dpkg-query',prefix=[];
    if(item.scope==='runtime-image'){
     const im=scan.images.find(x=>x.id===item.artifact);assert.equal(im?.status,'checked');
     const name=item.containers[0];assert.equal(exec('docker',['inspect','--format','{{.Image}}',name]),item.artifact);
     cmd='docker';prefix=['exec',name,'dpkg-query'];
    }else assert.equal(scan.host.status,'checked');
    assert.equal(exec(cmd,[...prefix,'-W','-f=${Version}',item.package]),item.installed);
    cache.set(key,exec(cmd,[...prefix,'-L',item.package]).split('\n'));
   }catch{cache.set(key,null);skipped.push({package:item.package,artifact:item.artifact});}
  }
  const files=cache.get(key),component=absentComponent(item,files);if(!component)continue;
  const reason=`Component-specific advisory: ${component}. This exact installed ${item.package} ${item.installed} dpkg file inventory contains none of that component. Binary subpackage attribution only: the affected sibling package and any same-image findings remain open. https://security-tracker.debian.org/tracker/${item.id} . No claim that the entire source package, service or host is safe.`;
  rows.push(validateDecision({key:item.key,status:'not-affected',reason,expiresAt:new Date(Date.now()+7*86400000).toISOString()}));
 }
 fs.writeFileSync(base+'binary-scope-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions:rows,skipped},null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({exactBinaryFindingsReviewed:rows.length,inventoryGroups:cache.size,unverifiedGroups:skipped.length,applied:false}));
 return rows;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)run();
