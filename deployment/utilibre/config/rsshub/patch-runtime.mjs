import { readFileSync, writeFileSync } from 'node:fs';

const bundlePath = '/app/dist/index.mjs';
const needle = 'atomlink:e.req.url,...a';
const replacement = 'atomlink:(()=>{let t=process.env.UTILIBRE_RSSHUB_PUBLIC_URL;if(!t)return e.req.url;let n=new URL(e.req.url),r=new URL(t);r.pathname=n.pathname;r.search=n.search;r.hash="";return r.href})(),...a';
const source = readFileSync(bundlePath, 'utf8');
const occurrences = source.split(needle).length - 1;

if (occurrences !== 1) {
  throw new Error(
    `Expected exactly one RSSHub atom-link patch point in ${bundlePath}; found ${occurrences}`,
  );
}

writeFileSync(bundlePath, source.replace(needle, replacement));
