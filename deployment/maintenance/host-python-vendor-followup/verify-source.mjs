// Pin authentic stable inputs and prove no invented extraction implementation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='/var/lib/utilibre-maintenance/host-python-vendor-followup-20261012';
const pins={
 'setuptools_78.1.1-0.1.dsc':'d0425d9385c8ad1cd5635b222dd90e1964c03de4ed3b1484317e912f0aac7e39',
 'setuptools_78.1.1-0.1.debian.tar.xz':'cf74bf9817f5eba7bc9bfcfbdce16ec57ba89c38280e5004b97e7caa9e1c9361',
 'setuptools_78.1.1.orig.tar.gz':'fcc17fd9cd898242f6b4adfaca46137a9edef687f43e6f78469692a5e70d851d',
 'python3-setuptools-whl_78.1.1-0.1_all.deb':'0caf134e73ab90ffeaa5ce2529d73ea7d48078b2a9251ed9d1b7b514a61e9483',
 'upstream-3b16eec9.patch':'4332b4aee0c7d7d672b487dd666ede84d3520e0694e02be31ecbd36e0cddc4c8'
};
for(const [file,hash]of Object.entries(pins))assert.equal(createHash('sha256').update(fs.readFileSync(root+'/sources/'+file)).digest('hex'),hash);
const sourceIndex=fs.readFileSync(root+'/source-index.txt','utf8'),packageIndex=fs.readFileSync(root+'/package-index.txt','utf8');
for(const [file,hash]of Object.entries(pins))if(file.endsWith('.deb'))assert(packageIndex.includes('SHA256: '+hash));else if(!file.endsWith('.patch'))assert(sourceIndex.includes(hash));
const changes=text=>text.split('\n').filter(l=>/^[+-]/.test(l)&&!/^---|^\+\+\+/.test(l));
const upstream=fs.readFileSync(root+'/sources/upstream-3b16eec9.patch','utf8').split('diff --git a/jaraco/context/__init__.py')[1].split('diff --git ')[0];
const local=fs.readFileSync(new URL('./context.patch',import.meta.url),'utf8');
assert.deepEqual(changes(local),changes(upstream));
console.log('Stable source and rollback package hashes match authenticated indexes; vendored repair exactly matches upstream code edits.');
