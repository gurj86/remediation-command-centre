const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const adapter=require('../dist/respond-adapter.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../dist/analytics.json'),'utf8'));
const fixture=adapter.fixture(data.cases);
const result=adapter.validateBatch(fixture,data.as_of);
assert.equal(result.input,15);
assert.equal(result.accepted.length,12);
assert.equal(result.rejected.length,3);
assert.equal(result.reconciled,true);
assert.ok(result.rejected.some(r=>r.errors.some(e=>e.includes('Duplicate'))));
assert.ok(result.rejected.some(r=>r.errors.some(e=>e.includes('Missing'))));
assert.ok(result.rejected.some(r=>r.errors.some(e=>e.includes('non-negative'))));
assert.equal(result.totals.redress,data.cases.slice(0,12).reduce((n,c)=>n+c.redress,0));
assert.equal(result.totals.sampled,data.cases.slice(0,12).filter(c=>c.qa_result!=='Not sampled').length);
assert.deepEqual(result.accepted[0],adapter.canonical(adapter.sourceRecord(data.cases[0])));
const clean=adapter.validateBatch(adapter.fixture(data.cases,false),data.as_of);
assert.equal(clean.rejected.length,0);
const s=adapter.sourceRecord(data.cases[0]);
for(const patch of [{DateReceived:'2026-10-01'},{DateReceived:'2026-02-30'},{RootCauseTheme:'Not mapped'},{SupportRequired:'Unknown'},{WorkflowStage:'Done'},{ProductCategory:'Other'},{QualityResult:'Approved'},{Decision:'Reject',RecordedAwardGBP:20},{LinkedThemes:[]}]){
 assert.equal(adapter.validateBatch([{...s,...patch}],data.as_of).rejected.length,1,JSON.stringify(patch));
}
const empty=adapter.validateBatch([],data.as_of);
assert.equal(empty.totals.qaFailureRate,null);
assert.equal(empty.totals.redress,0);
assert.equal(empty.reconciled,true);
console.log('Respond-style adapter: clean transfer, mapping, quarantine, duplicate rejection, award reconciliation, dates, enums and zero-sample QA checks passed.');

