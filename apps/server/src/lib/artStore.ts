import { AwsClient } from "aws4fetch";

/**
 * The art store on Cloudflare R2 (ADR 0014): the owner's pictures and the mirror of the catalogs' art, written through
 * R2's S3 API with `aws4fetch` signing each request, read by browsers from the bucket's public address.
 *
 * Georges, 2026-10-25: "before doing any kind of operation with the bucket to avoid paying over limits check yourself".
 * R2 bills storage, class A operations (writes, lists) and class B operations (reads) past a monthly free tier; nothing
 * here writes without first reading the month's usage from Cloudflare's analytics and checking that the plan keeps
 * every meter under `BUDGET_SHARE` of the free tier. No analytics token, no write.
 *
 * This module touches no database: the server loads its settings from Settings → Keys (`artStoreKeys.ts`), the mirror
 * from its environment.
 */
export type R2Settings = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** The bucket's public address (its r2.dev development URL or a custom domain), no trailing slash. */
  publicUrl: string;
  /** A Cloudflare API token with Account Analytics: Read, for the budget check; empty means no check and no write. */
  analyticsToken: string;
};

/** R2's monthly free tier (https://developers.cloudflare.com/r2/pricing/): storage in GB-month, operations a month. */
export const FREE_TIER = {
  storageBytes: 10_000_000_000,
  classA: 1_000_000,
  classB: 10_000_000,
} as const;
/** The share of the free tier a plan may reach; past it the store refuses to write. */
export const BUDGET_SHARE = 0.8;
/** How long a usage reading serves the checks before it is read again. */
const USAGE_TTL_MS = 10 * 60_000;

export type Usage = { since: string; classA: number; classB: number; storageBytes: number };
export type Plan = { classA?: number; classB?: number; bytes?: number };
export type Verdict = { ok: boolean; over: string[]; lines: string[] };

/** The operations R2 bills, by class (its pricing page); an operation the list does not know counts as class A, the dearer. */
const CLASS_A = new Set([
  "ListBuckets",
  "PutBucket",
  "ListObjects",
  "PutObject",
  "CopyObject",
  "CompleteMultipartUpload",
  "CreateMultipartUpload",
  "LifecycleStorageTierTransition",
  "ListMultipartUploads",
  "UploadPart",
  "UploadPartCopy",
  "ListParts",
  "PutBucketEncryption",
  "PutBucketCors",
  "PutBucketLifecycleConfiguration",
]);
const CLASS_B = new Set([
  "HeadBucket",
  "HeadObject",
  "GetObject",
  "UsageSummary",
  "GetBucketEncryption",
  "GetBucketLocation",
  "GetBucketCors",
  "GetBucketLifecycleConfiguration",
]);
const FREE = new Set(["DeleteObject", "DeleteBucket", "AbortMultipartUpload"]);
export function classOf(actionType: string): "A" | "B" | "free" {
  if (CLASS_B.has(actionType)) return "B";
  if (FREE.has(actionType)) return "free";
  return CLASS_A.has(actionType) ? "A" : "A";
}

type Analytics = {
  data?: {
    viewer?: {
      accounts?: {
        r2OperationsAdaptiveGroups?: {
          sum: { requests: number };
          dimensions: { actionType: string };
        }[];
        r2StorageAdaptiveGroups?: {
          max: { payloadSize: number; metadataSize: number; objectCount?: number };
          dimensions: { datetime: string };
        }[];
      }[];
    };
  };
  errors?: { message: string }[];
};

/** The month's usage from an analytics answer: operations summed by class, the newest storage reading. */
export function usageFromAnalytics(analytics: Analytics, since: string): Usage {
  const account = analytics.data?.viewer?.accounts?.[0];
  let classA = 0;
  let classB = 0;
  for (const group of account?.r2OperationsAdaptiveGroups ?? []) {
    const operationClass = classOf(group.dimensions.actionType);
    if (operationClass === "A") classA += group.sum.requests;
    if (operationClass === "B") classB += group.sum.requests;
  }
  const newest = [...(account?.r2StorageAdaptiveGroups ?? [])].sort((first, second) =>
    second.dimensions.datetime.localeCompare(first.dimensions.datetime),
  )[0];
  return {
    since,
    classA,
    classB,
    storageBytes: newest ? newest.max.payloadSize + newest.max.metadataSize : 0,
  };
}

const gigabytes = (bytes: number) => (bytes / 1_000_000_000).toFixed(2);
const count = (value: number) => value.toLocaleString("en-US");

/** Whether a plan keeps every meter under the budget, and where each meter stands. */
export function checkBudget(usage: Usage, plan: Plan): Verdict {
  const limits = {
    storage: FREE_TIER.storageBytes * BUDGET_SHARE,
    classA: FREE_TIER.classA * BUDGET_SHARE,
    classB: FREE_TIER.classB * BUDGET_SHARE,
  };
  const meters: [name: string, used: number, planned: number, limit: number, line: string][] = [
    [
      "storage",
      usage.storageBytes,
      plan.bytes ?? 0,
      limits.storage,
      `storage ${gigabytes(usage.storageBytes)} GB + ${gigabytes(plan.bytes ?? 0)} GB of ${gigabytes(FREE_TIER.storageBytes).replace(/\.00$/, "")} GB free (limit ${gigabytes(limits.storage)} GB)`,
    ],
    [
      "class A",
      usage.classA,
      plan.classA ?? 0,
      limits.classA,
      `class A ${count(usage.classA)} + ${count(plan.classA ?? 0)} of ${count(FREE_TIER.classA)} free (limit ${count(limits.classA)})`,
    ],
    [
      "class B",
      usage.classB,
      plan.classB ?? 0,
      limits.classB,
      `class B ${count(usage.classB)} + ${count(plan.classB ?? 0)} of ${count(FREE_TIER.classB)} free (limit ${count(limits.classB)})`,
    ],
  ];
  const over = meters
    .filter(([, used, planned, limit]) => used + planned > limit)
    .map(([name]) => name);
  return { ok: over.length === 0, over, lines: meters.map(([, , , , line]) => line) };
}

