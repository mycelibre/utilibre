import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {io} from '/opt/utilibre/calendar-src/razzia/packages/web/node_modules/socket.io-client/build/esm-debug/index.js';
const r='/opt/utilibre/reports/new-services-20261009';const owned=JSON.parse(fs.readFileSync(r+'/razzia-check-state.json','utf8'));
const password=JSON.parse(fs.readFileSync('/opt/utilibre/razzia-data/game.json','utf8')).managerPassword;
const s=io('https://quiz.utilibre.org',{path:'/ws',transports:['websocket'],reconnection:false,auth:{clientId:randomUUID()},extraHeaders:{'User-Agent':'Mozilla/5.0','Origin':'https://quiz.utilibre.org'}});
const wait=event=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Cleanup timeout: '+event)),10000);s.once(event,data=>{clearTimeout(timer);resolve(data)})});
const request=async(emit,event,data)=>{const p=wait(event);s.emit(emit,data);return p};
try{
 await wait('connect');await request('manager:auth','manager:config',password);
 for(const id of owned.results){const record=await request('results:get','results:data',id);assert.equal(record.subject,owned.subject);assert.equal(record.players.length,1);assert(record.players[0].username.startsWith('Fictional guest '));const c=await request('results:delete','manager:config',id);assert(!c.results.some(x=>x.id===id))}
 for(const id of [owned.originalQuizId,owned.importedQuizId]){const quiz=await request('quizz:get','quizz:data',id);assert(['Fictional workshop quiz',owned.subject].includes(quiz.subject));assert.equal(quiz.questions[0].question,'Which number follows one?');const c=await request('quizz:delete','manager:config',id);assert(!c.quizz.some(x=>x.id===id))}
 s.emit('manager:logout');fs.writeFileSync(r+'/razzia-cleanup.json',JSON.stringify({nativeQuizAndResultsDeletion:true,onlyKnownFictionalIds:true,ownedFixturesAbsent:true},null,2));console.log('Native deletion confirmed for only the two owned quizzes and two owned results.');
}finally{s.disconnect()}
