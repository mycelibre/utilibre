// Reuse the reviewed leaf overlay builder; preserve all other app/OS bytes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {buildExactPackages} from '../../js-closure/build.mjs';
const inputs = JSON.parse(fs.readFileSync(new URL('./inputs.json', import.meta.url)));
assert.equal(process.argv.length, 2);
await buildExactPackages([inputs.spec], inputs.packages,
  '/var/lib/utilibre-maintenance/releases-20261112/gathio', ['runtime']);
