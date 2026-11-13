import { categories, orderLabels, orderTransitions } from "../lib/commerce";
import Image from "../components/Image";
import AdminPromotions from "../components/AdminPromotions";
import AdminCustomers from "../components/AdminCustomers";
import { readStoredObject } from "../lib/storage";
import { notify } from "../lib/notifications";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  Tags,
  Users,
  X,
} from "lucide-react";
import { request, token } from "../lib/api";
import {
  productForm,
  productChanges,
  type ProductForm,
} from "../lib/product-editor";

type Tab =
  "overview" | "products" | "orders" | "analytics" | "promotions" | "customers";
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
  orderCode?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  createdAt: string;
  customer?: { name?: string; email?: string };
  items?: unknown[];
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
const ORDER_LABEL = orderLabels;

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
  const [notifications, setNotifications] = useState<
    Partial<Record<Tab, { count: number; message: string }>>
  >({});
  const [notificationError, setNotificationError] = useState("");
  const [updatingOrders, setUpdatingOrders] = useState<string[]>([]);
  const pendingOrderUpdates = useRef(new Set<string>());
  const orderVersion = useRef(0);
  const refreshing = useRef(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_PRODUCT);
  const [busy, setBusy] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!showForm) setImageFile(null);
  }, [showForm]);
  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);
  const [error, setError] = useState("");
  const [writeWarning, setWriteWarning] = useState("");
  const [checkingWrite, setCheckingWrite] = useState(false);
  async function checkWriteStatus() {
    setCheckingWrite(true);
    try {
      await request("/products/write-status", {
        method: "POST",
        signal: AbortSignal.timeout(5000),
      });
      setWriteWarning("");
    } catch (error) {
      setWriteWarning(
        error instanceof Error
          ? error.message
          : "Chưa kiểm tra được kết nối ghi vào cơ sở dữ liệu.",
      );
    } finally {
      setCheckingWrite(false);
    }
  }
  useEffect(() => {
    if (
      tab === "products" &&
      token() &&
      ["admin", "manager"].includes(user.role || "")
    )
      void checkWriteStatus();
  }, [tab]);
  const [analytics, setAnalytics] = useState<any>(null);
  const productFormRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!showForm) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    document.body.style.overflow = "hidden";
    productFormRef.current
      ?.querySelector<HTMLInputElement>("input")
      ?.focus({ preventScroll: true });
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowForm(false);
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        productFormRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]",
        ) || [],
      ).filter((element) => element.getClientRects().length);
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, [showForm]);

  async function loadNotifications() {
    try {
      setNotifications(await request("/admin/notifications"));
      setNotificationError("");
    } catch (error) {
      setNotificationError(
        error instanceof Error
          ? error.message
          : "Chưa tải được thông báo quản trị.",
      );
    }
  }
  async function readCustomerNotifications() {
    try {
      await request("/admin/notifications/customers/read", { method: "POST" });
      await loadNotifications();
    } catch (error) {
      setNotificationError(
        error instanceof Error
          ? error.message
          : "Chưa ghi nhận được thông báo đã xem.",
      );
    }
  }
  async function loadData() {
    if (refreshing.current) return;
    refreshing.current = true;
    const version = orderVersion.current;
    try {
      const results = await Promise.allSettled([
        request("/products").then(setProducts),
        request("/orders").then((nextOrders) => {
          if (version === orderVersion.current) setOrders(nextOrders);
        }),
        request("/analytics")
          .then(setAnalytics)
          .catch(() => undefined),
        loadNotifications(),
      ]);
      const failure = results.find((result) => result.status === "rejected");
      if (failure?.status === "rejected") throw failure.reason;
    } finally {
      refreshing.current = false;
    }
  }

  useEffect(() => {
    if (!token() || !["admin", "manager"].includes(user.role || "")) return;
    const refresh = () => {
      if (!document.hidden) void loadData().catch((e) => setError(e.message));
    };
    refresh();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [tab]);

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
      const existing = editingId
        ? products.find((product) => product._id === editingId)
        : undefined;
      // Validate fields before uploading so invalid forms do not leave unused files.
      const initialChanges = productChanges(
        form,
        existing ? productForm(existing) : undefined,
      );
      if (editingId && !imageFile && !Object.keys(initialChanges).length) {
        setShowForm(false);
        return;
      }
      // Check writes before uploading; a readable secondary cannot save edits.
      await request("/products/write-status", {
        method: "POST",
        signal: AbortSignal.timeout(5000),
      });
      setWriteWarning("");
      let submittedForm = form;
      if (imageFile) {
        const result = await request("/uploads/products", {
          method: "POST",
          headers: { "Content-Type": imageFile.type },
          body: imageFile,
        });
        submittedForm = { ...form, image: result.url };
        setForm(submittedForm);
        setImageFile(null);
      }
      const changes = productChanges(
        submittedForm,
        existing ? productForm(existing) : undefined,
      );
      if (existing && "images" in changes) {
        changes.images = submittedForm.image.trim()
          ? [submittedForm.image.trim(), ...(existing.images?.slice(1) || [])]
          : existing.images?.slice(1) || [];
      }
      if (editingId && !Object.keys(changes).length) {
        setShowForm(false);
        return;
      }
      const savedProduct: Product = await request(
        editingId ? `/products/${editingId}` : "/products",
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(changes),
        },
      );
      // Use the confirmed write response. A secondary read can still show the
      // previous document while replication catches up.
      setProducts((current) =>
        editingId
          ? current.map((product) =>
              product._id === savedProduct._id ? savedProduct : product,
            )
          : [savedProduct, ...current],
      );
      notify(
        editingId
          ? `Đã cập nhật sản phẩm. Tồn kho: ${Number(form.stock)}.`
          : `Đã thêm sản phẩm vào kho. Tồn kho: ${savedProduct.stock}.`,
      );
      setForm(EMPTY_PRODUCT);
      setEditingId(null);
      setShowForm(false);
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
      notify("Đã xóa sản phẩm.");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể xóa sản phẩm");
    }
  }

  async function updateOrder(
    id: string,
    status: string,
    confirmPayment = false,
  ) {
    if (pendingOrderUpdates.current.has(id)) return;
    pendingOrderUpdates.current.add(id);
    orderVersion.current++;
    setUpdatingOrders((previous) => [...previous, id]);
    setError("");
    try {
      const updated = await request(`/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, confirmPayment }),
      });
      orderVersion.current++;
      setOrders((previous) =>
        previous.map((order) => (order._id === id ? updated : order)),
      );
      notify(
        `Đã chuyển đơn ${updated.orderCode || updated._id.slice(-6).toUpperCase()} sang “${ORDER_LABEL[updated.status]}”.`,
      );
      await loadNotifications();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể cập nhật đơn");
    } finally {
      orderVersion.current++;
      pendingOrderUpdates.current.delete(id);
      setUpdatingOrders((previous) =>
        previous.filter((orderId) => orderId !== id),
      );
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
          {(
            [
              {
                id: "overview",
                label: "Tổng quan",
                icon: <LayoutDashboard size={17} />,
              },
              { id: "products", label: "Sản phẩm", icon: <Gem size={17} /> },
              {
                id: "orders",
                label: "Đơn hàng",
                icon: <ShoppingBag size={17} />,
              },
              {
                id: "customers",
                label: "Khách hàng",
                icon: <Users size={17} />,
              },
              {
                id: "promotions",
                label: "Khuyến mãi",
                icon: <Tags size={17} />,
              },
              {
                id: "analytics",
                label: "AI & Gợi ý",
                icon: <BarChart3 size={17} />,
              },
            ] as { id: Tab; label: string; icon: ReactNode }[]
          ).map((item) => {
            const notice =
              item.id === "overview" ? undefined : notifications[item.id];
            return (
              <button
                key={item.id}
                className={tab === item.id ? "active" : ""}
                onClick={() => setTab(item.id)}
                aria-label={item.label}
                aria-current={tab === item.id ? "page" : undefined}
                aria-describedby={
                  notice?.count ? `admin-notice-${item.id}` : undefined
                }
                title={
                  notice?.count
                    ? `${item.label}: ${notice.message}`
                    : item.label
                }
              >
                {item.icon}
                <span className="admin-nav-label">{item.label}</span>
                {!!notice?.count && (
                  <>
                    <span
                      className="admin-notification-badge"
                      aria-hidden="true"
                    >
                      {notice.count > 99 ? "99+" : notice.count}
                    </span>
                    <span
                      className="admin-notification-description"
                      id={`admin-notice-${item.id}`}
                    >
                      {notice.message}
                    </span>
                  </>
                )}
              </button>
            );
          })}
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
                    : tab === "customers"
                      ? "Quản Lý Khách Hàng"
                      : tab === "promotions"
                        ? "Voucher, Giảm Giá & Flash Sale"
                        : "Phân Tích AI & Gợi Ý"}
            </h1>
          </div>
          <Link to="/">XEM CỬA HÀNG ↗</Link>
        </header>

        {notificationError && (
          <div className="admin-notification-error" role="alert">
            <p>{notificationError}</p>
            <button onClick={() => void loadNotifications()}>
              Tải lại thông báo
            </button>
          </div>
        )}
        {tab !== "overview" && !!notifications[tab]?.count && (
          <div className="admin-section-notice" role="status">
            <span className="admin-notification-badge" aria-hidden="true">
              {notifications[tab]!.count > 99
                ? "99+"
                : notifications[tab]!.count}
            </span>
            <p>{notifications[tab]!.message}</p>
          </div>
        )}
        {tab === "promotions" && <AdminPromotions products={products} />}
        {tab === "customers" && (
          <AdminCustomers
            onViewed={readCustomerNotifications}
            refreshKey={notifications.customers?.count || 0}
          />
        )}
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
                  updatingOrders={updatingOrders}
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
            {writeWarning && (
              <div className="catalog-notice" role="status">
                <p>
                  <b>Chưa thể thêm hoặc sửa sản phẩm.</b> {writeWarning}
                </p>
                <button
                  type="button"
                  disabled={checkingWrite}
                  onClick={() => void checkWriteStatus()}
                >
                  {checkingWrite ? "Đang kiểm tra..." : "Kiểm tra lại kết nối"}
                </button>
              </div>
            )}
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
                  setError("");
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
                        setForm(productForm(p));
                        setError("");
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
            <p className="admin-order-help">
              Chọn trạng thái mới rồi bấm Cập nhật ở từng đơn. Với đơn chuyển
              khoản chờ thanh toán, xác nhận đã nhận đủ tiền để chuyển sang Đã
              xác nhận.
            </p>
            <OrderTable
              orders={orders}
              onStatus={updateOrder}
              updatingOrders={updatingOrders}
            />
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
        <div
          className="admin-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-form-title"
        >
          <form ref={productFormRef} onSubmit={createProduct}>
            <div className="modal-title">
              <div>
                <span>MIRA CATALOG</span>
                <h2 id="product-form-title">
                  {editingId ? "Cập Nhật Sản Phẩm" : "Thêm Sản Phẩm Mới"}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Đóng form sản phẩm"
                onClick={() => setShowForm(false)}
              >
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
                  aria-label="Danh mục"
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
                  step="1"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </label>
              <label>
                Loại đá / điểm nhấn
                <select
                  aria-label="Loại đá / điểm nhấn"
                  value={form.stone}
                  onChange={(e) => setForm({ ...form, stone: e.target.value })}
                >
                  {[
                    ...new Set([
                      form.stone,
                      "Không đính đá",
                      "Kim cương",
                      "Đá CZ",
                      "Ngọc trai",
                      "Ruby",
                      "Sapphire",
                      "Emerald",
                      "Thạch anh tím",
                      "Zircon",
                    ]),
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
                  disabled={busy}
                  onChange={(e) => {
                    setImageFile(null);
                    setForm({ ...form, image: e.target.value });
                  }}
                  placeholder="https://..."
                />
              </label>
              <div className="form-wide admin-image-upload">
                <label htmlFor="product-image-file">
                  Ảnh sản phẩm từ thiết bị
                </label>
                <input
                  ref={imageInputRef}
                  id="product-image-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    if (
                      !["image/jpeg", "image/png", "image/webp"].includes(
                        file.type,
                      ) ||
                      file.size > 5 * 1024 * 1024 ||
                      !file.size
                    ) {
                      setError(
                        "Vui lòng chọn ảnh JPG, PNG hoặc WebP, dung lượng tối đa 5 MB.",
                      );
                      return;
                    }
                    setError("");
                    setImageFile(file);
                  }}
                />
                <div className="admin-image-controls">
                  <button
                    type="button"
                    className="admin-secondary"
                    disabled={busy}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    Chọn tệp ảnh
                  </button>
                  <span>
                    {imageFile?.name || "JPG, PNG, WebP · Tối đa 5 MB"}
                  </span>
                  {imageFile && (
                    <button
                      type="button"
                      className="admin-secondary"
                      disabled={busy}
                      onClick={() => setImageFile(null)}
                    >
                      Bỏ tệp đã chọn
                    </button>
                  )}
                </div>
                {(imagePreview || form.image) && (
                  <Image
                    className="admin-image-preview"
                    src={imagePreview || form.image}
                    alt="Xem trước ảnh sản phẩm"
                  />
                )}
                <small>
                  Ảnh được tải lên khi bạn bấm Lưu sản phẩm và dùng làm ảnh đại
                  diện.
                </small>
              </div>
            </div>
            <div className="modal-footer">
              {error && (
                <p className="modal-error" role="alert">
                  {error}
                </p>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="admin-secondary"
                  disabled={busy}
                  onClick={() => setShowForm(false)}
                >
                  HỦY
                </button>
                <button className="admin-primary modal-submit" disabled={busy}>
                  {busy ? "ĐANG LƯU..." : "LƯU SẢN PHẨM"}
                </button>
              </div>
            </div>
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
  updatingOrders,
}: {
  orders: Order[];
  onStatus: (id: string, status: string, confirmPayment?: boolean) => void;
  updatingOrders: string[];
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
          <span className="admin-order-code">
            <b title={o.orderCode || o._id}>
              {o.orderCode || `#${o._id.slice(-6).toUpperCase()}`}
            </b>
          </span>
          <span className="admin-order-customer">
            <b>{o.customer?.name || "Khách hàng"}</b>
            <small>{o.customer?.email || ""}</small>
          </span>
          <span className="admin-order-date">{date(o.createdAt)}</span>
          <span className="admin-order-total">
            <b>{money(o.total)}</b>
          </span>
          <span className="admin-order-actions">
            <AdminOrderStatus
              order={o}
              busy={updatingOrders.includes(o._id)}
              onSave={onStatus}
            />
          </span>
        </div>
      ))}
      {orders.length === 0 && <p className="admin-empty">Chưa có đơn hàng.</p>}
    </div>
  );
}

