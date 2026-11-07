import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Gem, ArrowRight } from "lucide-react";
import { request } from "../lib/api";
import Image from "../components/Image";
import type { Product } from "../types/product";
import {
  matchJewelry,
  occasions,
  type JewelryPreferences,
} from "../lib/personal-tools";

export default function JewelryQuiz() {
  const [params] = useSearchParams();
  const [preferences, setPreferences] = useState<JewelryPreferences>({
    occasion: occasions.includes(params.get("occasion") || "")
      ? params.get("occasion")!
      : "",
    budgetMin: "0",
    budgetMax: "20000000",
    category: "",
    material: "",
    stone: "",
    includeUnavailable: true,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [step, setStep] = useState(1),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const [results, setResults] = useState<ReturnType<
    typeof matchJewelry
  > | null>(null);
  const resultRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    request("/products", { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setProducts(data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setLoadError("Không tải được danh mục cửa hàng. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    if (results) {
      resultRef.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
      resultRef.current?.focus({ preventScroll: true });
    }
  }, [results]);
  const options = (key: "category" | "material" | "stone") =>
    [
      ...new Set(
        products
          .map((p) => p[key])
          .filter((value): value is string => Boolean(value)),
      ),
    ].sort((a, b) => a.localeCompare(b, "vi"));
  function update<K extends keyof JewelryPreferences>(
    key: K,
    value: JewelryPreferences[K],
  ) {
    setPreferences((p) => ({ ...p, [key]: value }));
    setError("");
    setResults(null);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!preferences.occasion) {
      setError("Chọn dịp sử dụng để tiếp tục.");
      return;
    }
    try {
      if (step === 2 || step === 3) {
        const matches = matchJewelry(products, preferences);
        if (step === 3) {
          setResults(matches);
          return;
        }
      }
      setStep((n) => Math.min(3, n + 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tìm được gợi ý.");
    }
  }
  return (
    <main className="personal-tool-page">
      <Link className="tool-back" to="/#personal-tools">
        ← Công cụ dành riêng cho bạn
      </Link>
      <div className="personal-tool-heading">
        <Gem size={30} />
        <span>JEWELRY CONCIERGE</span>
        <h1>Trang sức dành cho bạn</h1>
        <p>
          Ba bước chọn nhu cầu. Kết quả lấy từ danh mục hiện có của cửa hàng,
          kèm lý do gợi ý và tình trạng hàng.
        </p>
      </div>
      {loading ? (
        <p role="status">Đang tải danh mục cửa hàng...</p>
      ) : loadError ? (
        <div className="personal-tool-panel" role="alert">
          <p>{loadError}</p>
          <button className="gold-btn" onClick={() => setRetry((n) => n + 1)}>
            THỬ LẠI
          </button>
        </div>
      ) : (
        <>
          <ol className="quiz-progress" aria-label="Các bước tư vấn">
            {["Dịp sử dụng", "Ngân sách", "Sở thích"].map((title, index) => (
              <li
                key={title}
                aria-current={step === index + 1 ? "step" : undefined}
              >
                <span>{index + 1}</span>
                {title}
              </li>
            ))}
          </ol>
          <form className="personal-tool-panel quiz-form" onSubmit={submit}>
            {step === 1 && (
              <fieldset>
                <legend>Bạn chọn trang sức cho dịp nào?</legend>
                <div className="tool-choice-grid">
                  {occasions.map((occasion) => (
                    <button
                      type="button"
                      key={occasion}
                      aria-pressed={preferences.occasion === occasion}
                      onClick={() => update("occasion", occasion)}
                    >
                      {occasion}
                    </button>
                  ))}
                </div>
                <p className="tool-muted">
                  Dịp sử dụng giúp ưu tiên danh mục phù hợp trong kết quả.
                </p>
              </fieldset>
            )}
            {step === 2 && (
              <>
                <h2>Ngân sách của bạn</h2>
                <div className="tool-choice-grid">
                  {[10000000, 20000000, 50000000].map((amount) => (
                    <button
                      type="button"
                      key={amount}
                      aria-pressed={preferences.budgetMax === String(amount)}
                      onClick={() => update("budgetMax", String(amount))}
                    >
                      Đến {amount.toLocaleString("vi-VN")}₫
                    </button>
                  ))}
                </div>
                <div className="tool-field-row">
                  <label className="tool-field">
                    Tối thiểu (₫)
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={preferences.budgetMin}
                      onChange={(e) => update("budgetMin", e.target.value)}
                    />
                  </label>
                  <label className="tool-field">
                    Tối đa (₫)
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={preferences.budgetMax}
                      onChange={(e) => update("budgetMax", e.target.value)}
                    />
                  </label>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <h2>Bạn yêu thích điều gì?</h2>
                <div className="tool-field-row">
                  {(
                    [
                      ["category", "Loại trang sức"],
                      ["material", "Chất liệu"],
                      ["stone", "Loại đá / điểm nhấn"],
                    ] as const
                  ).map(([key, label]) => (
                    <label className="tool-field" key={key}>
                      {label}
                      <select
                        aria-label={label}
                        value={preferences[key]}
                        onChange={(e) => update(key, e.target.value)}
                      >
                        <option value="">Không giới hạn</option>
                        {options(key).map((option) => (
                          <option value={option} key={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <label className="tool-checkbox">
                  <input
                    type="checkbox"
                    checked={preferences.includeUnavailable}
                    onChange={(e) =>
                      update("includeUnavailable", e.target.checked)
                    }
                  />
                  Hiện cả mẫu tạm hết hàng để tham khảo
                </label>
              </>
            )}
            {error && (
              <p role="alert" className="tool-error">
                {error}
              </p>
            )}
            <div className="tool-form-actions">
              {step > 1 && (
                <button
                  type="button"
                  className="tool-secondary"
                  onClick={() => {
                    setStep((n) => n - 1);
                    setError("");
                    setResults(null);
                  }}
                >
                  QUAY LẠI
                </button>
              )}
              <button className="gold-btn" type="submit">
                {step === 3 ? "XEM GỢI Ý" : "TIẾP TỤC"}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
          {results && (
            <section
              className="quiz-results"
              ref={resultRef}
              tabIndex={-1}
              aria-labelledby="quiz-results-title"
            >
              <div className="quiz-result-heading">
                <h2 id="quiz-results-title">
                  {results.length
                    ? `${results.length} mẫu phù hợp tiêu chí`
                    : "Chưa có mẫu phù hợp tiêu chí"}
                </h2>
                <p>
                  {preferences.occasion} ·{" "}
                  {Number(preferences.budgetMin).toLocaleString("vi-VN")}₫ –{" "}
                  {Number(preferences.budgetMax).toLocaleString("vi-VN")}₫
                </p>
              </div>
              {results.length ? (
                <>
                  <p>
                    Lọc theo ngân sách và các sở thích đã chọn; ưu tiên mẫu còn
                    hàng, sau đó đến dịp sử dụng.{" "}
                    {results.length > 9 && "Hiển thị 9 gợi ý đầu tiên."}
                  </p>
                  <div className="quiz-product-grid">
                    {results.slice(0, 9).map(({ product, reasons }) => (
                      <article className="quiz-product" key={product._id}>
                        <Link to={`/product/${product.slug}`}>
                          <Image src={product.images?.[0]} alt={product.name} />
                          <h3>{product.name}</h3>
                        </Link>
                        <strong>
                          {(product.salePrice ?? product.price).toLocaleString(
                            "vi-VN",
                          )}
                          ₫
                        </strong>
                        <span
                          className={
                            product.stock > 0
                              ? "stock-available"
                              : "stock-unavailable"
                          }
                        >
                          {product.stock > 0
                            ? "Còn hàng"
                            : "Tạm hết hàng · Tham khảo"}
                        </span>
                        <ul>
                          {reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                        <Link
                          className="tool-text-link"
                          to={`/product/${product.slug}`}
                        >
                          Xem chi tiết →
                        </Link>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <p>
                  Thử tăng ngân sách, đổi chất liệu hoặc bật hiển thị mẫu tạm
                  hết hàng. Công cụ giữ nguyên tiêu chí của bạn.
                </p>
              )}
              <div className="tool-form-actions">
                <button
                  className="tool-secondary"
                  onClick={() => {
                    setResults(null);
                    setStep(1);
                    window.scrollTo({ top: 0, behavior: "instant" });
                  }}
                >
                  ĐỔI TIÊU CHÍ
                </button>
                <Link className="tool-text-link" to="/products">
                  Xem toàn bộ danh mục →
                </Link>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
