import { useEffect, useState } from "react";
import { request } from "../lib/api";

type Location = { code: string; name: string };
export type ShippingAddressValue = {
  provinceCode: string;
  wardCode: string;
  addressLine: string;
};
export default function ShippingAddressFields({
  value,
  onChange,
}: {
  value: ShippingAddressValue;
  onChange: (value: ShippingAddressValue) => void;
}) {
  const [provinces, setProvinces] = useState<Location[]>([]);
  const [wards, setWards] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingWards, setLoadingWards] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    request("/locations/provinces", { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setProvinces(data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Không tải được danh mục tỉnh/thành. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    setWards([]);
    setLoadingWards(false);
    if (!value.provinceCode) return;
    const controller = new AbortController();
    setLoadingWards(true);
    setError("");
    request(
      `/locations/provinces/${encodeURIComponent(value.provinceCode)}/wards`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setWards(data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Không tải được danh mục phường/xã. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingWards(false);
      });
    return () => controller.abort();
  }, [value.provinceCode, retry]);
  return (
    <div className="shipping-address-fields">
      <p className="shipping-address-help">
        Địa chỉ giao hàng theo đơn vị hành chính sau sáp nhập.
      </p>
      <div className="field-grid">
        <label>
          TỈNH / THÀNH PHỐ
          <select
            required
            aria-label="TỈNH / THÀNH PHỐ"
            autoComplete="address-level1"
            value={value.provinceCode}
            disabled={loading}
            onChange={(e) => {
              setWards([]);
              onChange({
                ...value,
                provinceCode: e.target.value,
                wardCode: "",
              });
            }}
          >
            <option value="">
              {loading ? "Đang tải tỉnh/thành..." : "Chọn tỉnh/thành phố"}
            </option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          PHƯỜNG / XÃ / ĐẶC KHU
          <select
            required
            aria-label="PHƯỜNG / XÃ / ĐẶC KHU"
            autoComplete="address-level2"
            value={value.wardCode}
            disabled={!value.provinceCode || loadingWards || !wards.length}
            onChange={(e) => onChange({ ...value, wardCode: e.target.value })}
          >
            <option value="">
              {!value.provinceCode
                ? "Chọn tỉnh/thành trước"
                : loadingWards
                  ? "Đang tải phường/xã..."
                  : "Chọn phường/xã/đặc khu"}
            </option>
            {wards.map((w) => (
              <option key={w.code} value={w.code}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        ĐỊA CHỈ CỤ THỂ
        <input
          required
          autoComplete="address-line1"
          maxLength={250}
          value={value.addressLine}
          onChange={(e) => onChange({ ...value, addressLine: e.target.value })}
          placeholder="Số nhà, tên đường, tòa nhà, tầng/căn hộ..."
        />
      </label>
      {error && (
        <p className="auth-error" role="alert">
          {error}{" "}
          <button type="button" onClick={() => setRetry((n) => n + 1)}>
            Tải lại danh mục
          </button>
        </p>
      )}
    </div>
  );
}
