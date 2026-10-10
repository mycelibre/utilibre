// Original CC0 fictional practice files, not a document-processing service.
// Open XML ZIP packaging uses the already installed upstream fflate dependency.
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {zipSync,strToU8}=require('/opt/utilibre/src/mapshaper/node_modules/fflate');
const root=new URL('../../portal/public/examples/',import.meta.url);
const xml=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const zip=files=>zipSync(Object.fromEntries(Object.entries(files).map(([k,v])=>[k,strToU8(v)])),{level:6});
for(const lang of ['en','es']) {
 const es=lang==='es', title=es?'Presupuesto ficticio':'Fictional budget';
 const names=es?['Concepto','Costo GTQ','Papel','Transporte','Refacción','Total']:['Item','Cost GTQ','Paper','Transport','Snacks','Total'];
 const cell=(ref,value)=>typeof value==='number'?`<c r="${ref}"><v>${value}</v></c>`:`<c r="${ref}" t="inlineStr"><is><t>${xml(value)}</t></is></c>`;
 const rows=[[names[0],names[1]],[names[2],24],[names[3],30],[names[4],18],[names[5],72]];
 const xlsx={
  '[Content_Types].xml':'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
  '_rels/.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  'xl/workbook.xml':`<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${title}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
  'xl/_rels/workbook.xml.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
  'xl/worksheets/sheet1.xml':`<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((r,i)=>`<row r="${i+1}">${cell('A'+(i+1),r[0])}${i===4?'<c r="B5"><f>SUM(B2:B4)</f><v>72</v></c>':cell('B'+(i+1),r[1])}</row>`).join('')}</sheetData></worksheet>`,
 };
 await writeFile(new URL(`budget-${lang}.xlsx`,root),zip(xlsx));
 const paras=es?['Plan ficticio de lectura','Tres voluntarios preparan una lectura comunitaria.','Objetivo: revisar un capítulo sobre ríos.','Responsable ficticia: Ana Ejemplo. No contiene datos personales reales.']:['Fictional reading plan','Three volunteers prepare a community reading.','Goal: review one chapter about rivers.','Fictional coordinator: Ana Example. Contains no real personal data.'];
 const docx={
  '[Content_Types].xml':'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  '_rels/.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  'word/document.xml':`<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paras.map(s=>`<w:p><w:r><w:t>${xml(s)}</w:t></w:r></w:p>`).join('')}<w:sectPr/></w:body></w:document>`,
 };
 await writeFile(new URL(`document-${lang}.docx`,root),zip(docx));
 await writeFile(new URL(`document-${lang}.md`,root),`# ${paras[0]}\n\n${paras.slice(1).join('\n\n')}\n`);
 const columns=es?['Por hacer','En curso','Terminado']:['To do','In progress','Done'];
 const tasks=es?['Elegir un capítulo','Preparar tres preguntas','Compartir un resumen']:['Choose a chapter','Prepare three questions','Share a summary'];
 const kanban={list:[11,12,13],data:Object.fromEntries(columns.map((title,i)=>[String(11+i),{id:11+i,title,item:i===0?[1,2,3]:[]} ])),items:Object.fromEntries(tasks.map((title,i)=>[String(i+1),{id:i+1,title}]))};
 await writeFile(new URL(`community-${lang}.json`,root),JSON.stringify(kanban,null,2)+'\n');
 const event=es?'Lectura comunitaria ficticia':'Fictional community reading';
 const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Utilibre//CC0 fictional practice//EN','BEGIN:VEVENT',`UID:fictional-community-${lang}@utilibre.org`,'DTSTAMP:20261008T000000Z','DTSTART:20300513T000000Z','DTEND:20300513T010000Z',`SUMMARY:${event}`,es?'DESCRIPTION:Solo práctica ficticia. 12 mayo 2030 18:00 America/Guatemala.':'DESCRIPTION:Fictional practice only. 12 May 2030 18:00 America/Guatemala.','END:VEVENT','END:VCALENDAR',''];
 await writeFile(new URL(`community-${lang}.ics`,root),ics.join('\r\n'));
 await writeFile(new URL(`slides-${lang}.md`,root),es?'# Lectura comunitaria ficticia\n\nTres personas, un capítulo.\n\n---\n\n# Plan\n\n- Leer sobre ríos\n- Compartir tres preguntas\n- Guardar un resumen\n\n---\n\n# Siguiente paso\n\nElegí una fecha real con tu grupo.\n':'# Fictional community reading\n\nThree people, one chapter.\n\n---\n\n# Plan\n\n- Read about rivers\n- Share three questions\n- Save a summary\n\n---\n\n# Next step\n\nChoose a real date with your group.\n');
 const outline=es?'# Lectura ficticia\n## Preparar\n- Elegir un capítulo\n## Conversar\n- Tres preguntas\n## Conservar\n- Exportar el resumen':'# Fictional reading\n## Prepare\n- Choose a chapter\n## Discuss\n- Three questions\n## Keep\n- Export the summary';
 await writeFile(new URL(`cryptpad-outline-${lang}.md`,root),'```markmap\n'+outline+'\n```\n\n```mermaid\ngraph LR\n  A['+(es?'Leer':'Read')+'] --> B['+(es?'Conversar':'Discuss')+']\n```\n\n```mathjax\n2 + 2 = 4\n```\n');
}
console.log('Created original EN/ES office, Kanban, calendar and Markdown examples; actual-app import is a separate gate.');
