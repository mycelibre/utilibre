// Individually reviewed CNA records. Never a waiver for an executable kernel.
import assert from 'node:assert/strict';
import {sha} from './policy.mjs';
import {kernelComponentPaths,headerOverlap} from '../closure-followup/headers-policy.mjs';
export const commit='22921fa4dfe759764079680278da003992219f75';
export const records={
 'CVE-2026-98260':{sha256:'fa70c7d32d128ca3ced32488a0d72540868ecad57286e8122193e60a152990e6',paths:['fs/exec.c'],tokens:['de_thread','posix_cpu_timers_exit']},
 'CVE-2022-50240':{sha256:'a9efe408f15503529c18ce9ac53d37b390d441e220c8825c3d146411259c6bda',paths:['drivers/android/binder_alloc.c','drivers/android/binder_alloc.h','drivers/android/binder_alloc_selftest.c'],tokens:['binder_update_page_range']},
 'CVE-2022-50350':{sha256:'085484d8179130da67b405abd1afcf46878d248ad8c310f871b3f5435d3c5f8c',paths:['drivers/target/iscsi/iscsi_target_nego.c'],tokens:['iscsi_target_do_login_rx']},
 'CVE-2023-53187':{sha256:'9d435691f2ea98282462a62dedcd95466409e9a0819580e324a846dcd5dd091f',paths:['fs/btrfs/block-group.c','fs/btrfs/block-group.h'],tokens:['btrfs_mark_bg_unused']},
 'CVE-2025-39800':{sha256:'c0fcd261c0f1bfabf7573a149a20f7fa2d2be41cb57737f0f6349fe42756faa1',paths:['fs/btrfs/ctree.c'],tokens:['btrfs_copy_root']},
};
export const tokens=Object.values(records).flatMap(r=>r.tokens);
const roles={
 'utilibre-kitchenowl-app-1':['6.12.111-1','7dac8811c08ac295bab6b658f3af27ee79d4d75864d7fa5cec3253a561d3837c'],
 'utilibre-linkding-linkding-1':['6.12.111-1','e6f8af4beda6ff30a5b2b121d552e47f412cdc4e65f98f3ec29a34f1913ff62a'],
 'utilibre-gathio-postgres-1':['6.1.187-1','e8f8f488d6895a90c87e3268cf256e3fc53e7a56de88eb9658cf2e5afc5ac891'],
};
export function eligible(i){
 if(i?.status!=='needs-review'||i.severity!=='HIGH'||i.package!=='linux-libc-dev'||!records[i.id]||!Array.isArray(i.containers)||i.targetName!==i.artifact)return false;
 if(i.scope==='host-os')return i.id==='CVE-2026-98260'&&i.type==='debian'&&i.artifact==='host-dpkg'&&i.installed==='6.12.111-1'&&i.containers.length===0;
 if(i.scope!=='runtime-image')return false;
 if(i.id==='CVE-2026-98260'){
  const r=roles[i.containers[0]];return i.containers.length===1&&i.type==='debian'&&r?.[0]===i.installed&&i.artifact==='sha256:'+r?.[1];
 }
 return i.type==='ubuntu'&&i.installed==='5.15.0-198.208'&&i.artifact==='sha256:fd27de8cc838e398183978ac4342b83fad4db46712c08ed5e4d05436d18ae15b'&&JSON.stringify([...i.containers].sort())===JSON.stringify(['utilibre-simplelogin-jobs-1','utilibre-simplelogin-smtp-1','utilibre-simplelogin-web-1']);
}
export function url(id){assert(records[id]);const[,y,n]=id.split('-');return `https://raw.githubusercontent.com/CVEProject/cvelistV5/${commit}/cves/${y}/${n.slice(0,-3)}xxx/${id}.json`;}
export function primary(id,bytes){
 assert(records[id]);assert.equal(sha(bytes),records[id].sha256,'Changed primary record');
 const paths=kernelComponentPaths(JSON.parse(bytes),id);assert.deepEqual(paths,records[id].paths);return paths;
}
export function noOverlap(id,inventory){
 assert(records[id]);assert(!headerOverlap(records[id].paths,inventory.records.map(r=>r.path)),'Ambiguous exported header overlap');
}
