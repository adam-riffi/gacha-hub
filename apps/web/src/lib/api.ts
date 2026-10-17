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
  const response = await fetch(BASE + path, {
    method,
    credentials: "include",
    headers: bodyText !== undefined ? { "content-type": "application/json" } : {},
    body: bodyText,
    // A small write outlives the page, so leaving it at once keeps the save (browsers cap keepalive bodies at 64 KB).
    keepalive: method !== "GET" && (bodyText?.length ?? 0) < KEEPALIVE_MAX_BYTES,
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new ApiError(response.status, errBody);
  }
  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("application/json")
    ? ((await response.json()) as T)
    : (undefined as T);
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string, body?: unknown) => request<T>("DELETE", path, body),
  /** A picture, to /api/uploads by default, or to an art slot (`PUT /api/art/<slot>`). */
  async upload(file: File, path = "/api/uploads", method = "POST"): Promise<{ url: string }> {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(BASE + path, {
      method,
      credentials: "include",
      body: form,
    });
    if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => ({})));
    return response.json();
  },
};
