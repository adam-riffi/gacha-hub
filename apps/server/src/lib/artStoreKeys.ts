import { readKey } from "./appKeys.js";
import { createArtStore, type ArtStore, type R2Settings } from "./artStore.js";

/**
 * The art store as Settings → Keys describes it (ADR 0014): the R2 bucket's account, name, S3 credentials and public
 * address, and the analytics token the budget check reads with. One store per set of values, so a usage reading
 * serves every write of the next ten minutes.
 */
let current: { signature: string; store: ArtStore } | null = null;

export async function artStoreSettings(): Promise<R2Settings | null> {
  const [accountId, bucket, accessKeyId, secretAccessKey, publicUrl, analyticsToken] =
    await Promise.all([
      readKey("R2_ACCOUNT_ID"),
      readKey("R2_BUCKET"),
      readKey("R2_ACCESS_KEY_ID"),
      readKey("R2_SECRET_ACCESS_KEY"),
      readKey("R2_PUBLIC_URL"),
      readKey("CF_ANALYTICS_TOKEN"),
    ]);
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey || !publicUrl) return null;
  return { accountId, bucket, accessKeyId, secretAccessKey, publicUrl, analyticsToken };
}

/** The store, or null when the keys are not all there (uploads then go to the local folder). */
export async function loadArtStore(): Promise<ArtStore | null> {
  const settings = await artStoreSettings();
  if (!settings) return null;
  const signature = JSON.stringify(settings);
  if (current?.signature !== signature) current = { signature, store: createArtStore(settings) };
  return current.store;
}

/** Where the web app reads the mirrored art: ASSET_BASE when set (the host's or the owner's override), else the bucket's `/assets`. */
export async function assetBase(): Promise<string | null> {
  const override = await readKey("ASSET_BASE");
  if (override) return override;
  const publicUrl = await readKey("R2_PUBLIC_URL");
  return publicUrl ? `${publicUrl.replace(/\/+$/, "")}/assets` : null;
}
