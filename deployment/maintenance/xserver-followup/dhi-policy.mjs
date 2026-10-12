// Exact vendor payload, one role, three source fixes. Never a source-wide waiver.
import assert from 'node:assert/strict';
import {fixes} from './host-policy.mjs';
export {fixes};
export const container='utilibre-expanded-penpot-exporter-1';
export const version='2:21.1.16-1.3+deb13u4+dhi1';
export const packages={
 xvfb:{architecture:'amd64',sha256:'e56da5700ca46d8d11e8dd6263402a0efc765ad1839c8745f199d9e9e0222ecf'},
 'xserver-common':{architecture:'all',sha256:'5af009adebec92e742e82218e5c4e681090f4c4e5bc023184b74e7bb911ba0af'},
};
export const binary='4deb01cc6c26ac9d69382f53038add1284be45adce34dbafa0059bd8c8372a24';
export const nativeHash='a12700f8c02ac78c111f75f8ce58197a652ecf81458539708aa03930306d00d8';
export const keyHash='6f3fec0bd867abb05443bf0487f27426815ce2fa5d75e1136021560518ce78f3';
export const releaseHash='661fe7f9e65176bf391782b78d9e226f9fe45f40e7753fc4e8c0d102c9cf7d23';
export const sourcePins={
 'xorg-server_21.1.16-1.3+deb13u4+dhi1.dsc':'2de4f027ca5fbe4128f249a2bbf48c9f152d7a70f1d6256b22481941dd7cdee7',
 'xorg-server_21.1.16-1.3+deb13u4+dhi1.tar.gz':'de89a475ad27c805cb0d576047fe30951b1478f9af62d9c496df36733986cd20',
};
export function eligible(i){return i?.status==='needs-review'&&i.scope==='runtime-image'&&i.type==='debian'&&
 /^sha256:[a-f0-9]{64}$/.test(i.artifact||'')&&i.targetName===i.artifact&&
 Array.isArray(i.containers)&&i.containers.length===1&&i.containers[0]===container&&
 Object.hasOwn(packages,i.package)&&i.installed===version&&Object.hasOwn(fixes,i.id);}
export function nativeGate(n){
 assert.equal(n.binarySha256,binary);assert.equal(n.passed,true);assert.equal(n.label,'candidate');assert.equal(n.productionChanged,false);
 const check=name=>n.checks.find(c=>c.name===name);
 assert.equal(check('native-pixel-roundtrip')?.allPixelsMatch,true);
 assert.equal(check('CVE-2026-93523')?.invalidModifierRejected,true);assert.equal(check('CVE-2026-93523')?.validModifierAccepted,true);
 assert.equal(check('CVE-2026-88812')?.malformedFontRejected,true);assert.equal(check('CVE-2026-88812')?.serverSurvived,true);
 assert.equal(check('CVE-2026-88812')?.isolatedBaselineCrash,false);
 assert.equal(check('RandR-provider-query')?.providers,0);assert.match(check('RandR-provider-query')?.limitation||'',/not reproduced/);
 return true;
}
