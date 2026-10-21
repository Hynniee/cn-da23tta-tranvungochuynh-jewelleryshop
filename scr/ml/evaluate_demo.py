"""Reproduce held-out synthetic-data evaluation for the bundled demo model."""
import csv,random,json,math
from pathlib import Path
here=Path(__file__).resolve().parent
keys=['categoryMatch','materialMatch','styleMatch','priceFit','rating']
with (here/'interactions_demo.csv').open(encoding='utf-8',newline='') as f:
 rows=[([float(r[k]) for k in keys],int(r['label'])) for r in csv.DictReader(f)]
random.Random(42).shuffle(rows)
test=rows[int(len(rows)*.8):]
model=json.loads((here/'../server/src/ml/model.json').resolve().read_text(encoding='utf-8'))
assert model['features']==keys
w=model['coefficients'];b=model['intercept']
yp=[int(1/(1+math.exp(-max(-30,min(30,b+sum(a*v for a,v in zip(w,x))))))>=.5) for x,y in test]
truth=[y for x,y in test]
tp=sum(p==1 and y==1 for p,y in zip(yp,truth));fp=sum(p==1 and y==0 for p,y in zip(yp,truth));fn=sum(p==0 and y==1 for p,y in zip(yp,truth));tn=len(test)-tp-fp-fn
precision=tp/(tp+fp) if tp+fp else 0
recall=tp/(tp+fn) if tp+fn else 0
f1=2*precision*recall/(precision+recall) if precision+recall else 0
results={'dataset':'SYNTHETIC DEMO ONLY','train_samples':len(rows)-len(test),'test_samples':len(test),'test_positive':sum(truth),'test_negative':len(test)-sum(truth),'accuracy':round((tp+tn)/len(test),4),'precision':round(precision,4),'recall':round(recall,4),'f1':round(f1,4),'majority_baseline_accuracy':round(max(sum(truth),len(test)-sum(truth))/len(test),4),'confusion_matrix':{'TP':tp,'FP':fp,'FN':fn,'TN':tn},'note':'Synthetic data cannot establish real-world recommendation performance or Precision@3.'}
(here/'demo_metrics.json').write_text(json.dumps(results,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps(results,indent=2,ensure_ascii=False))
