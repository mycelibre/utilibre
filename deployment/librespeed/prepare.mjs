// Configure the complete upstream example UI; LibreSpeed performs all measurements.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
const [source, destination] = process.argv.slice(2);
if (!source || !destination) throw Error('Usage: node prepare.mjs PINNED_SOURCE OUTPUT');
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim();
if (revision !== '7bbfadeeed710500752496f952bbcfb66ab3bdb9') throw Error('Unexpected upstream revision');
const assets = join(resolve(source), 'web/assets');
const output = resolve(destination);
mkdirSync(output, { recursive: true });
for (const file of ['speedtest.js', 'speedtest_worker.js', 'favicon.ico']) copyFileSync(join(assets, file), join(output, file));
copyFileSync(join(source, 'LICENSE'), join(output, 'LICENSE.txt'));
const template = readFileSync(join(assets, 'example-singleServer-pretty.html'), 'utf8');
const requireReplace = (text, from, to) => {
  if (!text.includes(from)) throw Error(`Upstream UI changed: ${from.slice(0, 60)}`);
  return text.replace(from, to);
};
for (const lang of ['en', 'es']) {
  const es = lang === 'es';
  const label = es ? 'Medí tu conexión con Utilibre' : 'Test your connection to Utilibre';
  const start = es ? 'Iniciar prueba' : 'Start test';
  const stop = es ? 'Detener prueba' : 'Stop test';
  const ready = es ? 'La prueba no comienza hasta que la iniciés.' : 'The test starts only when you choose to start it.';
  let html = template.replace('<html>', `<html lang="${lang}">`).replace(', user-scalable=no', '').replaceAll('LibreSpeed Example', 'LibreSpeed · Utilibre');
  html = requireReplace(html, '<h1>LibreSpeed · Utilibre</h1>', `<nav><a href="https://utilibre.org/${lang}/">Utilibre</a> · <a href="/${es ? '' : 'es.html'}" lang="${es ? 'en' : 'es'}">${es ? 'English' : 'Español'}</a></nav>\n<h1>${label}</h1>\n<p class="explanation">${es ? 'LibreSpeed mide descarga, subida, latencia y su variación. Intercambia datos generados, no tus archivos. Puede consumir cientos de MB o varios GB: evitá iniciarlo con datos móviles limitados.' : 'LibreSpeed measures download, upload, latency and jitter. It exchanges generated data, not your files. A test can use hundreds of MB or several GB: avoid starting on a limited mobile-data plan.'}</p>\n<p class="explanation">${es ? 'Es una prueba breve hacia un servidor compartido, no una certificación de la velocidad de tu proveedor. No imponemos un límite de velocidad a la prueba. Otras pruebas, la distancia y la capacidad del servidor compartido pueden reducir el resultado.' : 'This is a short test to a shared server, not a certification of your ISP speed. The test is not speed-throttled. Other tests, distance and shared server capacity can still lower the result.'}</p>`);
  html = requireReplace(html, '<div id="startStopBtn" onclick="startStop()"></div>', `<button id="startStopBtn" type="button">${start}</button><p id="state" role="status">${ready}</p>`);
  html = html.replace(/\s*<div id="ipArea">[\s\S]*?<\/div>/, '');
  html = requireReplace(html, 'I("ip").textContent=data.clientIp;', '');
  html = requireReplace(html, 'I("ip").textContent="";', '');
  if (es) html = html.replace('>Download<', '>Descarga<').replace('>Upload<', '>Subida<').replace('>Ping<', '>Latencia<').replace('>Jitter<', '>Variación<');
  const init = `\n// Instance policy through the documented upstream parameter interface.\ns.setParameter("test_order", "P_D_U");\ns.setParameter("telemetry_level", "disabled");\ns.setParameter("getIp_ispInfo", false);\ns.setParameter("time_dl_max", 10);\ns.setParameter("time_ul_max", 10);\ns.setParameter("xhr_dlMultistream", 6);\ns.setParameter("xhr_ulMultistream", 3);\ns.setParameter("xhr_ul_blob_megabytes", 20);\ns.setParameter("garbagePhp_chunkSize", 32);\ns.setParameter("xhr_ignoreErrors", 0);\n`;
  html = requireReplace(html, 'var s=new Speedtest(); //create speedtest object', 'var s=new Speedtest(); //create speedtest object' + init);
  html = requireReplace(html, 'I("startStopBtn").className=""; //show start button again', `I("startStopBtn").className=""; //show start button again\n    I("startStopBtn").textContent=${JSON.stringify(start)};\n    I("state").textContent=aborted ? ${JSON.stringify(es ? 'Prueba detenida.' : 'Test stopped.')} : ${JSON.stringify(es ? 'Prueba terminada. Un valor cero o incompleto puede indicar un error o que el servicio está ocupado. Esperá y probá otra vez.' : 'Test finished. A zero or missing value can indicate an error or a busy service. Wait before trying again.')};`);
  html = requireReplace(html, 'I("startStopBtn").className="running";', `I("startStopBtn").className="running";\n        I("startStopBtn").textContent=${JSON.stringify(stop)};\n        I("state").textContent=${JSON.stringify(es ? 'Prueba en curso; podés detenerla.' : 'Test running; you can stop it.')};`);
  const scripts = [...html.matchAll(/<script type="text\/javascript">([\s\S]*?)<\/script>/g)].map(match => match[1]);
  html = html.replace(/<script type="text\/javascript">[\s\S]*?<\/script>/g, '');
  let css = html.match(/<style type="text\/css">([\s\S]*?)<\/style>/)[1];
  css = css.replace(/#startStopBtn(?::before|\.running:before)\{[\s\S]*?\}/g, '').replace('font-family:"Roboto",sans-serif;', 'font-family:system-ui,sans-serif;').replace('margin-bottom:12em;', 'margin-bottom:2em;').replace('font-size:1.5vw;', 'font-size:1rem;').replace('font-size:0.8em;', 'font-size:1rem;');
  css += '\n#startStopBtn{background:#a92323;color:#fff}#state{padding:0 1rem}.explanation{max-width:65ch;margin:1rem auto;padding:0 1rem}nav{padding:1rem}#startStopBtn{width:auto;padding:0 1rem;font:inherit;min-height:3rem}a:focus-visible,button:focus-visible{outline:3px solid currentColor;outline-offset:4px}\n';
  html = html.replace(/<style type="text\/css">[\s\S]*?<\/style>/, '<link rel="stylesheet" href="style.css">');
  html = requireReplace(html, '<a href="https://github.com/librespeed/speedtest">Source code</a>', `<p class="explanation">${es ? 'Sin cuenta ni historial de resultados en el servidor. Telemetría, identificación del proveedor y geolocalización desactivadas. La conexión sí comunica tu dirección IP a nuestra infraestructura.' : 'No account or server-side results history. Telemetry, ISP lookup and geolocation are disabled. Connecting still reveals your IP address to our infrastructure.'}</p>\n<p><a href="https://utilibre.org/${es ? 'es/guias/medir-conexion' : 'en/guides/test-connection'}">${es ? 'Guía y límites' : 'Guide and limits'}</a> · <a href="https://github.com/librespeed/speedtest-go">${es ? 'Código de LibreSpeed' : 'LibreSpeed source'}</a> · <a href="https://pdf.utilibre.org/utilibre-source/librespeed-utilibre.tar.gz">${es ? 'Código de esta versión' : 'This deployment’s source'}</a> · <a href="LICENSE.txt">LGPL-3.0-or-later</a></p>`);
  html = html.replace('</head>', `<meta name="description" content="${es ? 'Medí tu conexión con Utilibre usando LibreSpeed, sin cuenta ni historial de resultados.' : 'Test your connection to Utilibre with LibreSpeed, without an account or results history.'}">\n</head>`);
  html = html.replace('</body>', `<script src="ui-${lang}.js" defer></script>\n</body>`);
  writeFileSync(join(output, es ? 'es.html' : 'index.html'), html);
  writeFileSync(join(output, `ui-${lang}.js`), scripts.join('\n') + '\nI("startStopBtn").addEventListener("click", startStop);\n');
  writeFileSync(join(output, 'style.css'), css);
}
