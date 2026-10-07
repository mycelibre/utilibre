import { mkdir, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';

// Deterministic, synthetic single-page PDFs. No document-processing dependency,
// embedded scripts, links, dates, tracking or real personal information.
const directory = new URL('../public/examples/', import.meta.url);
await mkdir(directory, { recursive: true });
for (const language of ['en', 'es']) for (const letter of ['A', 'B']) {
  const heading = `UTILIBRE ${language === 'es' ? 'EJEMPLO' : 'SAMPLE'} ${letter}`;
  const line = language === 'es' ? 'Documento ficticio. Sin datos personales.' : 'Synthetic document. No personal data.';
  const stream = `BT /F1 24 Tf 60 740 Td (${heading}) Tj 0 -48 Td /F1 14 Tf (${line}) Tj ET\n`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  await writeFile(new URL(`pdf-${language}-${letter.toLowerCase()}.pdf`, directory), pdf);
}
