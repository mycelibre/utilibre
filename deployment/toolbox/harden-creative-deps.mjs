// Integrity-pinned, same-major fixes; all other upstream lock entries unchanged.
import { readFileSync, writeFileSync } from 'node:fs';
const app = process.argv[2];
const pins = {
  dompurify: { version: '3.4.16', resolved: 'https://registry.npmjs.org/dompurify/-/dompurify-3.4.16.tgz', integrity: 'sha512-sqo+pNp3qRhCIpbgRi1y8Tgk27Bo2Ry7w0dC1NBeNTdZChWjz9Xb/KOoZbRP/R6pQZ80Qw8YhXw13hWWBbMRnQ==' },
  fflate: { version: '0.8.3', resolved: 'https://registry.npmjs.org/fflate/-/fflate-0.8.3.tgz', integrity: 'sha512-tbZNuJrLwGUp3zshBtdy4W+ORxZuIh8a5ilyIEQDC5rY1f3U20JMry0Ll3WBzU58EZKsEuJFXhb5gwv8CsPvgA==' },
};
if (app === 'svgedit') {
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  for (const [name, pin] of Object.entries(pins)) {
    const entry = lock.packages[`node_modules/${name}`];
    if (!entry) throw new Error(`Missing lock entry: ${name}`);
    Object.assign(entry, pin);
  }
  writeFileSync('package-lock.json', JSON.stringify(lock, null, 2) + '\n');
} else if (app === 'excalidraw') {
  const lock = readFileSync('yarn.lock', 'utf8');
  const pattern = /dompurify@\^3\.2\.5:\n  version "3\.3\.1"\n  resolved [^\n]+\n  integrity [^\n]+/;
  if (!pattern.test(lock)) throw new Error('DOMPurify lock drift');
  const p = pins.dompurify;
  writeFileSync('yarn.lock', lock.replace(pattern, `dompurify@^3.2.5:\n  version "${p.version}"\n  resolved "${p.resolved}"\n  integrity ${p.integrity}`));
} else throw new Error('Unknown application');
