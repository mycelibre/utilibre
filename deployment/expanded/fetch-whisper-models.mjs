import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
const root = '/opt/utilibre/expanded-src/whisper/public/models';
const revisions = {
  'whisper-tiny': '5332fcc35e32a33b86612b9a57a89be7906102b1',
  'whisper-tiny.en': '79fb389fc764e7c395bd330e9531d9d32ada7049',
};
const files = ['README.md', 'config.json', 'generation_config.json', 'preprocessor_config.json',
  'tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json', 'added_tokens.json',
  'normalizer.json', 'merges.txt', 'vocab.json',
  'onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx'];
const manifest = [];
for (const [model, revision] of Object.entries(revisions)) {
  for (const name of files) {
    const url = `https://huggingface.co/Xenova/${model}/resolve/${revision}/${name}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${model}/${name}: ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    const path = `${root}/Xenova/${model}/${name}`;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
    manifest.push({ model, revision, file: name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    console.log(`${model}/${name}: ${bytes.length} bytes`);
  }
}
await writeFile(`${root}/manifest.json`, JSON.stringify(manifest, null, 2));
await writeFile(`${root}/LICENSE.txt`, await readFile('/usr/share/common-licenses/Apache-2.0'));
