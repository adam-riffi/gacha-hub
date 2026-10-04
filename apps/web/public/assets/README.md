# Game art assets

Runtime image assets (character art, weapon/artifact/talent/constellation icons)
resolved by [`apps/web/src/lib/assets.ts`](../../src/lib/assets.ts) via the
`assetUrl(gameKey, kind, key)` helper. Anything missing renders a generated
placeholder tile (see `<GameIcon>`), so the UI works with zero real files here.

## Why these aren't in git

The images are HoYoverse-owned. They are **git-ignored** (`.webp/.png/.jpg/...`)
and populated per environment instead of committed. Only this README and the
folder structure are tracked.

## Layout

```
assets/<gameKey>/<kind>/<key>.webp
```

- `gameKey` — `genshin`, `hsr`, …
- `kind` — `character` (square avatar), `portrait` (splash/card), `weapon`,
  `gear` (artifact/relic set pieces), `talent`, `constellation`, `material`
- `key` — the catalog asset key. Characters/weapons/materials use the source
  `icon` field (e.g. `UI_AvatarIcon_Arlecchino`). Derived keys:
  - talents: `<charIconKey>_<normal|skill|burst>`
  - constellations: `<charIconKey>_c<1..6>`
  - gear pieces: the catalog's per-piece icon key (`extra.pieceIcons`, e.g. `UI_RelicIcon_15035_4`)

Example (Genshin / Arlecchino):

```
genshin/character/UI_AvatarIcon_Arlecchino.webp
genshin/portrait/UI_AvatarIcon_Arlecchino.webp
genshin/weapon/UI_EquipIcon_Pole_BloodMoon.webp
genshin/talent/UI_AvatarIcon_Arlecchino_skill.webp
genshin/constellation/UI_AvatarIcon_Arlecchino_c1.webp
genshin/gear/UI_RelicIcon_15035_4.webp
```

## Where images come from

Pick one — the resolver doesn't care (set `VITE_ASSET_BASE`):

1. **Local (default)** — drop files here; served by the CDN in production.
2. **Vercel Blob / any CDN** — set `VITE_ASSET_BASE` to the public base URL.
3. **Google Drive → static** — keep originals in a Drive folder and pull them
   into this tree with [`scripts/assets/sync-drive.mjs`](../../../../scripts/assets/README.md).
   Drive is the drop-box; the runtime still serves static files.
