"""Reconcile SQL outputs with independent row-level calculations."""
import unittest, sys, math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'analytics'))
from build import generate,calculate,AS_OF
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

if __name__=='__main__':unittest.main()

