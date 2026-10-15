const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {assess,counts}=require('../dist/case-readiness.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../dist/analytics.json'),'utf8'));
const base={status:'Open',stage:'Investigation',evidence_status:'Complete',specialist_review:'Not required',qa_result:'Not sampled',outcome:'Pending',safety_flag:0};
assert.ok(assess(base).status.includes('ready'));
assert.ok(assess({...base,evidence_status:'Incomplete'}).status.includes('waiting'));
assert.ok(assess({...base,specialist_review:'Required'}).status.includes('waiting'));
assert.ok(assess({...base,stage:'Decision',qa_result:'Fail'}).status.includes('waiting'));
assert.ok(assess({...base,stage:'Redress'}).status.includes('waiting'));
assert.ok(assess({...base,stage:'FRL',outcome:'Uphold'}).status.includes('ready'));
assert.ok(assess({...base,stage:'Complaint Intake',evidence_status:'Incomplete',specialist_review:'Required'}).status.includes('ready'));
assert.ok(assess({...base,stage:'Complaint Intake',safety_flag:1,specialist_review:'Required'}).status.includes('waiting'));
assert.equal(assess({...base,status:'Closed',stage:'Closure',evidence_status:'Incomplete'}).status,'Closed');
for(const c of data.cases)assert.equal(assess(c).status,c.progress_status,c.case_id);
const totals=counts(data.cases);
assert.equal(totals.ready+totals.waiting,data.metrics.open);
assert.equal(totals.closed,data.metrics.closed);
for(const [key,view] of Object.entries(data.views)){
 const [product,pathway]=key.split('::');
 const rows=data.cases.filter(c=>c.product===product&&(!pathway||c.pathway===pathway));
 const tally=counts(rows);
 assert.equal(tally.ready+tally.waiting+tally.closed,view.metrics.total);
 for(const r of view.readiness)assert.equal(rows.filter(c=>assess(c).status===r.status).length,r.volume,key);
}
console.log('Next-action rules: stage-specific blocking, intake triage, safety, closed state, all 10,000 Python/JS classifications and eight scoped totals passed.');

