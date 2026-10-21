import { ArrowLeft, ArrowRight, Heart, Package, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

export default function AccountGuest() {
  return (
    <main className="account-guest" aria-labelledby="account-guest-title">
      <section className="account-guest-card">
        <span className="page-kicker">MIRA PRIVATE CLIENT</span>
        <div className="account-guest-icon" aria-hidden="true">
          <UserRound size={30} strokeWidth={1.3} />
        </div>
        <h1 id="account-guest-title">Bạn chưa đăng nhập</h1>
        <p className="account-guest-description">
          Đăng nhập để quản lý hồ sơ và đơn hàng MIRA.
          <br />
          Mọi thông tin của bạn, trong một không gian riêng.
        </p>
        <div className="account-guest-actions">
          <Link className="account-guest-login" to="/login?next=/account">
            Đăng nhập <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link className="account-guest-register" to="/register?next=/account">
            Tạo tài khoản
          </Link>
        </div>
        <p className="account-guest-note">
          Sau khi đăng nhập, bạn sẽ trở lại trang tài khoản.
        </p>
        <div className="account-guest-benefits">
          <div>
            <UserRound size={20} strokeWidth={1.4} aria-hidden="true" />
            <span>Hồ sơ cá nhân</span>
          </div>
          <div>
            <Package size={20} strokeWidth={1.4} aria-hidden="true" />
            <span>Theo dõi đơn hàng</span>
          </div>
          <div>
            <Heart size={20} strokeWidth={1.4} aria-hidden="true" />
            <span>Trang sức yêu thích</span>
          </div>
        </div>
      </section>
      <Link className="account-guest-explore" to="/products">
        <ArrowLeft size={15} aria-hidden="true" /> Tiếp tục khám phá trang sức
      </Link>
    </main>
  );
}
