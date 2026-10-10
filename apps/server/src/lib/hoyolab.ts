import { createHash, randomInt } from "node:crypto";

/** HoYoLAB's overseas salt for the DS header (genshin.py, DS_SALT[OVERSEAS]). */
const SALT = "6s25p5ox5y14umn1p61aqyyvbvvl3lrt";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** The DS header HoYoLAB's web client sends: time, six letters, and their salted MD5. */
export function dsHeader(t = Math.floor(Date.now() / 1000), r = Array.from({ length: 6 }, () => LETTERS[randomInt(LETTERS.length)]).join("")): string {
  return `${t},${r},${createHash("md5").update(`salt=${SALT}&t=${t}&r=${r}`).digest("hex")}`;
}

type Fetch = (url: string, init?: { method?: string; headers: Record<string, string>; body?: string }) => Promise<{ json: () => Promise<unknown> }>;

/**
 * A signed read from HoYoLAB with the user's cookie (ADR 0005); the cookie is
 * never logged. Some reads are POSTs (Genshin's character list).
 */
export async function hoyolabGet(url: string, cookie: string, fetchFn: Fetch = fetch as Fetch, post?: Record<string, string>): Promise<unknown> {
  const headers = { cookie, ds: dsHeader(), "x-rpc-app_version": "1.5.0", "x-rpc-client_type": "5", "x-rpc-language": "en-us", "x-rpc-lang": "en-us" };
  const res = await fetchFn(url, post ? { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(post) } : { headers });
  return res.json();
}
