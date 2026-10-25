import { describe, expect, it } from "vitest";
import { BUDGET_SHARE, checkBudget, classOf, createArtStore, FREE_TIER, usageFromAnalytics, type R2Settings } from "./artStore.js";

// Round 21 (ADR 0014): the art store moves from Vercel Blob (suspended until 19 November on the Hobby limit) to a
// Cloudflare R2 bucket, written through the S3 API. Georges, 2026-10-25: "before doing any kind of operation with the
// bucket to avoid paying over limits check yourself": the store reads the month's usage from Cloudflare's analytics and
// refuses a write that would take any meter past 80 % of the free tier.

const settings: R2Settings = {
  accountId: "0123456789abcdef0123456789abcdef",
  bucket: "gacha-hub-art",
  accessKeyId: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
  secretAccessKey: "0".repeat(64),
  publicUrl: "https://pub-0a1b2c3d4e5f.r2.dev",
  analyticsToken: "not-a-real-token-only-a-test-value-0000",
};

type Call = { url: string; method: string; headers: Record<string, string>; body: string };
/** A fetch that records each request and answers from a queue. */
function recorder(answers: { status?: number; body?: string }[] = []) {
  const calls: Call[] = [];
  const fetchImpl = async (input: Request | string, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    calls.push({ url: request.url, method: request.method, headers: Object.fromEntries(request.headers.entries()), body: request.body ? await request.text() : "" });
    const answer = answers.shift() ?? { status: 200, body: "" };
    return new Response(answer.body ?? "", { status: answer.status ?? 200 });
  };
  return { calls, fetchImpl: fetchImpl as typeof fetch };
}

describe("the operation classes R2 bills", () => {
  it("counts writes and lists as class A, reads as class B, and deletes as free", () => {
    expect(["PutObject", "ListObjects", "CopyObject", "CompleteMultipartUpload"].map(classOf)).toEqual(["A", "A", "A", "A"]);
    expect(["GetObject", "HeadObject", "HeadBucket"].map(classOf)).toEqual(["B", "B", "B"]);
    expect(["DeleteObject", "AbortMultipartUpload"].map(classOf)).toEqual(["free", "free"]);
  });
});

describe("the month's usage from Cloudflare's analytics", () => {
  it("sums the operations by class and takes the newest storage reading", () => {
    const usage = usageFromAnalytics(
      {
        data: {
          viewer: {
            accounts: [
              {
                r2OperationsAdaptiveGroups: [
                  { sum: { requests: 3315 }, dimensions: { actionType: "PutObject" } },
                  { sum: { requests: 4 }, dimensions: { actionType: "ListObjects" } },
                  { sum: { requests: 120000 }, dimensions: { actionType: "GetObject" } },
                  { sum: { requests: 10 }, dimensions: { actionType: "DeleteObject" } },
                ],
                r2StorageAdaptiveGroups: [
                  { max: { payloadSize: 300_000_000, metadataSize: 1_000_000, objectCount: 3315 }, dimensions: { datetime: "2026-10-25T18:00:00Z" } },
                  { max: { payloadSize: 10, metadataSize: 1, objectCount: 1 }, dimensions: { datetime: "2026-10-24T18:00:00Z" } },
                ],
              },
            ],
          },
        },
      },
      "2026-10-01T00:00:00Z",
    );
    expect(usage).toEqual({ since: "2026-10-01T00:00:00Z", classA: 3319, classB: 120000, storageBytes: 301_000_000 });
  });

  it("reads an empty month as zero", () => {
    expect(usageFromAnalytics({ data: { viewer: { accounts: [{ r2OperationsAdaptiveGroups: [], r2StorageAdaptiveGroups: [] }] } } }, "2026-11-01T00:00:00Z")).toEqual({ since: "2026-11-01T00:00:00Z", classA: 0, classB: 0, storageBytes: 0 });
  });
});

describe("the budget check before a write", () => {
  const usage = { since: "2026-10-01T00:00:00Z", classA: 3319, classB: 120000, storageBytes: 301_000_000 };

  it("allows a plan that keeps every meter under 80 % of the free tier, and says where each meter stands", () => {
    const verdict = checkBudget(usage, { classA: 3400, bytes: 700_000_000 });
    expect(verdict.ok).toBe(true);
    expect(verdict.over).toEqual([]);
    expect(verdict.lines).toEqual([
      "storage 0.30 GB + 0.70 GB of 10 GB free (limit 8.00 GB)",
      "class A 3,319 + 3,400 of 1,000,000 free (limit 800,000)",
      "class B 120,000 + 0 of 10,000,000 free (limit 8,000,000)",
    ]);
    expect(BUDGET_SHARE).toBe(0.8);
    expect(FREE_TIER).toEqual({ storageBytes: 10_000_000_000, classA: 1_000_000, classB: 10_000_000 });
  });

  it("refuses a plan that would take a meter past 80 %, naming the meter", () => {
    expect(checkBudget({ ...usage, classA: 790_000 }, { classA: 20_000 })).toMatchObject({ ok: false, over: ["class A"] });
    expect(checkBudget({ ...usage, storageBytes: 7_000_000_000 }, { bytes: 2_000_000_000 })).toMatchObject({ ok: false, over: ["storage"] });
    expect(checkBudget({ ...usage, classB: 7_999_999 }, { classB: 2 })).toMatchObject({ ok: false, over: ["class B"] });
  });
});

