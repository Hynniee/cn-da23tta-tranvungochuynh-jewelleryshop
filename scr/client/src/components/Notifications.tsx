import { useEffect, useState } from "react";
import { CheckCircle2, Info, X } from "lucide-react";
import {
  NOTIFICATION_DURATION,
  NOTIFICATION_EVENT,
  type Notification,
} from "../lib/notifications";

export default function Notifications() {
  const [notice, setNotice] = useState<(Notification & { id: number }) | null>(
    null,
  );
  useEffect(() => {
    let timer: number | undefined;
    let id = 0;
    const show = (event: Event) => {
      const notification = (event as CustomEvent<Notification>).detail;
      window.clearTimeout(timer);
      setNotice({ ...notification, id: ++id });
      timer = window.setTimeout(() => setNotice(null), NOTIFICATION_DURATION);
    };
    window.addEventListener(NOTIFICATION_EVENT, show);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(NOTIFICATION_EVENT, show);
    };
  }, []);

  return (
    <div
      className="notification-region"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {notice && (
        <div className={`action-notification ${notice.kind}`} key={notice.id}>
          {notice.kind === "success" ? (
            <CheckCircle2 size={22} aria-hidden="true" />
          ) : (
            <Info size={22} aria-hidden="true" />
          )}
          <p>{notice.message}</p>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => setNotice(null)}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
