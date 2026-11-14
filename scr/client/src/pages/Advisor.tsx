import Image from "../components/Image";
import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Sparkles } from "lucide-react";
import { useAdvisorConversation } from "../controllers/useAdvisorConversation";
import DSSWeights, { defaultWeights } from "../components/DSSWeights";
import ProductComparison from "../components/ProductComparison";
export default function Advisor() {
  const [message, setMessage] = useState("");
  const [manual, setManual] = useState(false),
    [weights, setWeights] = useState<Record<string, number>>(defaultWeights);
  const { messages, data, busy, error, send, reset } = useAdvisorConversation();
  useEffect(() => {
    if (!data || data.conversationReset) {
      setManual(false);
      setWeights({ ...defaultWeights });
    }
  }, [data?.conversationId, data?.conversationReset]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await send(message, manual ? weights : null);
      setMessage("");
    } catch {
      /* Error is displayed beside the form. */
    }
  }
  return (
    <main className="smart-page advisor-page">
      <header>
        <Bot />
        <span>TƯ VẤN TRANG SỨC MIRA</span>
        <h1>Tìm thiết kế dành riêng cho bạn</h1>
        <p>
          Chia sẻ nhu cầu, bổ sung hoặc thay đổi tiêu chí trong cùng cuộc trò
          chuyện
        </p>
      </header>
      <div className="decision-actions">
        <button
          disabled={busy}
          onClick={() => {
            reset();
            setManual(false);
          }}
        >
          Hội thoại mới
        </button>
        <Link to="/diamond-dss">Công cụ kim cương 4Cs</Link>
      </div>
      <section
        className="advisor-history"
        aria-label="Lịch sử tư vấn"
        aria-live="polite"
      >
        {messages.map((item, index) => (
          <article key={index} className={`advisor-turn ${item.from}`}>
            <b>{item.from === "user" ? "Bạn" : "MIRA"}</b>
            <p>{item.text}</p>
          </article>
        ))}
      </section>
      {data?.intent && Object.keys(data.intent).length > 0 && (
        <section className="advisor-criteria">
          <h2>Nhu cầu đã ghi nhận</h2>
          <p>
            {Object.entries(data.intent)
              .filter(
                ([key, value]) =>
                  !["weights", "priorities"].includes(key) &&
                  value !== undefined,
              )
              .map(([key, value]) => {
                const labels: Record<string, string> = {
                  category: "Loại",
                  material: "Chất liệu",
                  stone: "Đá",
                  excludeStone: "Không chọn",
                  style: "Phong cách",
                  occasion: "Dịp",
                  budgetMin: "Từ",
                  budgetMax: "Tối đa",
                  targetCarat: "Carat",
                };
                return `${labels[key] || key}: ${typeof value === "number" && key.startsWith("budget") ? `${value.toLocaleString("vi-VN")}₫` : value}`;
              })
              .join(" · ") || "Chưa có tiêu chí. Hãy chia sẻ nhu cầu của bạn"}
          </p>
        </section>
      )}
      {!!data?.optionalCriteria?.length && !data.missingCriteria.length && (
        <p>
          Bạn có muốn bổ sung{" "}
          {data.optionalCriteria
            .map(
              (key) =>
                ({
                  material: "chất liệu",
                  style: "phong cách",
                  occasion: "dịp sử dụng",
                })[key],
            )
            .join(", ")}{" "}
          để tinh chỉnh gợi ý không?
        </p>
      )}
      <form className="advisor-box" onSubmit={submit}>
        <label htmlFor="advisor-message">Nhu cầu hoặc thay đổi của bạn</label>
        <textarea
          id="advisor-message"
          aria-label="Nhu cầu tư vấn trang sức"
          placeholder="Ví dụ: Nhẫn cầu hôn vàng trắng dưới 30 triệu. Sau đó: Giảm ngân sách xuống 20 triệu"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
          maxLength={2000}
          required
        />
        <label className="manual-weights">
          <input
            type="checkbox"
            checked={manual}
            onChange={(event) => setManual(event.target.checked)}
          />
          Tự điều chỉnh trọng số trang sức
        </label>
        {manual && <DSSWeights weights={weights} onChange={setWeights} />}
        <button
          disabled={
            busy ||
            !message.trim() ||
            (manual && !Object.values(weights).some((value) => value > 0))
          }
        >
          <Sparkles size={16} />
          {busy ? "ĐANG PHÂN TÍCH..." : "GỬI NHU CẦU"}
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
      {!!data?.products?.length && (
        <section className="smart-result">
          <h2>Top-{data.products.length} theo DSS</h2>
          <p>
            Điểm thể hiện mức phù hợp theo tiêu chí, không phải xác suất hài
            lòng
          </p>
          <div className="smart-products">
            {data.products.map((product: any) => (
              <article key={product._id}>
                <Link to={`/product/${product.slug}`}>
                  <Image
                    src={product.images?.[0] || "/placeholder.svg"}
                    alt={product.name}
                  />
                  <b>{product.name}</b>
                  <span>
                    {Number(product.salePrice ?? product.price).toLocaleString(
                      "vi-VN",
                    )}
                    ₫
                  </span>
                  <strong>{product.dssScore}/100 điểm DSS</strong>
                </Link>
                <ul>
                  {product.reasons?.map((reason: string) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <ProductComparison products={data.products} />
        </section>
      )}
      {!!data?.diamonds?.length && (
        <section className="smart-result">
          <h2>Top-{data.diamonds.length} kim cương</h2>
          <div className="diamond-table">
            {data.diamonds.map((diamond: any) => (
              <article key={diamond._id}>
                <Link to={`/diamond/${diamond._id}`}>
                  <b>{diamond.code}</b>
                </Link>
                <span>
                  {diamond.carat} ct · {diamond.cut} · {diamond.color} ·{" "}
                  {diamond.clarity}
                </span>
                <span>{Number(diamond.price).toLocaleString("vi-VN")}₫</span>
                <strong>{diamond.score}/100</strong>
                <Link to={`/diamond/${diamond._id}`}>Xem chi tiết →</Link>
              </article>
            ))}
          </div>
          <ProductComparison products={data.diamonds} diamond />
        </section>
      )}
    </main>
  );
}
