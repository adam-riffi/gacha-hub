# 0006 — Game art in our own store

- Status: Accepted (2026-10-09)
- Date: 2026-10-09
- Proposed by: claude; decided by: Georges

## Context

The new screens lead with art: splash art on character cards and on the character sheet, icons everywhere else. Today the web app hotlinks two community CDNs (`communityArtUrl`: Enka for Genshin, Yatta for HSR). ZZZ, WuWa, Endfield and NTE have no art at all, and either CDN can block us. The resolver is ready for our own store: `assetPath()` builds `{VITE_ASSET_BASE}/{game}/{kind}/{key}.webp`.

Rough size: about 50 MB per game as WebP once splash art is included, so a few hundred MB and several thousand files for six games.

Free-tier limits that decide it (checked 2026-10-09):

| Store | Storage | Writes | Egress | Notes |
| --- | --- | --- | --- | --- |
| Vercel Blob (Hobby) | 1 GB | 2,000 advanced operations a month | 10 GB | Going over blocks Blob for 30 days, which would also stop user uploads. |
| Supabase Storage (Free) | 1 GB | — | 5 GB, plus 5 GB cached | No image transformations on Free. |
| Cloudflare R2 (free tier) | 10 GB | 1 million Class A operations a month | Free | `r2.dev` URLs are rate-limited and meant for development; a custom domain lifts that. |

## Decision

- Mirror game art into a **Cloudflare R2** bucket with public read access, and point `VITE_ASSET_BASE` at it. Paths stay `{game}/{kind}/{key}.webp`.
- Add the `splash` art kind to `ArtKind`, next to `character`, `portrait`, `weapon`, `gear`, `material`, `talent` and `constellation`.
- A mirror script in `scripts/assets/`, installed in isolation like `scripts/catalog` (not a workspace). It reads each catalog, downloads each image from the source recorded per art kind in the game's manifest (ADR 0004), converts it to WebP and uploads only what is missing or changed, by content hash. `sharp` and an S3 client are allowed inside `scripts/assets` only.
- The web app keeps `communityArtUrl` as a fallback, then the placeholder tile.
- The CSP `img-src` adds the bucket's host, in `securityHeaders.ts` and `vercel.json`; the existing test keeps the two equal.
- The R2 credentials live only in Georges's environment, or as GitHub Actions secrets for a manual `workflow_dispatch` mirror job.

## Alternatives considered

- **Vercel Blob.** Rejected for art: the Hobby write quota is far below the file count for six games, and going over would also lock user uploads. Blob stays for uploads.
- **Supabase Storage.** Workable, but splash art would hit the 5 GB egress first. Kept as the fallback if Cloudflare is not wanted.
- **Commit the art to `apps/web/public`.** Rejected: the repository is public, so it would redistribute the art, and it would grow by hundreds of MB.
- **Keep hotlinking.** Rejected: four of six games have no art, and two CDNs are single points of failure.

## Consequences

- One new account (Cloudflare) and two secrets for the mirror job, both created by Georges.
- Game art is © its publishers. It is mirrored for a non-commercial tool used by a few friends, credited in `NOTICE`, and removed on request.
- Each game version runs the mirror once after its catalog refresh.
