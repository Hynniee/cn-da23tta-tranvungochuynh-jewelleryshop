import { FormEvent, useState } from "react";
import { MapPin, Plus } from "lucide-react";
import useAddressBook, { SavedAddress } from "../controllers/useAddressBook";
import ShippingAddressFields, {
  ShippingAddressValue,
} from "./ShippingAddressFields";
import { request } from "../lib/api";
import { notify } from "../lib/notifications";

export default function AddressBook({
  name,
  phone,
  legacyAddress,
}: {
  name: string;
  phone?: string;
  legacyAddress?: string;
}) {
  const book = useAddressBook();
  const [editing, setEditing] = useState<string | null>(null);
  const [recipient, setRecipient] = useState({
    name,
    phone: phone || "",
    label: "Nhà riêng",
  });
  const [delivery, setDelivery] = useState<ShippingAddressValue>({
    provinceCode: "",
    wardCode: "",
    addressLine: "",
  });
  const [makeDefault, setMakeDefault] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function open(address?: SavedAddress) {
    setEditing(address?._id || "new");
    setError("");
    setRecipient({
      name: address?.name || name,
      phone: address?.phone || phone || "",
      label: address?.label || "Nhà riêng",
    });
    setDelivery({
      provinceCode: address?.provinceCode || "",
      wardCode: address?.wardCode || "",
      addressLine: address?.addressLine || "",
    });
    setMakeDefault(!book.addresses.length);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await request(
        editing === "new"
          ? "/auth/me/addresses"
          : `/auth/me/addresses/${encodeURIComponent(editing || "")}`,
        {
          method: editing === "new" ? "POST" : "PATCH",
          body: JSON.stringify({
            ...recipient,
            ...delivery,
            isDefault: makeDefault,
          }),
        },
      );
      book.setAddresses(result);
      setEditing(null);
      notify("Đã lưu địa chỉ giao hàng.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được địa chỉ.");
    } finally {
      setBusy(false);
    }
  }
  async function change(address: SavedAddress, remove = false) {
    if (busy) return;
    if (
      remove &&
      !window.confirm(`Xóa địa chỉ “${address.label}” của ${address.name}?`)
    )
      return;
    setBusy(true);
    setError("");
    try {
      book.setAddresses(
        await request(
          `/auth/me/addresses/${encodeURIComponent(address._id)}${remove ? "" : "/default"}`,
          { method: remove ? "DELETE" : "PATCH" },
        ),
      );
      notify(remove ? "Đã xóa địa chỉ." : "Đã đổi địa chỉ mặc định.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa cập nhật được địa chỉ.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="account-card address-book">
      <header>
        <div>
          <p>GIAO HÀNG</p>
          <h2>Sổ Địa Chỉ</h2>
        </div>
        {!editing && (
          <button
            type="button"
            className="ui-primary"
            disabled={
              busy ||
              book.loading ||
              !!book.error ||
              book.addresses.length >= 20
            }
            onClick={() => open()}
          >
            <Plus size={16} /> Thêm địa chỉ
          </button>
        )}
      </header>
      <p className="address-book-help">
        Địa chỉ đã lưu có thể chọn ngay khi thanh toán.
      </p>
      {book.loading ? (
        <p role="status">Đang tải sổ địa chỉ…</p>
      ) : book.error ? (
        <div role="alert">
          <p>{book.error}</p>
          <button type="button" className="ui-secondary" onClick={book.reload}>
            Tải lại sổ địa chỉ
          </button>
        </div>
      ) : null}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {editing ? (
        <form
          className="address-book-form"
          onSubmit={save}
          aria-label={
            editing === "new" ? "Thêm địa chỉ mới" : "Chỉnh sửa địa chỉ"
          }
        >
          <h3>{editing === "new" ? "Địa chỉ mới" : "Chỉnh sửa địa chỉ"}</h3>
          <div className="field-grid">
            <label>
              HỌ VÀ TÊN NGƯỜI NHẬN
              <input
                required
                maxLength={100}
                value={recipient.name}
                onChange={(e) =>
                  setRecipient({ ...recipient, name: e.target.value })
                }
              />
            </label>
            <label>
              SỐ ĐIỆN THOẠI NGƯỜI NHẬN
              <input
                required
                type="tel"
                maxLength={30}
                value={recipient.phone}
                onChange={(e) =>
                  setRecipient({ ...recipient, phone: e.target.value })
                }
              />
            </label>
          </div>
          <label>
            TÊN GỢI NHỚ
            <select
              aria-label="TÊN GỢI NHỚ"
              value={recipient.label}
              onChange={(e) =>
                setRecipient({ ...recipient, label: e.target.value })
              }
            >
              <option>Nhà riêng</option>
              <option>Công ty</option>
              <option>Khác</option>
            </select>
          </label>
          <ShippingAddressFields value={delivery} onChange={setDelivery} />
          {editing === "new" && (
            <label className="address-default-option">
              <input
                type="checkbox"
                checked={makeDefault}
                onChange={(e) => setMakeDefault(e.target.checked)}
              />{" "}
              Đặt làm địa chỉ mặc định
            </label>
          )}
          <div className="address-book-actions">
            <button
              type="button"
              className="ui-secondary"
              disabled={busy}
              onClick={() => {
                setEditing(null);
                setError("");
              }}
            >
              Hủy
            </button>
            <button className="ui-primary" disabled={busy}>
              {busy ? "Đang lưu…" : "Lưu địa chỉ"}
            </button>
          </div>
        </form>
      ) : (
        !book.loading &&
        !book.error && (
          <>
            {!book.addresses.length && (
              <div className="account-empty">
                <MapPin size={30} />
                <h3>Chưa có địa chỉ đã lưu</h3>
                <p>
                  Thêm địa chỉ để đặt hàng nhanh hơn trong lần mua tiếp theo.
                </p>
              </div>
            )}
            <div className="saved-address-list">
              {book.addresses.map((address) => (
                <article className="saved-address-card" key={address._id}>
                  <div className="saved-address-heading">
                    <strong>{address.label}</strong>
                    {address.isDefault && <span>Mặc định</span>}
                  </div>
                  <h3>{address.name}</h3>
                  <p>{address.phone}</p>
                  <p>{address.address}</p>
                  <div className="address-book-actions">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => open(address)}
                    >
                      Chỉnh sửa
                    </button>
                    {!address.isDefault && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void change(address)}
                      >
                        Đặt mặc định
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void change(address, true)}
                    >
                      Xóa
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {!!legacyAddress && !book.addresses.length && (
              <p className="address-book-legacy">
                Địa chỉ trước đây: {legacyAddress}. Vui lòng thêm địa chỉ vào sổ
                và chọn tỉnh/phường để sử dụng khi đặt hàng.
              </p>
            )}
          </>
        )
      )}
    </div>
  );
}
