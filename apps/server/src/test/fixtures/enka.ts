/** One showcased character in Enka's documented shape (Amber, C2, Raven Bow R5, a Wanderer's Troupe flower). */
export const showcase = {
  playerInfo: { nickname: "Traveler", level: 58, worldLevel: 8, showAvatarInfoList: [{ avatarId: 10000021, level: 80 }] },
  avatarInfoList: [
    {
      avatarId: 10000021,
      propMap: { "4001": { type: 4001, ival: "80", val: "80" } },
      talentIdList: [2101, 2102],
      skillLevelMap: { "10041": 6, "10032": 8, "10017": 9 },
      fightPropMap: { "2000": 15000.4, "2001": 1800.2, "2002": 700, "20": 0.55, "22": 1.2, "23": 1.3, "28": 100 },
      equipList: [
        { itemId: 15301, weapon: { level: 90, promoteLevel: 6, affixMap: { "115301": 4 } }, flat: { itemType: "ITEM_WEAPON", rankLevel: 3 } },
        {
          itemId: 81521,
          reliquary: { level: 21, mainPropId: 14001 },
          flat: {
            itemType: "ITEM_RELIQUARY",
            equipType: "EQUIP_BRACER",
            icon: "UI_RelicIcon_15003_4",
            reliquaryMainstat: { mainPropId: "FIGHT_PROP_HP", statValue: 4780 },
            reliquarySubstats: [{ appendPropId: "FIGHT_PROP_CRITICAL", statValue: 3.9 }, { appendPropId: "FIGHT_PROP_CRITICAL_HURT", statValue: 7.8 }],
          },
        },
      ],
    },
  ],
  ttl: 60,
};

/** One Star Rail showcase character in Enka's raw shape (Kafka E1 with Patience Is All You Need S2, two Hunter of Glacial Forest relics). */
export const hsrShowcase = {
  detailInfo: {
    nickname: "Trailblazer",
    level: 70,
    worldLevel: 6,
    avatarDetailList: [
      {
        avatarId: 1005,
        level: 80,
        rank: 1,
        promotion: 6,
        equipment: { tid: 23006, level: 80, rank: 2, promotion: 6 },
        relicList: [
          { type: 1, tid: 61041, level: 15, mainAffixId: 1, subAffixList: [{ affixId: 8, cnt: 2, step: 1 }, { affixId: 9, cnt: 1 }, { affixId: 7, cnt: 1, step: 2 }] },
          { type: 3, tid: 61043, level: 15, mainAffixId: 5, subAffixList: [] },
        ],
      },
    ],
  },
  ttl: 60,
};
