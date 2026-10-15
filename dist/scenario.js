(function(root){
  'use strict';
  function forecast(p){
    const rework=1+p.qaRate*p.qaFailRate*.5;
    const reviewDays=p.population*p.hours*rework/(p.reviewers*6);
    const qaHours=p.population*p.qaRate*.75;
    const qaDays=qaHours/(p.qaReviewers*6);
    return {reviewDays,qaDays,days:Math.ceil(Math.max(reviewDays,qaDays)),redress:p.population*p.upholdRate*p.avgRedress,staff:Math.ceil(p.population*p.hours*rework/(60*6)),qaBacklog:Math.ceil(Math.max(0,(qaHours-reviewDays*p.qaReviewers*6)/.75)),rework};
  }
  if(typeof module!=='undefined')module.exports={forecast};
  root.RemediationScenario={forecast};
})(typeof globalThis!=='undefined'?globalThis:this);

