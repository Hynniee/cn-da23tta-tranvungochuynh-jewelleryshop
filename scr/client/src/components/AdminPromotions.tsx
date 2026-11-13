import { FormEvent, useEffect, useRef, useState } from "react";
import { request } from "../lib/api";
import { notify } from "../lib/notifications";

type Kind = "voucher" | "discount" | "flash_sale";
type Promotion = {
  _id: string;
  name: string;
  type: Kind;
  code?: string;
  discountType: "percent" | "amount";
  value: number;
  minSubtotal: number;
  maxDiscount: number;
  allProducts: boolean;
  productIds: string[];
  startsAt: string;
  endsAt: string;
  active: boolean;
};
const labels: Record<Kind, string> = {
  voucher: "Voucher",
  discount: "Giảm giá",
  flash_sale: "Flash sale",
};
const localTime = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
const empty = (type: Kind) => ({
  name: "",
  type,
  code: "",
  discountType: "percent" as "percent" | "amount",
  value: "10",
  minSubtotal: "0",
  maxDiscount: "0",
  allProducts: type === "voucher",
  productIds: [] as string[],
  startsAt: localTime(new Date()),
  endsAt: localTime(new Date(Date.now() + 7 * 86400000)),
  active: true,
});
const money = (value: number) => value.toLocaleString("vi-VN") + "₫";
export default function AdminPromotions({
  products,
}: {
  products: { _id: string; name: string }[];
}) {
  const [list, setList] = useState<Promotion[]>([]);
  const [kind, setKind] = useState<Kind>("voucher");
  const [form, setForm] = useState<ReturnType<typeof empty> | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [clock, setClock] = useState(Date.now());
  const formRef = useRef<HTMLFormElement>(null);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setList(await request("/promotions"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được khuyến mãi.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const timer = setInterval(() => setClock(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  function start(type: Kind, promotion?: Promotion) {
    setKind(type);
    setEditing(promotion?._id || null);
    setError("");
    setSearch("");
    setForm(
      promotion
        ? {
            ...promotion,
            code: promotion.code || "",
            value: String(promotion.value),
            minSubtotal: String(promotion.minSubtotal),
            maxDiscount: String(promotion.maxDiscount),
            startsAt: localTime(new Date(promotion.startsAt)),
            endsAt: localTime(new Date(promotion.endsAt)),
          }
        : empty(type),
    );
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      formRef.current
        ?.querySelector<HTMLInputElement>("input")
        ?.focus({ preventScroll: true });
    });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form || busy) return;
    setBusy(true);
    setError("");
    try {
      if (new Date(form.endsAt) <= new Date(form.startsAt))
        throw Error("Thời gian kết thúc phải sau thời gian bắt đầu.");
      if (
        form.type !== "voucher" &&
        !form.allProducts &&
        !form.productIds.length
      )
        throw Error("Chọn ít nhất một sản phẩm áp dụng.");
      const saved: Promotion = await request(
        editing ? `/promotions/${editing}` : "/promotions",
        {
          method: editing ? "PUT" : "POST",
          body: JSON.stringify({
            ...form,
            code: form.code.trim().toUpperCase(),
            value: Number(form.value),
            minSubtotal: Number(form.minSubtotal),
            maxDiscount: Number(form.maxDiscount),
            startsAt: new Date(form.startsAt).toISOString(),
            endsAt: new Date(form.endsAt).toISOString(),
          }),
        },
      );
      setList((current) =>
        editing
          ? current.map((p) => (p._id === saved._id ? saved : p))
          : [saved, ...current],
      );
      setForm(null);
      notify(
        editing
          ? "Đã cập nhật chương trình."
          : "Đã thêm chương trình khuyến mãi.",
      );
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được chương trình.");
    } finally {
      setBusy(false);
    }
  }
  async function toggle(p: Promotion) {
    setBusy(true);
    setError("");
    try {
      const saved: Promotion = await request(`/promotions/${p._id}/active`, {
        method: "PATCH",
        body: JSON.stringify({ active: !p.active }),
      });
      setList((current) =>
        current.map((item) => (item._id === saved._id ? saved : item)),
      );
      notify(
        saved.active
          ? "Đã bật chương trình khuyến mãi."
          : "Đã tắt chương trình khuyến mãi.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không thay đổi được trạng thái.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-promotions">
      <div className="promotion-intro">
        <div>
          <span className="page-kicker">MIRA OFFERS</span>
          <h2>Ưu đãi cho từng khoảnh khắc</h2>
          <p>Quản lý mã ưu đãi, giá giảm và những khung giờ flash sale.</p>
        </div>
        <button
          className="admin-primary"
          onClick={() => start(kind)}
          disabled={busy}
        >
          + Thêm {labels[kind].toLowerCase()}
        </button>
      </div>
      <nav className="promotion-tabs" aria-label="Loại khuyến mãi">
        {(Object.keys(labels) as Kind[]).map((type) => (
          <button
            key={type}
            className={kind === type ? "active" : ""}
            aria-pressed={kind === type}
            onClick={() => setKind(type)}
          >
            {labels[type]}{" "}
            <span>{list.filter((p) => p.type === type).length}</span>
          </button>
        ))}
      </nav>
      <p className="promotion-rule">
        Giá sản phẩm chọn mức thấp nhất trong các chương trình đang chạy, không
        cộng dồn discount và flash sale. Mỗi đơn dùng một voucher, áp dụng sau
        giảm giá sản phẩm; phí giao hàng không được giảm.
      </p>
      {error && (
        <div className="catalog-notice" role="alert">
          <p>{error}</p>
          {!form && <button onClick={() => void load()}>Thử tải lại</button>}
        </div>
      )}
      {form && (
        <form
          className="admin-card promotion-editor"
          ref={formRef}
          onSubmit={save}
        >
          <h3>
            {editing ? "Cập nhật" : "Thêm"} {labels[form.type].toLowerCase()}
          </h3>
          <fieldset disabled={busy}>
            <div className="form-grid">
              <label className="form-wide">
                Tên chương trình
                <input
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ưu đãi MIRA cuối tuần"
                />
              </label>
              {form.type === "voucher" && (
                <label className="form-wide">
                  Mã voucher
                  <input
                    required
                    minLength={3}
                    maxLength={32}
                    pattern={"[A-Za-z0-9][A-Za-z0-9_\\-]{2,31}"}
                    value={form.code}
                    onChange={(e) =>
                      setForm({ ...form, code: e.target.value.toUpperCase() })
                    }
                    placeholder="MIRA10"
                  />
                </label>
              )}
              <label>
                Hình thức giảm
                <select
                  value={form.discountType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      discountType: e.target.value as "percent" | "amount",
                    })
                  }
                >
                  <option value="percent">Phần trăm (%)</option>
                  <option value="amount">Số tiền (₫)</option>
                </select>
              </label>
              <label>
                Mức giảm
                <input
                  required
                  type="number"
                  min="1"
                  max={form.discountType === "percent" ? 100 : 1e12}
                  step="1"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </label>
              {form.type === "voucher" && (
                <label>
                  Đơn tối thiểu (₫)
                  <input
                    required
                    type="number"
                    min="0"
                    max={1e12}
                    step="1"
                    value={form.minSubtotal}
                    onChange={(e) =>
                      setForm({ ...form, minSubtotal: e.target.value })
                    }
                  />
                </label>
              )}
              <label>
                {form.type === "voucher"
                  ? "Giảm tối đa mỗi đơn"
                  : "Giảm tối đa mỗi sản phẩm"}{" "}
                (₫, 0 = không giới hạn)
                <input
                  required
                  type="number"
                  min="0"
                  max={1e12}
                  step="1"
                  value={form.maxDiscount}
                  onChange={(e) =>
                    setForm({ ...form, maxDiscount: e.target.value })
                  }
                />
              </label>
              <label>
                Bắt đầu
                <input
                  required
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm({ ...form, startsAt: e.target.value })
                  }
                />
              </label>
              <label>
                Kết thúc
                <input
                  required
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </label>
              <label className="promotion-checkbox form-wide">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                />{" "}
                Bật chương trình theo lịch
              </label>
              {form.type !== "voucher" && (
                <div className="form-wide">
                  <label className="promotion-checkbox">
                    <input
                      type="checkbox"
                      checked={form.allProducts}
                      onChange={(e) =>
                        setForm({ ...form, allProducts: e.target.checked })
                      }
                    />{" "}
                    Áp dụng cho tất cả sản phẩm
                  </label>
                  {!form.allProducts && (
                    <>
                      <label>
                        Tìm sản phẩm áp dụng
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Nhập tên sản phẩm..."
                        />
                      </label>
                      <div className="promotion-product-picker">
                        {products
                          .filter((p) =>
                            p.name
                              .toLocaleLowerCase("vi")
                              .includes(search.toLocaleLowerCase("vi")),
                          )
                          .map((p) => (
                            <label className="promotion-checkbox" key={p._id}>
                              <input
                                type="checkbox"
                                checked={form.productIds.includes(p._id)}
                                onChange={() =>
                                  setForm({
                                    ...form,
                                    productIds: form.productIds.includes(p._id)
                                      ? form.productIds.filter(
                                          (id) => id !== p._id,
                                        )
                                      : [...form.productIds, p._id],
                                  })
                                }
                              />
                              {p.name}
                            </label>
                          ))}
                      </div>
                      <small>Đã chọn {form.productIds.length} sản phẩm.</small>
                    </>
                  )}
                </div>
              )}
            </div>
          </fieldset>
          <div className="promotion-actions">
            <button
              type="button"
              className="admin-secondary"
              disabled={busy}
              onClick={() => {
                setForm(null);
                setEditing(null);
                setError("");
              }}
            >
              Hủy
            </button>
            <button className="admin-primary" disabled={busy}>
              {busy ? "Đang lưu..." : "Lưu khuyến mãi"}
            </button>
          </div>
        </form>
      )}
      {loading ? (
        <p role="status">Đang tải khuyến mãi...</p>
      ) : (
        <div className="promotion-list">
          {list
            .filter((p) => p.type === kind)
            .map((p) => {
              const status = !p.active
                ? "Đã tắt"
                : new Date(p.endsAt).getTime() <= clock
                  ? "Đã kết thúc"
                  : new Date(p.startsAt).getTime() > clock
                    ? "Sắp diễn ra"
                    : "Đang diễn ra";
              return (
                <article className="admin-card promotion-card" key={p._id}>
                  <div className="promotion-card-head">
                    <span
                      className={`promotion-status ${status === "Đang diễn ra" ? "running" : ""}`}
                    >
                      {status}
                    </span>
                    <span>{labels[p.type]}</span>
                  </div>
                  <h3>{p.name}</h3>
                  {p.code && <code>{p.code}</code>}
                  <strong className="promotion-value">
                    −
                    {p.discountType === "percent"
                      ? `${p.value}%`
                      : money(p.value)}
                  </strong>
                  <p>
                    {p.type === "voucher"
                      ? `Đơn từ ${money(p.minSubtotal)}`
                      : p.allProducts
                        ? "Tất cả sản phẩm"
                        : `${p.productIds.length} sản phẩm được chọn`}
                    {p.maxDiscount > 0 && ` · Tối đa ${money(p.maxDiscount)}`}
                  </p>
                  <p className="promotion-dates">
                    {new Date(p.startsAt).toLocaleString("vi-VN")}
                    <br />→ {new Date(p.endsAt).toLocaleString("vi-VN")}
                  </p>
                  <div className="promotion-actions">
                    <button
                      className="admin-secondary"
                      disabled={busy}
                      onClick={() => start(p.type, p)}
                    >
                      Sửa
                    </button>
                    <button
                      className="admin-secondary"
                      disabled={busy}
                      onClick={() => void toggle(p)}
                    >
                      {p.active ? "Tắt chương trình" : "Bật chương trình"}
                    </button>
                  </div>
                </article>
              );
            })}
        </div>
      )}
      {!loading && !list.some((p) => p.type === kind) && (
        <div className="admin-card promotion-empty">
          <h3>Chưa có {labels[kind].toLowerCase()}</h3>
          <p>Tạo chương trình đầu tiên để chuẩn bị ưu đãi cho khách hàng.</p>
        </div>
      )}
    </section>
  );
}
