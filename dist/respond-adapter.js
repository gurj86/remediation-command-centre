/* Independently designed, fictional source contract. Not an Aptean API implementation. */
(function(root){
 'use strict';
 const mappings=[['CaseReference','case_id','Stable source reference; never a customer identifier'],['ProductCategory','product','Agreed product reference list'],['RootCauseTheme','root_cause','Primary cause; linked themes retained separately'],['DateReceived','received_date','ISO date; snapshot-aware validation'],['SupportRequired','vulnerable','Y / N → 1 / 0'],['WorkflowStage','stage','Agreed stage reference list'],['Decision','outcome','Uphold / Reject / Pending'],['RecordedAwardGBP','redress','Non-negative GBP recorded award; not payment confirmation'],['ReviewTeam','team','Fictional delivery team'],['QualityResult','qa_result','Pass / Fail / Not sampled'],['MigrationCohort','cohort','Programme cohort reference'],['LinkedThemes','linked_themes','List → delimited analytical themes']];
 function sourceRecord(c){return {CaseReference:c.case_id,ProductCategory:c.product,RootCauseTheme:c.root_cause,DateReceived:c.received_date,SupportRequired:c.vulnerable?'Y':'N',WorkflowStage:c.stage,Decision:c.outcome,RecordedAwardGBP:c.redress,ReviewTeam:c.team,QualityResult:c.qa_result,MigrationCohort:c.cohort,LinkedThemes:c.linked_themes.split('|')}}
 function canonical(s){return {case_id:s.CaseReference,product:s.ProductCategory,root_cause:s.RootCauseTheme,received_date:s.DateReceived,vulnerable:s.SupportRequired==='Y'?1:0,stage:s.WorkflowStage,outcome:s.Decision,redress:s.RecordedAwardGBP,team:s.ReviewTeam,qa_result:s.QualityResult,cohort:s.MigrationCohort,linked_themes:s.LinkedThemes.join('|')}}
 const stages=['Complaint Intake','Evidence','Investigation','Decision','Redress','FRL','Closure'];
 const causes=['Delayed payments','Incorrect calculations','Poor disclosure','Vulnerability handling','Migration issues','Evidence gaps','Complaint handling'];
 function validateBatch(records,asOf){
  const seen=new Set(),accepted=[],rejected=[];
  records.forEach((s,i)=>{
   const errors=[];
   if(typeof s.CaseReference!=='string'||!/^RMD-\d{5}$/.test(s.CaseReference))errors.push('Missing or invalid source case reference');
   if(seen.has(s.CaseReference))errors.push('Duplicate source reference within this batch');
   const timestamp=Date.parse(s.DateReceived);
   if(!/^\d{4}-\d{2}-\d{2}$/.test(s.DateReceived)||!Number.isFinite(timestamp)||new Date(timestamp).toISOString().slice(0,10)!==s.DateReceived||s.DateReceived>asOf)errors.push('Invalid received date or later than snapshot');
   if(!['Investments','Pensions','Savings','Mortgages'].includes(s.ProductCategory))errors.push('Unmapped product category');
   if(!causes.includes(s.RootCauseTheme))errors.push('Unmapped root-cause theme');
   if(!['Y','N'].includes(s.SupportRequired))errors.push('Unknown support indicator; do not silently default');
   if(!stages.includes(s.WorkflowStage))errors.push('Unmapped workflow stage');
   if(!['Uphold','Reject','Pending'].includes(s.Decision))errors.push('Unknown decision');
   if(typeof s.RecordedAwardGBP!=='number'||!Number.isFinite(s.RecordedAwardGBP)||s.RecordedAwardGBP<0)errors.push('Recorded award must be a non-negative number');
   if(s.Decision!=='Uphold'&&s.RecordedAwardGBP!==0)errors.push('Award conflicts with decision');
   if(!['North','Central','South','Specialist'].includes(s.ReviewTeam))errors.push('Unmapped delivery team');
   if(!['Legacy','Wave 1','Wave 2','Wave 3'].includes(s.MigrationCohort))errors.push('Unmapped migration cohort');
   if(!['Pass','Fail','Not sampled'].includes(s.QualityResult))errors.push('Unknown QA result');
   if(!Array.isArray(s.LinkedThemes)||!s.LinkedThemes.includes(s.RootCauseTheme)||s.LinkedThemes.some(t=>!causes.includes(t)))errors.push('Linked harm themes do not match the agreed reference list');
   if(errors.length)rejected.push({row:i+1,reference:s.CaseReference||'(missing)',errors});
   else{seen.add(s.CaseReference);accepted.push(canonical(s))}
  });
  const sampled=accepted.filter(c=>c.qa_result!=='Not sampled').length;
  const failed=accepted.filter(c=>c.qa_result==='Fail').length;
  const redress=accepted.reduce((n,c)=>n+c.redress,0);
  return {input:records.length,accepted,rejected,totals:{accepted:accepted.length,rejected:rejected.length,redress,sampled,failed,qaFailureRate:sampled?failed/sampled:null},reconciled:records.length===accepted.length+rejected.length};
 }
 function fixture(cases,includeExceptions=true){
  const rows=cases.slice(0,12).map(sourceRecord);
  if(includeExceptions){rows.push({...rows[0]},{...rows[1],CaseReference:''},{...rows[2],CaseReference:'RMD-99999',RecordedAwardGBP:-100})}
  return rows;
 }
 const api={mappings,sourceRecord,canonical,validateBatch,fixture};
 if(typeof module!=='undefined')module.exports=api;
 root.RespondDemo=api;
})(typeof globalThis!=='undefined'?globalThis:this);

