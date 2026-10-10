import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SECURITY_HEADERS } from "./securityHeaders.js";

const vercel = JSON.parse(readFileSync(new URL("../../../../vercel.json", import.meta.url), "utf8")) as {
  headers?: { source: string; headers: { key: string; value: string }[] }[];
};
const csp = SECURITY_HEADERS["Content-Security-Policy"] ?? "";
const directive = (name: string) => csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) ?? "";

describe("security headers", () => {
  it("are the same on Vercel's static files as on every server response", () => {
    const all = vercel.headers?.find((h) => h.source === "/(.*)");
    expect(Object.fromEntries((all?.headers ?? []).map((h) => [h.key, h.value]))).toEqual(SECURITY_HEADERS);
  });

  it("forbid framing, sniffing and leaking full referrers", () => {
    expect(directive("frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
    expect(SECURITY_HEADERS["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("only run the app's own scripts", () => {
    expect(directive("script-src")).toBe("script-src 'self'");
    expect(directive("object-src")).toBe("object-src 'none'");
  });

  it("allow the image hosts the app really uses", () => {
    // R2's public bucket hosts serve our own copy of the game art (ADR 0006).
    for (const host of ["https://enka.network", "https://sr.yatta.moe", "https://files.wuthery.com", "https://cdn.discordapp.com", "https://*.public.blob.vercel-storage.com", "https://*.r2.dev"]) {
      expect(directive("img-src")).toContain(host);
    }
  });

  it("keep fonts and styles on the app's own origin (self-hosted fonts, VISUAL-DESIGN.md §12)", () => {
    expect(directive("font-src")).toBe("font-src 'self'");
    expect(directive("style-src")).toBe("style-src 'self' 'unsafe-inline'");
  });
});
