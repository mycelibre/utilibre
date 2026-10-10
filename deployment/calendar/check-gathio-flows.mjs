import assert from 'node:assert/strict';
import fs from 'node:fs';
const base='http://127.0.0.1:3000';
const fixture=JSON.parse(fs.readFileSync('/tmp/gathio-fixture.json','utf8'));
const body={eventName:'Fictional revised deployment event',eventLocation:'Fictional room',eventStart:'2026-10-20T14:00',eventEnd:'2026-10-20T15:00',timezone:'Etc/UTC',eventDescription:'Fictional restoration check only.',eventURL:'',imagePath:'',hostName:'Fictional host',creatorEmail:'',publicCheckbox:'',eventGroupCheckbox:'',interactionCheckbox:'on',joinCheckbox:'on',maxAttendeesCheckbox:'',maxAttendees:0,editToken:fixture.editToken};
let r=await fetch(base+'/event/'+fixture.eventID,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({...body,editToken:'fictional-invalid'})});assert.equal(r.status,403);
const form=new FormData();for(const [key,value] of Object.entries(body))form.set(key,String(value));
// A local synthetic image fixture; no external image source is contacted.
const {Jimp}=await import('jimp');const image=new Jimp({width:8,height:8,color:0xff8844ff});const png=await image.getBuffer('image/png');form.set('imageUpload',new Blob([png],{type:'image/png'}),'fictional.png');
r=await fetch(base+'/event/'+fixture.eventID,{method:'PUT',body:form});assert.equal(r.status,200);
r=await fetch(base+'/events/'+fixture.eventID+'.jpg');assert.equal(r.status,200);assert((await r.arrayBuffer()).byteLength>20);
r=await fetch(base+'/export/event/'+fixture.eventID);const ics=await r.text();assert(ics.includes(body.eventName));
const imported=new FormData();imported.set('icsImportControl',new Blob([ics],{type:'text/calendar'}),'fictional.ics');r=await fetch(base+'/import/event',{method:'POST',body:imported});assert.equal(r.status,200);fixture.imported=await r.json();assert(fixture.imported.eventID&&fixture.imported.editToken);
fs.writeFileSync('/tmp/gathio-fixture.json',JSON.stringify(fixture),{mode:0o600});fs.writeFileSync('/tmp/gathio-fixture.ics',ics,{mode:0o600});
console.log(JSON.stringify({nativeEdit:true,wrongEditTokenDenied:true,nativeImageUpload:true,nativeIcsExportImport:true,originalAndImportedCopies:true}));
