// Exact signed host release only; these are not source-wide Xserver waivers.
import assert from 'node:assert/strict';
export const previous='2:21.1.16-1.3+deb13u4',current='2:21.1.25-1';
export const packages=['xserver-common','xvfb'];
export const pins={
 'xserver-common':{architecture:'all',old:'94bc0dcceeefabd4f706af19b3424de7f827758d0ebad5c18c52e73365d7f3ab',new:'d4bed7ebb791955cbec2338353b64d4bf926965b9c8239940aac995760ccaf52'},
 xvfb:{architecture:'amd64',old:'893d87bf159b6de077a929fc796a73c39f837d45310b2076e3eeebebb80552b6',new:'ede6ed7133b7e69e13afff9e5d33a7c047ab4fdb8ffef67ddd784b57c0d84d14'}
};
export const binary={old:'16667b1eaafbe0b09527c2152e45f81b4b8e977012281062fc2fb2427afa66ce',new:'a7b2f472eecc56e9cb87eeeaf11c94cae082df7ef895f032a80dd39e1d296cd5'};
export const fixes={
 'CVE-2026-88812':{commit:'c724006ee76fb002add50fcb4d97e8c96c279f09',sha256:'408b9e79be79c8eb345db437ffa02a52a66ea230c5de0e9be0becac0d81f28aa'},
 'CVE-2026-93521':{commit:'00ce692c7f6ea1900888a2a24aecf6cba5544ae1',sha256:'fc1f3ef5cee9e981910754629d139bd1d338817a6adc78fc3391abd7971484ab'},
 'CVE-2026-93523':{commit:'aa56160fa213d8767e7da0c076b5c8242703313b',sha256:'6bc56c5b09a3467da69b8d9a368740abac22fd8b926c01a88e6cafa6be0ebf33'}
};
export function simulationGate(text){
 assert.deepEqual(text.split('\n').filter(l=>l.startsWith('Inst ')).map(l=>l.split(' ')[1]).sort(),packages);
 assert(!/^Remv /m.test(text),'Package removal is outside scope');
 assert(text.split('\n').filter(l=>l.startsWith('Inst ')).every(l=>l.includes('('+current+' local-deb ')),'Only exact local packages');
 return true;
}
export function nativeGate(report,kind){
 assert(['old','new'].includes(kind));assert(report.passed&&report.productionChanged===false);
 assert.equal(report.label,kind==='old'?'baseline':'candidate');assert.equal(report.binarySha256,binary[kind]);
 const c=name=>report.checks.find(c=>c.name===name);
 assert(c('native-pixel-roundtrip')?.allPixelsMatch);
 assert(c('CVE-2026-93523')?.validModifierAccepted);
 assert.equal(c('CVE-2026-93523')?.invalidModifierRejected,kind==='new');
 assert.equal(c('CVE-2026-88812')?.serverSurvived,kind==='new');
 assert.equal(c('CVE-2026-88812')?.isolatedBaselineCrash,kind==='old');
 assert.equal(c('CVE-2026-88812')?.malformedFontRejected,kind==='new');
 assert.equal(c('RandR-provider-query')?.providers,0);
 assert.match(c('RandR-provider-query')?.limitation||'',/not reproduced/);
 return true;
}
export function eligible(i){return i?.status==='needs-review'&&i.scope==='host-os'&&i.artifact==='host-dpkg'&&i.type==='debian'&&packages.includes(i.package)&&i.installed===current&&Object.hasOwn(fixes,i.id)&&Array.isArray(i.containers)&&i.containers.length===0;}
