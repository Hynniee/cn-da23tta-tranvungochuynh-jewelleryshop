import { compareProductStock } from "../lib/inventory";
import { categories, orderLabels, orderTransitions } from "../lib/commerce";
import Image from "../components/Image";
import AdminPromotions from "../components/AdminPromotions";
import AdminCustomers from "../components/AdminCustomers";
import AdminMessages from "../components/AdminMessages";
import { defaultProductSizes } from "../lib/product-sizes";
import { readStoredObject } from "../lib/storage";
import { notify } from "../lib/notifications";
import {
  FormEvent,
  Fragment,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  BarChart3,
  ChevronDown,
  Boxes,
  Gem,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
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
  | "overview"
  | "products"
  | "orders"
  | "analytics"
  | "promotions"
  | "customers"
  | "messages";
type Product = {
  _id: string;
  name: string;
  slug: string;
  category: string;
  material: string;
  price: number;
  stock: number;
  sizeStocks?: { size: string; stock: number }[];
  inventoryEstimated?: boolean;
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
  sizes: defaultProductSizes("Nhẫn").join(", "),
  description: "",
  engravingAllowed: false,
  name: "",
  slug: "",
  category: "Nhẫn",
  material: "Vàng Trắng 18K",
  price: "",
  stock: "0",
  sizeStocks: {},
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
  const [params, setParams] = useSearchParams();
  const user = readStoredObject<{
    role?: string;
    name?: string;
    email?: string;
  }>("mira_user", {});
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const navigationRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!window.matchMedia("(max-width: 760px)").matches) return;
    const navigation = navigationRef.current;
    const active = navigation?.querySelector<HTMLElement>("button.active");
    if (navigation && active)
      navigation.scrollLeft = active.offsetLeft - navigation.offsetLeft - 16;
  }, [tab]);
  useEffect(() => {
    const requested = params.get("tab");
    if (
      [
        "overview",
        "products",
        "orders",
        "analytics",
        "promotions",
        "customers",
        "messages",
      ].includes(requested || "")
    )
      setTab(requested as Tab);
  }, [params]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  useEffect(() => {
    if (!token() || !["admin", "manager"].includes(user.role || "")) return;
    const controller = new AbortController();
    let busy = false;
    const refresh = async () => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const data = await request("/support/admin/unread", {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setUnreadMessages(data.count);
      } catch {
        /* The inbox shows connection errors when opened. */
      } finally {
        busy = false;
      }
    };
    void refresh();
    const timer = setInterval(refresh, 10000);
    window.addEventListener("supportchange", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("supportchange", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [user.role]);
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
          : "Chưa kiểm tra được kết nối ghi vào cơ sở dữ liệu",
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
  const [expandedInventory, setExpandedInventory] = useState<string | null>(
    null,
  );
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
          : "Chưa tải được thông báo quản trị",
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
          : "Chưa ghi nhận được thông báo đã xem",
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
  const visibleProducts = products
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort(compareProductStock);

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
      if (existing?.inventoryEstimated && !("sizeStocks" in changes)) {
        const confirmed = productChanges(submittedForm);
        changes.sizeStocks = confirmed.sizeStocks;
        changes.stock = confirmed.stock;
      }
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
          ? `Đã cập nhật sản phẩm · Tồn kho: ${savedProduct.stock}`
          : `Đã thêm sản phẩm vào kho · Tồn kho: ${savedProduct.stock}`,
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
      notify("Đã xóa sản phẩm");
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
        `Đã chuyển đơn ${updated.orderCode || updated._id.slice(-6).toUpperCase()} sang “${ORDER_LABEL[updated.status]}”`,
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
        <p>Vui lòng đăng nhập bằng tài khoản quản trị để tiếp tục</p>
        <Link to="/login">Đăng nhập ADMIN</Link>
      </section>
    );
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link to="/" className="admin-logo">
          MIRA<span>QUẢN TRỊ CỬA HÀNG</span>
        </Link>
        <nav
          className="admin-nav"
          ref={navigationRef}
          aria-label="Quản trị cửa hàng"
        >
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
                id: "messages",
                label: "Tin nhắn",
                icon: <MessageCircle size={17} />,
              },
              {
                id: "promotions",
                label: "Khuyến mãi",
                icon: <Tags size={17} />,
              },
              {
                id: "analytics",
                label: "Thống kê",
                icon: <BarChart3 size={17} />,
              },
            ] as { id: Tab; label: string; icon: ReactNode }[]
          ).map((item) => {
            const notice =
              item.id === "messages"
                ? {
                    count: unreadMessages,
                    message: `${unreadMessages} tin nhắn khách hàng chưa đọc`,
                  }
                : item.id === "overview"
                  ? undefined
                  : notifications[item.id];
            return (
              <button
                key={item.id}
                className={tab === item.id ? "active" : ""}
                onClick={() => {
                  setTab(item.id);
                  setParams({ tab: item.id });
                }}
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
          <button
            onClick={logout}
            aria-label="Đăng xuất quản trị"
            title="Đăng xuất"
          >
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
                ? "Tổng quan cửa hàng"
                : tab === "products"
                  ? "Quản lý sản phẩm"
                  : tab === "orders"
                    ? "Quản lý đơn hàng"
                    : tab === "customers"
                      ? "Quản lý khách hàng"
                      : tab === "messages"
                        ? "Tin nhắn khách hàng"
                        : tab === "promotions"
                          ? "Khuyến mãi & mã giảm giá"
                          : "Thống kê kinh doanh"}
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
        {tab === "messages" && <AdminMessages />}
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
                  .sort(compareProductStock)
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
                  <p className="admin-empty">Tồn kho đang ổn định</p>
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
                  <b>Chưa thể thêm hoặc sửa sản phẩm</b> {writeWarning}
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
            <p className="admin-inventory-order">
              Ưu tiên sản phẩm hết hàng, sau đó đến tồn kho thấp
            </p>
            <div className="product-admin-table">
              <div className="table-head">
                <span>Sản phẩm</span>
                <span>Danh mục</span>
                <span>Giá</span>
                <span>Tồn kho</span>
                <span></span>
              </div>
              {visibleProducts.map((p) => (
                <Fragment key={p._id}>
                  <div className="table-row">
                    <span className="product-cell">
                      <Image src={p.images?.[0] || "/placeholder.svg"} />
                      <span>
                        <b>{p.name}</b>
                        <small>{p.slug}</small>
                      </span>
                    </span>
                    <span>{p.category}</span>
                    <span>{money(p.price)}</span>
                    <div className="inventory-cell">
                      <div className="inventory-total">
                        <b className={p.stock <= 5 ? "stock-low" : ""}>
                          {p.stock}
                        </b>
                        <span>SP</span>
                      </div>
                      {!!p.sizeStocks?.length && (
                        <button
                          type="button"
                          className="inventory-toggle"
                          aria-expanded={expandedInventory === p._id}
                          aria-controls={`inventory-${p._id}`}
                          onClick={() =>
                            setExpandedInventory((current) =>
                              current === p._id ? null : p._id,
                            )
                          }
                        >
                          {p.sizeStocks.length} kích cỡ{" "}
                          <ChevronDown size={14} aria-hidden="true" />
                        </button>
                      )}
                    </div>
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
                      <button
                        aria-label={`Xóa ${p.name}`}
                        title="Xóa sản phẩm"
                        onClick={() => deleteProduct(p._id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </span>
                  </div>
                  {expandedInventory === p._id && (
                    <div
                      className="product-inventory-panel"
                      id={`inventory-${p._id}`}
                    >
                      <div className="inventory-panel-heading">
                        <b>Tồn kho theo kích cỡ</b>
                        <span>{p.name}</span>
                      </div>
                      <div className="inventory-size-grid">
                        {p.sizeStocks?.map((row) => (
                          <div
                            key={row.size}
                            className={`inventory-size-item ${row.stock === 0 ? "is-empty" : row.stock <= 2 ? "is-low" : ""}`}
                          >
                            <span>Size {row.size}</span>
                            <b>
                              {row.stock === 0 ? "Hết hàng" : `${row.stock} SP`}
                            </b>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Fragment>
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
              orders={
                params.get("order")
                  ? orders.filter((order) => order._id === params.get("order"))
                  : orders
              }
              onStatus={updateOrder}
              updatingOrders={updatingOrders}
            />
            {params.get("order") && (
              <Link className="tool-back" to="/admin?tab=orders">
                Xem tất cả đơn hàng →
              </Link>
            )}
          </section>
        )}
        {tab === "analytics" && (
          <section className="admin-card admin-full">
            <CardTitle title="Thống kê kinh doanh" />
            {analytics ? (
              <>
                <p>
                  Toàn bộ thời gian · Doanh thu gồm phí giao hàng, sau giảm giá;
                  chỉ tính đơn đã thanh toán và chưa hủy
                </p>
                <div className="admin-stats">
                  <Stat
                    icon={<ShoppingBag />}
                    label="Tổng đơn hàng"
                    value={String(analytics.commerce?.totalOrders || 0)}
                    note="Tất cả trạng thái"
                  />
                  <Stat
                    icon={<BarChart3 />}
                    label="Doanh thu đã thanh toán"
                    value={money(analytics.commerce?.revenue || 0)}
                    note={`${analytics.commerce?.revenueOrders || 0} đơn được ghi nhận`}
                  />
                  <Stat
                    icon={<PackageCheck />}
                    label="Giá trị trung bình đơn"
                    value={money(analytics.commerce?.averageOrderValue || 0)}
                    note="Trên đơn ghi nhận doanh thu"
                  />
                  <Stat
                    icon={<Boxes />}
                    label="Tổng tồn kho"
                    value={String(analytics.commerce?.inventory?.units || 0)}
                    note={`${analytics.commerce?.inventory?.lowStock || 0} sản phẩm còn ≤ 5; ${analytics.commerce?.inventory?.soldOut || 0} hết hàng`}
                  />
                </div>
                <div className="commerce-reports">
                  <section>
                    <h3>Đơn hàng theo trạng thái</h3>
                    {Object.entries(ORDER_LABEL).map(([status, label]) => (
                      <div className="report-row" key={status}>
                        <span>{label}</span>
                        <b>
                          {analytics.commerce?.statusCounts?.find(
                            (row: any) => row._id === status,
                          )?.count || 0}
                        </b>
                      </div>
                    ))}
                  </section>
                  <section>
                    <h3>Doanh thu theo tháng</h3>
                    <small>
                      12 tháng tạo đơn gần nhất có doanh thu · Giờ Việt Nam
                    </small>
                    {analytics.commerce?.monthlyRevenue?.length ? (
                      analytics.commerce.monthlyRevenue.map((row: any) => (
                        <div className="report-row" key={row._id}>
                          <span>
                            {row._id} · {row.orders} đơn
                          </span>
                          <b>{money(row.revenue)}</b>
                        </div>
                      ))
                    ) : (
                      <p>Chưa có doanh thu</p>
                    )}
                  </section>
                  <section>
                    <h3>Sản phẩm bán chạy</h3>
                    <small>
                      Theo số lượng trong đơn đã hoàn tất · Doanh số sản phẩm
                      trước voucher và phí giao hàng
                    </small>
                    {analytics.commerce?.bestSellers?.length ? (
                      analytics.commerce.bestSellers.map((row: any) => (
                        <div className="report-row" key={row._id}>
                          <span>
                            {row.name} · {row.quantity} SP
                          </span>
                          <b>{money(row.revenue)}</b>
                        </div>
                      ))
                    ) : (
                      <p>Chưa có đơn hoàn tất</p>
                    )}
                  </section>
                </div>
              </>
            ) : (
              <p role="status">
                Chưa tải được thống kê. Vui lòng tải lại trang
              </p>
            )}
            <h3>Hiệu quả hệ thống thông minh</h3>
            <div className="admin-stats">
              <Stat
                icon={<BarChart3 />}
                label="Lượt tương tác"
                value={String(analytics?.events || 0)}
                note="Dữ liệu hành vi đã ghi nhận"
              />
              <Stat
                icon={<Gem />}
                label="Lượt gợi ý sản phẩm"
                value={String(analytics?.recommendations || 0)}
                note={`CTR ${((analytics?.recommendationCTR || 0) * 100).toFixed(1)}%`}
              />
              <Stat
                icon={<Users />}
                label="Lượt tư vấn AI"
                value={String(analytics?.aiConversations || 0)}
                note="Lượt tư vấn Gemini"
              />
              <Stat
                icon={<PackageCheck />}
                label="Đơn đã thanh toán"
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
                    setForm({
                      ...form,
                      category: e.target.value,
                      sizes: defaultProductSizes(e.target.value).join(", "),
                    })
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
                  required={!form.sizes.trim()}
                  readOnly={!!form.sizes.trim()}
                  type="number"
                  min="0"
                  step="1"
                  value={
                    form.sizes.trim()
                      ? [
                          ...new Set(
                            form.sizes
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          ),
                        ].reduce(
                          (sum, size) =>
                            sum + Number(form.sizeStocks?.[size] || 0),
                          0,
                        )
                      : form.stock
                  }
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
                Size đang bán (cách nhau bằng dấu phẩy)
                <input
                  required={defaultProductSizes(form.category).length > 0}
                  value={form.sizes}
                  onChange={(e) => setForm({ ...form, sizes: e.target.value })}
                  placeholder="Ví dụ: 10, 12, 14 hoặc 40 cm, 45 cm"
                />
                <small>
                  Nhập số size hoặc số đo cụ thể. Phụ kiện không phân size có
                  thể để trống
                </small>
              </label>
              {!!form.sizes.trim() && (
                <fieldset className="form-wide size-inventory-editor">
                  <legend>Tồn kho theo kích cỡ / phân loại</legend>
                  {editingId &&
                    products.find((p) => p._id === editingId)
                      ?.inventoryEstimated && (
                      <p role="status">
                        Tồn kho cũ đang tạm chia đều cho các size. Hãy kiểm kê,
                        nhập số lượng thực tế và lưu sản phẩm
                      </p>
                    )}
                  <p>
                    Tổng tồn kho tự tính từ từng size. Size có tồn kho 0 sẽ tạm
                    hết hàng
                  </p>
                  <div>
                    {[
                      ...new Set(
                        form.sizes
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      ),
                    ].map((size) => (
                      <label key={size}>
                        Size {size}
                        <input
                          aria-label={`Tồn kho size ${size}`}
                          type="number"
                          min="0"
                          step="1"
                          required
                          value={form.sizeStocks?.[size] ?? "0"}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              sizeStocks: {
                                ...form.sizeStocks,
                                [size]: e.target.value,
                              },
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
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
                        "Vui lòng chọn ảnh JPG, PNG hoặc WebP, dung lượng tối đa 5 MB",
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
                  diện
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
      {orders.length === 0 && <p className="admin-empty">Chưa có đơn hàng</p>}
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
          <span>Đã kiểm tra và nhận đủ {money(order.total)} chuyển khoản</span>
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