function AdminOrderStatus({
  order,
  busy,
  onSave,
}: {
  order: Order;
  busy: boolean;
  onSave: (id: string, status: string, confirmPayment?: boolean) => void;
}) {
  const [nextStatus, setNextStatus] = useState(order.status);
  const [receivedPayment, setReceivedPayment] = useState(false);
  const code = order.orderCode || order._id.slice(-6).toUpperCase();
  const choices = orderTransitions[order.status] || [];
  const needsPaymentConfirmation =
    order.paymentMethod === "BANK_QR" &&
    order.paymentStatus !== "PAID" &&
    nextStatus === "confirmed";
  useEffect(() => {
    setNextStatus(order.status);
    setReceivedPayment(false);
  }, [order.status, order.paymentStatus]);
  if (!choices.length)
    return (
      <strong className={`order-status-label ${order.status}`}>
        {ORDER_LABEL[order.status] || order.status}
      </strong>
    );
  return (
    <div className="admin-order-status-editor">
      <select
        className={`order-status ${order.status}`}
        value={nextStatus}
        aria-label={`Trạng thái đơn ${code}`}
        disabled={busy}
        aria-busy={busy}
        onChange={(event) => {
          setNextStatus(event.target.value);
          setReceivedPayment(false);
        }}
      >
        {Object.keys(ORDER_LABEL).map((status) => (
          <option
            key={status}
            value={status}
            disabled={status !== order.status && !choices.includes(status)}
          >
            {ORDER_LABEL[status]}
          </option>
        ))}
      </select>
      {needsPaymentConfirmation && (
        <label className="admin-payment-confirmation">
          <input
            type="checkbox"
            checked={receivedPayment}
            disabled={busy}
            onChange={(event) => setReceivedPayment(event.target.checked)}
            aria-label={`Xác nhận đã nhận đủ tiền đơn ${code}`}
          />
          <span>Đã kiểm tra và nhận đủ {money(order.total)} chuyển khoản.</span>
        </label>
      )}
      <button
        type="button"
        className="admin-save-order"
        disabled={
          busy ||
          nextStatus === order.status ||
          (needsPaymentConfirmation && !receivedPayment)
        }
        onClick={() =>
          onSave(
            order._id,
            nextStatus,
            needsPaymentConfirmation && receivedPayment,
          )
        }
        aria-label={`Cập nhật đơn ${code}`}
      >
        {busy ? "Đang lưu…" : "Cập nhật"}
      </button>
    </div>
  );
}
