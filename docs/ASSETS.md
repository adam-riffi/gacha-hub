# Assets to populate

Georges, round 8: "make a list of all the assets/icons you need to populate everything, like currency icons, etc."

What the app shows as a picture, where it comes from today, and what is still missing. Game art is never committed (ADR 0006): each catalog keeps a key, each game module's `art` sources turn it into a URL (community sources until the R2 mirror holds our own copy, `npm run assets:mirror`). Where nothing is found, the app draws a tile with the kind's glyph in the game's colour, so nothing breaks while an asset is missing.

Counts checked on 2026-10-14 against the catalogs in `packages/shared/src/games/*/catalog.json`.

## Per game, from the catalogs

| Game | Characters | Splash art | Weapons | Gear sets | Materials | Skill icons | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Genshin | 122 / 122 | uses the gacha art by the icon's name | 255 / 255 | 63 / 63 | 536 / 536 | 360 / 360 | Enka, Yatta |
| Star Rail | 98 / 98 | none: the icon stands in | 170 / 170 | 62 / 62 | 134 / 134 | **0 / 392** | Yatta |
| ZZZ | 60 / 60 | 60 / 60 | 100 / 100 | 30 / 30 | 92 / 92 | **0 / 300** | Hakushin |
| WuWa | 50 / 50 | 50 / 50 | 112 / 112 | 29 / 29 | 128 / 128 | **0 / 250** | wuthery |
| Endfield | 29 / 29 | 29 / 29 (small, 152 × 212) | 71 / 71 | 22 / 22 | its 14 gifts: **0 / 14** | none in its data | Endaxis (round 7) |
| NTE | 23 / 23 | 23 / 23 | 49 / 49 | 9 series, one icon per series | 117 / 117 (gifts among them) | **0 / 92** | Hakushin |

Missing there, worth a source:

- **Skill icons** for Star Rail, ZZZ, WuWa and NTE (the sheet's skill rows and bubbles show a glyph).
- **Star Rail splash art** (the cards and the banners use the small icon).
- **Endfield's larger portraits** (Endaxis's are 152 × 212; the cards show them whole rather than enlarged).
- **NTE's set icons**, one per cartridge set (today the series' cartridge stands in).
- **Endfield's gift icons** (14 gifts, no icon in any source found).

## Not in the catalogs: the app's own lists

Each of these is a glyph or text today; a real icon per item would replace it.

| What | Where it shows | Items |
| --- | --- | --- |
| **Game icon and background** | the strip, Home, the hub's header | round 12: every game has a drawn emblem (`GameMark`) and a hand-checked hero splash (`art.hero`); the owner's `icon.png`/`background.jpg` still win once dropped in |
| **Currencies** | Home, a game's dashboard, Pulls, Activities, the DM | round 12: **sourced** for Genshin (Enka), Star Rail (Yatta), ZZZ + NTE (Hakushin), WuWa (wuthery) — the keys live in each game module's `currencies`; Endfield has no item-icon source |
| **Top-up currency** | the Top-ups card | Genesis Crystal, Oneiric Shard, Monochrome, Lunite |
| **30-day passes** | the dashboard's pass card | Blessing of the Welkin Moon, Express Supply Pass, Inter-Knot Membership, Lunite Subscription, Riftcrystal Mining Permit |
| **Battle passes** | the dashboard, the timeline | Gnostic Hymn, Nameless Honor, New Eridu City Fund, Pioneer Podcast, Protocol Pass, Circle Bounty |
| **Endgame modes** | Endgame, the timeline, Home | Spiral Abyss, Imaginarium Theater, Stygian Onslaught, Memory of Chaos, Pure Fiction, Apocalyptic Shadow, Anomaly Arbitration, Shiyu Defense, Deadly Assault, Lost Void, Tower of Adversity, Whimpering Wastes, Echoes of War, Beyond the Rails |
| **Endgame metrics** | each mode's result | stars, difficulty, seals, crests, acts, rank, points (drawn since round 8) |
| **Elements** | cards, filters, enemy weaknesses | Genshin's seven, Star Rail's seven, ZZZ's attributes (Hakushin has them), WuWa's six, Endfield's, NTE's |
| **Weapon types and paths** | filters, cards | Genshin's five, Star Rail's paths, ZZZ's specialties, WuWa's five, Endfield's five, NTE's Arc types |
| **Stats** | the sheet, the cards, gear | drawn since round 7 (one line icon per kind) |
| **Monthly shops** | Activities | Paimon's Bargains, Embers Exchange, Signal Shop, Coral Shop, Lost Exchange |
| **Daily and weekly tasks** | the dashboards, Activities | each game's `defaultTasks` (Daily Commissions, Weekly Bosses, Simulated Universe, Notorious Hunt…) |
| **Banner kinds** | Pulls | character, weapon, standard, bangboo, chronicled, the Arsenal… (a glyph per kind today) |

## Cards still waiting for art (2026-10-16)

Georges, 2026-10-16: "make me a list of all the artless cards that needs to be filled i'll find you art to put on them."

