// Build-time asset integration only. Playback/mixing remains Moodist's Howler UI.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const manifest = JSON.parse(await readFile(new URL('./moodist-recordings.json', import.meta.url), 'utf8'));
const root = process.argv[2];
if (!root || !/^[a-f0-9]{40}$/.test(manifest.commit)) throw Error('Supply the generated sounds directory');
const destination = path.join(root, 'recordings');
await mkdir(destination, { recursive: true });
const credits = [
  'Moodist on Utilibre: recording credits / Créditos de las grabaciones',
  '',
  `Audio collection: ${manifest.source}/tree/${manifest.commit}/data/resources/sounds`,
  `File-to-author mapping: ${manifest.source}/blob/${manifest.commit}/SOUNDS_LICENSING.md`,
  'Blanket supplied the edited Ogg loops. Utilibre redistributes them unchanged.',
  'Blanket proporcionó los bucles Ogg editados. Utilibre los distribuye sin cambios.',
  'These credits do not imply endorsement by the authors / Los créditos no implican el respaldo de los autores.',
  '',
  'CC BY 4.0: https://creativecommons.org/licenses/by/4.0/',
  'CC BY 3.0: https://creativecommons.org/licenses/by/3.0/',
  'CC0 1.0: https://creativecommons.org/publicdomain/zero/1.0/',
  'Public Domain: dedication shown on the linked original source page.',
  '',
];
for (const recording of manifest.recordings) {
  if (!/^[a-z-]+\.ogg$/.test(recording.file) || !/^[a-f0-9]{64}$/.test(recording.sha256)) throw Error('Invalid recording manifest');
  const file = path.join(destination, recording.file);
  let bytes;
  try { bytes = await readFile(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!bytes) {
    const response = await fetch(`https://raw.githubusercontent.com/rafaelmardojai/blanket/${manifest.commit}/data/resources/sounds/${recording.file}`, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw Error(`Recording unavailable: ${recording.file}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (bytes.length > 8 * 1024 * 1024 || createHash('sha256').update(bytes).digest('hex') !== recording.sha256) throw Error(`Recording checksum failed: ${recording.file}`);
  await writeFile(file, bytes);
  credits.push(`${recording.label} (${recording.file})`, `Author / Autor: ${recording.author}`, `License / Licencia: ${recording.license}`, `Original: ${recording.source}`, `Blanket edit / Edición en Blanket: ${recording.editor || 'No named editor / Sin editor identificado'}`, `SHA-256: ${recording.sha256}`, '');
}
await writeFile(path.join(root, 'RECORDING-CREDITS.txt'), credits.join('\n'));
await writeFile(path.join(root, 'recordings.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Verified ${manifest.recordings.length} locally hosted recordings.`);
