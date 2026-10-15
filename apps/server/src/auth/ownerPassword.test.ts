import { describe, expect, it } from "vitest";
import { OwnerPassword } from "./ownerPassword.js";

// ADR 0010: the owner password lives only as a scrypt hash in OWNER_PASSWORD_HASH.
describe("OwnerPassword", () => {
  it("matches the password it hashed and nothing else", async () => {
    const stored = await OwnerPassword.hash("correct horse battery staple");
    expect(stored).toMatch(/^scrypt\$\d+\$[\w+/=]+\$[\w+/=]+$/);
    expect(stored).not.toContain("correct horse");
    expect(await OwnerPassword.matches("correct horse battery staple", stored)).toBe(true);
    expect(await OwnerPassword.matches("correct horse battery stapler", stored)).toBe(false);
    expect(await OwnerPassword.matches("", stored)).toBe(false);
  });

  it("salts each hash, and refuses a malformed one rather than throwing", async () => {
    const [first, second] = [await OwnerPassword.hash("same"), await OwnerPassword.hash("same")];
    expect(first).not.toBe(second);
    for (const malformed of ["", "plain text", "scrypt$abc$def", "bcrypt$1$c2FsdA==$aGFzaA==", "scrypt$99999999999$c2FsdA==$aGFzaA=="]) {
      expect(await OwnerPassword.matches("same", malformed)).toBe(false);
    }
  });
});
