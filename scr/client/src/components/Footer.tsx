import { LockKeyhole, ShieldCheck, Gem } from "lucide-react";
import { Link } from "react-router-dom";
export default function Footer() {
  return (
    <>
      <section className="salon-strip">
        <div>
          <span className="eyebrow">TRẢI NGHIỆM TẠI SALON</span>
          <h2>Đặt lịch tư vấn tại salon</h2>
          <p>
            Trải nghiệm trang sức MIRA trong không gian riêng tư và nhận tư vấn
            trực tiếp từ chuyên viên
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
            Chọn salon, thời gian và chia sẻ mong muốn của bạn. MIRA sẽ chuẩn bị
            buổi tư vấn và gửi thông tin lịch hẹn qua email.
          </p>
          <Link to="/appointments" className="gold-btn">
            Đặt lịch tư vấn
          </Link>
        </div>
      </section>
      <footer className="lux-footer">
        <div className="footer-brand">
          <div className="footer-logo">MIRA</div>
          <p>
            Nhà chế tác kim hoàn và trang sức tuyển chọn, tôn vinh vẻ đẹp vượt
            thời gian bằng ngôn ngữ thiết kế tinh giản
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
          <Link to="/products">Tất cả sản phẩm</Link>
          <Link to="/shop?collection=vang">Nhẫn & trang sức vàng</Link>
          <Link to="/shop?collection=cuoi">Trang sức cưới</Link>
          <Link to="/shop?collection=bac">Trang sức bạc 925</Link>
          <Link to="/shop?collection=ngoc-trai">Trang sức ngọc trai</Link>
        </div>
        <div>
          <b>DỊCH VỤ & ĐẶC QUYỀN</b>
          <Link to="/services/bespoke">Dịch vụ chế tác riêng</Link>
          <Link to="/services/maintenance">Bảo dưỡng trang sức</Link>
          <Link to="/policies/exchange">Chính sách thu đổi</Link>
          <Link to="/appointments">Đặt lịch tại salon</Link>
          <Link to="/support">Liên hệ hỗ trợ</Link>
        </div>
        <div>
          <b>KHÁM PHÁ MIRA</b>
          <p>Khám phá các thiết kế trong bộ sưu tập hiện tại</p>
          <a href="/shop">Xem bộ sưu tập →</a>
        </div>
      </footer>
      <div className="footer-bottom">
        <span>© 2026 MIRA Fine Jewelry & Atelier</span>
        <span>
          <LockKeyhole size={13} /> THANH TOÁN BẢO MẬT SSL 256-BIT
        </span>
      </div>
    </>
  );
}
