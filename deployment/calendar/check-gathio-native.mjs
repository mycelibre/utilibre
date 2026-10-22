import assert from 'node:assert/strict';
import fs from 'node:fs';
const base='http://127.0.0.1:3000';
const start=Date.now()+2*86400000;
const body={eventName:'Fictional deployment event',eventLocation:'Fictional room',eventStart:new Date(start).toISOString().slice(0,16),eventEnd:new Date(start+3600000).toISOString().slice(0,16),timezone:'Etc/UTC',eventDescription:'Fictional restoration check only.',eventURL:'',imagePath:'',hostName:'Fictional host',creatorEmail:'',publicCheckbox:'',eventGroupCheckbox:'',interactionCheckbox:'on',joinCheckbox:'on',maxAttendeesCheckbox:'',maxAttendees:0};
const response=await fetch(base+'/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(response.status,200,await response.clone().text());const fixture=await response.json();assert.match(fixture.editToken,/^[A-Za-z0-9_-]{32}$/);Object.assign(fixture,{eventStart:body.eventStart,eventEnd:body.eventEnd});fs.writeFileSync('/tmp/gathio-fixture.json',JSON.stringify(fixture),{mode:0o600});
const view=await fetch(base+'/'+fixture.eventID);assert.equal(view.status,200);assert((await view.text()).includes(body.eventName));
const ics=await fetch(base+'/export/event/'+fixture.eventID);assert.equal(ics.status,200);const content=await ics.text();assert(content.includes('BEGIN:VEVENT')&&content.includes(body.eventName));fs.writeFileSync('/tmp/gathio-fixture.ics',content,{mode:0o600});
console.log(JSON.stringify({nativeCreate:true,nativeView:true,nativeIcsExport:true,secureEditToken:true,fixtureSavedPrivately:true}));
