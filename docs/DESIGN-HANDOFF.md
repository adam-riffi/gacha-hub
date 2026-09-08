# Gacha Hub — UI design handoff

Everything a designer (human or Claude Design) needs to design the front end:
what the app is, every screen, the data behind each, the states to cover, and
what's bespoke per game. Paired with **[DESIGN-BRIEF.md](DESIGN-BRIEF.md)**,
which has the ready-to-use design prompt and direction suggestions.

The app is a working React + Vite front end today; this describes the product
so the visual layer can be redesigned. Component/route names below are the real
ones, so mockups map cleanly onto the code.

---

## 1. What it is

**Gacha Hub** is a cross-game gacha companion for a small group of friends
(whitelist + a demo). One person signs in with Discord and tracks, per game:
their **currencies**, **daily/weekly** resets, **character builds**, what they
**own**, **farming plans**, **teams**, and the live **banners & events**. A
Discord bot mirrors the key actions, and reset reminders arrive as DMs.

Design values:
- **The app knows the games.** Characters, weapons, gear sets and materials all
  come from a built-in catalog — the user ticks what they own and picks from
  real data, rarely typing free text.
- **Bespoke per game.** Each game has its own identity and its own character
  sheet (Genshin artifacts ≠ HSR relics ≠ ZZZ drive discs ≠ Endfield gear).
  A game's **accent color** skins its surfaces.
- **Multi-user, private.** Discord-only login; each person sees only their data.

**Five games ship today:** Genshin Impact, Honkai: Star Rail, Zenless Zone
Zero, Wuthering Waves, Arknights: Endfield. Each has an `accent` color, an
`icon.png` and a `background.jpg` under `apps/web/public/games/<key>/`.

---

## 2. The current visual system (starting point, not a straitjacket)

Dark theme, one accent per game. Existing design tokens (CSS variables) — reuse,
extend, or replace with a refreshed system:

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#0c0d12` | page background |
| `--bg-elev` | `#14161f` | sidebar, inputs, sunken rows |
| `--surface` / `--surface-2` | `#1a1d29` / `#222634` | cards / controls |
| `--border` | `#2b2f40` | hairlines |
| `--text` / `--muted` | `#e7e9f0` / `#9aa0b4` | text |
| `--primary` / `--primary-dim` | `#7c8cff` / `#5561c9` | primary actions, links |
| `--accent` | `#ffd166` | highlights (per-game accent overrides this) |
| `--danger` / `--success` | `#ff6b6b` / `#4ade80` | destructive / done |
| `--radius` / `--radius-sm` | 12px / 8px | corners |

Type: Inter / system-ui. Layout: fixed left **sidebar** (236px) + scrolling
**main** (max-width 1200px). Building blocks in use: `card`, `btn`
(+ `primary`/`ghost`/`danger`/`sm`), `badge` (+ `done`/`todo`), `row`/`spread`/
`stack`, `table`, form inputs, a Kanban `board`, stat tiles, `toast`.

**Design freedom:** a refreshed look is welcome — richer game theming, better
density, illustrations. Keep it **dark-first**, **responsive** (sidebar collapses
under ~820px today), and **accent-driven per game**.

---

## 3. Navigation / information architecture

Left sidebar (persistent):
- **Dashboard** (`/`) · **Games** (`/library`) · **Tasks** (`/tasks`) ·
  **Banners & events** (`/timeline`) · **Settings** (`/settings`) ·
  **Admin** (`/admin`, admins only)
- **Your games** — a live list of installed games (accent dot + name), each a
  quick jump to that game.
- Footer: avatar + username + Sign out.

Inside a game, a **tab bar** switches screens without leaving:
**Overview · Ownership · Equipment · Materials** (`/games/:id`,
`/games/:id/ownership`, `/games/:id/equipment`, `/games/:id/materials`).
Character sheets live at `/characters/:id`.

---

## 4. Screens

Each screen lists purpose, the data shown, states to cover, and interactions.
"GI" = a game instance/profile (one per user per game).

### 4.1 Login (`/login`, unauthenticated)
- A single card: brand, one-line pitch, **Sign in with Discord**. In dev, a
  "Continue as Dev User" button also shows.
- States: idle. Full-screen centered.

### 4.2 Dashboard (`/`) — the command center
- **Summary tiles** (row): Games, Dailies left, Active goals, Unbuilt characters,
  Banners/events. Numbers turn accent when there's something to do, green when clear.
- **Banners & events** strip: up to 8 active/upcoming items across games, each
  with game name, a kind badge, and a countdown ("ends in 3d 4h" / "starts in…").
- **Active goals**: top-level farming goals, sorted by priority, with a priority
  badge, the game name, and progress `X / Y`. Links to the Tasks board.
- **Per-game cards** (grid): accent top-border, game name (link), region + "X/Y
  built" analytic, a reset countdown badge, an optional **regen widget** (e.g.
  Genshin resin "163/200 · full in 2h 47m"), **currencies** (editable number,
  cap, and a wish count like "≈ 12 wishes" for premium currency), and today's
  **dailies** with check buttons.
