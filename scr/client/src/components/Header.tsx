import {Link} from 'react-router-dom';
import {CalendarDays, Gem, Heart, Search, ShoppingBag, UserRound, WalletCards} from 'lucide-react';
import {useEffect,useState} from 'react';
import {getCart} from '../store/cart';

export default function Header(){
 const [n,setN]=useState(0);
 useEffect(()=>{const f=()=>setN(getCart().reduce((a,b)=>a+b.quantity,0));f();addEventListener('cartchange',f);return()=>removeEventListener('cartchange',f)},[]);
 return <>
  <div className="lux-topbar"><span>◈ Miễn phí vận chuyển bảo hiểm tận tay toàn quốc</span><span><Gem size={13}/> Giấy giám định kim cương quốc tế</span><span><CalendarDays size={13}/> Đặt lịch hẹn tư vấn riêng Private Salon</span></div>
  <header className="lux-header">
   <Link className="lux-logo" to="/"><b>MIRA</b><span>FINE JEWELRY · ATELIER</span></Link>
   <nav className="lux-nav">
    <Link to="/shop?category=Nhẫn">NHẪN</Link><Link to="/shop?category=Dây chuyền">DÂY CHUYỀN<br/>& MẶT DÂY</Link><Link to="/shop?category=Bông tai">BÔNG TAI</Link><Link to="/shop?category=Vòng tay">LẮC &<br/>VÒNG TAY</Link><Link to="/shop">CƯỚI &<br/>ĐÍNH HÔN</Link><Link to="/shop">HIGH<br/>JEWELRY</Link><Link to="/about">BESPOKE<br/>ATELIER</Link>
   </nav>
   <div className="lux-actions"><Link className="lux-search" to="/shop"><Search size={17}/><span>Tìm kim cương, loại đá, mã...</span></Link><span className="currency"><WalletCards size={15}/> VND</span><Link to="/wishlist"><Heart size={19}/></Link><Link className="lux-bag" to="/cart"><ShoppingBag size={19}/><b>{n}</b></Link><Link className="user-circle" to="/account"><UserRound size={18}/></Link></div>
  </header>
 </>
}
