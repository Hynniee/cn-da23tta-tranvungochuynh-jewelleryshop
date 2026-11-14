import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Ruler, ArrowRight } from "lucide-react";
import { estimateRingSize, type MeasureMethod } from "../lib/personal-tools";
import RingSizeTable from "../components/RingSizeTable";
import "../components/ring-size-guide.css";

export default function RingSizer() {
  const [method, setMethod] = useState<MeasureMethod>("circumference");
  const [measurement, setMeasurement] = useState("");
  const [result, setResult] = useState<ReturnType<
    typeof estimateRingSize
  > | null>(null);
  const [error, setError] = useState("");
  function calculate(event: FormEvent) {
    event.preventDefault();
    setResult(null);
    setError("");
    try {
      setResult(estimateRingSize(measurement, method));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tính được size.");
    }
  }
  return (
    <main className="personal-tool-page">
      <Link className="tool-back" to="/#personal-tools">
        ← Tiện ích & dịch vụ
      </Link>
      <div className="personal-tool-heading">
        <Ruler size={30} />
        <span>HƯỚNG DẪN ĐO SIZE</span>
        <h1>Tìm size nhẫn của bạn</h1>
        <p>Đo bằng thước thật, nhập số đo và xem size tham khảo.</p>
      </div>
      <div className="personal-tool-layout">
        <form className="personal-tool-panel" onSubmit={calculate}>
          <fieldset>
            <legend>Bạn muốn đo bằng cách nào?</legend>
            <div className="tool-choice-grid">
              {(
                [
                  ["circumference", "Chu vi ngón tay"],
                  ["diameter", "Đường kính lòng nhẫn"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={method === value}
                  onClick={() => {
                    setMethod(value);
                    setMeasurement("");
                    setResult(null);
                    setError("");
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <ol className="measurement-instructions">
            {method === "circumference" ? (
              <>
                <li>
                  Quấn một dải giấy mảnh quanh ngón tay, vừa khít và không siết
                  chặt.
                </li>
                <li>
                  Đánh dấu điểm hai đầu gặp nhau, trải giấy ra và đo chiều dài
                  bằng thước.
                </li>
                <li>Nhập số đo theo milimét (1 cm = 10 mm).</li>
              </>
            ) : (
              <>
                <li>Chọn chiếc nhẫn đang đeo vừa ngón tay bạn muốn đo.</li>
                <li>
                  Đo đường kính bên trong, từ mép trong bên này đến mép trong
                  đối diện, không tính độ dày thành nhẫn.
                </li>
                <li>Nhập số đo theo milimét.</li>
              </>
            )}
          </ol>
          <label className="tool-field">
            {method === "circumference"
              ? "Chu vi ngón tay (mm)"
              : "Đường kính lòng nhẫn (mm)"}
            <input
              required
              inputMode="decimal"
              value={measurement}
              placeholder={
                method === "circumference" ? "Ví dụ: 53,4" : "Ví dụ: 17"
              }
              onChange={(e) => {
                setMeasurement(e.target.value);
                setResult(null);
                setError("");
              }}
            />
          </label>
          {error && (
            <p className="tool-error" role="alert">
              {error}
            </p>
          )}
          <button className="gold-btn" type="submit">
            TÍNH SIZE THAM KHẢO <ArrowRight size={16} />
          </button>
          {result && (
            <section className="ring-result" role="status" aria-live="polite">
              <span>KẾT QUẢ ƯỚC TÍNH</span>
              <h2>
                {result.size
                  ? `Size tham khảo ${result.size}`
                  : "Số đo nằm ngoài bảng tham khảo"}
              </h2>
              <dl>
                <div>
                  <dt>Đường kính lòng nhẫn</dt>
                  <dd>{result.diameter.toFixed(2)} mm</dd>
                </div>
                <div>
                  <dt>Chu vi tương ứng</dt>
                  <dd>{result.circumference.toFixed(2)} mm</dd>
                </div>
              </dl>
              <p>
                {result.size
                  ? "Nếu số đo nằm giữa hai size, kết quả chọn size lớn hơn trong bảng."
                  : "Công cụ không tự gán size ngoài phạm vi bảng. Bạn có thể đặt lịch để đo trực tiếp."}
              </p>
              <Link to="/appointments">
                Đặt lịch xác nhận size tại cửa hàng →
              </Link>
            </section>
          )}
        </form>
        <aside className="personal-tool-panel tool-guide">
          <h2>Đo để đeo vừa vặn</h2>
          <p>
            Đo lại vài lần vào các thời điểm khác nhau, kiểm tra cả vị trí khớp
            ngón tay. Size có thể khác giữa các hãng và kiểu nhẫn; hãy xác nhận
            trước khi đặt hàng.
          </p>
          <div className="ring-diagram" aria-hidden="true">
            <span>
              Đường kính
              <br />
              lòng nhẫn
            </span>
          </div>
          <p className="tool-muted">
            Hình minh họa, không dùng kích thước trên màn hình để đo.
          </p>
          <details>
            <summary>Bảng size tham khảo</summary>
            <RingSizeTable />
          </details>
          <Link className="tool-text-link" to="/shop?category=Nhẫn">
            Khám phá bộ sưu tập nhẫn →
          </Link>
        </aside>
      </div>
    </main>
  );
}
