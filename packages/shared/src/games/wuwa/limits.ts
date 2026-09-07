/** Hard caps for Wuthering Waves builds — enforced by the doc schema and inputs. */
export const WUWA_LIMITS = {
  maxLevel: 90,
  maxSkill: 10,
  /** Resonance Chain (sequence nodes). */
  maxSequence: 6,
  maxWeaponLevel: 90,
  /** Weapon Syntonize rank. */
  maxSyntonize: 5,
  maxEchoLevel: 25,
} as const;
