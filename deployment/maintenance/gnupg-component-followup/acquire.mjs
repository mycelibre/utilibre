// Read-only production access; package acquisition in a disposable compiler-free image.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/gnupg-component-followup-20261012';
fs.mkdirSync(root+'/packages',{recursive:true});
const image=cp.execFileSync('docker',['inspect','--format','{{.Image}}','utilibre-expanded-penpot-exporter-1'],{encoding:'utf8'}).trim();
assert.match(image,/^sha256:[a-f0-9]{64}$/);
const packages=['dirmngr','gnupg-utils','gpg','gpg-agent','gpg-wks-client','gpgconf','gpgsm','gpgv'].map(p=>p+'=2.4.7-21+deb13u1+dhi4').concat(['gnupg=2.4.7-21+deb13u1','gnupg-l10n=2.4.7-21+deb13u1']);
assert(!fs.existsSync(root+'/packages/package-index.txt'),'Do not overwrite retained authenticated acquisition');
const script=`set -eu
apt-get -o APT::Update::Error-Mode=any update > /proof/apt-update.log 2>&1
cd /proof
apt-get download ${packages.join(' ')} > download.log 2>&1
apt-cache show ${packages.join(' ')} > package-index.txt
sha256sum *.deb > SHA256SUMS
`;
cp.execFileSync('docker',['run','--rm','--name','maintenance-gnupg-attribution-download','--user','0','--cpus','0.5','--memory','256m','--memory-swap','256m','--pids-limit','64','--log-driver','none','--tmpfs','/var/lib/apt/lists:rw,size=128m','--tmpfs','/var/cache/apt:rw,size=64m','--mount','type=bind,src='+root+'/packages,dst=/proof','--entrypoint','sh',image,'-ec',script],{timeout:180000,stdio:['ignore','pipe','pipe']});
console.log('Exact Debian/DHI package archives acquired through authenticated APT; no installed service changed.');
