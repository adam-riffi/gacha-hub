# 0013 — The art store on Vercel Blob

- Status: Superseded by 0014 on 2026-10-25 (the store suspended on the Hobby limit); accepted 2026-10-20 (Georges: "all ok go on")
- Date: 2026-10-20
- Proposed by: claude; decided by: Georges

## Context

Georges, 2026-10-20: "propose me a simple hosting solution for the assets (this solution must have a claude connector for the setup)". ADR 0006 chose a Cloudflare R2 bucket for our own copy of the games' art, mirrored by a script; nobody set it up, and the app has hotlinked the community CDNs since. Meanwhile the owner's own pictures (Settings → Art, round 14) already go to the Vercel Blob store the app's uploads use, which the Vercel connector created and whose token Vercel injects into the app.

## Decision

1. **Vercel Blob is the art store**, for the owner's pictures and for the mirror of the catalogs' art. The Hobby plan's included storage (1 GB) and monthly transfer (10 GB) cover everything the app can show, about 250 MB, for one user. No second account, no console, no secret to paste: the store was created through the connector and its token is on the host.
2. **The mirror writes to Blob** (`scripts/assets/mirror.ts`, `@vercel/blob` instead of the S3 client), under `assets/{game}/{kind}/{key}.webp`, skipping what the store holds. The `mirror-art` workflow takes the token from the app with GitHub's OIDC proof (ADR 0012) and **reports the public base** back; the app keeps it as `ASSET_BASE` (Settings → Keys), so the web app reads our copy at once, with no rebuild.
3. **The R2 keys leave Settings → Keys.** `ASSET_BASE` stays, as the override.

## Alternatives considered

- **Cloudflare R2** (ADR 0006): more generous (10 GB, no egress fees) but no connector; the setup never happened.
- **Supabase Storage**: a connector exists (the project's), 1 GB storage and 2 GB egress a month; a second service for what Blob already does.

## Consequences

- ADR 0006's store shape (keys, kinds, WebP, the `assetPath` layout) stands; only the host changes.
- Blob's list gives no content hash: the mirror skips a path it finds and `--force` uploads everything again.
- DEPLOY.md §7, AGENTS.md's command table and ASSETS.md say so.
