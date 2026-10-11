# Game assets

Drop each game's images here. Files are served at `/games/<key>/<file>` and
referenced from the game module's `art` field in
`packages/shared/src/games/<key>.ts`.

Expected files per game (optional — the UI falls back gracefully if missing):

- `icon.png` — square icon/logo
- `background.jpg` — wide background used behind the game's screens

Current game keys: `genshin`, `hsr`, `zzz`, `wuwa`, `endfield`, `nte`.

To add a brand-new game: `npm run game:new -- <key> "<Name>"` (AGENTS.md), then
drop assets in `public/games/<key>/`.
