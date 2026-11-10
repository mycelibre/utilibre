import test from 'node:test';import assert from 'node:assert/strict';
import {boundRelaySockets} from './relay-idle.mjs';
const header='sl local_address rem_address st tx_queue rx_queue tr tm->when retrnsmt uid timeout inode';
const row=port=>`0: 00000000:${port.toString(16).padStart(4,'0')} 00000000:0000 07 0:0 00:0 0 0 0 123`;
test('relay guard counts both range endpoints and rejects unknown input',()=>{
 assert.equal(boundRelaySockets([header],49700,49731),0);
 assert.equal(boundRelaySockets([header+'\n'+row(49700)+'\n'+row(49731)+'\n'+row(49732)],49700,49731),2);
 assert.equal(boundRelaySockets([header+'\n'+row(3479),header+'\n'+row(49705)],49700,49731),1);
 assert.throws(()=>boundRelaySockets(['missing header'],1,2));
 assert.throws(()=>boundRelaySockets([header+'\nmalformed'],1,2));
 assert.throws(()=>boundRelaySockets([header],2,1));
});
