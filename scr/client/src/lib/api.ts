export const API = "/api";
export const token = () => localStorage.getItem("mira_token");

export async function request(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  const accessToken = token();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(API + path, {
    ...options,
    headers,
    signal: options.signal ?? AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    if (response.status === 401) {
      localStorage.removeItem("mira_token");
      localStorage.removeItem("mira_user");
    }
    throw Object.assign(
      new Error(
        error?.message || `Không thể xử lý yêu cầu (${response.status}).`,
      ),
      { status: response.status },
    );
  }
  return response.status === 204 ? null : response.json();
}
