// One harmless, unpredictable synthetic topic. No real subscribers or mail.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
const origin='https://notify.utilibre.org';
const configText=await (await fetch(`${origin}/config.js`,{signal:AbortSignal.timeout(10000)})).text();
const config=JSON.parse(configText.slice(configText.indexOf('{'),configText.lastIndexOf('}')+1));
for(const key of ['enable_login','enable_signup','enable_calls','enable_emails','enable_reservations']) assert.equal(config[key],false,key);
assert(!config.web_push_public_key,'Browser Web Push must remain disabled');
const topic=`utilibre-check-${randomBytes(16).toString('hex')}`;
const content=`Fictional delivery check ${randomBytes(12).toString('hex')}`;
const abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),15000);
let reader;
try {
 const response=await fetch(`${origin}/${topic}/json`,{signal:abort.signal});assert.equal(response.status,200);
 reader=response.body.getReader();let buffer='';
 async function event(){
  for(;;){const n=buffer.indexOf('\n');if(n>=0){const line=buffer.slice(0,n);buffer=buffer.slice(n+1);if(line)return JSON.parse(line);continue;}
   const {done,value}=await reader.read();assert(!done,'Subscription closed before delivery');buffer+=new TextDecoder().decode(value);
  }
 }
 assert.equal((await event()).event,'open');
 const published=await fetch(`${origin}/${topic}`,{method:'POST',body:content,signal:abort.signal});assert.equal(published.status,200);
 const message=await published.json();assert.equal(message.expires-message.time,3600);
 let received;do{received=await event();}while(received.event!=='message');assert.equal(received.message,content);
 const history=await (await fetch(`${origin}/${topic}/json?poll=1&since=all`,{signal:abort.signal})).text();
 assert(history.split('\n').filter(Boolean).map(JSON.parse).some(value=>value.message===content));
 console.log(JSON.stringify({checkedAt:new Date().toISOString(),passed:true,checks:['anonymous publisher to connected anonymous subscriber','unrelated anonymous request can read topic history','configured expiry is 3600 seconds','login, signup, calls, email and browser Web Push disabled'],limits:['topic names are not authentication','server receives plaintext','cleanup may lag expiry','mobile background delivery not tested'],syntheticMessages:1}));
} finally {await reader?.cancel().catch(()=>{});abort.abort();clearTimeout(timeout);}
