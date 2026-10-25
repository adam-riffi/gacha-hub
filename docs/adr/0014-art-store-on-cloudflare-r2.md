# 0014 — The art store on Cloudflare R2, with a budget check before every write

- Status: Accepted
- Date: 2026-10-25
- Proposed by: claude; decided by: Georges ("go R2", then "before doing any kind of operation with the bucket to avoid paying over limits check yourself from now")

## Context
ADR 0013 (2026-10-20) put the art store on Vercel Blob: the owner's pictures (Settings → Art) and the mirror of the catalogs' art (3,315 images, about 250 MB). On 2026-10-25, the first mirror run after the round-20 deploy found the store suspended: "You have reached your usage limits for this store using the Hobby plan. Access resumes on 11/19/26." Every upload is refused and every read answers 403 until then. The app still shows catalog art, because each picture falls back to the community CDNs after the failed first request, but the owner's slot pictures (logos, key art, task icons) live only in that store and are gone for a month.

The forces: free hosting only (DESIGN.md §6); a store whose free allowance is far above what the app uses, so that a limit is never met; a cost model that bills past the allowance instead of cutting access; no new accounts to work around a limit; and Georges's rule that nothing touches the bucket without checking the month's usage first.

## Decision
1. **The art store is a Cloudflare R2 bucket** (`gacha-hub-art`, created through the Cloudflare connector on 2026-10-25), ADR 0006's original choice. Its free tier is 10 GB-month stored, a million class A operations (writes, lists) and ten million class B operations (reads) a month, egress free; the app's use is about 0.3 GB, a few thousand writes per mirror run and tens of thousands of reads a month. Past the allowance R2 bills ($0.015 a GB-month, $4.50 a million writes, $0.36 a million reads); it does not suspend.
2. **One store module** (`apps/server/src/lib/artStore.ts`) writes through R2's S3 API, each request signed by `aws4fetch` (65 KB, MIT; the library Cloudflare's own documentation uses). The app's uploads and the mirror share it; `@vercel/blob` leaves the server. Paths stay `assets/{game}/{kind}/{key}.webp` and `uploads/{name}`.
3. **Every write is preceded by a budget check.** The store reads the month's usage from Cloudflare's GraphQL analytics (`r2OperationsAdaptiveGroups` by action type, `r2StorageAdaptiveGroups`), adds the plan (the writes and bytes about to happen) and refuses when any meter would pass **80 % of the free tier**. A reading serves the checks of the next ten minutes. Without an analytics token there is no check and therefore no write. The mirror prints the three meters before and after its run; the bulk fetch of Settings → Art checks its whole batch before the first write.
4. **The mirror lists once per game** (one class A operation a thousand keys) instead of asking the store about each picture (one class B operation each): a run that uploads nothing costs a handful of operations.
5. **Keys in Settings → Keys** (ADR 0012), group Art store: the Cloudflare account ID, the bucket, the API token's Access Key ID and Secret Access Key (Object Read & Write on that bucket), the bucket's public URL (its r2.dev development address), and an analytics token (Account Analytics: Read). `ASSET_BASE` stays as an override; unset, the web reads the art at the bucket's `/assets`.
6. The r2.dev address is rate-limited and meant for light use, which is one user's. A custom domain lifts that if it ever matters; nothing in the app changes for it beyond the Public URL.

## Alternatives considered
- **Upgrade Vercel to Pro** ($20 a month): rejected; free hosting is a locked decision, and pictures for one person do not justify it.
- **Wait for 19 November**: rejected; a month without the owner's pictures, and the same limit every month after a mirror run.
- **A second Vercel account**: rejected; the same limit later, a new address (passkeys, Discord redirect, workflows), and against the terms.
- **Supabase Storage** (connector attached, 1 GB stored, 2 GB egress a month): rejected; a tenth of R2's transfer and the same suspension model.
- **Signing S3 requests by hand** (`node:crypto`): rejected for `aws4fetch`; sixty lines of signature code to maintain against a tested library the size of a picture.

## Consequences
- Georges enables R2 on his Cloudflare account (a card on file; nothing charged inside the allowance), creates the API token and the analytics token, enables the bucket's public development URL, and pastes the six values in Settings → Keys. Then the mirror runs once (the `mirror-art` workflow); the slot pictures are fetched again (Settings → Art), since the old ones point at the suspended store.
- The owner's pictures uploaded to Blob are not copied over: the store is unreadable until 19 November, and Settings → Art re-fetches the 117 it has sources for; the owner re-uploads any of his own.
- `DEPLOY.md` §7, `ASSETS.md` and the keys page describe the R2 store; ADR 0013 is superseded by this one.
- A budget line appears in every mirror report and in the session reports whenever the bucket is touched.
