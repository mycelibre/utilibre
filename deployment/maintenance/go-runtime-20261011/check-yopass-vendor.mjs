// Verify the real vendor package bytes and its own distroless inventory record.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
const root='/var/lib/utilibre-maintenance/go-runtime-20261011';
const base='utilibre-yopass:14.10.0-go-security-20261011@sha256:5f0522463f12d640cee398a7623126566a5625b92f8455e0dc790426b4428075';
const image='utilibre-yopass:14.10.0-go-openssl-security-20261011';
const docker=(...args)=>execFileSync('docker',args,{timeout:60000,maxBuffer:64*1024**2});
const [old,next]=JSON.parse(docker('image','inspect',base,image));
for(const k of ['Cmd','Entrypoint','User','Env','WorkingDir','ExposedPorts','Volumes'])assert.deepEqual(old.Config[k],next.Config[k],k);
const suffix=randomBytes(4).toString('hex'),created=[];
const copy=(id,path)=>execFileSync('tar',['-xOf','-'],{input:docker('cp',id+':/'+path,'-'),maxBuffer:64*1024**2});
try{
 const before=docker('create','--name','maintenance-yopass-vendor-old-'+suffix,base).toString().trim();created.push(before);
 const after=docker('create','--name','maintenance-yopass-vendor-new-'+suffix,image).toString().trim();created.push(after);
 const sumsPath='var/lib/dpkg/status.d/libssl3t64.md5sums';
 const parse=bytes=>bytes.toString().trim().split('\n').map(line=>{const match=/^([a-f0-9]{32})  (usr\/[a-zA-Z0-9_/+.~-]+)$/.exec(line);assert(match,'Expected package file record');return{md5:match[1],path:match[2]};});
 const oldFiles=parse(copy(before,sumsPath)),newFiles=parse(copy(after,sumsPath));
 assert.deepEqual(oldFiles.map(x=>x.path).sort(),newFiles.map(x=>x.path).sort(),'Vendor replacement preserves package file set');
 const control=copy(after,'var/lib/dpkg/status.d/libssl3t64').toString();
 assert.match(control,/^Package: libssl3t64$/m);assert.match(control,/^Version: 3\.5\.7-1~deb13u3$/m);
 for(const row of newFiles)assert.equal(createHash('md5').update(copy(after,row.path)).digest('hex'),row.md5,row.path);
 for(const binary of ['yopass','yopass-server']){
  const current=copy(after,binary),built=await readFile(root+'/output/'+binary);
  assert.deepEqual(current,built,'Compiler output unchanged by vendor layer');
 }
 const unchangedMetadata=['base-files','ca-certificates','libc6','libzstd1','media-types','netbase','tzdata','tzdata-legacy','zlib1g'];
 for(const name of unchangedMetadata)assert.deepEqual(copy(before,'var/lib/dpkg/status.d/'+name),copy(after,'var/lib/dpkg/status.d/'+name),'Unrelated package metadata unchanged');
 const report={status:'passed',date:new Date().toISOString(),imageId:next.Id,nativeConfigurationUnchanged:true,package:'libssl3t64',version:'3.5.7-1~deb13u3',allPackageFilesMatchVendorMd5:true,packageFiles:newFiles.length,bothApplicationBinariesUnchanged:true,unrelatedPackageMetadataUnchanged:true};
 await writeFile(root+'/yopass-vendor.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(report));
}finally{for(const id of created.reverse())docker('rm',id);}
