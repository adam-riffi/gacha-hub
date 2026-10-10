# 0009 — Arknights: Endfield pull history

- Status: Accepted (2026-10-10)
- Date: 2026-10-10
- Proposed by: claude; decided by: claude, on Georges's delegation of 2026-10-10 ("take every decision")

## Context

ADR 0005 lists Endfield's pull history under "SKPORT token" and its account data as "to research". Research on 2026-10-10 (community documentation, [skport-api-docs](https://github.com/AixLnyt/skport-api-docs), unofficial and unlicensed; tools such as Goyfield and Headhunt Tracker) found two different tokens:

| Token | Where it comes from | What it can do |
| --- | --- | --- |
| SKPORT `ACCOUNT_TOKEN` | the SKPORT website's login (sign-in with email and password, or the `ACCOUNT_TOKEN` cookie) | everything the website can: account data, and daily check-in for the account (community scripts use it for automatic check-in) |
| The records link's `token` (or `u8_token`) | a URL the game client opens for the Headhunting records page | reads the records only, on `ef-webview.gryphline.com`; it expires like HoYoverse's authkey |

The records API needs no request signing:

- `GET ef-webview.gryphline.com/api/record/char?token=…&server_id=…&lang=…&seq_id=…` pages the character banners' pulls, `seq_id` being the cursor (0 first);
- `GET …/api/record/weapon/pool` lists the weapon banners, and `GET …/api/record/weapon?…&pool_id=…&seq_id=…` pages one of them;
- `GET …/api/content` gives the banners' featured units.

Pity, per the same sources: limited banners share one counter; the beginner banner and each standard pool keep their own.

## Decision

- **Endfield's pull history comes from the records link, as a history link** (ADR 0005): pasted in Settings, read once on the server, never stored. Only its `token`, `server_id` and `lang` are kept from the link; requests go to `ef-webview.gryphline.com` only, whatever host the link names.
- **The SKPORT `ACCOUNT_TOKEN` is never asked for or stored.** It can act for the account (check-in), which ADR 0005 rules out without a new ADR, and Georges kept HoYoLAB read-only on 2026-10-10 for the same reason.
- Each record becomes a pull entry through the existing import core (`pullsFromRecords`, `importPulls`); Endfield's `pullBanners` gain the record types that feed each pity.
- **Account data** (operators, levels, potentials) stays manual: it is only reachable with the account token.

## Alternatives considered

- **Store the SKPORT account token and sync**, as HoYoLAB notes do. Rejected: the token grants write access (check-in), and its login flow involves a password and a captcha.
- **Endfield stays manual**, as NTE does. Rejected: unlike NTE's terms, nothing found forbids reading one's own records, and the records link is the same pattern as HoYoverse's history link.

## Consequences

- The record fields are not documented by the publisher. The reader follows the shape that open-source trackers parse (PROTORIG's `src/lib/api.ts`, the Arknights Endfield Pull History Extractor): `{code, msg, data: {list, hasMore}}`, each record with `poolId`, `poolName`, `charId` or `weaponId`, `rarity`, `isFree`, `gachaTs` (milliseconds) and `seqId` (the cursor), and gift records (`kind`) to skip. Character records are asked per `pool_type` (`E_CharacterGachaPoolType_Special`, `_Standard`, `_Beginner`, `_Joint`); weapon records in one list. The test fixtures follow that shape; a real answer replaces them once one is recorded.
- Pity, per the same trackers and the guides ([PCGamesN](https://www.pcgamesn.com/arknights-endfield/pity-system), [Prydwen](https://www.prydwen.gg/arknights-endfield/guides/gacha-system)): Special banners share one counter (hard pity 80); Basic headhunting has its own (80); each weapon banner has its own (40, featured 25%, the featured weapon at 80). Beginner and Joint banners are not tracked, like other games' beginner banners.
- Settings' Endfield row changes from "SKPORT token, once researched" to "Records link from the game (PC)".
- The endpoints are unofficial and can change; an import that fails is recorded and leaves manual entry working, as for the other games.
