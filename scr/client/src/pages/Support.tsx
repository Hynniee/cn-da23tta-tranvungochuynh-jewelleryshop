import { Link, useLocation, useSearchParams } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { token } from "../lib/api";
import SupportThread from "../components/SupportThread";

export default function Support() {
  const [params] = useSearchParams();
  const location = useLocation();
  const orderId = params.get("order") || undefined;
  const next = encodeURIComponent(location.pathname + location.search);
  return (
    <main className="support-page">
      <Link className="tool-back" to="/account?tab=orders">
        ← Tài khoản & đơn hàng
      </Link>
      <div className="support-page-heading">
        <MessageCircle size={28} />
        <div>
          <span>CHĂM SÓC KHÁCH HÀNG</span>
          <h1>Liên hệ hỗ trợ</h1>
          <p>
            Trò chuyện trực tiếp với nhân viên cửa hàng. Lịch sử được lưu trong
            tài khoản của bạn
          </p>
        </div>
      </div>
      {token() ? (
        <>
          {orderId && (
            <div className="support-order-context">
              Đang trao đổi về đơn hàng{" "}
              <Link
                to={`/account?tab=orders&order=${encodeURIComponent(orderId)}`}
              >
                #{orderId.slice(-8).toUpperCase()}
              </Link>
              <Link to="/support">Bỏ đính kèm</Link>
            </div>
          )}
          <SupportThread
            key={orderId || "general"}
            endpoint="/support/mine"
            orderId={orderId}
          />
        </>
      ) : (
        <section className="support-signin">
          <h2>Đăng nhập để nhắn với MIRA</h2>
          <p>
            Tài khoản giúp bạn nhận phản hồi và xem lại cuộc trò chuyện trên các
            thiết bị
          </p>
          <Link className="gold-btn" to={`/login?next=${next}`}>
            Đăng nhập
          </Link>
          <Link to={`/register?next=${next}`}>Tạo tài khoản</Link>
        </section>
      )}
    </main>
  );
}
