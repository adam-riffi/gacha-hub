# Asset pipeline

The web app resolves images through `assetUrl(gameKey, kind, key)`
([`apps/web/src/lib/assets.ts`](../../apps/web/src/lib/assets.ts)) and renders a
placeholder tile for anything missing, so **assets are optional** — the UI works
without them. This folder holds tooling to *populate* the real files.

## Where images are served from

Set `VITE_ASSET_BASE` (build-time, web app):

| Value | Serves from |
| --- | --- |
| _unset_ / `/assets` | `apps/web/public/assets` → your CDN in prod (default) |
| `https://<bucket>.r2.dev/assets` | Cloudflare R2 / S3 / any CDN |

Layout and key conventions: see
[`apps/web/public/assets/README.md`](../../apps/web/public/assets/README.md).

## sync-drive.mjs — Google Drive → static

Keep original art in a Drive folder that mirrors the on-disk tree
(`<gameKey>/<kind>/<key>.webp`) and pull it down:

```bash
GDRIVE_FOLDER_ID=<folder id from the share URL> \
GDRIVE_API_KEY=<Google API key, Drive API enabled> \
node scripts/assets/sync-drive.mjs           # add --dry to preview
```

- The **API-key** path (implemented) requires the folder be shared as
  **"Anyone with the link"**. Nothing is fetched from Drive at runtime — this
  only copies files into `apps/web/public/assets` at build/sync time.
- For a **private** folder, use a **service account**: `npm i googleapis`, share
  the folder with the service-account email, and swap the two REST calls in
  `sync-drive.mjs` (`listFolder` / `download`) for authenticated `drive.files`
  calls. Everything else (the recursive mirror) stays the same.

> Drive is a convenience drop-box, not an image host — it throttles hotlinking
> and its URLs are unstable. Always sync to static and serve from a CDN.

## mirror.ts — catalog art → our R2 bucket (ADR 0006, ADR 0014)

Lists every catalog image the manifests name a source for (`artJobs` in
`packages/shared/src/art.ts`), lists what the bucket holds once per game (one
request a thousand keys), converts each missing image to WebP and writes it
through the server's store module (`apps/server/src/lib/artStore.ts`, R2's S3
API signed by `aws4fetch`).

Before its first request it reads the month's usage from Cloudflare's analytics
and prints storage, class A and class B operations with the run's plan added;
it refuses to start when any meter would pass 80 % of the free tier, and prints
the usage again at the end (Georges, 2026-10-25: check before any operation on
the bucket). No analytics token, no run.

```bash
npm ci && npm --prefix scripts/assets ci
npm --prefix scripts/assets run mirror -- --dry-run                 # what would be mirrored, per game and kind; touches nothing
npm --prefix scripts/assets run mirror -- --game hsr --out ./tmp    # write WebP files locally instead
R2_ACCOUNT_ID=… R2_BUCKET=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… R2_PUBLIC_URL=… CF_ANALYTICS_TOKEN=… \
  npm --prefix scripts/assets run mirror -- --game all              # check the budget, then write to the bucket
```

In practice it runs from the manual **mirror-art** GitHub Actions workflow,
which takes the keys from the app (Settings → Keys, ADR 0012) with GitHub's
OIDC proof; nothing is a repository secret (setup: `docs/DEPLOY.md` §7). Never
commit the files it writes.
