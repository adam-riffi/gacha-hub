# 0009 — Arknights: Endfield pull history

- Status: Proposed
- Date: 2026-10-10
- Proposed by: claude; decided by: Georges

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

- Implementation waits for this ADR's acceptance **and for one real records answer** (its token removed): the record fields are not documented, so the reader is written against a recorded sample.
- Settings' Endfield row changes from "SKPORT token, once researched" to "Records link from the game (PC)".
- The endpoints are unofficial and can change; an import that fails is recorded and leaves manual entry working, as for the other games.
