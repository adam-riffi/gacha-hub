/** Hard caps for Honkai: Star Rail builds — enforced by the doc schema and inputs. */
export const HSR_LIMITS = {
  maxLevel: 80,
  /** Basic ATK caps at 6 (+1 from eidolons). */
  maxBasic: 7,
  /** Skill / Ultimate / Talent cap at 10 (+2 from eidolons). */
  maxTrace: 12,
  maxEidolon: 6,
  maxLightConeLevel: 80,
  maxSuperimposition: 5,
  maxRelicLevel: 15,
} as const;
