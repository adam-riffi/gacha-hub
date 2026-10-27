/**
 * One paste for the Art store's keys (Georges, 2026-10-27: one paste instead of six fields). The owner pastes the block
 * of Cloudflare values as he has it, labels in his own words, any order, one or several values a line; each value is
 * placed by its shape and the words around it. Nothing pasted is ever echoed: a line the parser cannot place is named
 * by its number and the reason only.
 */
export type PasteKeyName = "R2_ACCOUNT_ID" | "R2_BUCKET" | "R2_ACCESS_KEY_ID" | "R2_SECRET_ACCESS_KEY" | "R2_PUBLIC_URL" | "CF_ANALYTICS_TOKEN";
export type PasteResult = { values: Partial<Record<PasteKeyName, string>>; unplaced: string[] };

const HEX32 = /^[0-9a-f]{32}$/i;
const HEX64 = /^[0-9a-f]{64}$/i;
const PUBLIC_URL = /^(?:https?:\/\/)?([a-z0-9-]+\.r2\.dev)(?:\/.*)?$/i;
/** Cloudflare's account API tokens, and its classic 40-character user tokens. */
const ACCOUNT_TOKEN = /^cfat_[\w-]{20,}$/;
const CLASSIC_TOKEN = /^[\w-]{40}$/;
const BUCKET = /^[a-z0-9][a-z0-9-]{1,62}$/;

type Shape = "hex32" | "hex64" | "url" | "token" | "bucket";
const shapeOf = (token: string): Shape | null =>
  HEX64.test(token) ? "hex64" : HEX32.test(token) ? "hex32" : PUBLIC_URL.test(token) ? "url" : ACCOUNT_TOKEN.test(token) || CLASSIC_TOKEN.test(token) ? "token" : BUCKET.test(token) ? "bucket" : null;

export function parseKeyPaste(text: string): PasteResult {
  const values: Partial<Record<PasteKeyName, string>> = {};
  const unplaced: string[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    // Words and values are split on spaces, colons and equals signs; a URL's scheme would split too, so it goes first.
    const tokens = line.trim().replace(/https?:\/\//gi, "").split(/[\s:=]+/).filter(Boolean);
    if (!tokens.length) return;
    // The label of a value: every word on the line that is not itself a value, lower-cased.
    const label = tokens.filter((token) => shapeOf(token) === null || shapeOf(token) === "bucket").join(" ").toLowerCase();
    let placed = false;
    const place = (name: PasteKeyName, value: string) => {
      values[name] = value;
      placed = true;
    };
    for (const token of tokens) {
      const shape = shapeOf(token);
      if (shape === "hex64") place("R2_SECRET_ACCESS_KEY", token.toLowerCase());
      else if (shape === "hex32") {
        // "access key id" and "account id" look alike: the words decide (a typo in "account" still starts with "acc"), else
        // the page's order: the account first, then the key.
        const name: PasteKeyName = label.includes("access") ? "R2_ACCESS_KEY_ID" : label.includes("acc") ? "R2_ACCOUNT_ID" : values.R2_ACCOUNT_ID ? "R2_ACCESS_KEY_ID" : "R2_ACCOUNT_ID";
        place(name, token.toLowerCase());
      } else if (shape === "url") place("R2_PUBLIC_URL", `https://${PUBLIC_URL.exec(token)![1]!.toLowerCase()}`);
      else if (shape === "token") {
        if (label.includes("analytic")) place("CF_ANALYTICS_TOKEN", token);
        else unplaced.push(`line ${index + 1}: a token without the word analytics in its label`);
      } else if (shape === "bucket" && label.includes("bucket") && token.toLowerCase() !== "bucket" && !["id", "key", "url"].includes(token.toLowerCase())) place("R2_BUCKET", token.toLowerCase());
    }
    if (!placed && !unplaced.some((entry) => entry.startsWith(`line ${index + 1}:`))) unplaced.push(`line ${index + 1}: no value of a known shape`);
  });
  return { values, unplaced };
}
