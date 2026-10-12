// This CVE's tpm2daemon PKDECRYPT component only; not a GnuPG-source exemption.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export const current='2.4.7-21+deb13u1+dhi4';
export const pins={
 dirmngr:'1d2ad0386d34c8a1c29ff70753dcc8d830b1c4616a4694248284dcec2a3a09a4',
 'gnupg-l10n':'65c0b5b06123f81f08cfa9b0be313cbc9cf6255c550d70eabd8b175ce8928a35',
 'gnupg-utils':'65f4531b340cdfc5b4f3655f9f6224cfeb5a6d35cd0de4f71b26f126de8f8552',
 gnupg:'e68f0fd24a7a62f1112ae3e442564e134f21040492f11d1aefa7b18de93ebf6e',
 'gpg-agent':'84aeb783ab36f0a8d9f71a8df396abe45598f9d8b6717c9ca7a2d12950f6108c',
 'gpg-wks-client':'1b8ec005933345bb75e376101ac29d06baefd0ee8ef5e28122ed8ab52b074629',
 gpg:'b591b592d5c738a3b0cdd8923b850c293fdafe012e591882679b66647c82322c',
 gpgconf:'37fe956f80d998531c2d96eac03181552168ac1114adbae81f3270107db1b569',
 gpgsm:'e8bb97f3379b6b49f9d522965e2f8ba3fa016e4e7d3751ad99e8386d59a0ff9b',
 gpgv:'5b0c34bb3ad34671263730ab7af34ab48bab65fe635094eca44882694fa9b901'
};
export const version=p=>['gnupg','gnupg-l10n'].includes(p)?'2.4.7-21+deb13u1':current;
export const names=['utilibre-expanded-penpot-exporter-1','utilibre-expanded-penpot-frontend-1'];
export function eligible(i){return i?.id==='CVE-2026-24882'&&i.type==='debian'&&i.scope==='runtime-image'&&i.status==='needs-review'&&
 /^sha256:[a-f0-9]{64}$/.test(i.artifact)&&i.targetName===i.artifact&&Array.isArray(i.containers)&&i.containers.length===1&&names.includes(i.containers[0])&&
 Object.hasOwn(pins,i.package)&&(i.containers[0]===names[0]||i.package==='gpgv')&&
 (i.installed===version(i.package)||(i.package==='gpgv'&&i.installed==='2.4.7-21+deb13u1+dhi'+(i.containers[0]===names[0]?'3':'2')));}
export function prove(i,p){
 assert(eligible(i),'Finding outside the reviewed CVE/package/runtime scope');
 assert.equal(p.image,i.artifact);assert.equal(p.container,i.containers[0]);assert.equal(p.package,i.package);
 assert.equal(p.actualVersion,version(i.package));assert.equal(p.archiveSha256,pins[i.package]);
 assert.equal(p.authenticatedIndex,true);assert.equal(p.payloadExact,true);assert(p.fileCount>0);assert(/^[a-f0-9]{64}$/.test(p.inventorySha256));
 assert.equal(p.tpmInstalled,false);assert.deepEqual(p.tpmPaths,[]);assert.equal(p.tpmSearchComplete,true);
 if(i.installed!==p.actualVersion){assert.equal(i.package,'gpgv');assert.equal(p.residual?.version,i.installed);assert(/^[a-f0-9]{64}$/.test(p.residual.sha256));}
 return true;
}
