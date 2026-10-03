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
| `https://<blob>.public.blob.vercel-storage.com/assets` | Vercel Blob |
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