Checked screen by screen on 2026-10-16. Already filled and not on this list: characters, weapons, gear, materials and enemies (the catalogs' community art), the currencies of five games, and one hero splash per game, which also fills any banner or event without art of its own. Name each file as below (PNG or WebP); square pictures on a transparent background where it says "icon".

**47 pictures in all.** In order of what helps most:

### 1. Game logos — 6 icons, square, 256 × 256 or larger

The big square at the top of every game page, each card in Games, the chips along the top. A drawn emblem stands in today.

| Game | File |
| --- | --- |
| Genshin Impact | `genshin-logo.png` |
| Honkai: Star Rail | `hsr-logo.png` |
| Zenless Zone Zero | `zzz-logo.png` |
| Wuthering Waves | `wuwa-logo.png` |
| Arknights: Endfield | `endfield-logo.png` |
| Neverness to Everness | `nte-logo.png` |

### 2. Endgame modes — 14 icons, square, 256 × 256 or larger

Each mode's card on Endgame, the rows of Home's "Endgame · next resets" and each game's "Cycles · Endgame". A drawn metric icon stands in today.

| Game | Modes | Files |
| --- | --- | --- |
| Genshin | Spiral Abyss, Imaginarium Theater, Stygian Onslaught | `genshin-mode-abyss.png`, `genshin-mode-theater.png`, `genshin-mode-stygian.png` |
| Star Rail | Memory of Chaos, Pure Fiction, Apocalyptic Shadow, Anomaly Arbitration | `hsr-mode-moc.png`, `hsr-mode-pf.png`, `hsr-mode-as.png`, `hsr-mode-arbitration.png` |
| Zenless | Shiyu Defense, Deadly Assault, Lost Void | `zzz-mode-shiyu.png`, `zzz-mode-assault.png`, `zzz-mode-lost-void.png` |
| Wuthering Waves | Tower of Adversity, Whimpering Wastes | `wuwa-mode-tower.png`, `wuwa-mode-wastes.png` |
| Endfield | Echoes of War | `endfield-mode-echoes.png` |
| NTE | Beyond the Rails | `nte-mode-rails.png` |

### 3. Battle passes — 6 pictures, wide, 1280 × 720 or larger

The battle pass on each game's Activities (the version card) and on Home, where the game's hero stands in today.

| Game | Pass | File |
| --- | --- | --- |
| Genshin | Gnostic Hymn | `genshin-battle-pass.png` |
| Star Rail | Nameless Honor | `hsr-battle-pass.png` |
| Zenless | New Eridu City Fund | `zzz-battle-pass.png` |
| Wuthering Waves | Pioneer Podcast | `wuwa-battle-pass.png` |
| Endfield | Protocol Pass | `endfield-battle-pass.png` |
| NTE | Circle Bounty | `nte-battle-pass.png` |

### 4. 30-day passes — 5 icons, square, 256 × 256 or larger

The Monthly card's pass row on Activities and the forecast on Pulls; text only today.

| Game | Pass | File |
| --- | --- | --- |
| Genshin | Blessing of the Welkin Moon | `genshin-monthly-pass.png` |
| Star Rail | Express Supply Pass | `hsr-monthly-pass.png` |
| Zenless | Inter-Knot Membership | `zzz-monthly-pass.png` |
| Wuthering Waves | Lunite Subscription | `wuwa-monthly-pass.png` |
| NTE | Riftcrystal Mining Permit | `nte-monthly-pass.png` |

### 5. Standard banners — 5 pictures, wide, 1280 × 720 or larger

The Pulls page's card for the always-on banner, which shows a star while no event banner runs.

| Game | Banner | File |
| --- | --- | --- |
| Genshin | Standard wish (Wanderlust Invocation) | `genshin-banner-standard.png` |
| Star Rail | Stellar warp | `hsr-banner-standard.png` |
| Zenless | Stable channel | `zzz-banner-standard.png` |
| Wuthering Waves | Standard convene | `wuwa-banner-standard.png` |
| Endfield | Basic headhunting | `endfield-banner-standard.png` |

### 6. Monthly shops — 5 icons, square, 256 × 256 or larger

The Monthly card's shop rows on Activities; text only today.

| Game | Shop | File |
| --- | --- | --- |
| Genshin | Paimon's Bargains | `genshin-shop.png` |
| Star Rail | Embers Exchange | `hsr-shop.png` |
| Zenless | Signal Shop | `zzz-shop.png` |
| Wuthering Waves | Coral Shop | `wuwa-shop.png` |
| NTE | Lost Exchange | `nte-shop.png` |

### 7. Currencies no source has — 6 icons, square, 128 × 128 or larger

The wallet on Profile, the dashboards and the reminder DMs; a drawn line icon stands in today.

| Game | Currency | File |
| --- | --- | --- |
| Endfield | Sanity | `endfield-sanity.png` |
| Endfield | Oroberyl | `endfield-oroberyl.png` |
| Endfield | Arsenal Tickets | `endfield-arsenal-ticket.png` |
| Endfield | Stock Bills | `endfield-stock-bills.png` |
| NTE | City Stamina | `nte-city-stamina.png` |
| NTE | Tycoon Level | `nte-tycoon-level.png` |

Not on the list because a source has them, so claude fills them: elements and weapon types for the HoYoverse games and Wuthering Waves, the top-up currencies (Genesis Crystal, Oneiric Shard, Monochrome, Lunite). The daily and weekly task icons (Daily Commissions, Expeditions…) are optional: there are about 60, and the task names read well without them.

## How to add them

1. The best: the R2 mirror (DEPLOY.md §7). Enter the bucket's keys and its public URL in Settings → Keys (ADR 0012), then run the `mirror-art` workflow on GitHub (it takes the keys from the app; no GitHub secret), or `npm run assets:mirror -- --game <key>` with the `R2_*` variables in your shell. Every catalog key's art lands in our own store, and the app reads the public URL at once.
2. For the app's own lists (currencies, passes, modes, elements…): a folder per game in the bucket (`<game>/ui/<kind>/<key>.png`) and a key per item in the game module; this is the next step once a source for them is chosen.
3. Game icons and backgrounds: drop `icon.png` and `background.jpg` in `apps/web/public/games/<key>/` (they are the owner's to choose; nothing is committed without them).
