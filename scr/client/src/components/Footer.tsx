import { Headphones, LockKeyhole, ShieldCheck, Gem } from "lucide-react";
import { Link } from "react-router-dom";
export default function Footer() {
  return (
    <>
      <section className="salon-strip">
        <div>
          <span className="eyebrow">DỊCH VỤ KHÁCH HÀNG THƯỢNG LƯU</span>
          <h2>Đặt Lịch Tư Vấn Riêng Tại Private Salon</h2>
          <p>
            Trải nghiệm trang sức MIRA trong không gian riêng tư và nhận tư vấn
            trực tiếp từ chuyên viên.
          </p>
          <div className="salon-points">
            <span>
              <Gem size={15} /> TP. Hồ Chí Minh
            </span>
            <span>
              <Gem size={15} /> Hà Nội
            </span>
          </div>
        </div>
        <div className="salon-consultation">
          <h3>Buổi hẹn dành riêng cho bạn</h3>
          <p>
            Chọn Salon, thời gian và chia sẻ mong muốn của bạn. MIRA sẽ chuẩn bị
            buổi tư vấn và gửi thông tin lịch hẹn qua email.
          </p>
          <Link to="/appointments" className="gold-btn">
            ĐẶT LỊCH TƯ VẤN
          </Link>
        </div>
      </section>
      <footer className="lux-footer">
        <div className="footer-brand">
          <div className="footer-logo">MIRA</div>
          <p>
            Nhà chế tác kim hoàn và trang sức tuyển chọn, tôn vinh vẻ đẹp vượt
            thời gian bằng ngôn ngữ thiết kế tinh giản.
          </p>
          <div className="certs">
            <span>
              <Gem size={16} /> Chất liệu minh bạch
            </span>
            <span>
              <ShieldCheck size={16} /> Conflict-Free
            </span>
          </div>
        </div>
        <div>
          <b>TUYỆT TÁC KIM HOÀN</b>
          <a href="/products">Tất Cả Sản Phẩm</a>
          <a href="/shop">Nhẫn & Trang Sức Vàng</a>
          <a href="/shop">Trang Sức Cưới</a>
          <a href="/shop?collection=bac">Trang Sức Bạc 925</a>
          <a href="/shop?collection=ngoc-trai">Trang Sức Ngọc Trai</a>
        </div>
        <div>
          <b>DỊCH VỤ & ĐẶC QUYỀN</b>
          <span>Dịch Vụ Chế Tác Bespoke</span>
          <span>Bảo Dưỡng Trang Sức</span>
          <span>Chính Sách Thu Đổi</span>
          <Link to="/appointments">Đặt Lịch Private Salon</Link>
        </div>
        <div>
          <b>PRIVATE PREVIEW</b>
          <p>Khám phá các thiết kế trong bộ sưu tập hiện tại.</p>
          <a href="/shop">XEM BỘ SƯU TẬP →</a>
        </div>
      </footer>
      <div className="footer-bottom">
        <span>© 2026 MIRA Fine Jewelry & Atelier.</span>
        <span>
          <LockKeyhole size={13} /> THANH TOÁN BẢO MẬT SSL 256-BIT
        </span>
      </div>
      <a href="/advisor" className="concierge">
        <span></span> CONCIERGE 24/7 <Headphones size={16} />
      </a>
    </>
  );
}
