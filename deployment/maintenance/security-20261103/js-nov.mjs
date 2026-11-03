import fs from 'node:fs';import {buildExactPackages}from'../js-closure/build.mjs';
const inputs=JSON.parse(fs.readFileSync(new URL('./js-nov-inputs.json',import.meta.url)));
await buildExactPackages(inputs.rows,inputs.packages,'/var/lib/utilibre-maintenance/security-20261103/js-nov',process.argv.slice(2));
