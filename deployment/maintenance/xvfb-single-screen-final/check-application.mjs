// Reuse every existing two-account Penpot test, adding its native PDF variant.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
const root='/var/lib/utilibre-maintenance/xvfb-single-screen-final-20261012';
const manifest='/var/lib/utilibre-maintenance/native-final/penpot-single-screen.json';
fs.copyFileSync(root+'/application-manifest.json',manifest);
let source=fs.readFileSync(new URL('../check-penpot-2.18.3.mjs',import.meta.url),'utf8');
const point=" if(runtime)execFileSync('node',['deployment/maintenance/penpot-2.18.3/check-backend-media.mjs'";
assert.equal(source.split(point).length,2);
source=source.replace(point," execFileSync('node',['deployment/maintenance/xvfb-single-screen-final/check-exporter-pdf.mjs',metadata.report],{stdio:['ignore','pipe','pipe'],timeout:120000});\n"+point);
const result=cp.execFileSync(process.execPath,['--input-type=module','-','--manifest='+manifest],{input:source,encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:420000,maxBuffer:4*1024**2});
const receipt=JSON.parse(result);assert.equal(receipt.status,'passed');
fs.copyFileSync(receipt.report+'/fictional-rectangle.pdf',root+'/output/penpot-rectangle.pdf');
const qpdf=cp.execFileSync('docker',['exec','maintenance-xvfb-single-screen-20261012','sh','-ec','qpdf --check /output/penpot-rectangle.pdf && qpdf --show-npages /output/penpot-rectangle.pdf'],{encoding:'utf8'});
assert(qpdf.includes('No syntax or stream encoding errors found'));assert.equal(qpdf.trim().split('\n').at(-1),'1');
fs.writeFileSync(root+'/application.json',JSON.stringify({...receipt,date:new Date().toISOString(),nativePdfExport:true,pdfReopenedWithQpdf:true,pdfPages:1,productionChanged:false},null,2)+'\n');
console.log(JSON.stringify({...receipt,nativePdfExport:true,pdfPages:1}));
