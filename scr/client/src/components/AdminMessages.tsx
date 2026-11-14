import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Search } from "lucide-react";
import { request } from "../lib/api";
import SupportThread, { SupportConversation } from "./SupportThread";

type Conversation = SupportConversation & {
  customer: { name: string; email: string };
  unreadCount: number;
  lastMessage?: { body: string; createdAt: string; senderRole: string };
};
export default function AdminMessages() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    setLoading(true);
    const refresh = async () => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const data = await request(
          `/support/admin?${new URLSearchParams({ q: search, status: filter, page: String(page) })}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setItems(data.items);
        setPages(data.pages);
        setError("");
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "Chưa tải được hộp thư",
          );
      } finally {
        busy = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void refresh();
    const timer = setInterval(refresh, 5000);
    window.addEventListener("supportchange", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("supportchange", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [search, filter, page, revision]);
  const onConversation = useCallback(
    (conversation: SupportConversation | null) => {
      if (conversation)
        setSelected((previous) =>
          previous?._id === conversation._id
            ? { ...previous, status: conversation.status }
            : previous,
        );
    },
    [],
  );
  async function changeStatus() {
    if (!selected || statusBusy) return;
    setStatusBusy(true);
    setStatusError("");
    try {
      const data = await request(`/support/admin/${selected._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: selected.status === "open" ? "resolved" : "open",
        }),
      });
      onConversation(data);
      setRevision((value) => value + 1);
      window.dispatchEvent(new Event("supportchange"));
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : "Chưa đổi được trạng thái",
      );
    } finally {
      setStatusBusy(false);
    }
  }
  return (
    <div className="support-admin">
      <aside className="support-inbox">
        <div className="support-inbox-filters">
          <label>
            <Search size={16} />
            <input
              aria-label="Tìm khách hàng trong hộp thư"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tên hoặc email khách hàng"
            />
          </label>
          <select
            aria-label="Lọc trạng thái hội thoại"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả hội thoại</option>
            <option value="open">Đang hỗ trợ</option>
            <option value="resolved">Đã xử lý</option>
          </select>
        </div>
        {error && (
          <div className="support-error" role="alert">
            <p>{error}</p>
            <button onClick={() => setRevision((value) => value + 1)}>
              Thử lại
            </button>
          </div>
        )}
        {loading && (
          <p className="support-empty" role="status">
            Đang tải hộp thư…
          </p>
        )}
        {!loading && !error && !items.length && (
          <p className="support-empty">
            {search || filter
              ? "Không tìm thấy hội thoại phù hợp"
              : "Chưa có tin nhắn từ khách hàng"}
          </p>
        )}
        <div className="support-conversations">
          {items.map((item) => (
            <button
              key={item._id}
              className={selected?._id === item._id ? "active" : ""}
              onClick={() => {
                setSelected(item);
                setStatusError("");
              }}
              aria-pressed={selected?._id === item._id}
            >
              <strong>
                {item.customer.name}
                {item.unreadCount > 0 && (
                  <b
                    className="support-unread"
                    aria-label={`${item.unreadCount} tin chưa đọc`}
                  >
                    {item.unreadCount}
                  </b>
                )}
              </strong>
              <small>{item.customer.email}</small>
              <p>
                {item.lastMessage?.senderRole === "admin" ? "MIRA: " : ""}
                {item.lastMessage?.body || "Chưa có tin nhắn"}
              </p>
              <span>
                {item.status === "resolved" ? "Đã xử lý" : "Đang hỗ trợ"}
              </span>
              {item.lastMessage && (
                <time>
                  {new Date(item.lastMessage.createdAt).toLocaleString(
                    "vi-VN",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </time>
              )}
            </button>
          ))}
        </div>
        {pages > 1 && (
          <div className="support-pagination">
            <button
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Trước
            </button>
            <span>
              {page}/{pages}
            </span>
            <button
              disabled={page >= pages}
              onClick={() => setPage((value) => value + 1)}
            >
              Sau
            </button>
          </div>
        )}
      </aside>
      <section className="support-admin-detail">
        {selected ? (
          <>
            <header className="support-customer-heading">
              <div>
                <h2>{selected.customer.name}</h2>
                <p>{selected.customer.email}</p>
              </div>
              <button disabled={statusBusy} onClick={changeStatus}>
                {statusBusy
                  ? "Đang lưu…"
                  : selected.status === "open"
                    ? "Đánh dấu đã xử lý"
                    : "Mở lại hội thoại"}
              </button>
            </header>
            {statusError && (
              <p className="support-error" role="alert">
                {statusError}
              </p>
            )}
            <SupportThread
              key={selected._id}
              endpoint={`/support/admin/${selected._id}`}
              admin
              onChange={onConversation}
            />
          </>
        ) : (
          <div className="support-empty support-select">
            <MessageCircle size={36} />
            <h2>Hộp thư hỗ trợ khách hàng</h2>
            <p>Chọn một hội thoại để xem lịch sử và trả lời khách hàng</p>
          </div>
        )}
      </section>
    </div>
  );
}
