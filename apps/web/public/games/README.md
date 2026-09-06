# Game assets

Drop each game's images here. Files are served at `/games/<key>/<file>` and
referenced from the game module's `art` field in
`packages/shared/src/games/<key>.ts`.

Expected files per game (optional — the UI falls back gracefully if missing):

- `icon.png` — square icon/logo
- `background.jpg` — wide background used behind the game's screens

Current game keys: `genshin`, `hsr`, `zzz`, `endfield`.

To add a brand-new game: create `packages/shared/src/games/<key>.ts`, register it
in `packages/shared/src/games/index.ts`, add a bespoke sheet at
`apps/web/src/games/<key>/Sheet.tsx` (register it in
`apps/web/src/render/index.tsx`), then drop assets in `public/games/<key>/`.
