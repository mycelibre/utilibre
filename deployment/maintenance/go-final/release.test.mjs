import {test} from 'node:test';
import assert from 'node:assert/strict';
import {establishedOnPort,canonical} from './release.mjs';
const head='sl local_address rem_address st tx_queue';
const row=(port,state)=>`0: 00000000:${port} 00000000:0000 ${state} 00000000:00000000`;
test('Galene aggregate gate distinguishes listener and active signaling, IPv4 and IPv6',()=>{assert.equal(establishedOnPort([head+'\n'+row('1F90','0A'),head],8080),0);assert.equal(establishedOnPort([head+'\n'+row('1F90','0A')+'\n'+row('1F90','01'),head+'\n'+row('1F90','01')],8080),2);});
test('unrelated HTTP and closed connections do not imply an active Galene session',()=>{assert.equal(establishedOnPort([head+'\n'+row('1F90','0A')+'\n'+row('1F90','06')+'\n'+row('0050','01')],8080),0);});
test('missing listener or malformed evidence fails closed',()=>{assert.throws(()=>establishedOnPort([head],8080));assert.throws(()=>establishedOnPort([''],8080));assert.throws(()=>establishedOnPort([head+'\nbroken'],8080));});
test('Compose object key ordering is irrelevant but command/array ordering is preserved',()=>{assert.deepEqual(canonical({env:{Z:2,A:1},command:['a','b']}),canonical({command:['a','b'],env:{A:1,Z:2}}));assert.notDeepEqual(canonical({command:['a','b']}),canonical({command:['b','a']}));});
