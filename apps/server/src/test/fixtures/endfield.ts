/**
 * Endfield records pages in the shape open-source trackers parse (ADR 0009):
 * newest first, `seqId` the cursor, `gachaTs` in milliseconds, gift records
 * marked by `kind`. Made up from that shape, not recorded: replace them with
 * a real answer (its token removed) when one exists.
 */
export const charPage = {
  code: 0,
  msg: "",
  data: {
    list: [
      {
        poolId: "special_1_0_1",
        poolName: "Scars of the Forge",
        charId: "chr_0016_laevat",
        charName: "Laevatain",
        rarity: 6,
        isFree: false,
        isNew: true,
        gachaTs: "1791400000000",
        seqId: "1290",
      },
      {
        poolId: "special_1_0_1",
        poolName: "Scars of the Forge",
        charId: "chr_0011_seraph",
        charName: "Perlica",
        rarity: 4,
        isFree: false,
        isNew: false,
        gachaTs: "1791400000000",
        seqId: "1289",
      },
      {
        kind: "gift_intel_book",
        poolId: "special_1_0_1",
        poolName: "Scars of the Forge",
        nameText: "Headhunting Dossier",
        gachaTs: "1791350000000",
        seqId: "1289",
      },
      {
        poolId: "special_1_0_1",
        poolName: "Scars of the Forge",
        charId: "chr_0009_azrila",
        charName: "Ardelia",
        rarity: 5,
        isFree: true,
        isNew: true,
        gachaTs: "1791300000000",
        seqId: "1288",
      },
    ],
    hasMore: true,
  },
};

export const weaponPage = {
  code: 0,
  msg: "",
  data: {
    list: [
      {
        poolId: "weponbox_1_0_1",
        poolName: "Forge Arsenal",
        weaponId: "wpn_sword_0006",
        weaponName: "Forgeborn Scathe",
        weaponType: "Sword",
        rarity: 6,
        isNew: true,
        gachaTs: "1791350000000",
        seqId: "77",
      },
      {
        kind: "gift_weapon",
        poolId: "weponbox_1_0_1",
        poolName: "Forge Arsenal",
        nameText: "Arms Offering",
        gachaTs: "1791350000000",
        seqId: "76",
        giftRewardLabel: "100",
      },
    ],
    hasMore: false,
  },
};
