"""Evaluation helper for thesis experiments. Fill test_cases.csv with measured ground truth; no fabricated scores."""
import csv, statistics, sys
path=sys.argv[1] if len(sys.argv)>1 else 'test_cases.csv'
rows=list(csv.DictReader(open(path,encoding='utf-8-sig')))
if not rows: raise SystemExit('No test cases')
def b(v): return str(v).strip().lower() in {'1','true','yes'}
intent=[b(r['intent_correct']) for r in rows if r.get('intent_correct')!='']
hits=[b(r['hit_at_5']) for r in rows if r.get('hit_at_5')!='']
precision=[float(r['precision_at_5']) for r in rows if r.get('precision_at_5')]
recall=[float(r['recall_at_5']) for r in rows if r.get('recall_at_5')]
lat=[float(r['response_ms']) for r in rows if r.get('response_ms')]
print('Cases:',len(rows))
if intent: print('Intent Accuracy:',sum(intent)/len(intent))
if hits: print('Hit Rate@5:',sum(hits)/len(hits))
if precision: print('Precision@5:',statistics.mean(precision))
if recall: print('Recall@5:',statistics.mean(recall))
if lat: print('Mean Response Time (ms):',round(statistics.mean(lat),2))
