import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {io} from '/opt/utilibre/calendar-src/razzia/packages/web/node_modules/socket.io-client/build/esm-debug/index.js';
async function main(){
const reports=process.env.RAZZIA_CHECK_REPORTS||'/opt/utilibre/reports/new-services-20261009';
const dataRoot=process.env.RAZZIA_CHECK_DATA||'/opt/utilibre/razzia-data';
const base=process.env.RAZZIA_CHECK_URL||'https://quiz.utilibre.org';
const password=JSON.parse(fs.readFileSync(dataRoot+'/game.json','utf8')).managerPassword;
const fixture={id:'fictional-not-yet-created',subject:'Fictional workshop quiz',questions:[{type:'single',question:'Which number follows one?',answers:['Two','Five'],solutions:[0],cooldown:3,time:10}]};
assert.equal(fixture.subject,'Fictional workshop quiz');
const sockets=[];
const wait=(socket,event,predicate=()=>true,timeout=18000)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{socket.off(event,listener);reject(new Error('Timed out: '+event))},timeout);const listener=data=>{if(predicate(data)){clearTimeout(timer);socket.off(event,listener);resolve(data)}};socket.on(event,listener)});
const request=async(socket,emit,event,data,predicate)=>{const result=wait(socket,event,predicate);socket.emit(emit,data);return result};
async function client(){const s=io(base,{path:'/ws',transports:['websocket'],forceNew:true,reconnection:false,auth:{clientId:randomUUID()},extraHeaders:{'User-Agent':'Mozilla/5.0','Origin':'https://quiz.utilibre.org'}});sockets.push(s);s.events=[];s.onAny((event,data)=>s.events.push({event,data}));await wait(s,'connect');return s}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
try{
 const outsider=await client();
 await request(outsider,'manager:getConfig','manager:unauthorized');
 await request(outsider,'quizz:get','manager:unauthorized',fixture.id);
 await request(outsider,'results:get','manager:unauthorized','fictional-absent-result');
 const bad=await request(outsider,'manager:auth','manager:errorMessage','fictional-wrong-password');assert.equal(bad,'errors:manager.invalidPassword');
 const managers=[await client(),await client()];
 for(const s of managers)await request(s,'manager:auth','manager:config',password);
 const {id:placeholder,...definition}=fixture;fixture.id=(await request(managers[0],'quizz:save','quizz:saveSuccess',definition)).id;
 fs.writeFileSync(reports+'/razzia-check-state.json',JSON.stringify({originalQuizId:fixture.id,subject:fixture.subject,results:[]}),{mode:0o600});
 const nativeExport=await request(managers[0],'quizz:get','quizz:data',fixture.id);assert.equal(nativeExport.subject,fixture.subject);assert.deepEqual(nativeExport.questions,fixture.questions);
 const {id:discard,...copy}=nativeExport;copy.subject='Fictional isolated restore quiz';
 const imported=await request(managers[0],'quizz:save','quizz:saveSuccess',copy);assert(imported.id);
 fs.writeFileSync(reports+'/razzia-check-state.json',JSON.stringify({originalQuizId:fixture.id,importedQuizId:imported.id,subject:copy.subject,results:[]},null,2),{mode:0o600});
 const importedAgain=await request(managers[0],'quizz:get','quizz:data',imported.id);assert.deepEqual(importedAgain.questions,copy.questions);
 const rooms=[];const players=[];
 for(let n=0;n<2;n++){
  const room=await request(managers[n],'game:create','manager:gameCreated',imported.id);rooms.push(room);
  const player=await client();players.push(player);
  const pin=await request(player,'player:checkPin','player:checkPinResult',room.inviteCode);assert(pin.valid);
  const id=await request(player,'player:join','game:successRoom',room.inviteCode);assert.equal(id,room.gameId);
  await request(player,'player:login','game:successJoin',{gameId:id,data:{username:'Fictional guest '+(n+1)}});
 }
 assert.notEqual(rooms[0].gameId,rooms[1].gameId);assert.notEqual(rooms[0].inviteCode,rooms[1].inviteCode);
 await pause(100);
 for(let n=0;n<2;n++){
  const joins=managers[n].events.filter(x=>x.event==='manager:newPlayer').map(x=>x.data.username);
  assert.deepEqual(joins,['Fictional guest '+(n+1)]);
 }
 // A different authenticated manager must not start or kick participants in another room.
 const before=players[0].events.length;
 managers[1].emit('manager:startGame',{gameId:rooms[0].gameId});managers[1].emit('manager:kickPlayer',{gameId:rooms[0].gameId,playerId:players[0].id});
 await pause(250);assert.equal(players[0].events.length,before);
 // Nor can an unauthenticated socket take the manager reconnect role by knowing a room ID.
 const reset=await request(outsider,'manager:reconnect','game:reset',{gameId:rooms[0].gameId});assert.equal(reset,'errors:game.expired');
 const answerWaits=players.map(p=>wait(p,'game:status',x=>x.name==='SELECT_ANSWER'));
 managers.forEach((s,n)=>s.emit('manager:startGame',{gameId:rooms[n].gameId}));await Promise.all(answerWaits);
 const resultsWaits=players.map(p=>wait(p,'game:status',x=>x.name==='SHOW_RESULT'));
 const responseWaits=managers.map(p=>wait(p,'game:status',x=>x.name==='SHOW_RESPONSES'));
 players.forEach((s,n)=>s.emit('player:selectedAnswer',{gameId:rooms[n].gameId,data:{answerKeys:[n===0?0:1]}}));
 const results=await Promise.all(resultsWaits);await Promise.all(responseWaits);assert(results[0].data.correct);assert(!results[1].data.correct);assert(results[0].data.points>0);assert.equal(results[1].data.points,0);
 const finish=players.map(p=>wait(p,'game:status',x=>x.name==='FINISHED'));managers.forEach((s,n)=>s.emit('manager:showLeaderboard',{gameId:rooms[n].gameId}));await Promise.all(finish);
 const config=await request(managers[0],'manager:getConfig','manager:config');const own=config.results.filter(x=>x.subject===copy.subject);assert.equal(own.length,2);
 const resultIds=[];
 for(const meta of own){const data=await request(managers[0],'results:get','results:data',meta.id);assert.equal(data.players.length,1);assert.equal(data.questions.length,1);assert(['Fictional guest 1','Fictional guest 2'].includes(data.players[0].username));resultIds.push(meta.id)}
 fs.writeFileSync(reports+'/razzia-check-state.json',JSON.stringify({originalQuizId:fixture.id,importedQuizId:imported.id,subject:copy.subject,results:resultIds},null,2),{mode:0o600});
 const result={publicHttpsWebSockets:base.startsWith('https:'),unauthenticatedManagerQuizAndResultsDenied:true,wrongPasswordDenied:true,nativeQuizExportImport:true,twoSimultaneousRooms:true,participantsAndScoresIsolated:true,crossManagerRoomControlDenied:true,managerReconnectDeniedToOtherClient:true,nativePersistedResults:true,resultsExportButtonAvailable:false};
 fs.writeFileSync(reports+'/razzia-native.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 managers.forEach((s,n)=>{s.emit('manager:leave',{gameId:rooms[n].gameId});s.emit('manager:logout')});
}finally{await pause(100);sockets.forEach(s=>s.disconnect())}

}
main().catch(error=>{console.error(error);process.exitCode=1});
