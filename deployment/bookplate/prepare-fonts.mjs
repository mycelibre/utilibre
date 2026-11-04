// Preserve the existing self-hosted font bytes; remove only build-time fetching.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function prepareFonts(source){
 const here=new URL('.',import.meta.url).pathname,spec=JSON.parse(fs.readFileSync(here+'fonts.json'));
 const patch=here+'local-fonts.patch';
 assert.equal(sha(fs.readFileSync(patch)),spec.layoutPatchSha256);
 const layout=source+'/app/layout.tsx',current=sha(fs.readFileSync(layout));
 if(current!==spec.layoutAfterSha256){assert.equal(current,spec.layoutBeforeSha256,'Unexpected layout; no fuzzy patch');cp.execFileSync('git',['apply','--check',patch],{cwd:source,stdio:'pipe'});cp.execFileSync('git',['apply',patch],{cwd:source,stdio:'pipe'});}
 assert.equal(sha(fs.readFileSync(layout)),spec.layoutAfterSha256);
 const css=fs.readFileSync(here+'fonts.css');assert.equal(sha(css),spec.cssSha256);if(fs.existsSync(source+'/app/fonts.css'))assert.equal(sha(fs.readFileSync(source+'/app/fonts.css')),spec.cssSha256);fs.writeFileSync(source+'/app/fonts.css',css);
 fs.mkdirSync(source+'/public/utilibre-fonts',{recursive:true});
 for(const [name,hash]of Object.entries(spec.files)){assert(/^[A-Za-z0-9_.-]+$/.test(name));const bytes=fs.readFileSync(here+'fonts/'+name),target=source+'/public/utilibre-fonts/'+name;assert.equal(sha(bytes),hash);if(fs.existsSync(target))assert.equal(sha(fs.readFileSync(target)),hash);fs.writeFileSync(target,bytes);}
 return spec;
}
