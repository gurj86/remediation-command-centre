const assert=require('node:assert/strict');
const {forecast}=require('../dist/scenario.js');
const p={population:1000,reviewers:10,hours:6,qaRate:.25,qaFailRate:.2,qaReviewers:2,upholdRate:.6,avgRedress:1000};
const baseline=forecast(p);
assert.equal(baseline.days,103);
assert.equal(baseline.redress,600000);
assert.equal(baseline.staff,18);
assert.equal(baseline.qaBacklog,0);
assert.ok(forecast({...p,reviewers:20}).days<baseline.days);
const qaLimited=forecast({...p,reviewers:100,qaRate:1,qaReviewers:1});
assert.equal(qaLimited.days,125);
assert.ok(qaLimited.qaBacklog>0);
assert.equal(forecast({...p,population:0}).days,0);
assert.equal(forecast({...p,population:0}).redress,0);
assert.equal(forecast({...p,qaRate:0}).qaDays,0);
assert.ok(forecast({...p,hours:12}).days>baseline.days);
assert.equal(forecast({...p,upholdRate:0}).redress,0);
console.log('Scenario: baseline, review capacity, QA constraint, zero cases, zero QA, handling time and uphold boundaries passed.');

