import { ringSizeChart } from "../lib/personal-tools";

export default function RingSizeTable({
  selectedSize = "",
}: {
  selectedSize?: string;
}) {
  return (
    <div className="ring-size-table-wrap">
      <table className="ring-size-table">
        <caption>Size nhẫn theo ni Việt Nam · Đơn vị: mm</caption>
        <thead>
          <tr>
            <th scope="col">Size (ni)</th>
            <th scope="col">Đường kính lòng nhẫn</th>
            <th scope="col">Chu vi trong</th>
          </tr>
        </thead>
        <tbody>
          {ringSizeChart.map((row) => (
            <tr
              key={row.size}
              aria-current={
                String(row.size) === selectedSize ? "true" : undefined
              }
            >
              <th scope="row">{row.size}</th>
              <td>
                {row.diameter.toLocaleString("vi-VN", {
                  minimumFractionDigits: 1,
                })}
              </td>
              <td>
                {row.circumference.toLocaleString("vi-VN", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="ring-size-source">
        Tham khảo{" "}
        <a
          href="https://trangsuc.doji.vn/blogs/blog/ni-nhan-la-gi"
          target="_blank"
          rel="noreferrer"
        >
          bảng ni nhẫn DOJI
        </a>
        . Size có thể khác giữa các hãng và kiểu nhẫn.
      </p>
    </div>
  );
}