describe("the R2 store", () => {
  it("puts a picture with a signed request to the bucket's S3 address and answers its public URL", async () => {
    const { calls, fetchImpl } = recorder();
    const store = createArtStore(settings, fetchImpl);
    const url = await store.put("assets/wuwa/character/T_IconRoleHead256_75_UI.webp", Buffer.from("webp"), "image/webp");
    expect(url).toBe("https://pub-0a1b2c3d4e5f.r2.dev/assets/wuwa/character/T_IconRoleHead256_75_UI.webp");
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ method: "PUT", url: "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com/gacha-hub-art/assets/wuwa/character/T_IconRoleHead256_75_UI.webp" });
    expect(calls[0]!.headers["content-type"]).toBe("image/webp");
    expect(calls[0]!.headers["cache-control"]).toBe("public, max-age=604800");
    expect(calls[0]!.headers.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=a1b2c3d4e5f60718293a4b5c6d7e8f90\/\d{8}\/auto\/s3\/aws4_request, SignedHeaders=/);
    expect(calls[0]!.headers["x-amz-content-sha256"]).toMatch(/^[0-9a-f]{64}$/);
  });

  it("fails loudly when the bucket refuses the write", async () => {
    const { fetchImpl } = recorder([{ status: 403, body: "<Error><Code>AccessDenied</Code></Error>" }]);
    await expect(createArtStore(settings, fetchImpl).put("assets/x.webp", Buffer.from("x"), "image/webp")).rejects.toThrow(/403/);
  });

  it("lists the keys under a prefix, one request a thousand keys, following the continuation token", async () => {
    const page = (keys: string[], next?: string) =>
      `<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><IsTruncated>${next ? "true" : "false"}</IsTruncated>${next ? `<NextContinuationToken>${next}</NextContinuationToken>` : ""}${keys.map((key) => `<Contents><Key>${key}</Key><Size>10</Size></Contents>`).join("")}</ListBucketResult>`;
    const { calls, fetchImpl } = recorder([{ body: page(["assets/wuwa/a.webp", "assets/wuwa/b.webp"], "tok&en") }, { body: page(["assets/wuwa/c.webp"]) }]);
    const held = await createArtStore(settings, fetchImpl).list("assets/wuwa/");
    expect([...held]).toEqual(["assets/wuwa/a.webp", "assets/wuwa/b.webp", "assets/wuwa/c.webp"]);
    expect(calls.map((call) => call.method)).toEqual(["GET", "GET"]);
    expect(calls[0]!.url).toBe("https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com/gacha-hub-art?list-type=2&max-keys=1000&prefix=assets%2Fwuwa%2F");
    expect(calls[1]!.url).toBe("https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com/gacha-hub-art?continuation-token=tok%26en&list-type=2&max-keys=1000&prefix=assets%2Fwuwa%2F");
  });

  it("asks Cloudflare's analytics for the month's usage with the analytics token, from the first of the month", async () => {
    const { calls, fetchImpl } = recorder([{ body: JSON.stringify({ data: { viewer: { accounts: [{ r2OperationsAdaptiveGroups: [{ sum: { requests: 7 }, dimensions: { actionType: "PutObject" } }], r2StorageAdaptiveGroups: [] }] } } }) }]);
    const usage = await createArtStore(settings, fetchImpl).usage(new Date("2026-10-25T18:40:00Z"));
    expect(usage).toEqual({ since: "2026-10-01T00:00:00.000Z", classA: 7, classB: 0, storageBytes: 0 });
    expect(calls[0]).toMatchObject({ method: "POST", url: "https://api.cloudflare.com/client/v4/graphql" });
    expect(calls[0]!.headers.authorization).toBe("Bearer not-a-real-token-only-a-test-value-0000");
    const body = JSON.parse(calls[0]!.body) as { query: string; variables: Record<string, string> };
    expect(body.variables).toEqual({ accountTag: settings.accountId, bucketName: "gacha-hub-art", since: "2026-10-01T00:00:00.000Z", until: "2026-10-25T18:40:00.000Z" });
    expect(body.query).toContain("r2OperationsAdaptiveGroups");
    expect(body.query).toContain("r2StorageAdaptiveGroups");
  });

  it("refuses a write when the budget check cannot run (no analytics token) or when the plan goes past the limit", async () => {
    const noToken = createArtStore({ ...settings, analyticsToken: "" }, recorder().fetchImpl);
    await expect(noToken.assertBudget({ classA: 1 })).rejects.toThrow(/no budget check/);
    const { fetchImpl } = recorder([{ body: JSON.stringify({ data: { viewer: { accounts: [{ r2OperationsAdaptiveGroups: [{ sum: { requests: 799_999 }, dimensions: { actionType: "PutObject" } }], r2StorageAdaptiveGroups: [] }] } } }) }]);
    await expect(createArtStore(settings, fetchImpl).assertBudget({ classA: 2 })).rejects.toThrow(/class A 799,999 \+ 2 of 1,000,000 free \(limit 800,000\)/);
  });

  it("reads the usage once for a while: a second check within ten minutes asks nothing more", async () => {
    const { calls, fetchImpl } = recorder([{ body: JSON.stringify({ data: { viewer: { accounts: [{ r2OperationsAdaptiveGroups: [], r2StorageAdaptiveGroups: [] }] } } }) }]);
    const store = createArtStore(settings, fetchImpl);
    const first = await store.assertBudget({ classA: 1, bytes: 100 }, new Date("2026-10-25T18:40:00Z"));
    const second = await store.assertBudget({ classA: 1, bytes: 100 }, new Date("2026-10-25T18:45:00Z"));
    expect(first[0]).toBe("storage 0.00 GB + 0.00 GB of 10 GB free (limit 8.00 GB)");
    expect(second).toEqual(first);
    expect(calls).toHaveLength(1);
  });
});
