const BASE = import.meta.env.VITE_API_BASE_URL ?? "";
/** Below the browsers' 64 KB keepalive limit, with room for the headers. */
const KEEPALIVE_MAX_BYTES = 60_000;

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`API ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const bodyText = body !== undefined ? JSON.stringify(body) : undefined;
  const res = await fetch(BASE + path, {
    method,
    credentials: "include",
    headers: bodyText !== undefined ? { "content-type": "application/json" } : {},
    body: bodyText,
    // A small write outlives the page, so leaving it at once keeps the save (browsers cap keepalive bodies at 64 KB).
    keepalive: method !== "GET" && (bodyText?.length ?? 0) < KEEPALIVE_MAX_BYTES,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new ApiError(res.status, errBody);
  }
  const ct = res.headers.get("content-type") ?? "";
  return ct.includes("application/json")
    ? ((await res.json()) as T)
    : (undefined as T);
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string, body?: unknown) => request<T>("DELETE", path, body),
  async upload(file: File): Promise<{ url: string }> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(BASE + "/api/uploads", {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({})));
    return res.json();
  },
};
