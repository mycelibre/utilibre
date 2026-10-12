const assert=require('node:assert/strict'),fs=require('node:fs');
const path=process.argv[2];assert(path&&path.endsWith('/adm-zip'));
assert.equal(JSON.parse(fs.readFileSync(path+'/package.json')).version,'0.6.1');
const Zip=require(path),zip=new Zip();
zip.addFile('fictional/nota.txt',Buffer.from('Datos ficticios: piñata 🙂\n'));
zip.addFile('fictional/data.csv',Buffer.from('label,count\nExample,3\n'));
const copy=new Zip(zip.toBuffer());
assert.equal(copy.readAsText('fictional/nota.txt'),'Datos ficticios: piñata 🙂\n');
assert.deepEqual(copy.getEntries().map(e=>e.entryName).sort(),['fictional/data.csv','fictional/nota.txt']);
copy.extractAllTo('/tmp/fixture-output',false);
assert.equal(fs.readFileSync('/tmp/fixture-output/fictional/data.csv','utf8'),'label,count\nExample,3\n');
// Native path normalization must not create a sibling file on extraction.
const traversal=new Zip();traversal.addFile('../not-outside.txt',Buffer.from('fictional'));
traversal.extractAllTo('/tmp/fixture-output',true);
assert(!fs.existsSync('/tmp/not-outside.txt'));
console.log(JSON.stringify({status:'passed',version:'0.6.1',utf8ZipRoundtrip:true,extraction:true,noParentTraversal:true}));
