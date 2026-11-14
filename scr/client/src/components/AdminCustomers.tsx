import { FormEvent, useEffect, useState } from "react";
import { request } from "../lib/api";
import { orderLabels } from "../lib/commerce";
type Customer = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  orders?: number;
  spent?: number;
};
const money = (value: number) =>
  `${Number(value || 0).toLocaleString("vi-VN")}₫`;
const statuses = orderLabels;
export default function AdminCustomers({
  onViewed,
  refreshKey = 0,
}: {
  onViewed?: () => Promise<void>;
  refreshKey?: number;
}) {
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const [data, setData] = useState<{
    customers: Customer[];
    total: number;
    pages: number;
  } | null>(null);
  const [selected, setSelected] = useState(""),
    [detail, setDetail] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      request(`/customers?search=${encodeURIComponent(search)}&page=${page}`, {
        signal: controller.signal,
      })
        .then((result) => {
          setData(result);
          void onViewed?.();
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, page, revision, refreshKey]);
  useEffect(() => {
    setDetail(null);
    setSaved(false);
    if (!selected) return;
    const controller = new AbortController();
    request(`/customers/${selected}`, { signal: controller.signal })
      .then((result) => {
        setDetail(result);
        setForm({
          name: result.customer.name,
          phone: result.customer.phone || "",
        });
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [selected]);
  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const customer = await request(`/customers/${selected}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setDetail((previous: any) => ({ ...previous, customer }));
      setRevision((n) => n + 1);
      setSaved(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="admin-card admin-full customer-management">
      <div className="admin-toolbar">
        <h2>Khách hàng ({data?.total || 0})</h2>
        <label className="admin-search">
          Tìm kiếm
          <input
            aria-label="Tìm khách hàng"
            placeholder="Tên, email, số điện thoại"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading && <p role="status">Đang tải khách hàng…</p>}
      <div className="decision-table-scroll">
        <table className="decision-table">
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th>Liên hệ</th>
              <th>Số đơn</th>
              <th>Đã thanh toán</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              data?.customers.map((customer) => (
                <tr key={customer._id}>
                  <td>{customer.name}</td>
                  <td>
                    {customer.email}
                    <br />
                    {customer.phone}
                  </td>
                  <td>{customer.orders}</td>
                  <td>{money(customer.spent || 0)}</td>
                  <td>
                    <button
                      onClick={() => setSelected(customer._id)}
                      disabled={saving}
                    >
                      Xem / sửa
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!loading && !data?.customers.length && (
        <p>Không có khách hàng phù hợp</p>
      )}
      <nav className="decision-actions" aria-label="Phân trang khách hàng">
        <button
          disabled={page <= 1 || loading}
          onClick={() => setPage((n) => n - 1)}
        >
          Trang trước
        </button>
        <span>
          Trang {page} / {data?.pages || 1}
        </span>
        <button
          disabled={page >= (data?.pages || 1) || loading}
          onClick={() => setPage((n) => n + 1)}
        >
          Trang sau
        </button>
      </nav>
      {selected && (
        <section className="customer-detail">
          <div className="decision-actions">
            <h3>Hồ sơ khách hàng</h3>
            <button disabled={saving} onClick={() => setSelected("")}>
              Đóng hồ sơ
            </button>
          </div>
          {!detail ? (
            <p role="status">Đang tải hồ sơ…</p>
          ) : (
            <>
              <p>
                {detail.customer.email} · Tham gia{" "}
                {new Date(detail.customer.createdAt).toLocaleDateString(
                  "vi-VN",
                )}
              </p>
              <form className="decision-controls" onSubmit={save}>
                <label>
                  Họ tên
                  <input
                    required
                    maxLength={100}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label>
                  Số điện thoại
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </label>
                <button className="admin-primary" disabled={saving}>
                  {saving ? "Đang lưu…" : "Lưu thông tin"}
                </button>
              </form>
              {saved && <p role="status">Đã lưu thông tin khách hàng</p>}
              <h3>Lịch sử đơn hàng (tối đa 100 đơn gần nhất)</h3>
              <div className="decision-table-scroll">
                <table className="decision-table">
                  <thead>
                    <tr>
                      <th>Mã đơn</th>
                      <th>Ngày đặt</th>
                      <th>Trạng thái</th>
                      <th>Tổng tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.orders.map((order: any) => (
                      <tr key={order._id}>
                        <td>{order.orderCode}</td>
                        <td>
                          {new Date(order.createdAt).toLocaleDateString(
                            "vi-VN",
                          )}
                        </td>
                        <td>{statuses[order.status] || order.status}</td>
                        <td>{money(order.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!detail.orders.length && <p>Khách hàng chưa có đơn hàng</p>}
            </>
          )}
        </section>
      )}
    </section>
  );
}
