import {Router} from 'express';
import mongoose from 'mongoose';
import {optionalAuth,AuthRequest} from '../middleware/auth.js';
import {extractIntent,explain,Intent} from '../services/gemini.service.js';
import {recommend} from '../services/recommendation.service.js';
import {rebuildPreference} from '../services/preference.service.js';
import {rankDiamonds} from '../services/diamond.service.js';
import AIConversation from '../models/AIConversation.js';
import {demoProducts} from '../data/demoProducts.js';

const r=Router();
const diamondWords=/kim cương|diamond|4cs|carat|clarity|cut|color/i;
const personalWords=/dành (riêng )?cho (tôi|tớ|mình|t)|hợp với (tôi|tớ|mình|t)|sở thích|cá nhân/i;
const money=(t:string)=>{const m=t.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr)/i);return m?Number(m[1].replace(',','.'))*1_000_000:undefined};
const demoDiamonds=[
 {_id:'dia-1',certificateNo:'GIA-MIRA-1001',carat:1.0,cut:'Excellent',color:'E',clarity:'VVS1',price:168000000,score:96},
 {_id:'dia-2',certificateNo:'GIA-MIRA-1002',carat:0.8,cut:'Excellent',color:'F',clarity:'VS1',price:98500000,score:91},
 {_id:'dia-3',certificateNo:'GIA-MIRA-1003',carat:1.2,cut:'Very Good',color:'G',clarity:'VS2',price:142000000,score:86},
 {_id:'dia-4',certificateNo:'GIA-MIRA-1004',carat:0.7,cut:'Excellent',color:'D',clarity:'VVS2',price:89000000,score:89}
];
function scoreDemo(p:any,c:Intent){let s=45;if(c.category&&p.category===c.category)s+=22;if(c.material&&p.material===c.material)s+=12;if(c.style&&p.style===c.style)s+=8;if(c.occasion&&p.occasion?.includes(c.occasion))s+=8;if(c.budgetMax){const d=Math.abs(p.price-c.budgetMax)/Math.max(c.budgetMax,1);s+=Math.max(0,18-d*18);if(p.price>c.budgetMax*1.2)s-=15}return Math.max(1,Math.min(99,Math.round(s)))}
function demoRecommend(c:Intent,limit=5){return [...demoProducts].map(p=>({...p,score:scoreDemo(p,c)})).sort((a,b)=>b.score-a.score).slice(0,limit)}

r.post('/',optionalAuth,async(req:AuthRequest,res)=>{
 const started=Date.now(); const message=String(req.body.message||'').trim();
 if(!message)return res.status(400).json({message:'Vui lòng nhập nhu cầu'});
 const dbReady=mongoose.connection.readyState===1;
 try{
  if(diamondWords.test(message)){
   const diamonds=dbReady?(await rankDiamonds({targetCarat:Number(message.match(/(\d+(?:[.,]\d+)?)\s*(?:carat|ct)/i)?.[1]?.replace(',','.')||1),budgetMax:money(message),weights:{carat:.25,cut:/ưu tiên.*cut|ưu tiên.*giác cắt/i.test(message)?.55:.25,color:.25,clarity:.25}})).slice(0,5):demoDiamonds;
   const top:any=diamonds[0];
   return res.json({mode:'diamond',answer:top?`MIRA đã phân tích theo 4Cs. Gợi ý nổi bật: ${top.carat} carat, Cut ${top.cut}, Color ${top.color}, Clarity ${top.clarity}, mức phù hợp ${top.score}%.`:'Chưa có lựa chọn phù hợp.',diamonds});
  }
  const intent=await extractIntent(message);
  let products:any[];
  if(dbReady&&req.user?.id){await rebuildPreference(req.user.id);products=await recommend(req.user.id,5,intent)}else products=demoRecommend(intent,5);
  let answer=await explain(message,products);
  if(personalWords.test(message)&&!req.user?.id)answer='Bạn chưa đăng nhập nên MIRA đang gợi ý theo nhu cầu hiện tại và dữ liệu demo. Đăng nhập sau này sẽ giúp hệ thống học hành vi để cá nhân hóa tốt hơn. '+answer;
  if(dbReady&&req.user?.id) AIConversation.create({user:req.user.id,message,intent,answer,recommendedProducts:products.map((p:any)=>p._id),latencyMs:Date.now()-started}).catch(()=>undefined);
  return res.json({mode:personalWords.test(message)?'recommendation':'advisor',intent,answer,products,demo:!dbReady});
 }catch(e:any){console.error('assistant:',e);const intent=await extractIntent(message);const products=demoRecommend(intent,5);return res.json({mode:'advisor',intent,answer:`MIRA đã chọn ${products.length} sản phẩm demo gần nhất với nhu cầu của bạn.`,products,demo:true});}
});
export default r;
