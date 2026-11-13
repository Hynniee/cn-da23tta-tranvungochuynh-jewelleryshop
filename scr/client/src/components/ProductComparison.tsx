import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
export default function ProductComparison({
  products,
  diamond = false,
}: {
  products: any[];
  diamond?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const identity = products.map((product) => product._id).join(",");
  useEffect(() => {
    setSelected([]);
  }, [identity]);
  const rows = products.filter((product) =>
    selected.includes(String(product._id)),
  );
  const fields = diamond
    ? ["carat", "cut", "color", "clarity"]
    : ["category", "material", "stone", "style", "occasion"];
  const labels: Record<string, string> = {
    category: "Danh mục",
    material: "Chất liệu",
    stone: "Loại đá",
    style: "Phong cách",
    occasion: "Dịp sử dụng",
    carat: "Carat",
    cut: "Giác cắt",
    color: "Màu",
    clarity: "Độ tinh khiết",
  };
  if (!products.length) return null;
  return (
    <section className="product-comparison" aria-label="So sánh sản phẩm">
      <h3>So sánh lựa chọn</h3>
      <p>Chọn từ 2 đến 4 sản phẩm để đối chiếu thông số và điểm DSS.</p>
      <div className="comparison-choices">
        {products.map((product) => (
          <label key={product._id}>
            <input
              type="checkbox"
              checked={selected.includes(String(product._id))}
              disabled={
                selected.length >= 4 && !selected.includes(String(product._id))
              }
              onChange={(event) =>
                setSelected((previous) =>
                  event.target.checked
                    ? [...previous, String(product._id)]
                    : previous.filter((id) => id !== String(product._id)),
                )
              }
            />
            {product.name || product.code}
          </label>
        ))}
      </div>
      {rows.length >= 2 && (
        <div className="decision-table-scroll">
          <table className="decision-table">
            <caption>Thông số và đóng góp tiêu chí vào điểm xếp hạng</caption>
            <thead>
              <tr>
                <th>Tiêu chí</th>
                {rows.map((product) => (
                  <th key={product._id}>
                    <Link
                      to={
                        diamond
                          ? `/diamond/${product._id}`
                          : `/product/${product.slug}`
                      }
                    >
                      {product.name || product.code}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Giá hiện tại</th>
                {rows.map((product) => (
                  <td key={product._id}>
                    {Number(product.salePrice ?? product.price).toLocaleString(
                      "vi-VN",
                    )}
                    ₫
                  </td>
                ))}
              </tr>
              {fields.map((field) => (
                <tr key={field}>
                  <th>{labels[field]}</th>
                  {rows.map((product) => (
                    <td key={product._id}>
                      {Array.isArray(product[field])
                        ? product[field].join(", ")
                        : (product[field] ?? "Chưa có thông tin")}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th>Điểm DSS</th>
                {rows.map((product) => (
                  <td key={product._id}>
                    <strong>{product.dssScore ?? product.score}/100</strong>
                  </td>
                ))}
              </tr>
              {(rows[0].scoreParts || []).map((part: any) => (
                <tr key={part.criterion}>
                  <th>
                    {labels[part.criterion] || part.label}
                    <br />
                    <small>Trọng số {Math.round(part.weight * 100)}%</small>
                  </th>
                  {rows.map((product) => {
                    const p = product.scoreParts?.find(
                      (entry: any) => entry.criterion === part.criterion,
                    );
                    return (
                      <td key={product._id}>
                        {p
                          ? `${Math.round(p.value * 100)}/100 → ${p.contribution.toFixed(1)} điểm`
                          : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
