// A build gate for the small static notice; no external requests or telemetry.
import { URL } from 'node:url';
import console from 'node:console';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const content = readFileSync(new URL('../public/.well-known/security.txt', import.meta.url), 'utf8');
const values = name => [...content.matchAll(new RegExp(`^${name}: (.+)$`, 'gm'))].map(match => match[1]);
assert.ok(values('Contact').length > 0, 'At least one working security contact is required');
for (const contact of values('Contact')) assert.ok(['mailto:', 'https:'].includes(new URL(contact).protocol));
assert.equal(values('Expires').length, 1);
const days = (Date.parse(values('Expires')[0]) - Date.now()) / 86400000;
assert.ok(days > 30 && days < 366, 'Review contact accuracy and renew security.txt: expiry must be 31–365 days away');
assert.equal(values('Preferred-Languages')[0], 'en, es');
assert.equal(values('Canonical')[0], 'https://utilibre.org/.well-known/security.txt');
assert.equal(values('Policy')[0], 'https://utilibre.org/en/security');
assert.equal(values('Encryption').length, 0, 'Do not advertise an unverified encryption key');
console.log('security.txt structure and renewal window passed; live targets are checked during release.');
