import assert from'node:assert/strict';
export function exporterBinding(report,stage){
 assert.equal(report.status,'passed');assert.equal(report.groups.length,1);const g=report.groups[0];assert.equal(g.status,'passed');assert.equal(g.rows.length,1);const row=g.rows[0];
 assert.equal(g.key,'penpot-single-screen');assert.equal(g.project,'utilibre-expanded');assert.equal(row.key,'penpot-single-screen');assert.equal(row.service,'penpot-exporter');assert.equal(row.name,stage.container);
 assert.equal(row.oldImage,stage.base);assert.equal(row.oldRef,stage.baseRef);assert.equal(row.newImage,stage.image);assert.equal(row.newRef,stage.candidate);
 // The established group release helper records completion at group level.
 // A future explicit child state must never contradict that completion.
 assert(row.status===undefined||row.status==='passed');assert(Number.isFinite(Date.parse(g.completedAt)));assert(Number.isFinite(Date.parse(report.completedAt)));return row;
}
