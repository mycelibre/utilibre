// Build a small vendor-path Perl module package from unmodified upstream files.
// @INC natively prefers /usr/share/perl5 to Perl's core module directory.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/archive-tar-final-20261012',src=root+'/Archive-Tar-3.14';
const proof=JSON.parse(fs.readFileSync(root+'/source.json'));assert.equal(proof.status,'passed');
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(fs.readFileSync(root+'/Archive-Tar-3.14.tar.gz')),proof.archiveSha256);
const staging=fs.mkdtempSync(root+'/package-'),rows=[];
for(const rel of ['Archive/Tar.pm','Archive/Tar/Constant.pm','Archive/Tar/File.pm']){
 const data=fs.readFileSync(src+'/lib/'+rel),dest=staging+'/usr/share/perl5/'+rel;
 fs.mkdirSync(dest.slice(0,dest.lastIndexOf('/')),{recursive:true,mode:0o755});fs.writeFileSync(dest,data,{mode:0o644});
 rows.push({path:'/usr/share/perl5/'+rel,sha256:sha(data)});
}
const docs=staging+'/usr/share/doc/utilibre-archive-tar';fs.mkdirSync(docs,{recursive:true,mode:0o755});
for(const name of ['README','CHANGES'])fs.copyFileSync(src+'/'+name,docs+'/'+name);
fs.writeFileSync(docs+'/copyright','Archive::Tar 3.14, unmodified upstream modules.\nSource: '+proof.url+'\nLicense: same terms as Perl (Artistic License or GNU GPL).\nComplete original notices are retained in module POD and README.\n');
fs.mkdirSync(staging+'/DEBIAN',{mode:0o755});
fs.writeFileSync(staging+'/DEBIAN/control','Package: utilibre-archive-tar\nVersion: 3.14-1\nArchitecture: all\nMaintainer: Utilibre <admin@utilibre.org>\nDepends: perl (>= 5.36), perl-modules-5.36 | perl-modules-5.40\nSection: perl\nPriority: optional\nDescription: Pinned upstream Archive::Tar module for Utilibre\n Native vendor-path override of the core archive module; interpreter unchanged.\n');
const deb=root+'/utilibre-archive-tar_3.14-1_all.deb';
cp.execFileSync('chmod',['-R','a+rX',staging]);cp.execFileSync('dpkg-deb',['--root-owner-group','--build',staging,deb],{stdio:'pipe'});
const receipt={date:new Date().toISOString(),status:'passed',version:'3.14-1',sourceSha256:proof.archiveSha256,debSha256:sha(fs.readFileSync(deb)),bytes:fs.statSync(deb).size,modules:rows};
fs.writeFileSync(root+'/package.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
