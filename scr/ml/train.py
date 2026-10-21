"""Train a real logistic regression model on labeled user-product feature rows.
CSV columns: categoryMatch,materialMatch,styleMatch,priceFit,rating,label
Each feature in [0,1], label in {0,1}. Never treat synthetic results as real accuracy.
Usage: python -m pip install -r requirements.txt && python train.py --data interactions.csv
"""
import argparse,csv,json,math,random
from pathlib import Path
FEATURES=['categoryMatch','materialMatch','styleMatch','priceFit','rating']
def sigmoid(z):return 1/(1+math.exp(-max(-30,min(30,z))))
def load(path):
 rows=[]
 with open(path,encoding='utf-8-sig',newline='') as f:
  for r in csv.DictReader(f):
   x=[float(r[k]) for k in FEATURES];y=int(r['label'])
   if any(not 0<=v<=1 for v in x) or y not in (0,1):raise ValueError('Invalid feature/label row')
   rows.append((x,y))
 return rows
def fit(rows,epochs=1200,lr=.3,regularization=.01):
 w=[0.]*len(FEATURES);bias=0.
 for _ in range(epochs):
  dw=[0.]*len(w);db=0.
  for x,y in rows:
   err=sigmoid(bias+sum(a*v for a,v in zip(w,x)))-y
   for j in range(len(w)):dw[j]+=err*x[j]
   db+=err
  n=len(rows);w=[v-lr*(dw[j]/n+regularization*v) for j,v in enumerate(w)];bias-=lr*db/n
 return w,bias
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--data',required=True);ap.add_argument('--out',default='../server/src/ml/model.json');a=ap.parse_args()
 rows=load(a.data)
 if len(rows)<20 or len({y for _,y in rows})<2:raise SystemExit('Need >=20 labeled samples containing both classes')
 rng=random.Random(42);rng.shuffle(rows);split=max(1,int(len(rows)*.8));train,test=rows[:split],rows[split:]
 w,b=fit(train)
 out=Path(a.out);out.parent.mkdir(parents=True,exist_ok=True)
 out.write_text(json.dumps({'type':'logistic-regression','features':FEATURES,'coefficients':w,'intercept':b,'trainingSamples':len(train)},indent=2)+'\n',encoding='utf-8')
 print('Saved:',out,'training samples:',len(train))
 if test:
  correct=sum((sigmoid(b+sum(v*k for v,k in zip(w,x)))>=.5)==bool(y) for x,y in test)
  print('Holdout accuracy:',round(correct/len(test),3),'n=',len(test),'(interpret with class balance and baseline)')
if __name__=='__main__':main()
