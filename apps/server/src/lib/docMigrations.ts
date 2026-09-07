import type { GameDefinition } from "@gacha/shared";

/**
 * Upgrade a stored build document from `fromVersion` to the game's current
 * `docVersion` by applying each registered step in order. Stops early (and
 * reports the reached version) if a step is missing, so a document is never
 * mislabeled as newer than it is.
 */
export function migrateDoc(
  game: Pick<GameDefinition, "docVersion" | "migrations">,
  doc: unknown,
  fromVersion: number,
): { doc: unknown; version: number; changed: boolean } {
  let current = doc;
  let version = Math.max(1, fromVersion);
  while (version < game.docVersion) {
    const step = game.migrations?.[version];
    if (!step) break;
    current = step(current);
    version += 1;
  }
  return { doc: current, version, changed: version !== fromVersion };
}
