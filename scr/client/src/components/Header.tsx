import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Gem,
  Heart,
  Search,
  ShoppingBag,
  UserRound,
  WalletCards,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getCart } from "../store/cart";

export default function Header() {
  const [n, setN] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => setMenuOpen(false), [location.pathname, location.search]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  useEffect(() => {
    const f = () => setN(getCart().reduce((a, b) => a + b.quantity, 0));
    f();
    addEventListener("cartchange", f);
    return () => removeEventListener("cartchange", f);
  }, []);
  return (
    <>
      <div className="lux-topbar">
        <span>◈ Miễn phí vận chuyển cho đơn từ 2.000.000₫</span>
        <span>
          <Gem size={13} /> Vàng · Bạc 925 · Ngọc trai · Đá quý
        </span>
        <Link to="/appointments" className="salon-booking-link">
          <CalendarDays size={13} /> Đặt lịch hẹn tư vấn riêng Private Salon
        </Link>
      </div>
      <header className="lux-header">
        <Link className="lux-logo" to="/">
          <b>MIRA</b>
          <span>FINE JEWELRY · ATELIER</span>
        </Link>
        <nav
          id="primary-navigation"
          aria-label="Điều hướng chính"
          className={`lux-nav ${menuOpen ? "menu-open" : ""}`}
        >
          <Link to="/">TRANG CHỦ</Link>
          <Link to="/products">SẢN PHẨM</Link>
          <Link to="/shop?category=Nhẫn">NHẪN</Link>
          <Link to="/shop?category=Dây chuyền">DÂY CHUYỀN & MẶT DÂY</Link>
          <Link to="/shop?category=Bông tai">BÔNG TAI</Link>
          <Link to="/shop?category=Vòng tay">LẮC & VÒNG TAY</Link>
          <Link to="/shop?collection=bac">TRANG SỨC BẠC 925</Link>
          <Link to="/shop?collection=ngoc-trai">NGỌC TRAI</Link>
          <Link to="/about">BESPOKE ATELIER</Link>
        </nav>
        <div className="lux-actions">
          <form
            className="lux-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              navigate(
                `/products${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`,
              );
            }}
          >
            <input
              aria-label="Tìm kiếm trang sức"
              placeholder="Tìm trang sức, chất liệu..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button aria-label="Tìm kiếm" type="submit">
              <Search size={17} />
            </button>
          </form>
          <span className="currency">
            <WalletCards size={15} /> VND
          </span>
          <Link to="/wishlist" aria-label="Sản phẩm yêu thích">
            <Heart size={19} />
          </Link>
          <Link
            className="lux-bag"
            to="/cart"
            aria-label={`Giỏ hàng (${n} sản phẩm)`}
          >
            <ShoppingBag size={19} />
            <b>{n}</b>
          </Link>
          <Link className="user-circle" to="/account" aria-label="Tài khoản">
            <UserRound size={18} />
          </Link>
          <button
            className="mobile-menu-button"
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-controls="primary-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>
    </>
  );
}
