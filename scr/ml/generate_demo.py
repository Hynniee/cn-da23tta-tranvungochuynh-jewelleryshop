"""Generate synthetic labeled product preference examples for pipeline testing ONLY."""
import csv,math,random
from pathlib import Path
rng=random.Random(20261020)
out=Path(__file__).with_name('interactions_demo.csv')
features=['categoryMatch','materialMatch','styleMatch','priceFit','rating']
with out.open('w',encoding='utf-8',newline='') as f:
 writer=csv.writer(f);writer.writerow(features+['label'])
 for i in range(1000):
  x=[round(rng.uniform(.05,1),3) for _ in features]
  # Synthetic outcome generated from latent preference; stochastic, not a real customer's behavior.
  z=-3.4+1.5*x[0]+1.0*x[1]+1.2*x[2]+1.5*x[3]+.5*x[4]
  p=1/(1+math.exp(-z))
  writer.writerow(x+[int(rng.random()<p)])
print(f'Created {out} with 1000 synthetic samples')
