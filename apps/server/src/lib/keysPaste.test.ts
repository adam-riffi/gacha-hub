import { describe, expect, it } from "vitest";
import { parseKeyPaste } from "./keysPaste.js";

// Georges, 2026-10-27 (one paste instead of six fields): one paste box in Settings → Keys
// takes the whole block of Cloudflare values at once, labels in his own words, any order, and sorts them into the
// Art store's fields by their shape and their label. Test values only: not a real account, key or token.

const ACCOUNT = "f1300000000000000000000000000152";
const ACCESS = "de550000000000000000000000002294";
const SECRET = "fad5000000000000000000000000000000000000000000000000000000009505";
const URL = "https://pub-37780000000000000000000000087ac.r2.dev";
const ANALYTICS = "cfat_testOnlyNotARealTokenValue000000000000e16b";
const CLASSIC = "classic-analytics-token-test-value-00001";

describe("parseKeyPaste", () => {
  it("reads a labelled block, one value a line, in any order, with colons or without", () => {
    const text = `account id: ${ACCOUNT}
bucket: gacha-hub-art
access key id ${ACCESS}
Secret Access Key = ${SECRET}
public url: ${URL}
analytics token: ${ANALYTICS}`;
    expect(parseKeyPaste(text)).toEqual({
      values: { R2_ACCOUNT_ID: ACCOUNT, R2_BUCKET: "gacha-hub-art", R2_ACCESS_KEY_ID: ACCESS, R2_SECRET_ACCESS_KEY: SECRET, R2_PUBLIC_URL: URL, CF_ANALYTICS_TOKEN: ANALYTICS },
      unplaced: [],
    });
  });

  it("reads the block as it was typed in chat: two values on one line, a typo in a label, a token it does not place named by its line only", () => {
    const text = `here is the token cfat_theStoreTokenItselfNotNeeded0000000000a1
Access Key ID ${ACCESS}
Secret Access Key ${SECRET}
public url ${URL}/
analytics token accounnt id ${ACCOUNT}  API toekn ${ANALYTICS}`;
    const result = parseKeyPaste(text);
    expect(result.values).toEqual({ R2_ACCOUNT_ID: ACCOUNT, R2_ACCESS_KEY_ID: ACCESS, R2_SECRET_ACCESS_KEY: SECRET, R2_PUBLIC_URL: URL, CF_ANALYTICS_TOKEN: ANALYTICS });
    expect(result.unplaced).toEqual(["line 1: a token without the word analytics in its label"]);
    expect(JSON.stringify(result.unplaced)).not.toContain("cfat_theStore");
  });

  it("tells the two 32-character values apart by the words access and account, else by their order on the page", () => {
    expect(parseKeyPaste(`${ACCESS} access key\n${ACCOUNT} account`).values).toEqual({ R2_ACCESS_KEY_ID: ACCESS, R2_ACCOUNT_ID: ACCOUNT });
    expect(parseKeyPaste(`${ACCOUNT}\n${ACCESS}`).values).toEqual({ R2_ACCOUNT_ID: ACCOUNT, R2_ACCESS_KEY_ID: ACCESS });
  });

  it("takes the classic 40-character analytics token, a bare r2.dev host, and keeps nothing of an empty paste", () => {
    expect(parseKeyPaste(`analytics ${CLASSIC}\npub-37780000000000000000000000087ac.r2.dev`).values).toEqual({ CF_ANALYTICS_TOKEN: CLASSIC, R2_PUBLIC_URL: URL });
    expect(parseKeyPaste("   \n")).toEqual({ values: {}, unplaced: [] });
  });

  it("names what it could not read without echoing it", () => {
    const result = parseKeyPaste("bucket: My Bucket!\nsomething else entirely");
    expect(result.values).toEqual({});
    expect(result.unplaced).toEqual(["line 1: no value of a known shape", "line 2: no value of a known shape"]);
  });
});
