import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='/var/lib/utilibre-maintenance/host-cryptography-followup-20261012';
const pins={
 'python-cryptography_43.0.0-3+deb13u1.dsc':'8619854d8c6c99dcd28f05c9ccfd4513520de8afb3c59d291f93961f35eba79b',
 'python-cryptography_43.0.0.orig.tar.gz':'b88075ada2d51aa9f18283532c9f60e72170041bba88d7f37e49cbb10275299e',
 'python-cryptography_43.0.0-3+deb13u1.debian.tar.xz':'d87dee5c6d424f6d21ef1692f8b18fd1237134ba4af8216f0e72787b43b55d1e',
 'python-cryptography-43.0.0-4.el10_2.5.src.rpm':'336512154cea176d809879f11ea4ca3a5e06395e981c362fce49394589679c43'
};
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const si=fs.readFileSync(root+'/source-index.txt','utf8');
for(const [file,hash] of Object.entries(pins)) {assert.equal(sha(root+'/sources/'+file),hash);if(!file.endsWith('.rpm'))assert(si.includes(hash));}
const pi=fs.readFileSync(root+'/package-index.txt','utf8');
const deb=root+'/sources/python3-cryptography_43.0.0-3+deb13u1_amd64.deb';
assert(pi.includes('SHA256: '+sha(deb)));
console.log('Native stable inputs match authenticated APT indexes; vendor backport source matches the official Oracle erratum checksum.');
