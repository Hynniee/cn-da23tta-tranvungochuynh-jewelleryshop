import { useEffect, useState } from "react";
import { request } from "../lib/api";
export type AdvisorReply = {
  conversationId: string;
  mode: string;
  intent: Record<string, any>;
  missingCriteria: string[];
  optionalCriteria?: string[];
  answer: string;
  products: any[];
  diamonds: any[];
};
export type AdvisorMessage = {
  from: "user" | "ai";
  text: string;
  reply?: AdvisorReply;
};
type Conversation = { conversationId?: string; messages: AdvisorMessage[] };
const pending = new Set<string>();
const greeting: AdvisorMessage = {
  from: "ai",
  text: "Xin chào, mình là MIRA AI. Bạn đang tìm loại trang sức nào và ngân sách khoảng bao nhiêu? Mình có thể ghi nhớ nhu cầu trong cuộc trò chuyện và hỗ trợ lựa chọn kim cương theo 4Cs.",
};
function ownerKey() {
  try {
    return `mira_advisor:${JSON.parse(localStorage.getItem("mira_user") || "{}").id || "guest"}`;
  } catch {
    return "mira_advisor:guest";
  }
}
function read(key: string): Conversation {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || "null");
    if (Array.isArray(value?.messages)) return value;
  } catch {
    /* Session storage may be unavailable. */
  }
  return { messages: [greeting] };
}
const memory = new Map<string, Conversation>();
function current(key: string) {
  return memory.get(key) || read(key);
}
function publish(key: string, value: Conversation) {
  memory.set(key, value);
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Keep this tab usable. */
  }
  window.dispatchEvent(new Event("mira-advisor-change"));
}
export function useAdvisorConversation() {
  const key = ownerKey();
  const [conversation, setConversation] = useState(() => current(key));
  const [busy, setBusy] = useState(pending.has(key)),
    [error, setError] = useState("");
  useEffect(() => {
    const update = () => {
      setConversation(current(key));
      setBusy(pending.has(key));
    };
    update();
    window.addEventListener("mira-advisor-change", update);
    return () => window.removeEventListener("mira-advisor-change", update);
  }, [key]);
  async function send(text: string, weights?: Record<string, number> | null) {
    if (!text.trim() || pending.has(key)) return;
    pending.add(key);
    setError("");
    const before = current(key);
    const messages: AdvisorMessage[] = [
      ...before.messages,
      { from: "user", text: text.trim() },
    ];
    publish(key, { ...before, messages });
    try {
      const reply: AdvisorReply = await request("/assistant", {
        method: "POST",
        body: JSON.stringify({
          message: text.trim(),
          conversationId: before.conversationId,
          ...(weights !== undefined ? { weights } : {}),
        }),
      });
      publish(key, {
        conversationId: reply.conversationId,
        messages: [
          ...messages,
          { from: "ai" as const, text: reply.answer, reply },
        ].slice(-25),
      });
      return reply;
    } catch (e: any) {
      setError(e.message);
      publish(key, before);
      throw e;
    } finally {
      pending.delete(key);
      window.dispatchEvent(new Event("mira-advisor-change"));
    }
  }
  function reset() {
    if (!pending.has(key)) {
      publish(key, { messages: [greeting] });
      setError("");
    }
  }
  const data = [...conversation.messages]
    .reverse()
    .find((message) => message.reply)?.reply;
  return { messages: conversation.messages, data, busy, error, send, reset };
}
