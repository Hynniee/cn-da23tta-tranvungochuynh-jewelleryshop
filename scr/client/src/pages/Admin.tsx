import { categories, orderTransitions } from "../lib/commerce";
import Image from "../components/Image";
import { readStoredObject } from "../lib/storage";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  Gem,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { request, token } from "../lib/api";

type Tab = "overview" | "products" | "orders" | "analytics";
type Product = {
  _id: string;
  name: string;
  slug: string;
  category: string;
  material: string;
  price: number;
  stock: number;
  images?: string[];
  featured?: boolean;
  stone?: string;
  sizes?: string[];
  description?: string;
  engravingAllowed?: boolean;
};
type Order = {
  _id: string;
  total: number;
  status: string;
  createdAt: string;
  customer?: { name?: string; email?: string };
  items?: unknown[];
};
type ProductForm = {
  stone: string;
  sizes: string;
  description: string;
  engravingAllowed: boolean;
  name: string;
  slug: string;
  category: string;
  material: string;
  price: string;
  stock: string;
  image: string;
};

const EMPTY_PRODUCT: ProductForm = {
  stone: "Không đính đá",
  sizes: "Tiêu chuẩn",
  description: "",
  engravingAllowed: false,
  name: "",
  slug: "",
  category: "Nhẫn",
  material: "Vàng Trắng 18K",
  price: "",
  stock: "",
  image: "",
};
const ORDER_LABEL: Record<string, string> = {
  pending_payment: "Chờ thanh toán",
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

const money = (value: number) =>
  `${Number(value || 0).toLocaleString("vi-VN")}₫`;
const date = (value: string) => new Date(value).toLocaleDateString("vi-VN");
const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default function Admin() {
  const navigate = useNavigate();
  const user = readStoredObject<{
    role?: string;
    name?: string;
    email?: string;
  }>("mira_user", {});
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_PRODUCT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [analytics, setAnalytics] = useState<any>(null);

  async function loadData() {
    const [productData, orderData] = await Promise.all([
      request("/products"),
      request("/orders"),
    ]);
    setProducts(productData);
    setOrders(orderData);
    request("/analytics")
      .then(setAnalytics)
      .catch(() => undefined);
  }

  useEffect(() => {
    if (token() && ["admin", "manager"].includes(user.role || ""))
      loadData().catch((e) => setError(e.message));
  }, []);

  const revenue = useMemo(
    () =>
      orders
        .filter((o) => o.status === "completed")
        .reduce((sum, o) => sum + Number(o.total || 0), 0),
    [orders],
  );
  const lowStock = useMemo(
    () => products.filter((p) => Number(p.stock) <= 5).length,
    [products],
  );
  const visibleProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  function logout() {
    localStorage.removeItem("mira_token");
    localStorage.removeItem("mira_user");
    navigate("/login");
  }

  async function createProduct(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request(editingId ? `/products/${editingId}` : "/products", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          category: form.category,
          material: form.material,
          stone: form.stone,
          sizes: form.sizes
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          engravingAllowed: form.engravingAllowed,
          price: Number(form.price),
          stock: Number(form.stock),
          images: form.image ? [form.image] : [],
          description:
            form.description.trim() ||
            `${form.name} — trang sức MIRA từ ${form.material}.`,
        }),
      });
      setForm(EMPTY_PRODUCT);
      setEditingId(null);
      setShowForm(false);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể lưu sản phẩm");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProduct(id: string) {
    if (!window.confirm("Xóa sản phẩm này khỏi cửa hàng?")) return;
    try {
      await request(`/products/${id}`, { method: "DELETE" });
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể xóa sản phẩm");
    }
  }

  async function updateOrder(id: string, status: string) {
    try {
      await request(`/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể cập nhật đơn");
    }
  }

  if (!["admin", "manager"].includes(user.role || "")) {
    return (
      <section className="admin-locked">
        <Gem size={38} />
        <h1>Khu Vực Quản Trị MIRA</h1>
        <p>Vui lòng đăng nhập bằng tài khoản quản trị để tiếp tục.</p>
        <Link to="/login">ĐĂNG NHẬP ADMIN</Link>
      </section>
    );
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link to="/" className="admin-logo">
          MIRA<span>ADMIN CONSOLE</span>
        </Link>
        <nav className="admin-nav">
          <button
            className={tab === "overview" ? "active" : ""}
            onClick={() => setTab("overview")}
          >
            <LayoutDashboard size={17} /> Tổng quan
          </button>
          <button
            className={tab === "products" ? "active" : ""}
            onClick={() => setTab("products")}
          >
            <Gem size={17} /> Sản phẩm
          </button>
          <button
            className={tab === "orders" ? "active" : ""}
            onClick={() => setTab("orders")}
          >
            <ShoppingBag size={17} /> Đơn hàng
          </button>
          <button disabled>
            <Users size={17} /> Khách hàng <small>Soon</small>
          </button>
          <button
            className={tab === "analytics" ? "active" : ""}
            onClick={() => setTab("analytics")}
          >
            <BarChart3 size={17} /> AI & Gợi ý
          </button>
        </nav>
        <div className="admin-user">
          <span>{(user.name || "A").charAt(0)}</span>
          <div>
            <b>{user.name || "Administrator"}</b>
            <small>{user.email}</small>
          </div>
          <button onClick={logout}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <section className="admin-content">
        {error && (
          <p role="alert" className="auth-error">
            {error}
          </p>
        )}
        <header className="admin-top">
          <div>
            <span>MIRA JEWELRY / ADMIN</span>
            <h1>
              {tab === "overview"
                ? "Tổng Quan Cửa Hàng"
                : tab === "products"
                  ? "Quản Lý Sản Phẩm"
                  : tab === "orders"
                    ? "Quản Lý Đơn Hàng"
                    : "Phân Tích AI & Gợi Ý"}
            </h1>
          </div>
          <Link to="/">XEM CỬA HÀNG ↗</Link>
        </header>

        {tab === "overview" && (
          <>
            <div className="admin-stats">
              <Stat
                icon={<Gem />}
                label="Sản phẩm"
                value={String(products.length)}
                note={`${lowStock} sản phẩm sắp hết`}
              />
              <Stat
                icon={<ShoppingBag />}
                label="Tổng đơn hàng"
                value={String(orders.length)}
                note={`${orders.filter((o) => o.status === "pending").length} đơn chờ xác nhận`}
              />
              <Stat
                icon={<PackageCheck />}
                label="Đơn hoàn tất"
                value={String(
                  orders.filter((o) => o.status === "completed").length,
                )}
                note="Đã bàn giao khách hàng"
              />
              <Stat
                icon={<BarChart3 />}
                label="Doanh thu hoàn tất"
                value={money(revenue)}
                note="Từ các đơn đã hoàn tất"
              />
            </div>
            <div className="admin-grid">
              <section className="admin-card">
                <CardTitle
                  title="Đơn hàng gần đây"
                  action="Xem tất cả"
                  onClick={() => setTab("orders")}
                />{" "}
                <OrderTable
                  orders={orders.slice(0, 6)}
                  onStatus={updateOrder}
                />
              </section>
              <section className="admin-card admin-stock">
                <CardTitle
                  title="Tồn kho cần chú ý"
                  action="Quản lý"
                  onClick={() => setTab("products")}
                />
                {products
                  .filter((p) => p.stock <= 5)
                  .slice(0, 6)
                  .map((p) => (
                    <div key={p._id}>
                      <Image src={p.images?.[0] || "/placeholder.svg"} />
                      <span>
                        <b>{p.name}</b>
                        <small>
                          {p.category} · {p.material}
                        </small>
                      </span>
                      <strong>{p.stock} SP</strong>
                    </div>
                  ))}
                {lowStock === 0 && (
                  <p className="admin-empty">Tồn kho đang ổn định.</p>
                )}
              </section>
            </div>
          </>
        )}

        {tab === "products" && (
          <section className="admin-card admin-full">
            <div className="admin-toolbar">
              <div className="admin-search">
                <Search size={15} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tên sản phẩm..."
                />
              </div>
              <button
                className="admin-primary"
                onClick={() => {
                  setEditingId(null);
                  setForm(EMPTY_PRODUCT);
                  setShowForm(true);
                }}
              >
                <Plus size={15} /> THÊM SẢN PHẨM
              </button>
            </div>
            <div className="product-admin-table">
              <div className="table-head">
                <span>Sản phẩm</span>
                <span>Danh mục</span>
                <span>Giá</span>
                <span>Tồn kho</span>
                <span></span>
              </div>
              {visibleProducts.map((p) => (
                <div className="table-row" key={p._id}>
                  <span className="product-cell">
                    <Image src={p.images?.[0] || "/placeholder.svg"} />
                    <span>
                      <b>{p.name}</b>
                      <small>{p.slug}</small>
                    </span>
                  </span>
                  <span>{p.category}</span>
                  <span>{money(p.price)}</span>
                  <span>
                    <b className={p.stock <= 5 ? "stock-low" : ""}>{p.stock}</b>
                  </span>
                  <span className="row-actions">
                    <Link to={`/product/${p.slug}`}>Xem</Link>
                    <button
                      onClick={() => {
                        setEditingId(p._id);
                        setForm({
                          name: p.name,
                          slug: p.slug,
                          category: p.category,
                          material: p.material,
                          price: String(p.price),
                          stock: String(p.stock),
                          image: p.images?.[0] || "",
                          stone: p.stone || "Không đính đá",
                          sizes: p.sizes?.join(", ") || "Tiêu chuẩn",
                          description: p.description || "",
                          engravingAllowed: Boolean(p.engravingAllowed),
                        });
                        setShowForm(true);
                      }}
                    >
                      Sửa
                    </button>
                    <button onClick={() => deleteProduct(p._id)}>
                      <Trash2 size={15} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "orders" && (
          <section className="admin-card admin-full">
            <CardTitle title={`${orders.length} đơn hàng`} />
            <OrderTable orders={orders} onStatus={updateOrder} />
          </section>
        )}
        {tab === "analytics" && (
          <section className="admin-card admin-full">
            <CardTitle title="Hiệu quả hệ thống thông minh" />
            <div className="admin-stats">
              <Stat
                icon={<BarChart3 />}
                label="Behavior events"
                value={String(analytics?.events || 0)}
                note="Dữ liệu hành vi đã ghi nhận"
              />
              <Stat
                icon={<Gem />}
                label="Recommendation sessions"
                value={String(analytics?.recommendations || 0)}
                note={`CTR ${((analytics?.recommendationCTR || 0) * 100).toFixed(1)}%`}
              />
              <Stat
                icon={<Users />}
                label="AI conversations"
                value={String(analytics?.aiConversations || 0)}
                note="Lượt tư vấn Gemini"
              />
              <Stat
                icon={<PackageCheck />}
                label="Paid orders"
                value={String(analytics?.paidOrders || 0)}
                note={`${analytics?.paymentMismatches || 0} giao dịch cần đối soát`}
              />
            </div>
          </section>
        )}
      </section>

      {showForm && (
        <div className="admin-modal">
          <form onSubmit={createProduct}>
            <div className="modal-title">
              <div>
                <span>MIRA CATALOG</span>
                <h2>{editingId ? "Cập Nhật Sản Phẩm" : "Thêm Sản Phẩm Mới"}</h2>
              </div>
              <button type="button" onClick={() => setShowForm(false)}>
                <X />
              </button>
            </div>
            <div className="form-grid">
              <label>
                Tên sản phẩm
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      name: e.target.value,
                      slug:
                        !editingId &&
                        (!current.slug ||
                          current.slug === slugify(current.name))
                          ? slugify(e.target.value)
                          : current.slug,
                    }))
                  }
                />
              </label>
              <label>
                Slug
                <input
                  required
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </label>
              <label>
                Danh mục
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                >
                  {categories.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Chất liệu
                <input
                  required
                  value={form.material}
                  onChange={(e) =>
                    setForm({ ...form, material: e.target.value })
                  }
                />
              </label>
              <label>
                Giá bán
                <input
                  required
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </label>
              <label>
                Tồn kho
                <input
                  required
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </label>
              <label>
                Loại đá / điểm nhấn
                <select
                  value={form.stone}
                  onChange={(e) => setForm({ ...form, stone: e.target.value })}
                >
                  {[
                    "Không đính đá",
                    "Kim cương",
                    "Ngọc trai",
                    "Ruby",
                    "Sapphire",
                    "Emerald",
                    "Thạch anh tím",
                    "Zircon",
                  ].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label>
                Kích cỡ (cách nhau bằng dấu phẩy)
                <input
                  required
                  value={form.sizes}
                  onChange={(e) => setForm({ ...form, sizes: e.target.value })}
                  placeholder="10, 11, 12 hoặc 40cm, 45cm"
                />
              </label>
              <label className="form-wide">
                Mô tả
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </label>
              <label className="form-wide">
                <span>
                  <input
                    type="checkbox"
                    checked={form.engravingAllowed}
                    onChange={(e) =>
                      setForm({ ...form, engravingAllowed: e.target.checked })
                    }
                  />{" "}
                  Hỗ trợ khắc tên
                </span>
              </label>
              <label className="form-wide">
                URL hình ảnh
                <input
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="https://..."
                />
              </label>
            </div>
            <button className="admin-primary modal-submit" disabled={busy}>
              {busy ? "ĐANG LƯU..." : "LƯU SẢN PHẨM"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="admin-stat">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}
function CardTitle({
  title,
  action,
  onClick,
}: {
  title: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="admin-card-title">
      <h2>{title}</h2>
      {action && <button onClick={onClick}>{action} →</button>}
    </div>
  );
}
function OrderTable({
  orders,
  onStatus,
}: {
  orders: Order[];
  onStatus: (id: string, status: string) => void;
}) {
  return (
    <div className="order-admin-table">
      <div className="table-head">
        <span>Mã đơn</span>
        <span>Khách hàng</span>
        <span>Ngày</span>
        <span>Tổng tiền</span>
        <span>Trạng thái</span>
      </div>
      {orders.map((o) => (
        <div className="table-row" key={o._id}>
          <span>
            <b>#{o._id.slice(-6).toUpperCase()}</b>
          </span>
          <span>
            <b>{o.customer?.name || "Khách hàng"}</b>
            <small>{o.customer?.email || ""}</small>
          </span>
          <span>{date(o.createdAt)}</span>
          <span>
            <b>{money(o.total)}</b>
          </span>
          <span>
            <select
              className={`order-status ${o.status}`}
              value={o.status}
              onChange={(e) => onStatus(o._id, e.target.value)}
            >
              {[
                "pending_payment",
                "pending",
                "confirmed",
                "shipping",
                "completed",
                "cancelled",
              ].map((s) => (
                <option
                  key={s}
                  value={s}
                  disabled={
                    s !== o.status && !orderTransitions[o.status]?.includes(s)
                  }
                >
                  {ORDER_LABEL[s]}
                </option>
              ))}
            </select>
          </span>
        </div>
      ))}
      {orders.length === 0 && <p className="admin-empty">Chưa có đơn hàng.</p>}
    </div>
  );
}
