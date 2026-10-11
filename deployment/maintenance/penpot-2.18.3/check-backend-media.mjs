// Native backend image inspection + thumbnail processing, fictional upload only.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const directory=process.argv[2];
assert.match(directory,/^\/opt\/utilibre\/reports\/penpot-native-roundtrip-[a-z0-9_]+$/);
const metadata=JSON.parse(await readFile(directory+'/metadata.json','utf8'));
assert.equal(metadata.report,directory);assert.equal(metadata.version,'2.18.3');
const [network]=JSON.parse(execFileSync('docker',['network','inspect',metadata.name+'_isolated']));assert(network.Internal);
const [account,other]=JSON.parse(await readFile(directory+'/checker-accounts.json','utf8'));
const origin=`http://127.0.0.1:${metadata.port}`;
async function rpc(method,body,status=200,as=account){
 const response=await fetch(origin+'/api/main/methods/'+method,{method:'POST',headers:{accept:'application/json',...(body instanceof FormData?{}:{'content-type':'application/json'}),cookie:`auth-token=${as.cookie}`},body:body instanceof FormData?body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
 const text=await response.text();if(response.status!==status)await writeFile(directory+'/media-error.json',text,{mode:0o600});assert.equal(response.status,status,method);return text?JSON.parse(text):null;
}
const file=await rpc('create-file',{name:'Fictional backend media',projectId:account.profile.defaultProjectId});
try{
 const png=execFileSync('docker',['exec',metadata.name+'-penpot-backend-1','magick','-size','320x240','xc:#1248ac','png:-'],{timeout:30000,maxBuffer:1024*1024});assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 const form=new FormData();form.set('file-id',file.id);form.set('is-local','true');form.set('name','Fictional blue image');form.set('content',new Blob([png],{type:'image/png'}),'fictional.png');
 const media=await rpc('upload-file-media-object',form);assert.equal(media.width,320);assert.equal(media.height,240);assert.equal(media.mtype,'image/png');assert(media.thumbnailId,'Native backend must create thumbnail');
 const response=await fetch(origin+'/assets/by-id/'+media.thumbnailId,{headers:{cookie:`auth-token=${account.cookie}`},signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);const thumb=Buffer.from(await response.arrayBuffer());assert.equal(thumb.subarray(0,2).toString('hex'),'ffd8');
 const dimensions=execFileSync('docker',['exec','-i',metadata.name+'-penpot-backend-1','magick','identify','-format','%w %h','jpeg:-'],{input:thumb,encoding:'utf8',timeout:15000});assert.equal(dimensions,'100 75');
 await rpc('get-file',{id:file.id},404,other);
 await writeFile(directory+'/backend-media.json',JSON.stringify({status:'passed',checkedAt:new Date().toISOString(),original:{format:'PNG',width:320,height:240},nativeThumbnail:{format:'JPEG',width:100,height:75,bytes:thumb.length},otherAccountFileDenied:true,network:'internal Docker network; synthetic data only'}),{mode:0o600});
}finally{await rpc('delete-file',{id:file.id},204);}
