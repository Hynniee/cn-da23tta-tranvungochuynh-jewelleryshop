import { request } from "./api";
const recent = new Map<string, number>();
export function trackBehavior(
  type: "VIEW" | "CLICK" | "SEARCH" | "WISHLIST" | "ADD_CART",
  data: { product?: string; productSlug?: string; query?: string } = {},
) {
  try {
    const key = `${type}:${JSON.stringify(data)}`;
    const now = Date.now();
    if (now - (recent.get(key) || 0) < 1500) return;
    recent.set(key, now);
    if (recent.size > 100) recent.delete(recent.keys().next().value!);
    let sessionId = sessionStorage.getItem("mira_behavior_session");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("mira_behavior_session", sessionId);
    }
    void request("/behaviors", {
      method: "POST",
      body: JSON.stringify({
        type,
        ...data,
        sessionId,
        eventId: crypto.randomUUID(),
      }),
    }).catch(() => undefined);
  } catch {
    /* Tracking must never interrupt shopping. */
  }
}
