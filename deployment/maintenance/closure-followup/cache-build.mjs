import fs from 'node:fs';
import {buildExactPackages} from '../js-closure/build.mjs';
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012';
const specs=JSON.parse(fs.readFileSync(new URL('./cache-specs.json',import.meta.url)));
for(const s of specs)if(s.key==='cache-expanded-actual')s.disableNpmBackgroundChecks=true;
const pins={'http-cache-semantics':{version:'4.3.0',integrity:'sha512-M5t5LlJpS1UHMjvwRQVdFHvPISGeLAxNcrWuJkeGh0KxsqCHZ1O3NXZU/8x7cD0BDcGW8kapxMKTvwlqrNkHkA=='}};
await buildExactPackages(specs,pins,dir+'/cache',process.argv.length>2?process.argv.slice(2):specs.map(s=>s.key));
