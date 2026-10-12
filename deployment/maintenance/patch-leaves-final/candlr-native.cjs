const assert=require('node:assert/strict');
(async()=>{
 const base='http://127.0.0.1:8000',password='Fictional-password-for-native-gate-2026';
 async function request(path,method='GET',body,cookie){return fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});}
 const cookies=[];for(const username of ['fictional_a','fictional_b']){const r=await request('/auth/register','POST',{username,email:username+'@example.com',password});assert.equal(r.status,201);cookies.push(r.headers.get('set-cookie').split(';')[0]);}
 const types=await(await request('/event-types','GET',null,cookies[0])).json();assert(types.length>0);
 const saved=await request('/people','POST',{name:'Fictional Sol Example',event:{event_type_id:types[0].id,month:11,day:14,year:2000,year_known:true,notify:false,notes:'Fictional local test'}},cookies[0]);assert.equal(saved.status,201);const person=await saved.json();
 assert.equal((await request('/people/'+person.id,'GET',null,cookies[1])).status,404);
 assert.equal((await request('/people/'+person.id)).status,401);
 const exported=await request('/data/export?format=json','GET',null,cookies[0]);assert(exported.ok);assert((await exported.text()).includes('Fictional Sol Example'));
 const del=await request('/people/'+person.id,'DELETE',null,cookies[0]);assert(del.ok);assert.equal((await request('/people/'+person.id,'GET',null,cookies[0])).status,404);
 console.log(JSON.stringify({twoAccounts:true,privateRecordCreate:true,secondAccountDenied:true,loggedOutDenied:true,nativeExport:true,deletion:true}));
})().catch(e=>{console.error('Synthetic Candlr gate failed: '+e.message);process.exit(1);});
