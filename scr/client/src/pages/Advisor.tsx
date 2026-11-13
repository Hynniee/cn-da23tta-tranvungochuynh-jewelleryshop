import Image from "../components/Image";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Sparkles } from "lucide-react";
import { request } from "../lib/api";
export default function Advisor() {
  const [message, setMessage] = useState(
    "Tôi cần nhẫn cầu hôn khoảng 30 triệu, phong cách tối giản, vàng trắng",
  );
  const [data, setData] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      setData(
        await request("/assistant", {
          method: "POST",
          body: JSON.stringify({ message }),
        }),
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="smart-page">
      <header>
        <Bot />
        <span>MIRA JEWELRY ADVISOR</span>
        <h1>Tìm thiết kế dành riêng cho bạn</h1>
        <p>
          Chia sẻ dịp tặng, phong cách và ngân sách. MIRA sẽ giúp bạn khám phá
          những lựa chọn phù hợp.
        </p>
      </header>
      <form className="advisor-box" onSubmit={submit}>
        <textarea
          aria-label="Nhu cầu tư vấn trang sức"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
        />
        <button disabled={busy}>
          <Sparkles size={16} />
          {busy ? "ĐANG PHÂN TÍCH..." : "TƯ VẤN CHO TÔI"}
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
      {data && (
        <section className="smart-result">
          <h2>Gợi ý từ MIRA</h2>
          <p>{data.answer}</p>
          <div className="smart-products">
            {data.products?.map((p: any) => (
              <Link to={`/product/${p.slug}`} key={p._id}>
                <Image src={p.images?.[0] || "/placeholder.svg"} />
                <b>{p.name}</b>
                <span>{Number(p.price).toLocaleString("vi-VN")}₫</span>
                <strong>Phù hợp {p.score}%</strong>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
