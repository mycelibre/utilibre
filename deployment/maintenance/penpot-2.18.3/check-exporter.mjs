// Exercise the upstream exporter through its native route with synthetic data.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const directory=process.argv[2];
assert.match(directory,/^\/opt\/utilibre\/reports\/penpot-native-roundtrip-[a-z0-9_]+$/);
const metadata=JSON.parse(await readFile(directory+'/metadata.json','utf8'));
assert.equal(metadata.report,directory);assert.equal(metadata.version,'2.18.3');
const [network]=JSON.parse(execFileSync('docker',['network','inspect',metadata.name+'_isolated']));assert(network.Internal);
const [account]=JSON.parse(await readFile(directory+'/checker-accounts.json','utf8'));
const origin=`http://127.0.0.1:${metadata.port}`;
async function rpc(method,body,status=200){
 const response=await fetch(origin+'/api/main/methods/'+method,{method:'POST',headers:{accept:'application/json','content-type':'application/json',cookie:`auth-token=${account.cookie}`},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,status,method);const text=await response.text();return text?JSON.parse(text):null;
}
const file=await rpc('create-file',{name:'Fictional PNG export',projectId:account.profile.defaultProjectId});
const pageId=file.data.pages[0],zero='00000000-0000-0000-0000-000000000000';
const shape={...file.data.pagesIndex[pageId].objects[zero],id:randomUUID(),type:'rect',name:'Fictional export rectangle',x:10,y:10,width:240,height:160,selrect:{x:10,y:10,width:240,height:160,x1:10,y1:10,x2:250,y2:170},points:[{x:10,y:10},{x:250,y:10},{x:250,y:170},{x:10,y:170}],fills:[{fillColor:'#2F80ED',fillOpacity:1}],proportion:1.5};
delete shape.shapes;
try{
 await rpc('update-file',{id:file.id,sessionId:randomUUID(),revn:file.revn,vern:file.vern,changes:[{type:'add-obj',pageId,id:shape.id,parentId:zero,frameId:zero,componentsV2:true,obj:shape}]});
 const payload={'~:cmd':'~:export-shapes','~:profile-id':'~u'+account.profile.id,'~:wait':true,'~:exports':[{'~:file-id':'~u'+file.id,'~:page-id':'~u'+pageId,'~:object-id':'~u'+shape.id,'~:type':'~:png','~:suffix':'','~:scale':1,'~:name':'Fictional rectangle'}]};
 const response=await fetch(origin+'/api/export',{method:'POST',headers:{'content-type':'application/transit+json',cookie:`auth-token=${account.cookie}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(75000)});
 const resource=await response.text();await writeFile(directory+'/exporter-response.json',resource,{mode:0o600});assert.equal(response.status,200,'Native PNG exporter');
 const parsed=JSON.parse(resource);const rawUri=parsed['~:uri'];const uri=typeof rawUri==='string'?rawUri:rawUri?.['~#uri'];assert(uri,'Native resource URI');
 const url=new URL(uri);assert.equal(url.origin,origin);assert(url.pathname.startsWith('/assets/by-id/'));
 const result=await fetch(url,{headers:{cookie:`auth-token=${account.cookie}`},signal:AbortSignal.timeout(30000)});assert.equal(result.status,200);
 const bytes=Buffer.from(await result.arrayBuffer());assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(bytes.readUInt32BE(16),240);assert.equal(bytes.readUInt32BE(20),160);
 await writeFile(directory+'/fictional-rectangle.png',bytes,{mode:0o600});
 await writeFile(directory+'/exporter.json',JSON.stringify({status:'passed',date:new Date().toISOString(),version:'2.18.3',format:'PNG',width:240,height:160,bytes:bytes.length,nativeRoute:true,isolatedNetwork:true,changedBrowserLaunchFlags:false}),{mode:0o600});
}finally{await rpc('delete-file',{id:file.id},204);}
