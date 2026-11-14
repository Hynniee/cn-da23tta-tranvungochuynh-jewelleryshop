import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Send } from "lucide-react";
import { request } from "../lib/api";

export type SupportConversation = { _id: string; status: "open" | "resolved" };
type Message = {
  _id: string;
  body: string;
  senderRole: "customer" | "admin";
  createdAt: string;
  readAt?: string | null;
  order?: string;
  orderCode?: string;
};
type History = {
  conversation: SupportConversation | null;
  messages: Message[];
  hasMore: boolean;
};
const stamp = (value: string) =>
  new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export default function SupportThread({
  endpoint,
  admin = false,
  orderId,
  onChange,
}: {
  endpoint: string;
  admin?: boolean;
  orderId?: string;
  onChange?: (conversation: SupportConversation | null) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<SupportConversation | null>(
    null,
  );
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [olderBusy, setOlderBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const olderLoaded = useRef(false);
  const prependHeight = useRef<number | null>(null);
  const callback = useRef(onChange);
  callback.current = onChange;
  const sendKey = useRef({ body: "", orderId: "", id: "" });
  const sendingRef = useRef(false);
  const loadRef = useRef<() => void>(() => {});
  const ownRole = admin ? "admin" : "customer";

  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    const refresh = async () => {
      if (busy || document.hidden || controller.signal.aborted) return;
      busy = true;
      try {
        const data: History = await request(endpoint, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setConversation(data.conversation);
        callback.current?.(data.conversation);
        setMessages((previous) => {
          const merged = new Map(
            previous.map((message) => [message._id, message]),
          );
          data.messages.forEach((message) => merged.set(message._id, message));
          return [...merged.values()].sort((a, b) =>
            a._id.localeCompare(b._id),
          );
        });
        if (!olderLoaded.current) setHasMore(data.hasMore);
        setError("");
        // Mark only the fetched messages, so a concurrent incoming message stays unread.
        const ids = data.messages
          .filter(
            (message) => message.senderRole !== ownRole && !message.readAt,
          )
          .map((message) => message._id);
        if (ids.length && !document.hidden) {
          await request(`${endpoint}/read`, {
            method: "POST",
            body: JSON.stringify({ ids }),
            signal: controller.signal,
          });
          window.dispatchEvent(new Event("supportchange"));
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "Chưa tải được tin nhắn",
          );
      } finally {
        busy = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadRef.current = () => {
      void refresh();
    };
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    window.addEventListener("supportchange", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("supportchange", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [endpoint, ownRole]);

  useEffect(() => {
    const element = list.current;
    if (!element) return;
    if (prependHeight.current !== null) {
      element.scrollTop += element.scrollHeight - prependHeight.current;
      prependHeight.current = null;
    } else if (follow.current) element.scrollTop = element.scrollHeight;
  }, [messages]);

  async function loadOlder() {
    if (!messages[0] || olderBusy) return;
    setOlderBusy(true);
    try {
      const data: History = await request(
        `${endpoint}?before=${messages[0]._id}`,
      );
      prependHeight.current = list.current?.scrollHeight ?? null;
      olderLoaded.current = true;
      setMessages((previous) => {
        const merged = new Map(
          [...data.messages, ...previous].map((message) => [
            message._id,
            message,
          ]),
        );
        return [...merged.values()].sort((a, b) => a._id.localeCompare(b._id));
      });
      setHasMore(data.hasMore);
      const ids = data.messages
        .filter((message) => message.senderRole !== ownRole && !message.readAt)
        .map((message) => message._id);
      if (ids.length && !document.hidden) {
        await request(`${endpoint}/read`, {
          method: "POST",
          body: JSON.stringify({ ids }),
        });
        window.dispatchEvent(new Event("supportchange"));
      }
      setError("");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Chưa tải được tin nhắn cũ",
      );
    } finally {
      setOlderBusy(false);
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError("");
    if (
      sendKey.current.body !== body ||
      sendKey.current.orderId !== (orderId || "")
    ) {
      sendKey.current = {
        body,
        orderId: orderId || "",
        id: crypto.randomUUID(),
      };
    }
    try {
      const message: Message = await request(`${endpoint}/messages`, {
        method: "POST",
        body: JSON.stringify({
          body,
          clientId: sendKey.current.id,
          ...(orderId ? { orderId } : {}),
        }),
      });
      follow.current = true;
      setMessages((previous) =>
        [...previous.filter((item) => item._id !== message._id), message].sort(
          (a, b) => a._id.localeCompare(b._id),
        ),
      );
      setDraft("");
      sendKey.current = { body: "", orderId: "", id: "" };
      window.dispatchEvent(new Event("supportchange"));
      loadRef.current();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Chưa gửi được tin nhắn. Nội dung vẫn được giữ để bạn thử lại",
      );
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  }

  return (
    <div className="support-thread">
      <div className="support-thread-status">
        <span
          className={`support-state ${conversation?.status === "resolved" ? "resolved" : ""}`}
        >
          {conversation?.status === "resolved"
            ? "Đã xử lý · Gửi thêm để mở lại"
            : "Đang hỗ trợ"}
        </span>
        <small>Tin nhắn được cập nhật tự động</small>
      </div>
      {error && (
        <div className="support-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => loadRef.current()}>
            Thử tải lại
          </button>
        </div>
      )}
      <div
        className="support-message-list"
        ref={list}
        role="log"
        aria-label="Lịch sử trò chuyện"
        aria-live="polite"
        onScroll={() => {
          const element = list.current;
          if (element)
            follow.current =
              element.scrollHeight - element.scrollTop - element.clientHeight <
              60;
        }}
      >
        {hasMore && (
          <button
            className="support-load-older"
            disabled={olderBusy}
            onClick={loadOlder}
          >
            {olderBusy ? "Đang tải…" : "Xem tin nhắn trước"}
          </button>
        )}
        {loading && (
          <p role="status" className="support-empty">
            Đang tải hội thoại…
          </p>
        )}
        {!loading && !messages.length && (
          <div className="support-empty">
            <MessageCircle size={30} />
            <h3>Bạn cần MIRA hỗ trợ điều gì?</h3>
            <p>
              Gửi câu hỏi về đơn hàng, thanh toán hoặc sản phẩm. Nhân viên cửa
              hàng sẽ phản hồi tại đây khi có thể
            </p>
          </div>
        )}
        {messages.map((message) => (
          <article
            key={message._id}
            className={`support-message ${message.senderRole === ownRole ? "own" : ""}`}
          >
            <b>
              {message.senderRole === "admin"
                ? "Nhân viên MIRA"
                : admin
                  ? "Khách hàng"
                  : "Bạn"}
            </b>
            {message.order && (
              <Link
                className="support-order"
                to={
                  admin
                    ? `/admin?tab=orders&order=${message.order}`
                    : `/account?tab=orders&order=${message.order}`
                }
              >
                Đơn hàng {message.orderCode}
              </Link>
            )}
            <p>{message.body}</p>
            <time dateTime={message.createdAt}>{stamp(message.createdAt)}</time>
          </article>
        ))}
      </div>
      <form className="support-composer" onSubmit={send}>
        {orderId && (
          <p className="support-context">
            Tin nhắn này sẽ kèm thông tin đơn hàng bạn đang cần hỗ trợ
          </p>
        )}
        <label htmlFor="support-draft">
          {admin ? "Trả lời khách hàng" : "Nhắn cho nhân viên MIRA"}
        </label>
        <textarea
          id="support-draft"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={2000}
          rows={3}
          disabled={sending}
          placeholder="Nhập nội dung cần hỗ trợ…"
          required
        />
        <div>
          <small>{draft.length}/2.000 ký tự</small>
          <button type="submit" disabled={sending || !draft.trim() || loading}>
            <Send size={16} />
            {sending ? "Đang gửi…" : "Gửi tin nhắn"}
          </button>
        </div>
      </form>
    </div>
  );
}
