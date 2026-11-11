import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';

// Exercise the real CLI rejection path, before privileged tools or writes.
const cases=[
 ['retired Grid publisher','../../creative-batch/grid-publish.mjs',[],/Retired GridSpace/],
 ['unknown Grid flag','../../creative-batch/grid-publish.mjs',['--latest'],/Use --prepare-nov11/],
 ['conflicting portal profiles','../release-refresh-20261106/release-portal.mjs',['--apply','--upgrades','--stabilization'],/AssertionError/],
 ['old and new portal profiles','../release-refresh-20261106/release-portal.mjs',['--apply','--upgrades','--nov9'],/Choose one exact release profile/],
 ['wrong service in Wakapi profile','../release-refresh-20261106/release.mjs',['grist','--apply','--wakapi-nov11'],/AssertionError/],
 ['retired Candlr source publisher','../../records/publish-sources.mjs',[],/Retired Candlr source recipe/],
 ['retired Candlr source flag','../../records/publish-sources.mjs',['candlr','--candlr-nov4'],/Retired Candlr source recipe/],
 ['unknown held upgrade','../release-refresh-20261106/release.mjs',['grist','--apply','--held-nov11'],/AssertionError/],
 ['CryptPad requires explicit activation','./release-cryptpad-upgrade.mjs',[],/AssertionError/],
 ['CryptPad refuses extra activation flags','./release-cryptpad-upgrade.mjs',['--apply','--latest'],/AssertionError/],
 ['portal release profiles remain exclusive','../release-refresh-20261106/release-portal.mjs',['--apply','--upgrades','--held-upgrades'],/AssertionError/],
];
for(const [label,file,args,message]of cases)test(label,()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'utilibre-upgrade-boundary-'));
 try{
  const sentinel=dir+'/called';
  for(const binary of ['docker','curl','cp','tar'])fs.writeFileSync(dir+'/'+binary,'#!/bin/sh\n: > "$UTILIBRE_FORBIDDEN_CALL"\nexit 85\n',{mode:0o700});
  const result=cp.spawnSync(process.execPath,[new URL(file,import.meta.url).pathname,...args],{timeout:10000,encoding:'utf8',maxBuffer:65536,env:{PATH:dir+':/usr/bin:/bin',LANG:'C.UTF-8',UTILIBRE_FORBIDDEN_CALL:sentinel}});
  assert(!result.error);assert.notEqual(result.status,0);assert.match(result.stderr,message);
  assert(!fs.existsSync(sentinel),'Rejected request reached an external command');
 }finally{fs.rmSync(dir,{recursive:true});}
});
