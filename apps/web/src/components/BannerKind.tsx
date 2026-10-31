import { useState } from "react";
import { artSlotKey, getGame } from "@gacha/shared";
import { useSlotArt } from "../lib/art";
import { communityAssetUrl } from "../lib/assets";
import { GLYPHS, type GlyphKind } from "./Glyph";

const LABEL: Record<GlyphKind, string> = { character: "Character banner", weapon: "Weapon banner", standard: "Standard banner", bangboo: "Bangboo banner", gear: "Gear banner", material: "Material banner", game: "Banner" };

/** The ticket a kind of banner spends in a game: the limited one, the standard one, or a banner's own (Boopons). */
function ticketOf(gameKey: string | undefined, kind: GlyphKind) {
  const game = gameKey ? getGame(gameKey) : undefined;
  return game?.currencies.find((currency) => currency.pullCost === 1 && (kind === "standard" ? Boolean(currency.standardOnly) : kind === "bangboo" ? currency.onlyFor === "bangboo" : !currency.standardOnly && !currency.onlyFor));
}

/**
 * A banner's kind as a mark (round 23, Georges: "add a character/weapon icon to the banner to better differentiate
 * them"): on a tile in the kind's colour, large, named for screen readers. The game's own ticket picture when the game is
 * known and has one, the owner's upload first (round 28: "for the icons try to use game icons specifically"); the kind's
 * drawn glyph otherwise, or when the picture fails.
 */
export function BannerKind({ kind, gameKey, className = "" }: { kind: GlyphKind; gameKey?: string; className?: string }) {
  const ticket = ticketOf(gameKey, kind);
  const uploaded = useSlotArt(gameKey && ticket ? artSlotKey(gameKey, "currency", ticket.key) : null);
  const source = gameKey && ticket?.icon ? communityAssetUrl(gameKey, "material", ticket.icon) : null;
  const [failed, setFailed] = useState<string[]>([]);
  const src = [uploaded, source].find((candidate): candidate is string => Boolean(candidate) && !failed.includes(candidate!));
  return (
    <span className={`kind-mark is-${kind} ${className}`} data-kind={kind} role="img" aria-label={LABEL[kind]} title={LABEL[kind]}>
      {src ? (
        <img className="kind-art" src={src} alt="" loading="lazy" onError={() => setFailed([...failed, src])} />
      ) : (
        <svg className="kind-glyph" viewBox="0 0 24 24" aria-hidden="true">
          {GLYPHS[kind]}
        </svg>
      )}
    </span>
  );
}
