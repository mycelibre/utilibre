// Reproducible, fail-closed privacy packaging of complete upstream applications.
// No processing engine is replaced. Sources and exact changes stay reviewable.
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const app = process.argv[2];
const roots = {
  mapshaper: { source: '/opt/utilibre/src/mapshaper', commit: '9e39193444f70a48eeffda20d8d44f82567e6d54', files: 'www', version: '0.7.80-p1' },
  numbat: { source: '/opt/utilibre/src/numbat', commit: '79046422203060e296da41c8c762c506200d2c93', files: '/opt/utilibre/build/numbat', version: '1.24.0-p1' },
  plan: { source: '/opt/utilibre/src/super-productivity', commit: '42ded9f31a132bf92633b0c78ad4ebf1d87c0f71', files: 'dist/browser', version: '19.1.0-p1' },
};
const cfg = roots[app];
if (!cfg) throw Error('Expected mapshaper, numbat or plan');
if (execFileSync('git', ['rev-parse', 'HEAD'], {cwd:cfg.source,encoding:'utf8'}).trim() !== cfg.commit) throw Error('Source revision changed; review patches');
const target = `/opt/utilibre/pack-static/${app}-${cfg.version}`;
await mkdir(target, {recursive:true});
await cp(path.resolve(cfg.source, cfg.files), target, {recursive:true});
async function replace(file, from, to) {
  const dest = path.join(target, file), source = await readFile(dest, 'utf8');
  if (!source.includes(from)) throw Error(`Upstream changed: ${file}`);
  await writeFile(dest, source.replace(from, to));
}
if (app === 'plan') {
  // Complete upstream production build; restrictive server CSP contains optional
  // cloud/plugin integrations. Do not start SuperSync or test databases.
  await cp(path.join(cfg.source,'LICENSE'),path.join(target,'LICENSE'));
  await cp(path.join(cfg.source,'dist/3rdpartylicenses.txt'),path.join(target,'3rdpartylicenses.txt'));
} else if (app === 'mapshaper') {
  // Native absence of mapboxParams disables all basemap controls.
  await writeFile(path.join(target,'basemap.js'), '// Remote basemaps intentionally disabled on Utilibre.\n');
  await replace('index.html', '<title>Mapshaper</title>', '<title>Mapshaper · Utilibre</title>');
  await replace('index.html', 'href="/docs/"', 'href="https://github.com/mbloch/mapshaper/wiki"');
  await replace('index.html', 'href="/docs/reference.html#-i-input"', 'href="https://github.com/mbloch/mapshaper/wiki/Command-Reference#-i-input"');
  // The upstream site's policy is not the policy of this deployment.
  for (const f of ['CNAME','privacy.html','terms.html']) await rm(path.join(target,f),{force:true});
  await cp(path.join(cfg.source,'LICENSE'),path.join(target,'LICENSE'));
} else {
  await replace('index.html', '    <link href="https://fonts.googleapis.com/css?family=Exo+2%7CFira+Mono:400,700&display=swap" rel="stylesheet">', '    <!-- System fonts: no external font requests. -->');
  await replace('index.html', 'content="https://numbat.dev/"', 'content="https://calc.utilibre.org/"');
  await replace('index.html', 'content="https://numbat.dev/numbat.png"', 'content="https://calc.utilibre.org/numbat.png"');
  await replace('index.html', '    <link rel="search" type="application/opensearchdescription+xml" href="/opensearch.xml" title="numbat.dev scientific calculator">', '');
  await replace('index.html', '<p class="links">', '<p>Calculations stay in this tab; reload clears them. Currency rates are unavailable.<br>Los cálculos quedan en esta pestaña; recargar los borra. No hay tasas de cambio.</p><button type="button" id="share-calculation">Create a readable sharing link / Crear un enlace legible</button><p><label for="share-link">Sharing link / Enlace para compartir</label><input id="share-link" readonly size="30"><span id="share-note" role="status"></span></p><p class="links"><a href="https://utilibre.org/">Utilibre</a> &bull; ');
  await replace('index.js', '    fetch_exchange_rates().then(setup);', '    setup(); // No remote rates or fallback.');
  // Delete the unused network function, rather than merely disabling its caller.
  const js = path.join(target,'index.js');
  let code = await readFile(js,'utf8');
  code = code.replace(/async function fetch_exchange_rates\(\) \{[\s\S]*?\n\}\n/, '');
  code = code.replace(/function updateUrlQuery\(query\) \{[\s\S]*?\n\}\n/, 'function updateUrlQuery() {} // Normal calculations never change the URL.\n');
  code = code.replace('historySize: 200,', 'history: false,\n            historySize: 0,');
  const start = code.indexOf('        // evaluate expression in query string');
  const end = code.indexOf('\n    });', start);
  if (start<0 || end<0) throw Error('Numbat input handler changed');
  code = code.slice(0,start) + `        // Shared input is visible but not automatically executed.
        const shared = new URLSearchParams(location.hash.slice(1)).get('code');
        if (shared && shared.length <= 8000) term.set_command(shared.split('⏎').join('\\n'));
        document.getElementById('share-calculation').addEventListener('click', () => {
            const field = document.getElementById('share-link');
            const note = document.getElementById('share-note');
            if (!combined_input || combined_input.length > 8000) {
                field.value = ''; note.textContent = 'Enter a short calculation first / Ingresá primero un cálculo corto'; return;
            }
            const link = new URL(location.origin + location.pathname);
            link.hash = new URLSearchParams({code: combined_input}).toString();
            field.value = link.href; field.focus(); field.select();
            note.textContent = ' Copy this link. Recipients and browser history can read its calculations. / Copiá este enlace. Quien lo reciba y el historial pueden leer los cálculos.';
        });` + code.slice(end);
  await writeFile(js,code);
  // PHP endpoint and query-based OpenSearch are not part of this static service.
  for (const f of ['ecb-exchange-rates.php','opensearch.xml']) await rm(path.join(target,f),{force:true});
  for(const f of ['LICENSE-APACHE','LICENSE-MIT']) await cp(path.join(cfg.source,f),path.join(target,f));
}
console.log(`Prepared ${app} ${cfg.version}: ${target}`);
