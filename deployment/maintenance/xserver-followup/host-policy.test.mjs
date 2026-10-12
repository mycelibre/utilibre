import test from 'node:test';
import assert from 'node:assert/strict';
import {current,binary,simulationGate,nativeGate,eligible} from './host-policy.mjs';
const simulation=['Inst xserver-common [old] ('+current+' local-deb [all])','Inst xvfb [old] ('+current+' local-deb [amd64])'].join('\n');
test('exact two native packages only',()=>assert(simulationGate(simulation)));
for(const [name,change]of [
 ['libc upgrade',s=>s+'\nInst libc6 [old] (next local-deb [amd64])'],
 ['removal',s=>s+'\nRemv libc6 [old]'],
 ['wrong version',s=>s.replaceAll(current,'2:21.1.26-1')],
 ['remote substitute',s=>s.replaceAll('local-deb','Debian:unstable')],
 ['incomplete upgrade',s=>s.split('\n')[0]]
])test('reject '+name,()=>assert.throws(()=>simulationGate(change(simulation))));
const finding={status:'needs-review',scope:'host-os',artifact:'host-dpkg',type:'debian',package:'xvfb',installed:current,id:'CVE-2026-88812',containers:[]};
test('exact host finding',()=>assert(eligible(finding)));
for(const [name,patch]of Object.entries({old:{installed:'2:21.1.16-1.3+deb13u4'},container:{scope:'runtime-image'},artifact:{artifact:'sha256:other'},DHI:{installed:current+'+dhi1'},unprovedCVE:{id:'CVE-2023-5574'},otherPackage:{package:'xserver-xorg-core'},containerNames:{containers:['penpot']},alreadyReviewed:{status:'mitigated'}}))test('reject finding '+name,()=>assert(!eligible({...finding,...patch})));
const proof={label:'candidate',passed:true,productionChanged:false,binarySha256:binary.new,checks:[{name:'native-pixel-roundtrip',allPixelsMatch:true},{name:'CVE-2026-93523',validModifierAccepted:true,invalidModifierRejected:true},{name:'CVE-2026-88812',serverSurvived:true,isolatedBaselineCrash:false,malformedFontRejected:true},{name:'RandR-provider-query',providers:0,limitation:'Native provider mutation is not reproduced.'}]};
test('native proof',()=>assert(nativeGate(proof,'new')));
for(const [name,patch]of Object.entries({wrongBytes:{binarySha256:binary.old},falseLabel:{label:'baseline'},incomplete:{checks:proof.checks.slice(1)},failure:{passed:false},mutatedProduction:{productionChanged:true}}))test('reject native '+name,()=>assert.throws(()=>nativeGate({...proof,...patch},'new')));
