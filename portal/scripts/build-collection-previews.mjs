/* global URL, document, console */
// Build-time only: original share graphics from the maintained collection copy.
// Existing Playwright; no asset service, app screenshots or runtime dependency.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { scenarioCollections } from '../src/pages/scenario-collection-data.ts';

const root = new URL('../', import.meta.url);
const data = async (path, type) => `data:${type};base64,${(await readFile(new URL(path, root))).toString('base64')}`;
const escape = value => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const font = await data('node_modules/@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-wght-normal.woff2', 'font/woff2');
const display = await data('node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2', 'font/woff2');
const logo = await data('public/brand/svg/utilibre-logo-coral.svg', 'image/svg+xml');
const image = await data('public/examples/fictional-image.jpg', 'image/jpeg');
const palette = (await readFile(new URL('src/styles/main.css', root), 'utf8')).match(/:root \{([\s\S]*?)\}/)[1];
await mkdir(new URL('public/previews/', root), { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.route(/^https?:/, route => route.abort());
  for (const collection of scenarioCollections) for (const language of ['en', 'es']) {
    const es = language === 'es';
    let example;
    if (collection.id === 'documents') example = `<img class="sample" src="${image}" alt=""><p>1200 × 800 → 600 × 400</p>`;
    else if (collection.id === 'workshop') example = `<ol>${(es ? ['Antes: elegí un tema', 'Durante: practicá en grupo', 'Después: guardá los apuntes'] : ['Before: choose a topic', 'During: practise together', 'After: save the notes']).map(s => `<li>${escape(s)}</li>`).join('')}</ol>`;
    else example = (es ? [['Lectura', 12], ['Práctica', 8], ['Debate', 6]] : [['Reading', 12], ['Practice', 8], ['Discussion', 6]]).map(([label, value]) => `<div class="row"><span>${label}</span><div class="bar" style="width:${value * 13}px"></div><b>${value}</b></div>`).join('');
    await page.setContent(`<!doctype html><html lang="${language}"><meta charset="utf-8"><style>
      @font-face{font-family:Body;src:url(${font})} @font-face{font-family:Display;src:url(${display})}
      :root{${palette}} *{box-sizing:border-box} body{margin:0;background:var(--paper);color:var(--ink);font-family:Body,sans-serif;padding:48px;}
      header{display:flex;align-items:center;justify-content:space-between;padding-bottom:24px;border-bottom:2px solid var(--ink);font-size:20px} header img{width:180px}
      main{display:grid;grid-template-columns:1.5fr 1fr;gap:40px;align-items:center;margin-top:36px}
      h1{font:600 58px/1.08 Display,serif;letter-spacing:-.025em;margin:0 0 24px} p{font-size:24px;line-height:1.4;margin:12px 0}
      figure{margin:0;border-block:1px solid var(--rule);padding:24px 0} figcaption{font-size:18px;line-height:1.4;margin-top:20px;color:var(--ink-soft)} .sample{display:block;width:100%;max-height:205px;object-fit:contain;object-position:left}
      ol{font-size:24px;line-height:1.4;padding-left:26px} li{margin:12px 0} .row{display:flex;align-items:center;gap:12px;margin:20px 0;font-size:22px} .row span{width:112px;flex-shrink:0}.bar{height:20px;background:var(--lichen)} b{font-variant-numeric:tabular-nums}
      footer{font-size:19px;margin-top:28px;color:var(--ink-soft)}
      </style><header><img src="${logo}" alt="Utilibre"><span>utilibre.org</span></header><main><section><h1>${escape(collection.title[language])}</h1><p>${escape(collection.description[language])}</p><footer>${es ? 'Herramientas gratuitas · Guía y archivo de práctica' : 'Free tools · Guide and practice file'}</footer></section><figure>${example}<figcaption>${es ? 'Ejemplo ficticio para practicar. No es una captura de la aplicación.' : 'Fictional practice example. Not an application screenshot.'}</figcaption></figure></main></html>`);
    await page.evaluate(() => document.fonts.ready);
    if (await page.evaluate(() => document.documentElement.scrollHeight > 630)) throw Error(`Preview overflow: ${collection.id}/${language}`);
    const file = new URL(`public/previews/collection-${collection.id}-${language}.png`, root);
    await page.screenshot({ path: file.pathname });
    await writeFile(new URL(`${file.href}.json`), JSON.stringify({ prompt: 'Original Utilibre share graphic rendered by scripts/build-collection-previews.mjs from maintained collection copy and fictional local practice data. Not an upstream UI screenshot. Existing Utilibre identity and self-hosted OFL fonts; documents graphic reuses examples/fictional-image.jpg with its existing provenance. No remote assets or visitor data.', language, collection: collection.id }, null, 2) + '\n');
  }
} finally { await browser.close(); }
console.log('Built six local 1200×630 collection previews; no network assets.');
