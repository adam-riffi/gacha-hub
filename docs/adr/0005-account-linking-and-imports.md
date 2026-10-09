# 0005 — Account linking and imports

- Status: Proposed
- Date: 2026-10-09
- Proposed by: claude; decided by: Georges

## Context

DESIGN.md §2 deferred account sync, and the 2026-09 handoff listed HoYoLAB and WuWa import as "do not start without asking". On 2026-10-09 Georges decided that data should fill in automatically wherever possible, and that the HoYoLAB cookie may be stored on the server. Manual entry stays the fallback everywhere.

| Game | Pull history | Account data |
| --- | --- | --- |
| Genshin, HSR, ZZZ | History link (authkey) or a UIGF v4.2 file | HoYoLAB real-time notes (stamina, dailies, weekly bosses, expeditions) and battle chronicle (endgame, roster); Enka showcase (builds) |
| Wuthering Waves | Convene history link from the game log | None |
| Arknights: Endfield | SKPORT token | To research |
| Neverness to Everness | Manual only: its terms forbid third-party tools | Manual only |

## Decision

- **Linking is opt-in, per user and per provider**, from Settings → Linked accounts, and **read-only**: Gacha Hub never checks in, redeems codes or changes anything in a game account.
- **HoYoLAB:** store only the read tokens that real-time notes and the battle chronicle need (the `lt*_v2` cookies), not `cookie_token_v2`. They are encrypted at rest with AES-256-GCM (`node:crypto`) under `LINK_SECRET_KEY`, with the key version stored per row. Tokens are never logged, never returned to the browser and never exported. Revoking deletes the row. A failed sync marks the link as needing attention and stops retrying until the user links again.
- **Sync cadence:** real-time notes at most every 30 minutes per account; the battle chronicle once per cycle and on demand. Both ride the existing cron tick, with a lock per account.
- **Pull history:** a history link is used once, server side, and never stored (authkeys expire within a day). Imported pulls become `PullEntry` rows (ADR 0002) with `source = import` and the game's record id, so re-imports deduplicate. UIGF v4.2 import and export for HoYoverse games.
- **Showcase builds** come from Enka by UID (Genshin, HSR, ZZZ). A sync fills empty fields and fields still marked AUTO; a field the user edits becomes MANUAL until the next sync.
- **Endgame history** is snapshotted at every reset, because the official record keeps only recent cycles.
- New tables `LinkedAccount` (provider, uid, encrypted secret, key version, status, last sync, last error) and `ImportRun` (provider, kind, counts, errors), both with RLS enabled.

## Alternatives considered

- **Store nothing and ask for the cookie at each sync.** Rejected: defeats automatic sync, which is the point.
- **Keep tokens in the browser and sync client side.** Rejected: HoYoLAB refuses browser origins, and reminders must fire with no tab open.
- **Store the full cookie, including `cookie_token_v2`.** It would allow fetching wish history without pasting a link, plus check-in and code redemption, but it grants write access to the account. Rejected for now; it needs its own ADR if wanted.

## Consequences

- A new secret, `LINK_SECRET_KEY`, entered by Georges in Vercel. Rotating it re-encrypts rows by key version.
- ENGINEERING.md §12 keeps secrets in GitHub and Vercel only. This ADR records the exception for tokens that users provide: they live in the database, encrypted.
- The endpoints are undocumented and can change. Every import fails soft, records an `ImportRun` and leaves manual entry working.
- HoYoverse's terms on third-party tools are a risk Georges accepts for read-only use. NTE stays manual because its terms are explicit.
