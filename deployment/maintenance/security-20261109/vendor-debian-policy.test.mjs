import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {proveDhiPayload,proveVendorDebian} from './vendor-debian-policy.mjs';
const inputs=JSON.parse(fs.readFileSync(new URL('./vendor-debian-inputs.json',import.meta.url)));
function fixture(){
 const s=structuredClone(inputs.rows.find(s=>s.key==='apt-penpot-frontend'));
 const b={base:s.base,imageId:'sha256:'+'a'.repeat(64)};
 const p={base:b.base,imageId:b.imageId,passed:true,metadataPreserved:true,productionChanged:false,network:'none',
  fixtureSha256:createHash('sha256').update(fs.readFileSync(new URL('./check-vendor-dhi.py',import.meta.url))).digest('hex'),
  rows:['apt','libapt-pkg7.0'].map(packageName=>({package:packageName,version:'3.0.4+dhi0',archiveSha256:inputs.packages[s.packages[packageName].package].sha256,payloadExact:true,
   residual:s.residual[packageName],files:Array.from({length:11},(_,i)=>({path:'/usr/share/fixture/'+i,type:'file',value:'a'.repeat(64)}))}))};
 return {s,b,p};
}
test('DHI proof binds exact package payloads and preserved old metadata',()=>{const {s,b,p}=fixture();assert(proveDhiPayload(inputs,s,b,p));});
test('historical adapter review cannot choose an arbitrary Git revision',()=>{
 const {s}=fixture(),b={base:s.base,candidate:s.candidate,passed:true,configurationUnchanged:true,unrelatedPackagesUnchanged:true};
 assert.throws(()=>proveVendorDebian(inputs,s,b,{}, {}, {},'/unused',{recordedRevision:'0'.repeat(40)}),{code:'ERR_ASSERTION'});
});
test('historical adapter review is confined to the two recorded APT services',()=>{
 const {s}=fixture();s.key='unreviewed-service';const b={base:s.base,candidate:s.candidate,passed:true,configurationUnchanged:true,unrelatedPackagesUnchanged:true};
 assert.throws(()=>proveVendorDebian(inputs,s,b,{}, {}, {},'/unused',{recordedRevision:'f5c2e09f812e920a3b1c95e8c6673227abf1ca6d'}),{code:'ERR_ASSERTION'});
});
for(const [name,change] of Object.entries({
 'wrong service':x=>x.s.key='another-service',
 'wrong distribution':x=>x.s.acquisition='ubuntu',
 'wrong artifact':x=>x.p.imageId='sha256:'+'b'.repeat(64),
 'unverified payload':x=>x.p.rows[0].payloadExact=false,
 'unsigned archive':x=>x.p.rows[0].archiveSha256='b'.repeat(64),
 'unfixed version':x=>x.p.rows[0].version='3.0.3+dhi2',
 'metadata deletion':x=>x.p.metadataPreserved=false,
 'different residual metadata':x=>x.p.rows[0].residual={...x.p.rows[0].residual,sha256:'b'.repeat(64)},
 'missing files':x=>x.p.rows[0].files=[],
 'duplicate files':x=>x.p.rows[0].files.push(x.p.rows[0].files[0]),
 'changed checker':x=>x.p.fixtureSha256='b'.repeat(64),
 'unapproved network':x=>x.p.network='public',
 'production mutation':x=>x.p.productionChanged=true,
})){test('DHI proof rejects '+name,()=>{const x=fixture();change(x);assert.throws(()=>proveDhiPayload(inputs,x.s,x.b,x.p));});}
