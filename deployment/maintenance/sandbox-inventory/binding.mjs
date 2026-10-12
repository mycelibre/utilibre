// Bind source findings to public runtime code and a fixed, non-secret config allowlist.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export const container='utilibre-records-grist-1';
const executable='/grist/sandbox/pyodide/worker/node_modules/@deno/linux-x64-glibc/deno';
export const expectedSettings={GRIST_SANDBOX_FLAVOR:'pyodide',GRIST_PYODIDE_SKIP_DENO:'0',GRIST_SANDBOX:'/usr/local/bin/grist-deno',GRIST_SANDBOX2:'',GRIST_SANDBOX3:'',GRIST_TEST_SANDBOX_ARGS:'',GRIST_SANDBOX_APPEND_ARGS:''};
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function sandboxSettings(environment){
 assert(Array.isArray(environment));
 const result={};
 for(const [key,expected] of Object.entries(expectedSettings)){
  const matches=environment.filter(value=>typeof value==='string'&&value.startsWith(key+'='));
  assert(matches.length<=1,'Duplicate sandbox configuration');
  const value=matches.length?matches[0].slice(key.length+1):'';
  assert(value===expected,`Unexpected sandbox setting: ${key}`);result[key]=value;
 }
 return result;
}
export function validateBinding(binding,manifest,wrapper){
 assert.deepEqual(Object.keys(binding).sort(),['binarySha256','image','settings','wrapperSha256']);
 assert.match(binding.image,/^sha256:[a-f0-9]{64}$/);
 assert.equal(binding.binarySha256,manifest.binarySha256);
 assert.equal(binding.wrapperSha256,digest(wrapper));
 assert.deepEqual(binding.settings,expectedSettings);
 return binding;
}
export function boundLock(bytes,binding){
 // TOML comments do not change dependency resolution; they change review identity.
 return Buffer.concat([Buffer.from(`# Utilibre runtime binding: ${digest(JSON.stringify(binding))}\n`),bytes]);
}
export async function runtimeBinding(command){
 const manifest=JSON.parse(await readFile(new URL('./deno/provenance.json',import.meta.url),'utf8'));
 const wrapper=await readFile(new URL('../sandbox-final/grist-deno.sh',import.meta.url));
 const image=(await command('docker',['inspect',container,'--format','{{.Image}}'],30000)).trim();
 // Only these seven non-secret values leave this function; never log inspect output.
 const settings=sandboxSettings(JSON.parse(await command('docker',['inspect',container,'--format','{{json .Config.Env}}'],30000)));
 const hash=async file=>(await command('docker',['exec',container,'sha256sum',file],30000)).trim().split(/\s+/)[0];
 return validateBinding({image,wrapperSha256:await hash('/usr/local/bin/grist-deno'),binarySha256:await hash(executable),settings},manifest,wrapper);
}
