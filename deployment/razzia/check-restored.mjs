import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {io} from '/opt/utilibre/calendar-src/razzia/packages/web/node_modules/socket.io-client/build/esm-debug/index.js';
async function main(){
 const expected=JSON.parse(fs.readFileSync('/tmp/fixture.json','utf8'));
 const password=JSON.parse(fs.readFileSync('/app/config/game.json','utf8')).managerPassword;
 const socket=io('http://127.0.0.1:3001',{path:'/ws',transports:['websocket'],forceNew:true,reconnection:false,auth:{clientId:randomUUID()}});
 const wait=(event,predicate=()=>true)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Restore request timeout: '+event)),10000);const f=x=>{if(predicate(x)){socket.off(event,f);clearTimeout(timer);resolve(x)}};socket.on(event,f)});
 const request=async(emit,event,data)=>{const p=wait(event);socket.emit(emit,data);return p};
 try{
  await wait('connect');await request('manager:auth','manager:config',password);
  for(const id of [expected.originalQuizId,expected.importedQuizId]){const q=await request('quizz:get','quizz:data',id);assert(q.subject.startsWith('Fictional '));assert.equal(q.questions[0].question,'Which number follows one?')}
  for(const id of expected.results){const r=await request('results:get','results:data',id);assert.equal(r.subject,expected.subject);assert.equal(r.players.length,1);assert.equal(r.questions.length,1)}
  socket.emit('manager:logout');console.log(JSON.stringify({nativeManagerAuthentication:true,twoQuizDefinitionsRestored:true,twoFinishedResultsRestored:true,network:'none'}));
 }finally{socket.disconnect()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
