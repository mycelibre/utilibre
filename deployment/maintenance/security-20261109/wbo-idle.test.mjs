import test from 'node:test';
import assert from 'node:assert/strict';
import {requireEmptyWhiteboard} from './wbo-idle.mjs';
test('only an explicitly empty store and no connections permits restart',()=>assert.deepEqual(requireEmptyWhiteboard({files:0,bytes:0},0),{files:0,bytes:0,connections:0}));
for(const [name,store,connections]of [
 ['saved board',{files:1,bytes:0},0],['saved bytes',{files:0,bytes:1},0],
 ['active connection',{files:0,bytes:0},1],['missing metadata',{},0],
 ['string metadata',{files:'0',bytes:0},0],['negative metadata',{files:-1,bytes:0},0],
 ['unexpected field',{files:0,bytes:0,names:[]},0],['missing connections',{files:0,bytes:0},undefined],
])test('rejects '+name,()=>assert.throws(()=>requireEmptyWhiteboard(store,connections)));
