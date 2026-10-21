import Image from "./Image";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, ChevronDown, Send, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import { request, token } from "../lib/api";

type Product = {
  _id: string;
  slug: string;
  name: string;
  price: number;
  images?: string[];
  score?: number;
};
type Diamond = {
  _id: string;
  certificateNo?: string;
  carat: number;
  cut: string;
  color: string;
  clarity: string;
  price: number;
  score?: number;
};
type Reply = {
  mode: "advisor" | "recommendation" | "diamond";
  answer: string;
  products?: Product[];
  diamonds?: Diamond[];
};
type Msg = { from: "user" | "ai"; text: string; reply?: Reply };

const suggestions = [
  "Trang sức bạc dưới 1 triệu",
  "Bông tai ngọc trai dưới 1 triệu",
  "Nhẫn ruby vàng 14K dưới 6 triệu",
  "Nhẫn cầu hôn dưới 30 triệu",
];

export default function MiraAIChat() {
  const [open, setOpen] = useState(false),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      from: "ai",
      text: "Xin chào, mình là MIRA AI ✨ Hãy nói ngân sách, loại trang sức, chất liệu hoặc dịp tặng. Mình sẽ phân tích nhu cầu, xếp hạng sản phẩm MIRA và hỗ trợ chọn kim cương theo 4Cs.",
    },
  ]);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(
    () => bottom.current?.scrollIntoView({ behavior: "smooth" }),
    [messages, busy],
  );
  async function send(text = input) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    setMessages((m) => [...m, { from: "user", text: q }]);
    setBusy(true);
    try {
      const data = await request("/assistant", {
        method: "POST",
        body: JSON.stringify({ message: q }),
      });
      setMessages((m) => [
        ...m,
        { from: "ai", text: data.answer, reply: data },
      ]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          from: "ai",
          text: e.message || "MIRA AI chưa thể xử lý yêu cầu này.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    send();
  }
  return (
    <div className="mira-ai-root">
      {open && (
        <section className="mira-ai-panel" aria-label="MIRA AI Assistant">
          <header>
            <div className="mira-ai-brand">
              <span>
                <Sparkles size={17} />
              </span>
              <div>
                <b>MIRA AI</b>
                <small>JEWELRY ASSISTANT</small>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Đóng">
              <X size={19} />
            </button>
          </header>
          <div className="mira-ai-modes">
            <span>AI Advisor</span>
            <span>Dành cho bạn</span>
            <span>4Cs DSS</span>
          </div>
          <div className="mira-ai-messages">
            {messages.map((m, i) => (
              <div key={i} className={`mira-msg ${m.from}`}>
                <div className="mira-bubble">{m.text}</div>
                {m.reply?.products?.length ? (
                  <div className="mira-chat-products">
                    {m.reply.products.slice(0, 4).map((p) => (
                      <article className="mira-chat-product-card" key={p._id}>
                        <Link
                          className="mira-chat-product-main"
                          to={`/product/${p.slug}`}
                          onClick={() => setOpen(false)}
                        >
                          <Image
                            src={p.images?.[0] || "/placeholder.svg"}
                            alt={p.name}
                          />
                          <div>
                            <b>{p.name}</b>
                            <span>
                              {Number(p.price).toLocaleString("vi-VN")}₫
                            </span>
                            {p.score != null && (
                              <small>
                                Phù hợp {p.score}% với nhu cầu của bạn
                              </small>
                            )}
                          </div>
                        </Link>
                        <Link
                          className="mira-chat-detail-btn"
                          to={`/product/${p.slug}`}
                          onClick={() => setOpen(false)}
                        >
                          Xem chi tiết sản phẩm →
                        </Link>
                      </article>
                    ))}
                  </div>
                ) : null}
                {m.reply?.diamonds?.length ? (
                  <div className="mira-chat-diamonds">
                    {m.reply.diamonds.slice(0, 4).map((d) => (
                      <article key={d._id}>
                        <b>
                          {d.carat} ct · {d.cut}
                        </b>
                        <span>
                          {d.color} · {d.clarity}
                        </span>
                        <small>
                          {Number(d.price).toLocaleString("vi-VN")}₫ · Điểm{" "}
                          {d.score}%
                        </small>
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {busy && (
              <div className="mira-thinking">
                <Bot size={16} /> MIRA đang phân tích...
              </div>
            )}
            <div ref={bottom} />
          </div>
          {!token() && (
            <div className="mira-ai-login">
              Bạn vẫn có thể dùng AI ở chế độ demo. Đăng nhập để MIRA ghi nhớ
              hành vi và cá nhân hóa sâu hơn.{" "}
              <Link to="/login" onClick={() => setOpen(false)}>
                Đăng nhập
              </Link>
            </div>
          )}
          <div className="mira-ai-suggestions">
            {suggestions.map((s) => (
              <button key={s} onClick={() => send(s)} disabled={busy}>
                {s}
              </button>
            ))}
          </div>
          <form onSubmit={submit}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập nhu cầu của bạn..."
            />
            <button disabled={busy || !input.trim()} aria-label="Gửi">
              <Send size={18} />
            </button>
          </form>
        </section>
      )}
      <button className="mira-ai-launcher" onClick={() => setOpen((v) => !v)}>
        {open ? (
          <ChevronDown size={23} />
        ) : (
          <>
            <Sparkles size={20} />
            <span>Hỏi MIRA AI</span>
          </>
        )}
      </button>
    </div>
  );
}
