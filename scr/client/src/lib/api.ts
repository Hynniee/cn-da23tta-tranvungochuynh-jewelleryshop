export const API = "/api";
export const token = () => localStorage.getItem("mira_token");

export async function request(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (typeof options.body === "string" && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  const accessToken = token();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const timeout = AbortSignal.timeout(30_000);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeout])
    : timeout;
  const readOnly = (options.method || "GET").toUpperCase() === "GET";
  let response: Response;
  // Atlas may still be connecting when the page first opens. Only retry reads;
  // submitting an order or editing stock must never be repeated automatically.
  for (let attempt = 0; ; attempt++) {
    try {
      response = await fetch(API + path, { ...options, headers, signal });
      if (
        !readOnly ||
        ![502, 503, 504].includes(response.status) ||
        attempt >= 5
      )
        break;
      await response.body?.cancel();
    } catch (error) {
      if (
        !readOnly ||
        !(error instanceof TypeError) ||
        signal.aborted ||
        attempt >= 5
      )
        throw error;
    }
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(signal.reason);
      };
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", abort);
        resolve();
      }, [1000, 2000, 4000, 6000, 8000][attempt]);
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
  }
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    if (response.status === 401) {
      localStorage.removeItem("mira_token");
      localStorage.removeItem("mira_user");
    }
    throw Object.assign(
      new Error(
        error?.message || `Không thể xử lý yêu cầu (${response.status})`,
      ),
      { status: response.status, code: error?.code },
    );
  }
  return response.status === 204 ? null : response.json();
}