- States: empty (no games → CTA to Library), loading, populated.
- Interactions: edit a currency inline; check off a daily; jump to a game.

### 4.3 Games library (`/library`)
- Grid of installable games (icon, name, accent, currency count, regions) with
  an **Install** action; installed ones link to their overview.
- States: list.

### 4.4 Game Overview (`/games/:id`)
- Game tab bar (Overview active). Header: game name, "N owned" badge, **region**
  selector (NA/EU/Asia — affects reset timing), and actions: **Restore default
  tasks**, **Generate backlog**, **Uninstall**.
- **Reminder control**: toggle "Discord reset reminder" + lead-minutes.
- **Currencies** card: each currency editable, with cap and wish count.
- **Builds** card: list of the user's character builds (name, catalog name,
  a build-status badge) linking to the sheet; a picker of owned characters + an
  optional build name to add a build (a character can have several named builds).
- **Teams** card: saved party presets (name + member chips from owned
  characters, capped at the game's party size), add/remove members, delete.
- States: loading, empty builds/teams.

### 4.5 Ownership (`/games/:id/ownership`)
- Tab bar (Ownership). Tabs: **Characters / Weapons**. Header shows "N / M owned".
- Filters: search, rarity, element/type, owned/unowned. Bulk **Own all shown** /
  **Clear shown**.
- Grid of catalog entries (name, rarity stars, element/type) each with an
  **Owned** checkbox. Owned characters show **Edit build →** (if a build exists)
  or **+ Create build**.
- This is the primary "tick what you have" screen — should feel fast to scan and
  toggle across a few hundred entries.

### 4.6 Equipment (`/games/:id/equipment`)
- Tab bar. Tabs: **Weapons / Gear sets**. Filters: search, rarity, weapon type.
- **Weapons**: cards with rarity, type, max level, an **Owned** toggle, and
  **Farm / pre-farm** (expands a level-range picker → preview material table →
  create farming tasks).
- **Gear sets**: cards with slot count, set bonuses, source, and a **Farm set**
  button.

### 4.7 Materials (`/games/:id/materials`)
- Tab bar. Table grouped by material category. Filters: search, category,
  "needed only". Columns: material (+ source), **Have** (editable), **Needed**
  (from active goals), **Missing**, **farm days** (weekday chips + a "today" badge).
- The deduped source of truth for "how much of everything do I still need."

### 4.8 Character sheet (`/characters/:id`) — bespoke per game
- Header: back, character name (editable), game badge, a **build-status** select
  (Unbuilt/Building/Good/Perfect), Save, Delete.
- Left: **portrait panel** (image + name). Right: the **bespoke sheet** (see §5).
- Below: **Plan farming** panel (level + talent targets → preview material
  deficit → generate a nested goal tree), and a **Reference** card
  (constellations/eidolons + talent descriptions from the catalog; may be empty
  today — design for the populated shape).
- States: loading; "no sheet registered" fallback.

### 4.9 Tasks (`/tasks`) — Kanban board
- A compact "New task" form (title, type, cadence/target, priority, game).
- **Board**: one **column per game** (accent top-border), each split into
  **Dailies & weeklies**, **Goals**, **Checklists**.
  - Recurring rows: check button, title + cadence badge, a **notify bell** (fold
    into reminders), a priority pill, delete.
  - **Goal cards**: title (+ "backlog" badge when applicable), priority pill,
    notify bell, delete; and **material subtasks** nested inside — each a row
    with the material name, an editable progress number, and its target, plus a
    "N/M materials done" line. This nesting ("Farm Venti" → Slime Concentrate,
    Mora, talent books…) is central; make the tree legible.
- Controls: **Show backlog** toggle (hidden completionist goals; columns show a
  "+N backlog" hint), a text filter.
- States: no games; empty columns.

### 4.10 Banners & events (`/timeline`)
- Per-game tabs + a status filter (Active + upcoming / Active / Upcoming / Ended
  / All). Two columns: **Banners** and **Events**.
- Banner card: name, kind badge, status badge, a when-line ("starts in… · date"
  or "ends in…"), and **featured characters** as chips with an **owned** ✓/·
  badge (link to ownership).
- Event card: name (optional external link), status, when-line, description,
  reward chips.

### 4.11 Admin (`/admin`, admins only)
- Upload banners/events as JSON. Header: **Seed sample data**, kind (Banners/
  Events), game selectors. Left: a payload textarea with **Example / Load
  current / Schema** helpers and **Validate & apply**, showing per-field errors
  or a success summary. Right: current items (with delete) and an **audit log**
  (who changed what, when, before→after).

### 4.12 Settings (`/settings`)
- Account info, reminder defaults, sign out. (Light today; room to grow.)

---

## 5. Per-game character sheets (the bespoke part)

Every game's sheet shares a shape — **Portrait + Level + identity + Weapon +
Gear + Talents + Stats** — but the gear and talent structure differ. Values are
constrained to catalog-valid options where possible (element read-only unless the
character is multi-element; artifact main-stats are per-slot dropdowns, etc.).

| Game | Identity | Weapon | Gear (equipment) | Talents |
|------|----------|--------|------------------|---------|
| **Genshin** | Element (7: Pyro…), Constellation 0–6 | 1 weapon (name, lvl, refinement 1–5) | **5 artifacts**: Flower, Plume, Sands, Goblet, Circlet — each set, main stat, level 0–20, substats | Normal / Skill / Burst (1–10) |
| **HSR** | Path (Destruction…), Element | 1 **Light Cone** (name, lvl, superimposition) | **6 relics**: 4 relics + 2 planar ornaments — set, main stat, level, substats | Basic / Skill / Ultimate / Talent (traces) |
| **ZZZ** | Attribute, Faction | 1 **W-Engine** | **6 drive discs** (slots 1–6) — set, main stat, substats | per-skill levels |
| **WuWa** | Element (6: Glacio…) | 1 weapon | **5 echoes** (cost 4/3/1 tiers) — set, main stat, substats | Forte skills |
| **Endfield** | Class (Guard…), Element (Physical/Heat/Cryo/Electric/Nature) | 1 weapon **with a nested essence** (name + effect) | **4 gear** slots | per-skill levels |

Design each sheet with its game's identity (see DESIGN-BRIEF §per-game), but keep
the interaction model consistent (a reusable "gear piece" card: set, main stat,
level, substats). A generic `PortraitPanel` and `GearPieceCard` already exist.

---

## 6. Data entities (so components bind to real fields)

- **User**: discordId, username, avatarUrl, isAdmin.
- **GameInstance** (profile): gameKey, regionKey (na/eu/asia).
- **CurrencyState**: key, value (+ cap, regenPerHour, pullCost/pullLabel from the
  game module → wish counts).
- **Character** (build): catalogId, name (nickname), portraitUrl, `doc` (the
  bespoke sheet document), **buildStatus** (none/building/good/perfect).
- **Ownership**: kind (character/weapon/item), catalogId, qty.
- **MaterialStock**: materialId, qty.
- **Task**: scope (game/character), type (recurring/goal/checklist), title,
  cadence, target, progress, materialId, **priority** (low/normal/high),
  **backlog** (bool), **notify** (bool), **parentId** (nesting: parent goal →
  material subtasks).
- **Team**: name, members (catalog character ids). Party size per game.
- **Banner**: name, kind (character/weapon/other), startsAt/endsAt, featured
  (catalog ids + rateUp), status (upcoming/active/ended).
- **Event**: name, startsAt/endsAt, description, rewards, url, status.
- **AuditLog**: actor, action, target, before/after diff.
- **Catalog** (per game, read-only reference): characters (rarity, element/tag,
  weaponType, ascension + talent cost tables, **constellations**, **talent info**),
  weapons, gear sets (slots, bonuses), materials (category, rarity, availability
  weekdays, source).

## 7. Key API routes (what the UI reads/writes)

`GET /api/me` · `GET /api/games` · `GET/POST/DELETE /api/instances[/:id]` ·
`PUT /api/instances/:id` (region) · `PUT /api/instances/:id/currencies/:key` ·
`GET/PUT /api/instances/:id/ownership` · `GET/POST /api/instances/:id/characters`,
`GET/PUT/DELETE /api/characters/:id` · `GET/PUT /api/instances/:id/materials`,
`GET …/materials/needed` · `POST /api/instances/:id/plans/preview|generate` ·
`POST /api/instances/:id/backlog/generate` · `POST /api/instances/:id/tasks/defaults` ·
`GET/POST/PUT/DELETE /api/instances/:id/teams[/:teamId]` ·
`GET/POST/PUT/DELETE /api/tasks[/:id]` (+ `/complete`, `/progress`) ·
`GET /api/games/:key/banners|events` · `GET /api/dashboard` · admin `POST /api/admin/payload`,
`GET /api/admin/export|audit`. The catalog JSON is bundled client-side and loaded per game on demand.

## 8. Placeholders — design for the FULL shape

Some catalog data isn't populated yet but the schema and screens exist. **Design
as if it's present** (don't design around emptiness):
- **Constellations / eidolons** and **talent descriptions** on the character
  Reference card — will be filled from the dataset later.
- **Character/weapon/material icons** — sources ship them; treat art as present
  (portrait, catalog thumbnails, element/rarity glyphs). Provide graceful
  fallbacks (initials/silhouette) for missing images.
- Per-game build-value constraints beyond Genshin (element/stat dropdowns) will
  extend to the other four sheets; design them the same way.

## 9. Practical notes

- **Theme:** dark-first; per-game accent skins that game's surfaces/headers.
- **Responsive:** works down to a phone; the sidebar collapses (~820px). The
  Tasks board and wide tables scroll horizontally within their own container.
- **Density:** users scan hundreds of catalog entries and dozens of tasks —
  favor scannable grids/lists, clear empty states, and fast inline edits.
- **Tone:** a personal power-tool for enthusiasts, not a marketing site.
