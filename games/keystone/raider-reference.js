// Public metadata snapshot; refresh with scripts/update-keystone-reference.py
export const RAIDER_REFERENCE = {
  "source": "Raider.IO public API",
  "fetchedAt": "2026-10-30T08:39:06.748473+00:00",
  "season": "season-mn-2",
  "cnStartsAt": "2026-08-19T23:00:00Z",
  "staticUrl": "https://raider.io/api/v1/mythic-plus/static-data?expansion_id=11",
  "dungeons": [
    {
      "id": 16865,
      "slug": "altar-of-fangs",
      "name": "Altar of Fangs",
      "short_name": "AOF",
      "keystone_timer_seconds": 1800
    },
    {
      "id": 16368,
      "slug": "den-of-nalorakk",
      "name": "Den of Nalorakk",
      "short_name": "DON",
      "keystone_timer_seconds": 1920
    },
    {
      "id": 9526,
      "slug": "kings-rest",
      "name": "Kings' Rest",
      "short_name": "KR",
      "keystone_timer_seconds": 1980
    },
    {
      "id": 16091,
      "slug": "murder-row",
      "name": "Murder Row",
      "short_name": "MR",
      "keystone_timer_seconds": 2040
    },
    {
      "id": 14063,
      "slug": "ruby-life-pools",
      "name": "Ruby Life Pools",
      "short_name": "RLP",
      "keystone_timer_seconds": 1680
    },
    {
      "id": 9527,
      "slug": "temple-of-sethraliss",
      "name": "Temple of Sethraliss",
      "short_name": "TOS",
      "keystone_timer_seconds": 1920
    },
    {
      "id": 16359,
      "slug": "the-blinding-vale",
      "name": "The Blinding Vale",
      "short_name": "BV",
      "keystone_timer_seconds": 1800
    },
    {
      "id": 16425,
      "slug": "voidscar-arena",
      "name": "Voidscar Arena",
      "short_name": "VSA",
      "keystone_timer_seconds": 1800
    }
  ],
  "example": {
    "url": "https://raider.io/mythic-plus-runs/season-mn-2/23564503-24-den-of-nalorakk",
    "apiUrl": "https://raider.io/api/v1/mythic-plus/run-details?season=season-mn-2&id=23564503",
    "region": "cn",
    "level": 24,
    "dungeonSlug": "den-of-nalorakk",
    "clearTimeMs": 1705549,
    "completedAt": "2026-10-28T18:21:42.000Z",
    "roster": [
      {
        "classSlug": "warrior",
        "specSlug": "arms",
        "specId": 71,
        "role": "dps",
        "region": "cn"
      },
      {
        "classSlug": "paladin",
        "specSlug": "holy",
        "specId": 65,
        "role": "healer",
        "region": "cn"
      },
      {
        "classSlug": "shaman",
        "specSlug": "elemental",
        "specId": 262,
        "role": "dps",
        "region": "cn"
      },
      {
        "classSlug": "rogue",
        "specSlug": "subtlety",
        "specId": 261,
        "role": "dps",
        "region": "cn"
      },
      {
        "classSlug": "death-knight",
        "specSlug": "blood",
        "specId": 250,
        "role": "tank",
        "region": "cn"
      }
    ]
  },
  "limitations": "One public CN run is an example, not a population statistic or spec tier list. Game damage, loot, affixes and encounters use original simplified rules."
};
