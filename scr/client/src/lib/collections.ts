import { normalizeSearch } from "./commerce";

export const collections: Record<
  string,
  { title: string; description: string; note: string }
> = {
  vang: {
    title: "Nhẫn & trang sức vàng",
    description:
      "Khám phá những thiết kế vàng cho mỗi ngày và những dịp đáng nhớ",
    note: "Lọc thêm theo danh mục, chất liệu vàng và ngân sách để tìm thiết kế phù hợp",
  },
  cuoi: {
    title: "Trang sức cưới",
    description: "Nhẫn cưới và thiết kế cầu hôn dành cho lời hứa đồng hành",
    note: "Chọn size tại trang sản phẩm hoặc đặt lịch để được tư vấn và đo size trực tiếp",
  },
  bac: {
    title: "Trang sức bạc 925",
    description:
      "Những thiết kế bạc 925 nhẹ nhàng, dễ kết hợp và phù hợp làm quà tặng",
    note: "Xem hướng dẫn chăm sóc bạc trong cẩm nang bảo quản trang sức",
  },
  "ngoc-trai": {
    title: "Trang sức ngọc trai",
    description:
      "Vẻ đẹp dịu nhẹ của ngọc trai trong những thiết kế dành cho bạn",
    note: "Xem loại ngọc, chất liệu đi kèm và kích cỡ trong thông tin từng sản phẩm",
  },
  "da-mau": {
    title: "Trang sức đá màu",
    description:
      "Khám phá sắc màu và điểm nhấn của từng loại đá trong bộ sưu tập MIRA",
    note: "Lọc theo loại đá và chất liệu để tìm thiết kế phù hợp",
  },
};

export function matchesCollection(
  product: {
    category: string;
    material: string;
    stone?: string;
    occasion?: string[];
  },
  collection: string,
) {
  const material = normalizeSearch(product.material);
  const stone = normalizeSearch(product.stone || "");
  switch (collection) {
    case "vang":
      return material.includes("vang");
    case "bac":
      return material.includes("bac") && material.includes("925");
    case "ngoc-trai":
      return stone === "ngoc trai";
    case "cuoi":
      return (
        product.category === "Nhẫn cưới" ||
        (product.occasion || []).some((value) =>
          ["cuoi", "cau hon"].includes(normalizeSearch(value)),
        )
      );
    case "da-mau":
      return (
        !!stone && !["khong dinh da", "ngoc trai", "kim cuong"].includes(stone)
      );
    default:
      return true;
  }
}
