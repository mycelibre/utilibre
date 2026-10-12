// Reuse the already validated native Gathio fixture, changing only this
// followup's evidence paths/names and removing the unrelated TIFF codec check.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {root,here,sha,read} from './common.mjs';
process.umask(0o077);
const original=fs.readFileSync(here+'../tiff-bookworm-followup/application.mjs','utf8');let body=original;
assert(body.includes("from './common.mjs'"));body=body.replace("from './common.mjs'",'from '+JSON.stringify(here+'common.mjs'));
assert(body.includes("from '../geospatial-followup/gdal-policy.mjs'"));body=body.replace("from '../geospatial-followup/gdal-policy.mjs'",'from '+JSON.stringify(here+'../geospatial-followup/gdal-policy.mjs'));
body=body.replace(",native=read(root+'/native.json')",'');
const start=body.indexOf('const codec='),end=body.indexOf("const name='maintenance-tiff-gathio-native'");assert(start>0&&end>start);
body=body.slice(0,start)+body.slice(end);
body=body.replaceAll('tiff_fixture','hdf5_fixture').replaceAll('tiff_reader','hdf5_reader').replaceAll('maintenance-tiff-gathio-native','maintenance-hdf5-gathio-native');
body=body.replace('codecInventoryUnchanged:true,eightCodecOldHeaderRoundtrips:true,','hdf5NativeRoundtrips:read(root+\'/stage.json\').oldHeaderNativeRoundtrips,');
assert(!body.includes('tiff-native')&&!body.includes('native.json'));
fs.mkdirSync(root+'/reused-fixtures',{recursive:true});const file=root+'/reused-fixtures/gathio-native.mjs';assert(!fs.existsSync(file));fs.writeFileSync(file,body);
fs.writeFileSync(root+'/reused-fixtures/provenance.json',JSON.stringify({date:new Date().toISOString(),source:here+'../tiff-bookworm-followup/application.mjs',originalSha256:sha(original),adaptedSha256:sha(body),changes:['evidence/helper paths','owned disposable fixture names','TIFF-only codec check replaced by previously passed HDF5/HL/netCDF/GDAL check'],databaseBehaviorUnchanged:true},null,2)+'\n');
execFileSync(process.execPath,[file],{stdio:'inherit',timeout:600000});
assert.equal(read(root+'/application.json').status,'passed');
