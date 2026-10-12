import assert from 'node:assert/strict';
const modules=Object.freeze({
  '--rsvg-tiff':'../penpot-native-followup/release-inputs.mjs',
  '--heif-alignment':'../penpot-heif-alignment/release-inputs.mjs',
});
export function followupInputModule(flag){
  if(flag===undefined)return null;
  assert(Object.hasOwn(modules,flag),'Unknown Penpot repair variant');
  return new URL(modules[flag],import.meta.url);
}