const USAGE_QUERY = `query R2Usage($accountTag: string!, $bucketName: string!, $since: Time!, $until: Time!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      r2OperationsAdaptiveGroups(limit: 10000, filter: { datetime_geq: $since, datetime_leq: $until, bucketName: $bucketName }) {
        sum { requests }
        dimensions { actionType }
      }
      r2StorageAdaptiveGroups(limit: 10000, filter: { datetime_geq: $since, datetime_leq: $until, bucketName: $bucketName }, orderBy: [datetime_DESC]) {
        max { payloadSize metadataSize objectCount }
        dimensions { datetime }
      }
    }
  }
}`;

const monthStart = (now: Date) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");
const unescapeXml = (text: string) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

export type ArtStore = {
  readonly kind: "r2";
  /** Where a browser reads a stored path. */
  publicUrl(path: string): string;
  /** Writes a picture (one class A operation) and answers its public URL; throws when the bucket refuses. */
  put(path: string, bytes: Uint8Array, contentType: string, cacheControl?: string): Promise<string>;
  /** The keys under a prefix, read a thousand at a time (one class A operation each page). */
  list(prefix: string): Promise<Set<string>>;
  /** The month's usage, from Cloudflare's analytics. */
  usage(now?: Date): Promise<Usage>;
  /** Refuses (throws) when the check cannot run or when the plan goes past the budget; answers the meters' lines otherwise. */
  assertBudget(plan: Plan, now?: Date): Promise<string[]>;
};

export function createArtStore(settings: R2Settings, fetchImpl: typeof fetch = fetch): ArtStore {
  const client = new AwsClient({
    accessKeyId: settings.accessKeyId,
    secretAccessKey: settings.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const endpoint = `https://${settings.accountId}.r2.cloudflarestorage.com`;
  const publicBase = settings.publicUrl.replace(/\/+$/, "");
  let reading: { at: number; usage: Usage } | null = null;

  const signed = async (url: string, init: RequestInit) => fetchImpl(await client.sign(url, init));

  const usage = async (now = new Date()): Promise<Usage> => {
    const since = monthStart(now);
    const response = await fetchImpl("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        authorization: `Bearer ${settings.analyticsToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query: USAGE_QUERY,
        variables: {
          accountTag: settings.accountId,
          bucketName: settings.bucket,
          since,
          until: now.toISOString(),
        },
      }),
    });
    if (!response.ok) throw new Error(`R2 usage: the analytics answered ${response.status}`);
    const analytics = (await response.json()) as Analytics;
    if (analytics.errors?.length)
      throw new Error(`R2 usage: ${analytics.errors.map((error) => error.message).join("; ")}`);
    return usageFromAnalytics(analytics, since);
  };

  return {
    kind: "r2",
    publicUrl: (path) => `${publicBase}/${encodePath(path)}`,
    async put(path, bytes, contentType, cacheControl = "public, max-age=604800") {
      const response = await signed(`${endpoint}/${settings.bucket}/${encodePath(path)}`, {
        method: "PUT",
        body: bytes,
        headers: { "content-type": contentType, "cache-control": cacheControl },
      });
      if (!response.ok) throw new Error(`R2 PUT ${path}: ${response.status}`);
      return `${publicBase}/${encodePath(path)}`;
    },
    async list(prefix) {
      const keys = new Set<string>();
      let token: string | undefined;
      do {
        const query = new URLSearchParams({
          "list-type": "2",
          "max-keys": "1000",
          prefix,
          ...(token ? { "continuation-token": token } : {}),
        });
        query.sort();
        const response = await signed(`${endpoint}/${settings.bucket}?${query}`, { method: "GET" });
        if (!response.ok) throw new Error(`R2 list ${prefix}: ${response.status}`);
        const xml = await response.text();
        for (const match of xml.matchAll(/<Key>([^<]*)<\/Key>/g)) keys.add(unescapeXml(match[1]!));
        token = /<IsTruncated>true<\/IsTruncated>/.test(xml)
          ? unescapeXml(
              /<NextContinuationToken>([^<]*)<\/NextContinuationToken>/.exec(xml)?.[1] ?? "",
            ) || undefined
          : undefined;
      } while (token);
      return keys;
    },
    usage,
    async assertBudget(plan, now = new Date()) {
      if (!settings.analyticsToken)
        throw new Error(
          "no budget check: the analytics token is not set, so the store will not write (Settings → Keys, Art store)",
        );
      if (!reading || now.getTime() - reading.at > USAGE_TTL_MS)
        reading = { at: now.getTime(), usage: await usage(now) };
      const verdict = checkBudget(reading.usage, plan);
      if (!verdict.ok)
        throw new Error(
          `over the budget (${verdict.over.join(", ")}): ${verdict.lines.join("; ")}`,
        );
      return verdict.lines;
    },
  };
}
