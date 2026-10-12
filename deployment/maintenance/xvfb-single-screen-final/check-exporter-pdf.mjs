// Parameterize the established synthetic native export fixture; no new API.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
const directory=process.argv[2];
assert.match(directory,/^\/opt\/utilibre\/reports\/penpot-native-roundtrip-[a-z0-9_]+$/);
let source=fs.readFileSync(new URL('../penpot-2.18.3/check-exporter.mjs',import.meta.url),'utf8');
assert.equal(source.split("'~:type':'~:png'").length,2);
source=source.replace("'~:type':'~:png'","'~:type':'~:pdf'").replaceAll('Fictional PNG export','Fictional PDF export').replaceAll('Native PNG exporter','Native PDF exporter').replaceAll('exporter-response.json','exporter-pdf-response.json').replaceAll('fictional-rectangle.png','fictional-rectangle.pdf').replaceAll("directory+'/exporter.json'","directory+'/exporter-pdf.json'").replace("format:'PNG',width:240,height:160","format:'PDF'");
const png="assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(bytes.readUInt32BE(16),240);assert.equal(bytes.readUInt32BE(20),160);";
assert(source.includes(png));source=source.replace(png,"assert.equal(bytes.subarray(0,5).toString(),'\x25PDF-');assert(bytes.length>500);");
cp.execFileSync(process.execPath,['--input-type=module','-',directory],{input:source,stdio:['pipe','pipe','pipe'],timeout:120000});
