import { describe, expect, it } from "vitest";
import { linkKeys, openSecret, sealSecret } from "./linkSecret.js";

const K1 = Buffer.alloc(32, 1).toString("base64");
const K2 = Buffer.alloc(32, 2).toString("base64");
const ROW = "user-1:hoyolab";

describe("link secrets (ADR 0005)", () => {
  const keys = linkKeys(K1);

  it("seals and opens a token, with a fresh IV each time", () => {
    const a = sealSecret("ltoken_v2=abc", ROW, keys);
    const b = sealSecret("ltoken_v2=abc", ROW, keys);
    expect(a.keyVersion).toBe(1);
    expect(a.secret).not.toBe(b.secret);
    expect(a.secret).not.toContain("abc");
    expect(openSecret(a.secret, a.keyVersion, ROW, keys)).toBe("ltoken_v2=abc");
  });

  it("refuses a tampered secret, or one moved to another user's row", () => {
    const a = sealSecret("ltoken_v2=abc", ROW, keys);
    const [iv, tag, data] = a.secret.split(".");
    const flipped = Buffer.from(data!, "base64");
    flipped[0] = flipped[0]! ^ 1;
    expect(() => openSecret([iv, tag, flipped.toString("base64")].join("."), 1, ROW, keys)).toThrow();
    expect(() => openSecret(a.secret, 1, "user-2:hoyolab", keys)).toThrow();
  });

  it("seals with the newest key and still opens rows under an older one", () => {
    const old = sealSecret("t", ROW, keys);
    const rotated = linkKeys(`2:${K2},1:${K1}`);
    expect(sealSecret("t", ROW, rotated).keyVersion).toBe(2);
    expect(openSecret(old.secret, old.keyVersion, ROW, rotated)).toBe("t");
    expect(() => openSecret(old.secret, 1, ROW, linkKeys(`2:${K2}`))).toThrow(/key version 1/);
  });

  it("needs a 32-byte key", () => {
    expect(() => linkKeys("")).toThrow(/LINK_SECRET_KEY/);
    expect(() => linkKeys(Buffer.alloc(16).toString("base64"))).toThrow(/32 bytes/);
  });
});
