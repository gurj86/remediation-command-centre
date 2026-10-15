"""Reconcile SQL outputs with independent row-level calculations."""
import unittest, sys, math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'analytics'))
from build import generate,calculate,build_package,AS_OF,PROGRAMMES
from datetime import date

class AnalyticsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows=generate();cls.d=calculate(cls.rows)
    def test_extract_integrity(self):
        self.assertEqual(len({r['case_id'] for r in self.rows}),10000)
        for r in self.rows:
            self.assertLessEqual(date.fromisoformat(r['received_date']),AS_OF)
            if r['closed_date']:
                self.assertLessEqual(date.fromisoformat(r['closed_date']),AS_OF)
                self.assertGreaterEqual(r['closed_date'],r['received_date'])
                self.assertEqual(r['stage'],'Closure')
            self.assertEqual(r['redress']>0,r['outcome']=='Uphold')
    def test_totals_and_denominators(self):
        m=self.d['metrics'];self.assertEqual(m['total'],m['open']+m['closed'])
        self.assertEqual(m['qa_sampled'],sum(r['qa_result']!='Not sampled' for r in self.rows))
        self.assertEqual(m['qa_fails'],sum(r['qa_result']=='Fail' for r in self.rows))
        self.assertAlmostEqual(m['redress'],sum(r['redress'] for r in self.rows),places=5)
        self.assertEqual(sum(c['volume'] for c in self.d['causes']),m['total'])
        self.assertEqual(sum(c['volume'] for c in self.d['risk']),m['total'])
        self.assertEqual(sum(c['volume'] for c in self.d['stages']),m['total'])
        self.assertEqual(sum(c['count'] for c in self.d['distribution']),m['upheld'])
    def test_risk_and_link_evidence(self):
        for c in self.d['risk']:
            subset=[r for r in self.rows if r['product']==c['product'] and r['team']==c['team']]
            self.assertEqual(c['overdue'],sum(r['sla_status']=='Overdue' for r in subset))
            self.assertTrue(0<=c['risk_score']<=100)
        for link in self.d['links']:
            self.assertEqual(link['count'],sum(link['source'] in r['linked_themes'].split('|') and link['target'] in r['linked_themes'].split('|') for r in self.rows))
    def test_windows_and_reproducibility(self):
        self.assertEqual(self.rows[:5],generate()[:5])
        for w in self.d['weekly']:
            self.assertEqual(w['closed'],sum(w['start']<=r['closed_date']<=w['end'] for r in self.rows))
        self.assertEqual(sum(m['received'] for m in self.d['monthly']),10000)
        self.assertEqual(sum(m['closed'] for m in self.d['monthly']),self.d['metrics']['closed'])
        self.assertEqual(self.d['outlier_count'],sum(r['redress']>self.d['outlier_fence'] for r in self.rows))
    def test_product_and_pathway_coverage(self):
        package=build_package(self.rows)
        self.assertEqual(len(PROGRAMMES),6)
        self.assertEqual(len(self.d['risk']),24)
        for profile in PROGRAMMES:
            subset=[r for r in self.rows if r['product']==profile['product']]
            self.assertEqual(set(r['complaint_type'] for r in subset),{t['name'] for t in profile['types']})
            view=package['views'][profile['product']]
            self.assertEqual(view['metrics']['total'],len(subset))
            self.assertAlmostEqual(view['metrics']['redress'],sum(r['redress'] for r in subset),places=5)
            self.assertEqual(sum(c['volume'] for c in view['complaint_types']),len(subset))
            self.assertEqual(sum(c['volume'] for c in view['stages']),len(subset))
            self.assertEqual(view['metrics']['qa_sampled'],sum(r['qa_result']!='Not sampled' for r in subset))
            self.assertEqual(view['outlier_count'],sum(r['redress']>view['outlier_fence'] for r in subset))
            for stage in view['stages']:
                from build import FRACTIONS
                from datetime import timedelta
                j=int(stage['stage_index'])
                expected=sum(date(2026,9,24)<=date.fromisoformat(r['received_date'])+timedelta(days=round(r['model_duration_days']*FRACTIONS[min(j+1,6)]))<=AS_OF for r in subset)
                self.assertEqual(stage['throughput_7d'],expected)
        motor=[r for r in self.rows if r['product']=='Motor Finance']
        self.assertEqual(sum(package['views']['Motor Finance::'+p]['metrics']['total'] for p in ['Commission & disclosure','Vehicle quality & warranty']),len(motor))
        for r in self.rows:
            if r['safety_flag']:
                self.assertEqual(r['complaint_type'],'Vehicle braking or safety concern')
                self.assertEqual(r['product'],'Motor Finance')

if __name__=='__main__':unittest.main()

