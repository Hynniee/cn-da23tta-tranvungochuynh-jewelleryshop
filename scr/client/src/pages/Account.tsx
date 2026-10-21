import { orderLabels } from "../lib/commerce";
import { readStoredObject } from "../lib/storage";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { request, token } from "../lib/api";
import AccountGuest from "../components/AccountGuest";

type User = {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  birthday?: string;
  gender?: string;
  role?: string;
};
type Order = {
  orderCode?: string;
  _id: string;
  createdAt: string;
  status: string;
  total: number;
};

export default function Account() {
  const nav = useNavigate();
  const [tab, setTab] = useState<"profile" | "orders" | "address" | "wishlist">(
    "profile",
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [user, setUser] = useState<User>(() =>
    readStoredObject<User>("mira_user", { name: "", email: "" }),
  );
  const [form, setForm] = useState<User>(user);
  const [message, setMessage] = useState("");
  const [busyOrder, setBusyOrder] = useState<string | null>(null);
  async function cancelOrder(id: string) {
    setBusyOrder(id);
    try {
      await request(`/orders/${id}/cancel`, { method: "PATCH" });
      setOrders(await request("/orders/mine"));
      setMessage("Đã hủy đơn hàng.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể hủy đơn");
    } finally {
      setBusyOrder(null);
    }
  }

  useEffect(() => {
    if (!token()) return;
    request("/auth/me")
      .then((u: User) => {
        setUser(u);
        setForm(u);
        localStorage.setItem("mira_user", JSON.stringify(u));
      })
      .catch((e) => setMessage(e.message));
    request("/orders/mine")
      .then(setOrders)
      .catch((e) => setMessage(e.message));
  }, []);

  if (!token()) return <AccountGuest />;

  const initials = (form.name || "MIRA")
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((x) => x[0]?.toUpperCase())
    .join("");
  const logout = () => {
    localStorage.removeItem("mira_token");
    localStorage.removeItem("mira_user");
    nav("/login");
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const updated = await request("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      localStorage.setItem("mira_user", JSON.stringify(updated));
      setUser(updated);
      setForm(updated);
      setMessage("Đã lưu thông tin cá nhân.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không thể lưu hồ sơ");
    }
  };

  return (
    <main className="account-page">
      <div className="account-crumb">
        <Link to="/">Trang chủ</Link>
        <span>/</span>
        <span>Tài khoản của tôi</span>
      </div>
      <section className="account-banner">
        <p>MIRA PRIVATE CLIENT</p>
        <h1>Tài Khoản Của Tôi</h1>
        <span>
          Quản lý hồ sơ, đơn hàng và những đặc quyền dành riêng cho bạn.
        </span>
      </section>
      <div className="account-shell">
        <aside className="account-side">
          <div className="account-person">
            <div className="account-avatar">{initials}</div>
            <div>
              <strong>{user.name || "Khách hàng MIRA"}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <nav className="account-menu">
            <button
              className={tab === "profile" ? "active" : ""}
              onClick={() => setTab("profile")}
            >
              Thông tin cá nhân
            </button>
            <button
              className={tab === "orders" ? "active" : ""}
              onClick={() => setTab("orders")}
            >
              Đơn hàng của tôi <b>{orders.length}</b>
            </button>
            <button
              className={tab === "address" ? "active" : ""}
              onClick={() => setTab("address")}
            >
              Sổ địa chỉ
            </button>
            <button
              className={tab === "wishlist" ? "active" : ""}
              onClick={() => setTab("wishlist")}
            >
              Danh sách yêu thích
            </button>
            <button onClick={logout}>Đăng xuất</button>
          </nav>
          <div className="account-tier">
            <small>HẠNG THÀNH VIÊN</small>
            <strong>MIRA GOLD</strong>
            <p>Private Client · Ưu tiên lịch hẹn Salon</p>
            <div>
              <i />
            </div>
            <span>6.800 / 10.000 điểm để lên Platinum</span>
          </div>
        </aside>

        <section className="account-main">
          {message && <p role="status">{message}</p>}
          {tab === "profile" && (
            <div className="account-card">
              <header>
                <div>
                  <p>HỒ SƠ KHÁCH HÀNG</p>
                  <h2>Thông Tin Cá Nhân</h2>
                </div>
                <span>Thông tin của bạn được MIRA bảo mật</span>
              </header>
              <form className="account-form" onSubmit={save}>
                <label>
                  <span>HỌ VÀ TÊN</span>
                  <input
                    value={form.name || ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </label>
                <label>
                  <span>EMAIL</span>
                  <input
                    type="email"
                    readOnly
                    value={form.email || ""}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  <span>SỐ ĐIỆN THOẠI</span>
                  <input
                    value={form.phone || ""}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="09xx xxx xxx"
                  />
                </label>
                <label>
                  <span>NGÀY SINH</span>
                  <input
                    type="date"
                    value={form.birthday || ""}
                    onChange={(e) =>
                      setForm({ ...form, birthday: e.target.value })
                    }
                  />
                </label>
                <label>
                  <span>GIỚI TÍNH</span>
                  <select
                    value={form.gender || "Nữ"}
                    onChange={(e) =>
                      setForm({ ...form, gender: e.target.value })
                    }
                  >
                    <option>Nữ</option>
                    <option>Nam</option>
                    <option>Khác</option>
                  </select>
                </label>
                <label>
                  <span>MẬT KHẨU</span>
                  <div className="account-password">
                    <input value="••••••••••" disabled />
                  </div>
                </label>
                <label>
                  <span>ĐỊA CHỈ GIAO HÀNG</span>
                  <input
                    value={form.address || ""}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                  />
                </label>
                <footer>
                  <span>{message}</span>
                  <button type="submit">LƯU THAY ĐỔI</button>
                </footer>
              </form>
            </div>
          )}

          {tab === "orders" && (
            <div className="account-card">
              <header>
                <div>
                  <p>LỊCH SỬ MUA SẮM</p>
                  <h2>Đơn Hàng Của Tôi</h2>
                </div>
              </header>
              {!orders.length ? (
                <div className="account-empty">
                  <h3>Chưa có đơn hàng nào</h3>
                  <p>Khám phá những thiết kế Fine Jewelry của MIRA.</p>
                  <Link to="/shop">KHÁM PHÁ BỘ SƯU TẬP</Link>
                </div>
              ) : (
                <div className="account-orders">
                  {orders.map((o) => (
                    <article key={o._id}>
                      <div>
                        <small>MÃ ĐƠN HÀNG</small>
                        <b>
                          {o.orderCode || `#${o._id.slice(-8).toUpperCase()}`}
                        </b>
                      </div>
                      <div>
                        <small>NGÀY ĐẶT</small>
                        <span>
                          {new Date(o.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                      <div>
                        <small>TRẠNG THÁI</small>
                        {["pending", "pending_payment"].includes(o.status) && (
                          <button
                            className="cancel-order"
                            disabled={busyOrder !== null}
                            onClick={() => cancelOrder(o._id)}
                          >
                            {busyOrder === o._id ? "Đang hủy..." : "Hủy đơn"}
                          </button>
                        )}
                        <span className="account-status">
                          {orderLabels[o.status] || o.status}
                        </span>
                        {o.status === "pending_payment" && (
                          <Link to={`/checkout?order=${o._id}`}>
                            Thanh toán chuyển khoản
                          </Link>
                        )}
                      </div>
                      <div>
                        <small>TỔNG TIỀN</small>
                        <strong>{o.total.toLocaleString("vi-VN")} ₫</strong>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "address" && (
            <div className="account-card">
              <header>
                <div>
                  <p>GIAO HÀNG</p>
                  <h2>Sổ Địa Chỉ</h2>
                </div>
                <button onClick={() => setTab("profile")}>
                  CẬP NHẬT ĐỊA CHỈ
                </button>
              </header>
              <div className="account-addresses">
                <article>
                  <b>MẶC ĐỊNH</b>
                  <h3>{user.name}</h3>
                  <p>{form.phone || "Chưa cập nhật số điện thoại"}</p>
                  <p>{user.address || "Chưa cập nhật địa chỉ giao hàng."}</p>
                  <button onClick={() => setTab("profile")}>Chỉnh sửa</button>
                </article>
              </div>
            </div>
          )}

          {tab === "wishlist" && (
            <div className="account-card">
              <header>
                <div>
                  <p>BỘ SƯU TẬP CỦA BẠN</p>
                  <h2>Danh Sách Yêu Thích</h2>
                </div>
              </header>
              <div className="account-empty">
                <h3>Lưu lại thiết kế bạn yêu thích</h3>
                <p>Các sản phẩm được đánh dấu trái tim sẽ xuất hiện tại đây.</p>
                <Link to="/wishlist">XEM DANH SÁCH YÊU THÍCH</Link>
              </div>
            </div>
          )}

          <div className="account-perks">
            <article>
              <b>01</b>
              <h3>Private Salon Priority</h3>
              <p>Ưu tiên lịch hẹn riêng cùng chuyên gia MIRA.</p>
            </article>
            <article>
              <b>02</b>
              <h3>Lifetime Jewelry Spa</h3>
              <p>Chăm sóc và vệ sinh trang sức định kỳ.</p>
            </article>
            <article>
              <b>03</b>
              <h3>Birthday Privilege</h3>
              <p>Đặc quyền cá nhân hóa trong tháng sinh nhật.</p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
