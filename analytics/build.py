"""Reproducible fictional governed extract and SQLite analytics. Python 3.10+, stdlib only."""
from pathlib import Path
from datetime import date, timedelta
import random, math, sqlite3, json, csv, itertools

ROOT = Path(__file__).resolve().parents[1]
AS_OF = date(2026, 9, 30)
STAGES = ['Complaint Intake', 'Evidence', 'Investigation', 'Decision', 'Redress', 'FRL', 'Closure']
FRACTIONS = [0,.06,.23,.60,.73,.86,1]
CAUSES = ['Delayed payments', 'Incorrect calculations', 'Poor disclosure', 'Vulnerability handling', 'Migration issues', 'Evidence gaps', 'Complaint handling']
PRODUCTS = ['Investments', 'Pensions', 'Savings', 'Mortgages']
TEAMS = ['North', 'Central', 'South', 'Specialist']

def generate(n=10000):
    r = random.Random(86)
    rows=[]
    for i in range(n):
        received = date(2026,1,1)+timedelta(days=r.randrange(273))
        age=(AS_OF-received).days
        product=r.choices(PRODUCTS,[32,28,24,16])[0]
        cohort=r.choices(['Legacy','Wave 1','Wave 2','Wave 3'],[25,25,30,20])[0]
        cause=r.choices(CAUSES,[19,19,13,10,18 if cohort=='Wave 3' else 9,15,15])[0]
        vulnerable=int(r.random()<.23)
        duration=max(4,round(r.lognormvariate(3.25,.52)+(18 if cause=='Evidence gaps' else 0)+(12 if cohort=='Wave 3' else 0)))
        closed=age>=duration
        stage=6 if closed else max(j for j in range(6) if age>=round(duration*FRACTIONS[j]))
        decided=closed or stage>=4
        outcome=('Uphold' if r.random()<(.74 if vulnerable else .61) else 'Reject') if decided else 'Pending'
        redress=round(r.lognormvariate(6.15+(product=='Pensions')*.55+(cause=='Incorrect calculations')*.5,.85),2) if outcome=='Uphold' else 0
        qa_eligible=stage>=3
        qa=r.random()<.72 if qa_eligible else False
        qa_result=('Fail' if r.random()<(.12+.12*(cohort=='Wave 3')+.08*vulnerable) else 'Pass') if qa else 'Not sampled'
        closed_date=(received+timedelta(days=duration)).isoformat() if closed else ''
        themes=[cause]
        if r.random()<.4: themes.append(r.choice([c for c in CAUSES if c!=cause]))
        stage_entered=received+timedelta(days=round(duration*FRACTIONS[stage]))
        days_stage=0 if closed else (AS_OF-stage_entered).days
        rows.append(dict(case_id=f'RMD-{i+1:05d}',product=product,complaint_type={'Investments':'Instruction delay','Pensions':'Benefit calculation','Savings':'Interest dispute','Mortgages':'Payment allocation'}[product],root_cause=cause,received_date=received.isoformat(),vulnerable=vulnerable,customer_segment='Additional support' if vulnerable else 'Standard',status='Closed' if closed else 'Open',outcome=outcome,redress=redress,team=r.choice(TEAMS),reviewer=f'RV-{r.randrange(1,41):02d}',qa_result=qa_result,handling_hours=round(r.uniform(2,8)+2*(cause=='Evidence gaps')+vulnerable,2),channel=r.choice(['Phone','Email','Online','Letter']),stage=STAGES[stage],stage_index=stage,days_in_stage=days_stage,age_days=age,sla_status='Closed late' if closed and duration>56 else 'Closed within target' if closed else 'Overdue' if age>56 else 'At risk' if age>42 else 'Within target',cohort=cohort,linked_themes='|'.join(themes),closed_date=closed_date))
        rows[-1]['model_duration_days']=duration
        rows[-1]['stage_entered_date']=stage_entered.isoformat()
    return rows

