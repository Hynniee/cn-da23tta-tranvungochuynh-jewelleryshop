import { ChevronDown } from "lucide-react";
import { orderLabels } from "../lib/commerce";
import { readStoredObject } from "../lib/storage";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { request, token } from "../lib/api";
import AccountGuest from "../components/AccountGuest";
import AddressBook from "../components/AddressBook";
import WishlistProducts from "../components/WishlistProducts";
import { notify } from "../lib/notifications";
import OrderDetailsDialog, {
  CustomerOrder,
} from "../components/OrderDetailsDialog";

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
type AccountTab = "profile" | "orders" | "address" | "wishlist";

export default function Account() {
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const selectedOrderId = params.get("order");
  const requestedTab = params.get("tab");
  const tab = selectedOrderId
    ? "orders"
    : ["orders", "address", "wishlist"].includes(requestedTab || "")
      ? requestedTab
      : "profile";
  function setTab(value: AccountTab) {
    setParams({ tab: value });
    setMenuOpen(false);
  }
  function closeOrder() {
    const next = new URLSearchParams(params);
    next.delete("order");
    next.set("tab", "orders");
    setParams(next, { replace: true });
  }
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [ordersRetry, setOrdersRetry] = useState(0);
  const selectedOrder = orders.find((order) => order._id === selectedOrderId);
  const updatePayment = useCallback(
    (id: string, update: { status: string; paymentStatus: string }) => {
      setOrders((current) =>
        current.map((order) =>
          order._id === id ? { ...order, ...update } : order,
        ),
      );
    },
    [],
  );
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
      setMessage("");
      notify("Đã hủy đơn hàng");
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
  }, []);

  useEffect(() => {
    if (!token()) return;
    const controller = new AbortController();
    setOrdersLoading(true);
    setOrdersError("");
    request("/orders/mine", { signal: controller.signal })
      .then((result: CustomerOrder[]) => {
        if (!controller.signal.aborted) setOrders(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setOrdersError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setOrdersLoading(false);
      });
    return () => controller.abort();
  }, [ordersRetry]);

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
      setMessage("");
      notify("Đã lưu thông tin cá nhân");
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
        <h1>Tài khoản của tôi</h1>
        <span>
          Quản lý hồ sơ, đơn hàng và những đặc quyền dành riêng cho bạn
        </span>
      </section>
      <div className="account-shell">
        <aside className={`account-side ${menuOpen ? "is-open" : ""}`}>
          <div className="account-person">
            <div className="account-avatar">{initials}</div>
            <div>
              <strong>{user.name || "Khách hàng MIRA"}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <button
            type="button"
            className="account-navigation-toggle"
            aria-expanded={menuOpen}
            aria-controls="account-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            Mục tài khoản <ChevronDown size={17} aria-hidden="true" />
          </button>
          <nav
            className="account-menu"
            id="account-navigation"
            aria-label="Mục tài khoản"
          >
            <button
              className={tab === "profile" ? "active" : ""}
              aria-current={tab === "profile" ? "page" : undefined}
              onClick={() => setTab("profile")}
            >
              Thông tin cá nhân
            </button>
            <button
              className={tab === "orders" ? "active" : ""}
              aria-current={tab === "orders" ? "page" : undefined}
              onClick={() => setTab("orders")}
            >
              Đơn hàng của tôi <b>{orders.length}</b>
            </button>
            <button
              className={tab === "address" ? "active" : ""}
              aria-current={tab === "address" ? "page" : undefined}
              onClick={() => setTab("address")}
            >
              Sổ địa chỉ
            </button>
            <button
              className={tab === "wishlist" ? "active" : ""}
              aria-current={tab === "wishlist" ? "page" : undefined}
              onClick={() => setTab("wishlist")}
            >
              Danh sách yêu thích
            </button>
            <Link to="/support">Liên hệ hỗ trợ</Link>
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
                  <h2>Thông tin cá nhân</h2>
                </div>
                <span>Thông tin của bạn được MIRA bảo mật</span>
              </header>
              <form className="account-form" onSubmit={save}>
                <label>
                  <span>Họ và tên</span>
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
                  <span>Số điện thoại</span>
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
                  <h2>Đơn hàng của tôi</h2>
                </div>
              </header>
              {ordersLoading ? (
                <p role="status">Đang tải đơn hàng…</p>
              ) : ordersError ? (
                <div className="account-empty" role="alert">
                  <p>{ordersError}</p>
                  <button
                    type="button"
                    className="ui-secondary"
                    onClick={() => setOrdersRetry((value) => value + 1)}
                  >
                    Tải lại đơn hàng
                  </button>
                </div>
              ) : !orders.length ? (
                <div className="account-empty">
                  <h3>Chưa có đơn hàng nào</h3>
                  <p>Khám phá những thiết kế Fine Jewelry của MIRA</p>
                  <Link to="/shop">KHÁM PHÁ BỘ SƯU TẬP</Link>
                </div>
              ) : (
                <div
                  className="account-orders"
                  tabIndex={0}
                  aria-label="Danh sách đơn hàng"
                >
                  <p className="account-orders-hint">
                    Vuốt ngang để xem đầy đủ thông tin và thao tác
                  </p>
                  <table className="account-orders-table">
                    <colgroup>
                      <col />
                      <col />
                      <col />
                      <col />
                      <col />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Mã đơn hàng</th>
                        <th>Ngày đặt</th>
                        <th>Trạng thái</th>
                        <th>Tổng tiền</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o._id}>
                          <td>
                            <b>
                              {o.orderCode ||
                                `#${o._id.slice(-8).toUpperCase()}`}
                            </b>
                          </td>
                          <td>
                            {new Date(o.createdAt).toLocaleDateString("vi-VN")}
                          </td>
                          <td>
                            <span
                              className={`account-status order-status-${o.status}`}
                            >
                              {orderLabels[o.status] || o.status}
                            </span>
                          </td>
                          <td className="order-total-cell">
                            <strong>{o.total.toLocaleString("vi-VN")} ₫</strong>
                          </td>
                          <td>
                            <div className="account-order-actions">
                              <button
                                type="button"
                                className="order-details-button"
                                onClick={() =>
                                  setParams({ tab: "orders", order: o._id })
                                }
                              >
                                Xem chi tiết
                              </button>
                              {["pending", "pending_payment"].includes(
                                o.status,
                              ) && (
                                <button
                                  type="button"
                                  className="cancel-order"
                                  disabled={busyOrder !== null}
                                  onClick={() => cancelOrder(o._id)}
                                >
                                  {busyOrder === o._id
                                    ? "Đang hủy…"
                                    : "Hủy đơn"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!ordersLoading &&
                !ordersError &&
                selectedOrderId &&
                !selectedOrder && (
                  <p role="alert">
                    Không tìm thấy đơn hàng này trong tài khoản của bạn
                  </p>
                )}
            </div>
          )}

          {tab === "address" && (
            <AddressBook
              name={user.name}
              phone={user.phone}
              legacyAddress={user.address}
            />
          )}

          {tab === "wishlist" && (
            <div className="account-card">
              <header>
                <div>
                  <p>BỘ SƯU TẬP CỦA BẠN</p>
                  <h2>Danh sách yêu thích</h2>
                </div>
              </header>
              <WishlistProducts />
            </div>
          )}

          <div className="account-perks">
            <article>
              <b>01</b>
              <h3>Hẹn gặp tại salon</h3>
              <p>Chọn địa điểm và thời gian tư vấn phù hợp</p>
            </article>
            <article>
              <b>02</b>
              <h3>Chăm sóc trang sức</h3>
              <p>Xem hướng dẫn vệ sinh và bảo quản theo chất liệu</p>
            </article>
            <article>
              <b>03</b>
              <h3>Hỗ trợ từ nhân viên</h3>
              <p>Nhắn cho MIRA khi cần hỗ trợ về đơn hàng</p>
            </article>
          </div>
        </section>
      </div>
      {tab === "orders" && selectedOrder && (
        <OrderDetailsDialog
          key={selectedOrder._id}
          order={selectedOrder}
          transferSubmitted={
            location.state?.transferSubmitted === selectedOrder._id
          }
          onClose={closeOrder}
          onPaymentUpdate={updatePayment}
        />
      )}
    </main>
  );
}
