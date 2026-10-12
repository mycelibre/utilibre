#!/usr/bin/env node
// Reuse the established native application fixtures unchanged, adapting only
// their evidence/spec paths and temporary names for this exact library overlay.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
process.umask(0o077);
const here=new URL('.',import.meta.url).pathname,spec=JSON.parse(fs.readFileSync(here+'spec.json')),w=spec.work;
const sha=b=>createHash('sha256').update(b).digest('hex');
const kind=process.argv[2];assert(['native','rssbridge'].includes(kind));
const file=kind==='native'?'app-checks.mjs':'rssbridge-check.mjs';
const upstream=new URL('../openssl-bookworm-followup/',import.meta.url).pathname;
const original=fs.readFileSync(upstream+file,'utf8');let text=original;
assert(text.includes("'/var/lib/utilibre-maintenance/openssl-bookworm-followup-20261012'"));
text=text.replace("'/var/lib/utilibre-maintenance/openssl-bookworm-followup-20261012'",JSON.stringify(w));
assert(text.includes("here=new URL('.',import.meta.url).pathname"));
text=text.replace("here=new URL('.',import.meta.url).pathname",'here='+JSON.stringify(upstream));
assert(text.includes("here+'specs.json'"));text=text.replace("here+'specs.json'",JSON.stringify(here+'bases.json'));
text=text.replaceAll('maintenance-bookworm-openssl-','maintenance-openldap-').replaceAll('maintenance-openssl-rssbridge-fixture','maintenance-openldap-rssbridge-fixture');
fs.mkdirSync(w+'/reused-fixtures',{recursive:true});
const target=w+'/reused-fixtures/'+file;assert(!fs.existsSync(target),'Do not replace an executed fixture');
fs.writeFileSync(target,text);
fs.writeFileSync(target+'.provenance.json',JSON.stringify({date:new Date().toISOString(),upstream:upstream+file,upstreamSha256:sha(original),adaptedSha256:sha(text),changes:['evidence directory','catalogue spec path','original fixture asset directory','disposable names'],applicationBehaviorUnchanged:true},null,2)+'\n');
execFileSync(process.execPath,[target],{stdio:'inherit',timeout:600000});
