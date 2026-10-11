// Only the named synthetic task outputs, never saved account exports.
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const from='/opt/utilibre/reports/creative-batch-20261011/',to='/home/ubuntu/freetools/portal/public/examples/';
const plan=JSON.parse(readFileSync(from+'floorplan-practice.json'));assert.equal(plan.floors[0].walls.length,3);plan.name='Fictional practice plan / Plano ficticio';writeFileSync(to+'floorplan-practice.json',JSON.stringify(plan,null,2)+'\n');
const model=JSON.parse(readFileSync(from+'blockbench-practice.bbmodel'));assert.equal(model.elements[0].name,'Fictional cube');writeFileSync(to+'blockbench-practice.bbmodel',JSON.stringify(model,null,2)+'\n');
const diagram=JSON.parse(readFileSync(from+'fossflow-practice.json'));assert.equal(diagram.views[0].rectangles.length,1);diagram.title='Fictional diagram / Diagrama ficticio';diagram.icons=[];writeFileSync(to+'fossflow-practice.json',JSON.stringify(diagram,null,2)+'\n');
const font=JSON.parse(readFileSync(from+'glyphr-practice.gs2'));assert.match(JSON.stringify(font),/Fictional Practice/);writeFileSync(to+'glyphr-practice.gs2',JSON.stringify(font,null,2)+'\n');
copyFileSync(from+'jscad-cube.stl',to+'practice-cube.stl');
console.log('Published only synthetic native examples; no account exports included.');
