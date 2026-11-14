import Image from "./Image";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, ChevronDown, Send, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import { token } from "../lib/api";
import { useAdvisorConversation } from "../controllers/useAdvisorConversation";

const suggestions = [
  "Trang sức bạc dưới 1 triệu",
  "Bông tai ngọc trai dưới 1 triệu",
  "Nhẫn ruby vàng 14K dưới 6 triệu",
  "Nhẫn cầu hôn dưới 30 triệu",
];

export default function MiraAIChat() {
  const [open, setOpen] = useState(false),
    [input, setInput] = useState("");
  const {
    messages,
    busy,
    error,
    send: sendConversation,
    reset,
  } = useAdvisorConversation();
  const messageList = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true });
  }, [open]);
  useEffect(() => {
    const list = messageList.current;
    if (open && list)
      list.scrollTo({ top: list.scrollHeight, behavior: "instant" });
  }, [messages, busy, open]);
  async function send(text = input) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    try {
      await sendConversation(q);
    } catch {
      setInput(q);
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
                <small>TRỢ LÝ TRANG SỨC</small>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Đóng">
              <X size={19} />
            </button>
          </header>
          <div className="mira-ai-modes">
            <span>Tư vấn AI</span>
            <span>Dành cho bạn</span>
            <span>Kim cương 4Cs</span>
          </div>
          <div className="decision-actions chat-actions">
            <button disabled={busy} onClick={reset}>
              Hội thoại mới
            </button>
            <Link to="/advisor" onClick={() => setOpen(false)}>
              So sánh & điều chỉnh tiêu chí
            </Link>
          </div>
          <div className="mira-ai-messages" ref={messageList}>
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
                              {Number(p.salePrice ?? p.price).toLocaleString(
                                "vi-VN",
                              )}
                              ₫
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
                        <Link
                          to={`/diamond/${d._id}`}
                          onClick={() => setOpen(false)}
                        >
                          Xem chi tiết kim cương →
                        </Link>
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
          </div>
          {!token() && (
            <div className="mira-ai-login">
              AI gợi ý từ sản phẩm của cửa hàng. Đăng nhập để MIRA ghi nhớ hành
              vi và cá nhân hóa sâu hơn.{" "}
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
              ref={inputRef}
              aria-label="Tin nhắn cho MIRA AI"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập nhu cầu của bạn..."
              maxLength={2000}
            />
            <button disabled={busy || !input.trim()} aria-label="Gửi">
              <Send size={18} />
            </button>
          </form>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </section>
      )}
      <button className="mira-ai-launcher" onClick={() => setOpen((v) => !v)}>
        {open ? (
          <ChevronDown size={23} />
        ) : (
          <>
            <Sparkles size={20} />
            <span>Hỏi MIRA</span>
          </>
        )}
      </button>
    </div>
  );
}
