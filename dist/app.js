'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const num=x=>Math.round(x).toLocaleString('en-GB'), money=x=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(x), compact=x=>'£'+(x/1e6).toFixed(2)+'m', pct=(a,b)=>b?(100*a/b).toFixed(1)+'%':'N/A';
const palette=['#2c7565','#aabf6b','#d7a856','#73a58b','#537c84','#b0ad84','#749856'];
let D, selectedCause=null, riskMode='heatmap', briefMode='weekly';
const plotConfig={responsive:true,displaylogo:false,modeBarButtonsToRemove:['toImage','lasso2d','select2d']};
const layout={font:{family:'DM Sans, sans-serif',color:'#566b63',size:10},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',margin:{l:50,r:20,t:18,b:45}};
const sceneAxis={showgrid:true,gridcolor:'#e4ebe1',zeroline:false,showbackground:false,showticklabels:false,title:{text:''},showspikes:false};

function showCases(title,predicate){
 const rows=D.cases.filter(predicate).sort((a,b)=>b.redress-a.redress);
 $('#case-title').textContent=title;$('#case-context').textContent=`${num(rows.length)} matching synthetic cases · snapshot ${D.as_of} · recorded redress is not necessarily paid`;
 $('#case-body').replaceChildren(...rows.slice(0,100).map(row=>{const tr=document.createElement('tr');[row.case_id,row.product,row.stage,row.root_cause,row.vulnerable?'Additional support':'Standard',row.qa_result,money(row.redress),row.sla_status].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});return tr}));
 $('#case-dialog').showModal();
}
function metrics(){const m=D.metrics;$('#metrics').innerHTML=[['PROGRAMME POPULATION',num(m.total),'All synthetic cases'],['OPEN CASES',num(m.open),`${pct(m.closed,m.total)} closed to date`],['RECORDED REDRESS',compact(m.redress),'Upheld decisions · not payment MI'],['QA FAILURE RATE',pct(m.qa_fails,m.qa_sampled),`${num(m.qa_fails)} / ${num(m.qa_sampled)} sampled`],['OVERDUE OPEN CASES',num(m.overdue),'Beyond fictional 56-day target']].map((x,i)=>`<div class="metric ${i===4?'alert':''}"><small>${x[0]}</small><strong>${x[1]}</strong><span>${x[2]}</span></div>`).join('')}
function causeDetail(c){
 selectedCause=c?.name||null;
 if(!c){$('#cause-detail').innerHTML=`<div class="eyebrow">THE PROGRAMME / ALL CAUSES</div><h3>Connected issues.<br>Compounding harm.</h3><p>Each cluster is a primary cause. The links show how often two themes appear together in a synthetic case.</p><div class="cause-number">${num(D.metrics.total)}</div><small>cases in the synthetic programme</small><div class="cause-stats"><div><strong>${compact(D.metrics.redress)}</strong><small>recorded redress</small></div><div><strong>7</strong><small>root-cause clusters</small></div></div><p>Select a node or a theme below to inspect the evidence.</p><button id="cause-cases">Explore all cases ↗</button>`;$('#cause-cases').onclick=()=>showCases('All programme cases',()=>true)}
 else{const strongest=D.links.filter(l=>l.source===c.name||l.target===c.name).sort((a,b)=>b.count-a.count)[0];const other=strongest.source===c.name?strongest.target:strongest.source;
 $('#cause-detail').innerHTML=`<div class="eyebrow">SELECTED PRIMARY CAUSE</div><h3>${c.name}</h3><div class="cause-number">${num(c.volume)}</div><small>${pct(c.volume,D.metrics.total)} of the programme population</small><div class="cause-stats"><div><strong>${money(c.avg_redress)}</strong><small>mean upheld redress</small></div><div><strong>${pct(c.qa_fails,c.qa_sampled)}</strong><small>sampled QA fail</small></div></div><p>${num(c.open)} open cases. Strongest linked theme: ${other.toLowerCase()} (${num(strongest.count)} co-occurrences). Associations are not causal proof.</p><button id="cause-cases">Inspect ${num(c.volume)} cases ↗</button>`;$('#cause-cases').onclick=()=>showCases(c.name,x=>x.root_cause===c.name)}
 $$('#cause-buttons button').forEach(b=>b.classList.toggle('active',b.dataset.cause===selectedCause));
}
function network(){
 const max=Math.max(...D.causes.map(c=>c.avg_redress));
 const pos={};D.causes.forEach((c,i)=>{const a=i*Math.PI*2/7;pos[c.name]=[Math.cos(a)*2.8,Math.sin(a)*2.8,c.avg_redress/max*3]});
 const traces=[];
 D.links.forEach(l=>{let a=pos[l.source],b=pos[l.target];traces.push({type:'scatter3d',mode:'lines',x:[a[0],b[0]],y:[a[1],b[1]],z:[a[2],b[2]],line:{color:'#b7c8ac',width:Math.max(1,l.count/45)},opacity:.28,hoverinfo:'skip',showlegend:false})});
 D.causes.forEach((c,i)=>{const p=pos[c.name];traces.push({type:'scatter3d',mode:'lines',x:[0,p[0]],y:[0,p[1]],z:[0,p[2]],line:{color:palette[i],width:2},opacity:.55,hoverinfo:'skip',showlegend:false})});
 traces.push({type:'scatter3d',mode:'markers+text',x:[0],y:[0],z:[0],text:['CUSTOMER HARM'],textposition:'bottom center',textfont:{color:'#153c2f',size:11},marker:{size:28,color:'#184d3d',opacity:1,line:{width:2,color:'#b4cc9f'}},customdata:['all'],hovertemplate:'Customer harm<br>All 10,000 synthetic cases<extra></extra>',showlegend:false});
 traces.push({type:'scatter3d',mode:'markers+text',x:D.causes.map(c=>pos[c.name][0]),y:D.causes.map(c=>pos[c.name][1]),z:D.causes.map(c=>pos[c.name][2]),text:D.causes.map(c=>c.name.replace(' ','<br>')),textposition:'top center',textfont:{color:'#254b3c',size:10},customdata:D.causes.map(c=>c.name),marker:{size:D.causes.map(c=>Math.sqrt(c.volume)*.57),color:palette,opacity:.96,line:{width:1,color:'#fff'}},hovertext:D.causes.map(c=>`${c.name}<br>${num(c.volume)} cases<br>${money(c.avg_redress)} mean upheld redress`),hovertemplate:'%{hovertext}<extra></extra>',showlegend:false});
 const camera={eye:{x:1.15,y:1.15,z:.85},center:{x:0,y:0,z:0}};
 Plotly.newPlot('network',traces,{...layout,margin:{l:8,r:8,t:5,b:5},scene:{xaxis:sceneAxis,yaxis:sceneAxis,zaxis:{...sceneAxis,title:{text:'MEAN UPHELD REDRESS ↑',font:{size:9}}},camera,aspectmode:'manual',aspectratio:{x:1,y:1,z:.8}},showlegend:false},plotConfig).then(()=>{
 $('#network').on('plotly_click',event=>{const name=event.points[0].customdata;if(name)causeDetail(D.causes.find(c=>c.name===name))});
 $('#reset-camera').onclick=()=>Plotly.relayout('network',{'scene.camera':camera});
 });
 $('#cause-buttons').innerHTML=D.causes.map(c=>`<button data-cause="${c.name}">${c.name}</button>`).join('');
 $$('#cause-buttons button').forEach(b=>b.onclick=()=>causeDetail(D.causes.find(c=>c.name===b.dataset.cause)));
 causeDetail(null);
}
function process(){
 const max=Math.max(...D.stages.filter(s=>s.stage!=='Closure').map(s=>s.volume));
 const show=s=>{$$('#process button').forEach(b=>b.classList.toggle('active',b.dataset.stage===s.stage));$('#flow-detail').innerHTML=`<div><h3>${s.stage} ${s.volume===max?'· largest active queue':''}</h3><p>${num(s.volume)} ${s.stage==='Closure'?'closed cases':'cases in queue'} · ${s.dwell.toFixed(1)} mean days in current stage · ${num(s.overdue)} overdue · ${num(s.at_risk)} at risk<br>${num(s.throughput_7d)} modelled ${s.stage==='Closure'?'closures':'stage exits'} in the last 7 days. ${s.stage==='Investigation'?'Evidence quality and reviewer capacity are hypotheses to investigate.':'Inspect case details before deciding on intervention.'}</p></div><button id="stage-cases">Inspect queue ↗</button>`;$('#stage-cases').onclick=()=>showCases(s.stage,x=>x.stage===s.stage)};
 $('#process').innerHTML=D.stages.map((s,i)=>`<button data-stage="${s.stage}" class="stage ${s.volume===max?'bottleneck':''}"><span class="stage-num">0${i+1}<span>${s.volume===max?'●':'↗'}</span></span><h3>${s.stage}</h3><strong>${num(s.volume)}</strong><small>${s.stage==='Closure'?'closed to date':'current queue'}</small><div class="pressure"><div style="width:${Math.min(s.volume/max*100,100)}%"></div></div><small>${num(s.throughput_7d)} ${s.stage==='Closure'?'closed':'exits'} / 7 days</small></button>`).join('');
 $$('#process button').forEach(b=>b.onclick=()=>show(D.stages.find(s=>s.stage===b.dataset.stage)));show(D.stages.find(s=>s.volume===max));
}
function risk(){
 const products=['Investments','Pensions','Savings','Mortgages'],teams=['North','Central','South','Specialist'];
 const measure=$('#risk-measure').value;
 const value=c=>measure==='qa_rate'?100*c.qa_fails/Math.max(1,c.qa_sampled):c[measure];
 const cells=products.map(p=>teams.map(t=>D.risk.find(c=>c.product===p&&c.team===t)));
 const z=cells.map(row=>row.map(value));const text=cells.map(row=>row.map(c=>`${c.product} · ${c.team}<br>Cases: ${num(c.volume)}<br>Open: ${num(c.open)} · Overdue: ${num(c.overdue)}<br>QA failed / sampled: ${c.qa_fails} / ${c.qa_sampled}<br>Recorded redress: ${money(c.redress)}`));
 const colours=[[0,'#eff3db'],[.35,'#c5d899'],[.65,'#85a874'],[1,'#285744']];
 const trace=riskMode==='heatmap'?{type:'heatmap',x:teams,y:products,z,text,hovertemplate:'%{text}<extra></extra>',colorscale:colours,xgap:5,ygap:5,texttemplate:measure==='redress'?'%{z:,.0f}':'%{z:.1f}',textfont:{size:12},colorbar:{thickness:9,len:.8,tickfont:{size:8}}}:{type:'surface',x:[0,1,2,3],y:[0,1,2,3],z,text,hovertemplate:'%{text}<extra></extra>',colorscale:colours,colorbar:{thickness:9,len:.8},contours:{z:{show:true,usecolormap:true,project:{z:true}}}};
 const options=riskMode==='heatmap'?{...layout,margin:{l:87,r:45,t:30,b:40},xaxis:{side:'top',fixedrange:true},yaxis:{autorange:'reversed',fixedrange:true}}:{...layout,margin:{l:5,r:30,t:10,b:5},scene:{xaxis:{...sceneAxis,showticklabels:true,tickvals:[0,1,2,3],ticktext:teams},yaxis:{...sceneAxis,showticklabels:true,tickvals:[0,1,2,3],ticktext:products},zaxis:{...sceneAxis,showticklabels:true},camera:{eye:{x:1.4,y:1.4,z:1.1}}}};
 Plotly.react('risk-chart',[trace],options,plotConfig).then(()=>{const chart=$('#risk-chart');chart.removeAllListeners?.('plotly_click');chart.on('plotly_click',e=>{const pt=e.points[0];const p=riskMode==='heatmap'?pt.y:products[Math.round(pt.y)],t=riskMode==='heatmap'?pt.x:teams[Math.round(pt.x)];if(!p||!t)return;const c=D.risk.find(c=>c.product===p&&c.team===t);$('#risk-detail').innerHTML=`<strong>${p} / ${t}</strong> · ${num(c.volume)} cases · ${num(c.overdue)} overdue · ${pct(c.qa_fails,c.qa_sampled)} sampled QA fail <button id="risk-cases">Inspect cases ↗</button>`;$('#risk-cases').onclick=()=>showCases(`${p} / ${t}`,x=>x.product===p&&x.team===t)})});
}
function signals(){
 const worst=[...D.cohorts].sort((a,b)=>b.qa_fails/b.qa_sampled-a.qa_fails/a.qa_sampled)[0];const top=[...D.causes].sort((a,b)=>b.redress-a.redress)[0];
 const signals=[['01',`${worst.cohort}: elevated QA exceptions`,`${pct(worst.qa_fails,worst.qa_sampled)} failed among ${num(worst.qa_sampled)} sampled cases. Compare migration controls before inferring a cause.`],['02',`${top.name}: redress concentration`,`${compact(top.redress)} recorded across ${num(top.volume)} primary-cause cases. Inspect the distribution and decision evidence.`],['03',`${num(D.outlier_count)} high-redress outliers`, `Above ${money(D.outlier_fence)} using Q3 + 1.5 × IQR. A review flag, not evidence of an incorrect award.`]];
 $('#signals').innerHTML=signals.map(x=>`<div class="signal"><span>${x[0]}</span><div><strong>${x[1]}</strong><p>${x[2]}</p></div></div>`).join('');
 $('#cohorts').innerHTML=`<table class="data-table"><thead><tr><th>Cohort</th><th>Cases</th><th>Closed</th><th>QA fail</th><th>Overdue</th></tr></thead><tbody>${D.cohorts.map(c=>`<tr><td><button class="cohort-button" data-cohort="${c.cohort}">${c.cohort} ↗</button></td><td>${num(c.volume)}</td><td>${pct(c.closed,c.volume)}</td><td>${pct(c.qa_fails,c.qa_sampled)}</td><td>${num(c.overdue)}</td></tr>`).join('')}</tbody></table>`;
 $$('.cohort-button').forEach(b=>b.onclick=()=>showCases(b.dataset.cohort,x=>x.cohort===b.dataset.cohort));
 $('#vulnerability').innerHTML=`<div class="compare">${D.vulnerability.map(c=>`<div><small>${c.segment}</small><strong>${pct(c.qa_fails,c.qa_sampled)}</strong><span>sampled QA failure</span><p>${num(c.volume)} cases<br>${pct(c.overdue,c.open)} of open cases overdue<br>${money(c.redress/c.volume)} redress / all cases</p></div>`).join('')}</div>`;
 $('#outlier-note').innerHTML=`${num(D.outlier_count)} awards exceed the IQR review threshold of ${money(D.outlier_fence)}. <button id="outliers">Inspect outliers ↗</button>`;$('#outliers').onclick=()=>showCases('High-redress outliers',x=>x.redress>D.outlier_fence);
 const months=D.monthly.map(x=>x.month.slice(5));
 Plotly.newPlot('progress-chart',[{type:'bar',x:months,y:D.monthly.map(x=>x.received),name:'Received',marker:{color:'#c3d3ae'},hovertemplate:'Month %{x}<br>%{y} received<extra></extra>'},{type:'scatter',mode:'lines+markers',x:months,y:D.monthly.map(x=>x.closed),name:'Closed',line:{color:'#296450',width:2}},{type:'scatter',mode:'lines',x:months,y:D.monthly.map(x=>100*x.qa_fails/x.qa_sampled),name:'QA fail %',yaxis:'y2',line:{color:'#c19c57',dash:'dot',width:2},hovertemplate:'Month %{x}<br>%{y:.1f}% QA fail<extra></extra>'}],{...layout,margin:{l:35,r:35,t:10,b:60},legend:{orientation:'h',y:-.22,font:{size:8}},xaxis:{title:{text:'Received month / 2026',font:{size:8}},type:'category',fixedrange:true},yaxis:{gridcolor:'#edf0e9',fixedrange:true},yaxis2:{overlaying:'y',side:'right',ticksuffix:'%',showgrid:false,fixedrange:true}},plotConfig);
 Plotly.newPlot('redress-chart',[{type:'bar',x:D.distribution.map(x=>x.label),y:D.distribution.map(x=>x.count),marker:{color:['#dbe6c9','#bfd2a3','#97b17a','#71905a','#4f7146','#2a553c']},hovertemplate:'%{x}<br>%{y} upheld cases<extra></extra>'}],{...layout,margin:{l:38,r:5,t:10,b:45},xaxis:{fixedrange:true,tickfont:{size:8}},yaxis:{gridcolor:'#edf0e9',fixedrange:true}},plotConfig);
}
const controls=[['population','Open population',100,20000,100,'cases'],['reviewers','Case reviewers',1,100,1,'FTE'],['hours','Average handling time',1,16,.25,'hours / case'],['qaRate','QA sampling rate',0,100,1,'%'],['qaReviewers','QA reviewers',1,30,1,'FTE'],['upholdRate','Expected uphold rate',0,100,1,'%']];
let baseline;
function simulator(){
 const m=D.metrics;baseline={population:m.open,reviewers:24,hours:Number(m.handling_hours.toFixed(2)),qaRate:25,qaReviewers:4,upholdRate:Math.round(100*m.upheld/m.decided)};
 // Include exact baseline in range steps by using a numeric field for population and 0.01 hours.
 $('#sim-controls').innerHTML=controls.map(([id,label,min,max,step,unit])=>`<div class="control"><label for="sim-${id}">${label}<output id="out-${id}"></output></label><input id="sim-${id}" type="range" min="${id==='population'?0:min}" max="${max}" step="${id==='population'?1:id==='hours'?.01:step}" value="${baseline[id]}"><small>${unit}</small></div>`).join('');
 $$('#sim-controls input').forEach(x=>x.oninput=updateScenario);$('#reset-scenario').onclick=()=>{Object.entries(baseline).forEach(([k,v])=>$('#sim-'+k).value=v);updateScenario()};updateScenario();
}
function updateScenario(){
 const values=Object.fromEntries(controls.map(([id])=>[id,Number($('#sim-'+id).value)]));
 controls.forEach(([id,,,,,unit])=>$('#out-'+id).textContent=(id==='hours'?values[id].toFixed(2):num(values[id]))+(unit==='%'?'%':''));
 const p={...values,qaRate:values.qaRate/100,upholdRate:values.upholdRate/100,qaFailRate:D.metrics.qa_fails/D.metrics.qa_sampled,avgRedress:D.metrics.avg_upheld_redress};
 const r=RemediationScenario.forecast(p);
 $('#scenario-results').innerHTML=`<div><small>Estimated completion</small><strong>${num(r.days)} <span>working days</span></strong><span>Review ${r.reviewDays.toFixed(1)}d · QA ${r.qaDays.toFixed(1)}d</span></div><div><small>Modelled redress exposure</small><strong>${money(r.redress)}</strong><span>Undecided population assumption</span></div><div><small>Reviewers for a 60-day target</small><strong>${num(r.staff)} <span>FTE</span></strong><span>At the selected handling time</span></div><div><small>QA queue at review completion</small><strong>${num(r.qaBacklog)} <span>cases</span></strong><span>${r.qaBacklog?'QA capacity is the constraint':'QA capacity covers modelled demand'}</span></div>`;
 $('#capacity-fill').style.width=Math.min(100,60/Math.max(r.days,1)*100)+'%';
 $('#scenario-comment').textContent=r.days<=60?`Within the illustrative 60-working-day target. Expected review rework factor: ${r.rework.toFixed(3)}. Validate case mix before acting.`:`${r.days-60} working days beyond the illustrative target. ${r.qaBacklog?'QA capacity constrains completion; add QA capacity or reconsider the sampling plan under governance review.':`The model needs ${Math.max(0,r.staff-p.reviewers)} additional case reviewers to meet 60 working days.`}`;
}
function brief(){
 const m=D.metrics,a=D.weekly[0],b=D.weekly[1],top=[...D.causes].sort((a,b)=>b.redress-a.redress)[0],queue=[...D.stages].filter(x=>x.stage!=='Closure').sort((a,b)=>b.volume-a.volume)[0];
 const direction=b.closed>=a.closed?'up':'down';
 const content={weekly:[`Weekly closures ${direction} ${num(Math.abs(b.closed-a.closed))} cases.`,`${num(b.closed)} cases closed on 24–30 September, compared with ${num(a.closed)} on 17–23 September. New intake was ${num(b.received)} versus ${num(a.received)} in the preceding week. These are completed seven-day windows.`,`The current snapshot has ${num(m.open)} open cases, including ${num(m.overdue)} beyond the fictional programme target. ${queue.stage} holds the largest active queue (${num(queue.volume)} cases). Current queue sizes are not historical queue movements.`,`Sources: weekly.closed, weekly.received; metrics.open, metrics.overdue; stages.volume. Snapshot: ${D.as_of}.`],redress:[`${top.name} has the largest recorded redress total.`,`${money(top.redress)} is associated with ${num(top.volume)} primary-cause cases (${pct(top.redress,m.redress)} of all recorded redress). Mean redress among upheld decisions in this cluster is ${money(top.avg_redress)}.`,`Across the programme, ${num(D.outlier_count)} awards exceed the ${money(D.outlier_fence)} IQR threshold. Concentration is a reason to review case mix and decision evidence; it does not establish an error or a causal effect. Recorded awards are not payment confirmation.`,`Sources: causes.redress, causes.volume, causes.avg_redress; metrics.redress; outlier_count and outlier_fence.`],action:[`Review ${queue.stage.toLowerCase()} capacity and exception controls.`,`${queue.stage} contains ${num(queue.volume)} cases, with ${num(queue.overdue)} overdue and ${queue.dwell.toFixed(1)} mean days in current stage. Queue size and age are signals to inspect, not a proven diagnosis of the delay.`,`Proposed human action: inspect the underlying exceptions, validate the evidence and test staffing assumptions in the scenario lab. Keep QA assurance and additional-support needs visible before approving a change. No case decision or allocation is automated.`,`Sources: stages.volume, stages.overdue, stages.dwell. Recommended action is a demo rule applied to the largest active queue.`]};
 const text=content[briefMode];$('#brief-content').innerHTML=`<h3>${text[0]}</h3><p>${text[1]}</p><p>${text[2]}</p><p class="source">${text[3]}<br>Rule-based interpretation of calculated metrics. Prepared for human challenge.</p>`;
}
function downloadBrief(){const text=`REMEDIATION COMMAND CENTRE — REVIEW PACK\nGurjit Kaila / Portfolio prototype\nSynthetic data only / ${D.as_of}\n\n${$('#brief-content').innerText}\n\nReviewer acknowledgement (local demo only): ${$('#review-check').checked?'Acknowledged':'Pending'}\n\n${JSON.stringify({metrics:D.metrics,weekly:D.weekly,cohorts:D.cohorts},null,2)}\n\nNo customer decision, production approval or audit record is created.`;const url=URL.createObjectURL(new Blob([text],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='remediation-review-pack.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function start(){
 try{
 const response=await fetch('analytics.json');if(!response.ok)throw Error('Extract could not be loaded');D=await response.json();
 metrics();process();simulator();brief();
 $('#load-status').hidden=true;
 if(typeof Plotly==='undefined'){$('#network').innerHTML='<p class="fallback">3D rendering is unavailable. Use the cause buttons to inspect the calculated data.</p>';$('#risk-chart').innerHTML='<p class="fallback">Charts unavailable. Reopen after the local plotting library loads.</p>';$('#cause-buttons').innerHTML=D.causes.map(c=>`<button data-cause="${c.name}">${c.name}</button>`).join('');$$('#cause-buttons button').forEach(b=>b.onclick=()=>causeDetail(D.causes.find(c=>c.name===b.dataset.cause)));causeDetail(null);$('#reset-camera').disabled=true;}else{network();risk();signals();}
 }catch(e){$('#load-status').textContent='The programme extract could not be loaded. Serve this folder over HTTP and reload. '+e.message;}
}
$('#close-dialog').onclick=()=>$('#case-dialog').close();
$('#heat-mode').onclick=()=>{riskMode='heatmap';$('#heat-mode').classList.add('active');$('#surface-mode').classList.remove('active');$('#heat-mode').setAttribute('aria-pressed','true');$('#surface-mode').setAttribute('aria-pressed','false');risk()};
$('#surface-mode').onclick=()=>{riskMode='surface';$('#surface-mode').classList.add('active');$('#heat-mode').classList.remove('active');$('#heat-mode').setAttribute('aria-pressed','false');$('#surface-mode').setAttribute('aria-pressed','true');risk()};
$('#risk-measure').onchange=()=>{$('#risk-detail').textContent='Select a cell to inspect the underlying cases.';risk()};
$$('[data-brief]').forEach(b=>b.onclick=()=>{briefMode=b.dataset.brief;$$('[data-brief]').forEach(x=>x.classList.toggle('active',x===b));$('#review-check').checked=false;$('#review-state').textContent='Draft · awaiting reviewer acknowledgement';brief()});
$('#review-check').onchange=e=>$('#review-state').textContent=e.target.checked?'Acknowledged locally · proposed actions still require approval':'Draft · awaiting reviewer acknowledgement';
$('#download-brief').onclick=downloadBrief;
start();

