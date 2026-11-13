export const defaultWeights = {
  category: 25,
  material: 20,
  price: 20,
  style: 15,
  occasion: 15,
  rating: 5,
};
const labels: Record<string, string> = {
  category: "Loại trang sức",
  material: "Chất liệu",
  price: "Ngân sách",
  style: "Phong cách",
  occasion: "Dịp sử dụng",
  rating: "Đánh giá",
  carat: "Carat",
  cut: "Giác cắt",
  color: "Màu",
  clarity: "Độ tinh khiết",
};
export default function DSSWeights({
  weights,
  onChange,
}: {
  weights: Record<string, number>;
  onChange: (weights: Record<string, number>) => void;
}) {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  return (
    <fieldset className="dss-weights">
      <legend>Mức ưu tiên các tiêu chí</legend>
      <p>
        Điều chỉnh mức ưu tiên; hệ thống tự chuẩn hóa tổng trọng số về 100%.
      </p>
      <div className="decision-controls">
        {Object.entries(weights).map(([key, value]) => (
          <label key={key}>
            {labels[key]} ({sum ? Math.round((value / sum) * 100) : 0}%)
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              aria-label={`Trọng số ${labels[key]}`}
              value={value}
              onChange={(event) =>
                onChange({ ...weights, [key]: Number(event.target.value) })
              }
            />
          </label>
        ))}
      </div>
      {!sum && (
        <p role="alert">Cần ít nhất một tiêu chí có mức ưu tiên lớn hơn 0.</p>
      )}
    </fieldset>
  );
}
