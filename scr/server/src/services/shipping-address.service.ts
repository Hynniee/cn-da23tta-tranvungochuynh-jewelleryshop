import divisions from "../data/administrative-units.json" with { type: "json" };

export const provinces = divisions.provinces;
export function shippingAddress(input: {
  provinceCode?: unknown;
  wardCode?: unknown;
  addressLine?: unknown;
}) {
  const province = provinces.find((p) => p.code === input.provinceCode);
  const ward = province?.wards.find((w) => w.code === input.wardCode);
  const line =
    typeof input.addressLine === "string" ? input.addressLine.trim() : "";
  if (!province || !ward || !line || line.length > 250)
    throw Object.assign(
      new Error(
        "Vui lòng chọn đúng tỉnh/thành, phường/xã và nhập địa chỉ cụ thể (tối đa 250 ký tự).",
      ),
      { status: 400 },
    );
  return {
    provinceCode: province.code,
    provinceName: province.name,
    wardCode: ward.code,
    wardName: ward.name,
    addressLine: line,
    address: `${line}, ${ward.name}, ${province.name}`,
  };
}