def calculate(rows):
    db=sqlite3.connect(':memory:'); db.row_factory=sqlite3.Row
    columns=list(rows[0]); numeric={'vulnerable','stage_index','days_in_stage','age_days','redress','handling_hours','model_duration_days'}
    db.execute('CREATE TABLE cases ('+','.join(f'{c} '+('REAL' if c in numeric else 'TEXT') for c in columns)+')')
    db.executemany('INSERT INTO cases VALUES ('+','.join('?' for _ in columns)+')',[list(x.values()) for x in rows])
    def q(sql,args=()): return [dict(x) for x in db.execute(sql,args)]
    metrics=q("""SELECT COUNT(*) total,SUM(status='Open') open,SUM(status='Closed') closed,SUM(redress) redress,
      SUM(sla_status='Overdue') overdue, SUM(sla_status='At risk') at_risk,
      SUM(qa_result='Fail') qa_fails, SUM(qa_result!='Not sampled') qa_sampled,
      AVG(handling_hours) handling_hours, SUM(outcome='Uphold') upheld,SUM(outcome!='Pending') decided,
      AVG(CASE WHEN outcome='Uphold' THEN redress END) avg_upheld_redress FROM cases""")[0]
    stages=q("""SELECT stage,stage_index,COUNT(*) volume,AVG(days_in_stage) dwell,
      SUM(sla_status='Overdue') overdue,SUM(sla_status='At risk') at_risk,
      SUM(received_date>='2026-09-24') recent_arrivals FROM cases GROUP BY stage,stage_index ORDER BY stage_index""")
    # All synthetic stage transitions are generated from the fixture's duration model.
    # Only transitions on/before the snapshot are included; no future exits leak into MI.
    for s in stages:
        j=int(s['stage_index']); moved=0
        for row in rows:
            start=date.fromisoformat(row['received_date']); duration=row['model_duration_days']
            transition=start+timedelta(days=round(duration*FRACTIONS[min(j+1,6)]))
            if date(2026,9,24)<=transition<=AS_OF: moved+=1
        s['throughput_7d']=moved if j<6 else sum('2026-09-24'<=x['closed_date']<='2026-09-30' for x in rows)
    causes=q("""SELECT root_cause name,COUNT(*) volume,SUM(redress) redress,
      AVG(CASE WHEN outcome='Uphold' THEN redress END) avg_redress,SUM(status='Open') open,
      SUM(qa_result='Fail') qa_fails,SUM(qa_result!='Not sampled') qa_sampled FROM cases GROUP BY root_cause ORDER BY volume DESC""")
    links=[]
    for a,b in itertools.combinations(CAUSES,2):
        count=sum(a in x['linked_themes'].split('|') and b in x['linked_themes'].split('|') for x in rows)
        links.append(dict(source=a,target=b,count=count))
    risk=q("""SELECT product,team,COUNT(*) volume,SUM(redress) redress,SUM(status='Open') open,
      SUM(sla_status='Overdue') overdue,SUM(vulnerable=1) vulnerable,
      SUM(qa_result='Fail') qa_fails,SUM(qa_result!='Not sampled') qa_sampled FROM cases GROUP BY product,team""")
    for c in risk:
        c['risk_score']=round(100*(.6*c['overdue']/max(c['open'],1)+.4*c['qa_fails']/max(c['qa_sampled'],1)),1)
    cohorts=q("""SELECT cohort,COUNT(*) volume,SUM(status='Closed') closed,SUM(redress) redress,
      SUM(qa_result='Fail') qa_fails,SUM(qa_result!='Not sampled') qa_sampled,SUM(sla_status='Overdue') overdue FROM cases GROUP BY cohort""")
    vulnerability=q("""SELECT customer_segment segment,COUNT(*) volume,SUM(redress) redress,
      SUM(qa_result='Fail') qa_fails,SUM(qa_result!='Not sampled') qa_sampled,
      SUM(sla_status='Overdue') overdue,SUM(status='Open') open FROM cases GROUP BY customer_segment""")
    monthly=[]
    for month in range(1,10):
        prefix=f'2026-{month:02d}'
        item=q("""SELECT COUNT(*) received,SUM(qa_result='Fail') qa_fails,SUM(qa_result!='Not sampled') qa_sampled FROM cases WHERE received_date LIKE ?""",(prefix+'%',))[0]
        item.update(month=prefix,closed=q("SELECT COUNT(*) n FROM cases WHERE closed_date LIKE ?",(prefix+'%',))[0]['n'])
        monthly.append(item)
    redresses=sorted(x['redress'] for x in rows if x['redress']>0)
    def quantile(p):
        idx=(len(redresses)-1)*p; lo=int(idx); return redresses[lo]+(redresses[min(lo+1,len(redresses)-1)]-redresses[lo])*(idx-lo)
    q1,q3=quantile(.25),quantile(.75); fence=q3+1.5*(q3-q1)
    distribution=[dict(label=label,count=sum(lo<=v<hi for v in redresses)) for label,lo,hi in [('Under £250',0,250),('£250–500',250,500),('£500–1k',500,1000),('£1k–2k',1000,2000),('£2k–5k',2000,5000),('£5k+',5000,float('inf'))]]
    weekly=[]
    for start,end in [('2026-09-17','2026-09-23'),('2026-09-24','2026-09-30')]:
        weekly.append(dict(start=start,end=end,received=q('SELECT COUNT(*) n FROM cases WHERE received_date BETWEEN ? AND ?',(start,end))[0]['n'],closed=q('SELECT COUNT(*) n FROM cases WHERE closed_date BETWEEN ? AND ?',(start,end))[0]['n']))
    return dict(as_of=AS_OF.isoformat(),metrics=metrics,stages=stages,causes=causes,links=links,risk=risk,cohorts=cohorts,vulnerability=vulnerability,monthly=monthly,weekly=weekly,distribution=distribution,outlier_fence=fence,outlier_count=sum(x>fence for x in redresses),top_cases=sorted(rows,key=lambda x:x['redress'],reverse=True)[:20],cases=rows)

if __name__=='__main__':
    rows=generate(); result=calculate(rows)
    dest=ROOT/'dist'; dest.mkdir(exist_ok=True)
    (dest/'analytics.json').write_text(json.dumps(result,separators=(',',':')),encoding='utf-8')
    with (dest/'synthetic-cases.csv').open('w',newline='',encoding='utf-8') as f:
        writer=csv.DictWriter(f,fieldnames=rows[0]);writer.writeheader();writer.writerows(rows)
    print(json.dumps(result['metrics'],indent=2))

