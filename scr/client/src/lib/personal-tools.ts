import type { Product } from "../types/product";

// Diameter values transcribed from DOJI's published sizing chart.
export const ringSizeChart = [
  14.7, 15, 15.5, 16, 16.5, 16.7, 17, 17.5, 17.7, 18, 18.5, 18.7, 18.8, 19,
  19.2,
].map((diameter, i) => ({
  size: i + 6,
  diameter,
  circumference: diameter * Math.PI,
}));
export type MeasureMethod = "circumference" | "diameter";
export function estimateRingSize(raw: string, method: MeasureMethod) {
  if (!/^\d+(?:[.,]\d+)?$/.test(raw.trim()))
    throw new Error("Nhập số đo bằng mm, ví dụ 53,4 hoặc 17.");
  const value = Number(raw.trim().replace(",", "."));
  const diameter = method === "diameter" ? value : value / Math.PI;
  if (!Number.isFinite(value) || diameter < 10 || diameter > 30)
    throw new Error("Số đo chưa hợp lệ. Hãy kiểm tra đơn vị mm và đo lại.");
  const inRange =
    diameter >= ringSizeChart[0].diameter &&
    diameter <= ringSizeChart[ringSizeChart.length - 1].diameter + 0.0001;
  const match = inRange
    ? ringSizeChart.find((row) => row.diameter >= diameter - 0.0001)
    : undefined;
  return {
    diameter,
    circumference: diameter * Math.PI,
    size: match?.size ?? null,
  };
}

export const occasions = ["Cầu hôn", "Kỷ niệm", "Quà tặng", "Đeo hằng ngày"];
export type JewelryPreferences = {
  occasion: string;
  budgetMin: string;
  budgetMax: string;
  category: string;
  material: string;
  stone: string;
  includeUnavailable: boolean;
};
export function matchJewelry(
  products: Product[],
  preferences: JewelryPreferences,
) {
  const min = Number(preferences.budgetMin || 0),
    max = Number(preferences.budgetMax);
  if (
    !preferences.budgetMax.trim() ||
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    min < 0 ||
    max <= 0 ||
    min > max
  )
    throw new Error(
      "Ngân sách tối đa phải lớn hơn 0 và không nhỏ hơn ngân sách tối thiểu.",
    );
  const preferredCategories: Record<string, string[]> = {
    "Cầu hôn": ["Nhẫn", "Nhẫn cưới"],
    "Kỷ niệm": ["Nhẫn", "Nhẫn cưới", "Mặt dây chuyền", "Dây chuyền"],
    "Quà tặng": ["Bông tai", "Dây chuyền", "Mặt dây chuyền"],
    "Đeo hằng ngày": ["Bông tai", "Dây chuyền", "Nhẫn"],
  };
  return products
    .filter((p) => {
      const price = p.salePrice ?? p.price;
      return (
        Number.isFinite(price) &&
        price >= min &&
        price <= max &&
        (!preferences.category || p.category === preferences.category) &&
        (!preferences.material || p.material === preferences.material) &&
        (!preferences.stone || p.stone === preferences.stone) &&
        (preferences.includeUnavailable || p.stock > 0)
      );
    })
    .map((product) => {
      const exactOccasion = product.occasion?.includes(preferences.occasion);
      const preferredCategory = preferredCategories[
        preferences.occasion
      ]?.includes(product.category);
      const reasons = ["Trong ngân sách đã chọn"];
      if (preferences.category)
        reasons.push(`Đúng loại ${product.category.toLocaleLowerCase("vi")}`);
      if (preferences.material) reasons.push(`Chất liệu ${product.material}`);
      if (preferences.stone) reasons.push(`Điểm nhấn ${product.stone}`);
      if (exactOccasion)
        reasons.push(
          `Được phân loại cho dịp ${preferences.occasion.toLocaleLowerCase("vi")}`,
        );
      else if (preferredCategory)
        reasons.push(
          `Ưu tiên danh mục này cho dịp ${preferences.occasion.toLocaleLowerCase("vi")}`,
        );
      return {
        product,
        reasons,
        priority: exactOccasion ? 2 : preferredCategory ? 1 : 0,
      };
    })
    .sort(
      (a, b) =>
        Number(b.product.stock > 0) - Number(a.product.stock > 0) ||
        b.priority - a.priority ||
        (a.product.salePrice ?? a.product.price) -
          (b.product.salePrice ?? b.product.price) ||
        a.product._id.localeCompare(b.product._id),
    );
}
