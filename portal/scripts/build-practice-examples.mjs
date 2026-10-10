// One-time authoring tool, not run in production or on page requests.
// Every image/document is synthetic; no screenshots or personal data.
/* global document, console */
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const out = new URL('../public/examples/', import.meta.url);
await mkdir(out, { recursive: true });
function rasterPdf(jpeg, w, h) {
  const stream = Buffer.from(`q ${w} 0 0 ${h} 0 0 cm /I Do Q\n`);
  const objects = [Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'), Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'), Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /I 4 0 R >> >> /Contents 5 0 R >>`), Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), jpeg, Buffer.from('\nendstream')]), Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`), stream, Buffer.from('endstream')])];
  const chunks = [Buffer.from('%PDF-1.4\n')], offsets = []; let size = chunks[0].length;
  for (const [i, o] of objects.entries()) { offsets.push(size); const b = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`), o, Buffer.from('\nendobj\n')]); chunks.push(b); size += b.length; }
  chunks.push(Buffer.from(`xref\n0 6\n0000000000 65535 f \n${offsets.map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${size}\n%%EOF\n`));
  return Buffer.concat(chunks);
}
function fictionalExif(jpeg) {
  const value = Buffer.from('UTILIBRE FICTIONAL EXAMPLE\0'); const t = Buffer.alloc(26 + value.length);
  t.write('II'); t.writeUInt16LE(42, 2); t.writeUInt32LE(8, 4); t.writeUInt16LE(1, 8);
  t.writeUInt16LE(0x013b, 10); t.writeUInt16LE(2, 12); t.writeUInt32LE(value.length, 14); t.writeUInt32LE(26, 18); value.copy(t, 26);
  const p = Buffer.concat([Buffer.from('Exif\0\0'), t]); const marker = Buffer.from([255, 225, 0, 0]); marker.writeUInt16BE(p.length + 2, 2);
  const provenance = Buffer.from('impeccable:prompt\0Origin: Utilibre fictional practice graphic, programmatically drawn with Canvas by portal/scripts/build-practice-examples.mjs on 2026-10-07. Geometric shapes and fictional Alex Example / SAMPLE-123 text; not a photograph or an application screenshot. No third-party image or personal data.');
  const comment = Buffer.from([255, 254, 0, 0]); comment.writeUInt16BE(provenance.length + 2, 2);
  return Buffer.concat([jpeg.subarray(0, 2), marker, p, comment, provenance, jpeg.subarray(2)]);
}
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const lang of ['en', 'es']) {
    const lines = lang === 'es' ? ['AVISO FICTICIO — PRÁCTICA', 'Taller de lectura', 'Nombre ficticio: María Ejemplo', 'Fecha ficticia: 12 de mayo de 2030', 'Cantidad: 24 libros', 'Revisá tildes, nombres y números.'] : ['FICTIONAL NOTICE — PRACTICE', 'Reading workshop', 'Fictional name: María Example', 'Fictional date: 12 May 2030', 'Quantity: 24 books', 'Check accents, names and numbers.'];
    const jpeg = Buffer.from(await page.evaluate(lines => { const c = document.createElement('canvas'); c.width = 1200; c.height = 720; const x = c.getContext('2d'); x.fillStyle = 'white'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#111'; x.font = '38px Arial'; lines.forEach((line, i) => x.fillText(line, 50, 95 + i * 100)); return c.toDataURL('image/jpeg', 0.96).split(',')[1]; }, lines), 'base64');
    await writeFile(new URL(`scan-${lang}.pdf`, out), rasterPdf(jpeg, 1200, 720));
    await writeFile(new URL(`study-${lang}.csv`, out), lang === 'es' ? 'Actividad,Horas\nLectura,12\nPráctica,8\nRepaso,6\n' : 'Activity,Hours\nReading,12\nPractice,8\nReview,6\n');
  }
  const image = Buffer.from(await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 1200; c.height = 800; const x = c.getContext('2d'); x.fillStyle = '#eee7d7'; x.fillRect(0, 0, 1200, 800); x.fillStyle = '#d85a30'; x.fillRect(60, 180, 450, 450); x.fillStyle = '#345d68'; x.beginPath(); x.arc(850, 410, 190, 0, Math.PI * 2); x.fill(); x.fillStyle = '#111'; x.font = '34px Arial'; x.fillText('FICTIONAL EXAMPLE / EJEMPLO FICTICIO', 40, 80); x.fillText('Name / Nombre: Alex Example', 80, 260); x.fillText('Code / Código: SAMPLE-123', 80, 320); x.fillText('Synthetic graphic, not an ID document or real photograph.', 40, 740); return c.toDataURL('image/jpeg', 0.96).split(',')[1]; }), 'base64');
  await writeFile(new URL('fictional-image.jpg', out), fictionalExif(image));
  await writeFile(new URL('transfer-example.txt', out), 'UTILIBRE: FICTIONAL PRACTICE FILE / ARCHIVO FICTICIO\nHello from the other device. / Hola desde el otro dispositivo.\nCheck that both lines are readable. / Revisá que ambas líneas sean legibles.\n');
  console.log('Authored two raster-only scans, two UTF-8 CSVs, a fictional graphic with synthetic EXIF, and a harmless transfer file.');
} finally { await browser.close(); }
