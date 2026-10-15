/* Illustrative next-action rules, not an approval or a production workflow engine. */
(function(root){
 function assess(c){
  if(c.status==='Closed')return {status:'Closed',reason:'Recorded as closed in the synthetic case system.'};
  const blockers=[];
  if(c.stage!=='Complaint Intake'&&c.evidence_status!=='Complete')blockers.push('Evidence is incomplete');
  if(['Investigation','Decision','Redress','FRL'].includes(c.stage)&&c.specialist_review==='Required')blockers.push('Specialist review is required');
  if(['Decision','Redress','FRL'].includes(c.stage)&&c.qa_result==='Fail')blockers.push('Complaint-handling QA needs follow-up');
  if(['Redress','FRL'].includes(c.stage)&&c.outcome==='Pending')blockers.push('A complaint decision is still needed');
  if(c.safety_flag&&c.specialist_review!=='Completed')blockers.push('Reported safety concern needs qualified review');
  return blockers.length?{status:'Open — waiting for evidence or review',reason:blockers.join('; ')}:{status:'Open — ready for the next action',reason:c.stage==='Complaint Intake'?'Ready for intake triage; investigation evidence may still be needed later.':'The illustrative checks for this stage pass. A person still authorises the next action.'};
 }
 function counts(cases){const result={ready:0,waiting:0,closed:0};cases.forEach(c=>{const s=assess(c).status;result[s==='Closed'?'closed':s.startsWith('Open — ready')?'ready':'waiting']++});return result}
 root.CaseReadiness={assess,counts};
 if(typeof module!=='undefined')module.exports=root.CaseReadiness;
})(typeof globalThis!=='undefined'?globalThis:this);

