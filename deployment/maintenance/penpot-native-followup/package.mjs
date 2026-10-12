// Genuine locally built Debian packages; never overwrite version metadata alone.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,cp,symlink,stat,chmod} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='/var/lib/utilibre-maintenance/penpot-native-followup-20261012';
const output=root+'/output',version='2.60.3+utilibre1';
assert.equal((await readFile(output+'/build-passed','utf8')).trim(),'passed');
assert.equal((await stat(output+'/install/usr/lib/x86_64-linux-gnu/librsvg-2.so.2.60.3')).isFile(),true);
const specs=JSON.parse(await readFile(new URL('./specs.json',import.meta.url)));
const run=(cmd,args)=>execFileSync(cmd,args,{encoding:'utf8',timeout:120000,maxBuffer:8*1024**2});
const packages=[];
for(const name of ['librsvg2-2','librsvg2-common']) {
 const role=specs.roles[1],stage=root+'/packages/'+name;
 await mkdir(stage+'/DEBIAN',{recursive:true});
 const before=run('docker',['run','--rm','--network','none','--read-only','--log-driver','none','--entrypoint','dpkg-query',role.baseId,'-s',name]);
 assert.match(before,/Version: 2\.60\.0\+dfsg-1\n/);
 let control=before.replace(/^Status:.*\n/m,'').replace(/^Installed-Size:.*\n/m,'')
   .replace(/^Version:.*$/m,'Version: '+version)
   .replace(/^Maintainer:.*$/m,'Maintainer: Utilibre maintainers <admin@utilibre.org>')
   .replace('librsvg2-2 (= 2.60.0+dfsg-1)','librsvg2-2 (= '+version+')');
 control+='Original-Maintainer: Debian GNOME Maintainers <pkg-gnome-maintainers@lists.alioth.debian.org>\n';
 await writeFile(stage+'/DEBIAN/control',control);
 await mkdir(stage+'/usr/share/doc/'+name,{recursive:true});
 const copyright=run('docker',['run','--rm','--network','none','--read-only','--log-driver','none','--entrypoint','cat',role.baseId,'/usr/share/doc/'+name+'/copyright']);
 await writeFile(stage+'/usr/share/doc/'+name+'/copyright',copyright);
 if(name==='librsvg2-2')await cp(output+'/notices',stage+'/usr/share/doc/'+name+'/dependency-notices',{recursive:true});
 await writeFile(stage+'/usr/share/doc/'+name+'/README.Utilibre',
   'Native upstream librsvg 2.60.3, built with the release Cargo.lock and vendored sources.\n'+
   'Source: https://download.gnome.org/sources/librsvg/2.60/librsvg-2.60.3.tar.xz\n'+
   'Same-series repair for CVE-2026-96889; unchanged native SONAME.\n'+
   'The full corresponding source and dependency notices accompany the Utilibre source offer.\n');
 if(name==='librsvg2-2') {
   const lib=stage+'/usr/lib/x86_64-linux-gnu';await mkdir(lib,{recursive:true});
   await cp(output+'/install/usr/lib/x86_64-linux-gnu/librsvg-2.so.2.60.3',lib+'/librsvg-2.so.2.60.3');
   await symlink('librsvg-2.so.2.60.3',lib+'/librsvg-2.so.2');
   await writeFile(stage+'/DEBIAN/triggers','activate-noawait ldconfig\n');
 } else {
   const relative='usr/lib/x86_64-linux-gnu/gdk-pixbuf-2.0/2.10.0/loaders/libpixbufloader_svg.so';
   await mkdir(stage+'/'+relative.slice(0,relative.lastIndexOf('/')),{recursive:true});
   await cp(output+'/install/'+relative,stage+'/'+relative);
   await mkdir(stage+'/usr/share/thumbnailers',{recursive:true});
   await cp(output+'/install/usr/share/thumbnailers/librsvg.thumbnailer',stage+'/usr/share/thumbnailers/librsvg.thumbnailer');
   const postinst=run('docker',['run','--rm','--network','none','--read-only','--log-driver','none','--entrypoint','cat',role.baseId,'/var/lib/dpkg/info/librsvg2-common:amd64.postinst']);
   await writeFile(stage+'/DEBIAN/postinst',postinst);await chmod(stage+'/DEBIAN/postinst',0o755);
 }
 const file=`${output}/${name}_${version}_amd64.deb`;
 run('dpkg-deb',['--build','--root-owner-group',stage,file]);
 const bytes=await readFile(file);packages.push({name,version,file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
await writeFile(root+'/packages.json',JSON.stringify({schema:1,status:'prepared',createdAt:new Date().toISOString(),packages},null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({status:'prepared',packages:packages.map(({name,version,sha256})=>({name,version,sha256}))}));
