import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Gem,
  Heart,
  Search,
  ShoppingBag,
  UserRound,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getCart } from "../store/cart";
import HeaderDropdown from "./HeaderDropdown";

export default function Header() {
  const [n, setN] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [headerHidden, setHeaderHidden] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [search, setSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setMenuOpen(false);
    setOpenMenu(null);
    navigate(
      `/products${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`,
    );
  };
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const measure = () =>
      header.style.setProperty("--header-height", `${header.offsetHeight}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1101px)");
    const closeMobile = () => {
      if (media.matches) setMenuOpen(false);
    };
    media.addEventListener("change", closeMobile);
    return () => media.removeEventListener("change", closeMobile);
  }, []);
  useEffect(() => {
    setMenuOpen(false);
    setOpenMenu(null);
  }, [location.pathname, location.search]);
  useEffect(() => {
    let previousY = window.scrollY;
    setHeaderHidden(false);

    const onScroll = () => {
      const activeElement = document.activeElement;
      // Clamp elastic overscroll so bouncing at either edge cannot hide the header.
      const currentY = Math.max(
        0,
        Math.min(
          window.scrollY,
          document.documentElement.scrollHeight - window.innerHeight,
        ),
      );
      if (
        currentY <= 16 ||
        menuOpen ||
        openMenu ||
        (headerRef.current?.contains(activeElement) &&
          activeElement?.matches("input, textarea, select, :focus-visible"))
      ) {
        setHeaderHidden(false);
        previousY = currentY;
        return;
      }

      // Accumulate small movements without flickering on trackpads.
      if (Math.abs(currentY - previousY) < 8) return;
      setHeaderHidden(
        currentY > previousY &&
          currentY > (headerRef.current?.offsetHeight ?? 0),
      );
      previousY = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen, openMenu, location.pathname, location.search]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (openMenu) {
          setOpenMenu(null);
        } else {
          setMenuOpen(false);
          if (menuOpen) menuButton.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [openMenu, menuOpen]);
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
          <CalendarDays size={13} /> Đặt lịch tư vấn tại salon
        </Link>
      </div>
      {menuOpen && (
        <button
          type="button"
          className="header-menu-backdrop"
          tabIndex={-1}
          onPointerDown={(event) => event.preventDefault()}
          aria-label="Đóng menu điều hướng"
          onClick={() => {
            setMenuOpen(false);
            setOpenMenu(null);
            menuButton.current?.focus();
          }}
        />
      )}
      <header
        ref={headerRef}
        className={`lux-header${headerHidden ? " lux-header--hidden" : ""}`}
        onFocusCapture={() => setHeaderHidden(false)}
        onBlurCapture={(event) => {
          if (
            menuOpen &&
            event.relatedTarget &&
            !event.currentTarget.contains(event.relatedTarget as Node)
          ) {
            setMenuOpen(false);
            setOpenMenu(null);
          }
        }}
      >
        <Link className="lux-logo" to="/">
          <b>MIRA</b>
          <span>FINE JEWELRY · ATELIER</span>
        </Link>
        <nav
          id="primary-navigation"
          aria-label="Điều hướng chính"
          className={`lux-nav ${menuOpen ? "menu-open" : ""}`}
          onClick={(event) => {
            if ((event.target as Element).closest("a")) {
              setMenuOpen(false);
              setOpenMenu(null);
            }
          }}
        >
          <form
            className="header-mobile-search"
            role="search"
            onSubmit={submitSearch}
          >
            <Search size={18} aria-hidden="true" />
            <input
              aria-label="Tìm trang sức trong menu"
              placeholder="Tìm trang sức, chất liệu…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button type="submit" aria-label="Tìm sản phẩm trong menu">
              Tìm
            </button>
          </form>
          <NavLink to="/" end>
            Trang chủ
          </NavLink>
          {[
            {
              id: "products",
              label: "Sản phẩm",
              items: [
                { label: "Tất cả sản phẩm", to: "/products" },
                { label: "Nhẫn", to: "/shop?category=Nhẫn" },
                { label: "Nhẫn cưới", to: "/shop?category=Nhẫn cưới" },
                { label: "Dây chuyền", to: "/shop?category=Dây chuyền" },
                {
                  label: "Mặt dây chuyền",
                  to: "/shop?category=Mặt dây chuyền",
                },
                { label: "Bông tai", to: "/shop?category=Bông tai" },
                { label: "Vòng tay", to: "/shop?category=Vòng tay" },
                { label: "Bộ trang sức", to: "/shop?category=Bộ trang sức" },
                { label: "Lắc chân", to: "/shop?category=Lắc chân" },
                { label: "Charm", to: "/shop?category=Charm" },
              ],
            },
            {
              id: "collections",
              label: "Bộ sưu tập",
              items: [
                { label: "Trang sức vàng", to: "/shop?collection=vang" },
                { label: "Bạc 925", to: "/shop?collection=bac" },
                { label: "Ngọc trai", to: "/shop?collection=ngoc-trai" },
                { label: "Đá màu", to: "/shop?collection=da-mau" },
                { label: "Trang sức kim cương", to: "/shop?stone=Kim cương" },
              ],
            },
          ].map((menu) => (
            <HeaderDropdown
              key={menu.id}
              {...menu}
              open={openMenu === menu.id}
              onToggle={() =>
                setOpenMenu(openMenu === menu.id ? null : menu.id)
              }
              onClose={() => setOpenMenu(null)}
            />
          ))}
          <Link
            aria-current={
              location.pathname === "/shop" &&
              location.search.includes("promotion=active")
                ? "page"
                : undefined
            }
            to="/shop?promotion=active"
          >
            Ưu đãi
          </Link>
          <HeaderDropdown
            id="services"
            label="Dịch vụ"
            open={openMenu === "services"}
            onToggle={() =>
              setOpenMenu(openMenu === "services" ? null : "services")
            }
            onClose={() => setOpenMenu(null)}
            items={[
              {
                label: "Đặt lịch tại salon",
                to: "/appointments",
                description: "Xem trang sức và đo size trực tiếp",
              },
              {
                label: "Hướng dẫn đo size nhẫn",
                to: "/ring-sizer",
                description: "Bảng size và cách đo tại nhà",
              },
              {
                label: "Bảo quản trang sức",
                to: "/jewelry-care",
                description: "Chăm sóc theo từng chất liệu",
              },
              {
                label: "Liên hệ hỗ trợ",
                to: "/support",
                description: "Nhắn tin với nhân viên cửa hàng",
              },
              { label: "Đơn hàng của tôi", to: "/account?tab=orders" },
            ]}
          />
          <NavLink to="/about">Về MIRA</NavLink>
        </nav>
        <div className="lux-actions">
          <form className="lux-search" role="search" onSubmit={submitSearch}>
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
            ref={menuButton}
            className="mobile-menu-button"
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-controls="primary-navigation"
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((open) => !open);
              setOpenMenu(null);
            }}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>
    </>
  );
}
