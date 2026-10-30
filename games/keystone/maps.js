// Routes authored for this game over the pinned MDT atlas reference. See maps/README.md.
export const DUNGEON_MAPS = {
  "fangs": {
    "width": 1000,
    "height": 666.6667,
    "image": "/games/keystone/maps/fangs-1.webp",
    "entrance": {
      "x": 134.9,
      "y": 107.6
    },
    "bosses": [
      "Rav'i",
      "The Writhing Coil",
      "Zul'jan"
    ],
    "route": [
      {
        "x": 135,
        "y": 180,
        "area": "卡希加拉前厅",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Twinfang Harrower",
          "Primal Serpent",
          "Ravenous Descendant"
        ],
        "packGroup": 6
      },
      {
        "x": 135,
        "y": 275,
        "area": "仪式长廊",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Ravenous Descendant"
        ],
        "packGroup": 13
      },
      {
        "x": 135,
        "y": 365,
        "area": "拉维密室",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Twinfang Harrower"
        ],
        "packGroup": 50
      },
      {
        "bossName": "Rav'i",
        "area": "拉维密室",
        "kind": "boss",
        "via": [],
        "display": "Rav'i",
        "x": 134.75,
        "y": 429.39,
        "bossIndex": 0
      },
      {
        "x": 230,
        "y": 460,
        "area": "蜿蜒洞窟",
        "kind": "trash",
        "via": [
          {
            "x": 120,
            "y": 500
          },
          {
            "x": 180,
            "y": 520
          }
        ],
        "enemies": [
          "Twinfang Harrower"
        ],
        "packGroup": 50
      },
      {
        "x": 320,
        "y": 325,
        "area": "洞窟上坡",
        "kind": "trash",
        "via": [
          {
            "x": 270,
            "y": 400
          }
        ],
        "enemies": [
          "High Evolutionist",
          "Bloodletter"
        ],
        "packGroup": 24
      },
      {
        "x": 445,
        "y": 370,
        "area": "盘卷之厅",
        "kind": "trash",
        "via": [
          {
            "x": 370,
            "y": 330
          }
        ],
        "enemies": [
          "Rattling Writhe",
          "High Evolutionist",
          "Bloodletter"
        ],
        "packGroup": 26
      },
      {
        "bossName": "The Writhing Coil",
        "area": "盘卷之厅",
        "kind": "boss",
        "via": [],
        "display": "The Writhing Coil",
        "x": 500.9,
        "y": 389.52,
        "bossIndex": 1
      },
      {
        "x": 600,
        "y": 510,
        "area": "祭坛下层",
        "kind": "trash",
        "via": [
          {
            "x": 505,
            "y": 480
          }
        ],
        "enemies": [
          "Living Venom",
          "Ula'tek's Chosen"
        ],
        "packGroup": 34
      },
      {
        "x": 755,
        "y": 470,
        "area": "阿曼尼祭坛",
        "kind": "trash",
        "via": [
          {
            "x": 700,
            "y": 530
          }
        ],
        "enemies": [
          "Blade of the Altar"
        ],
        "packGroup": 33
      },
      {
        "x": 755,
        "y": 245,
        "area": "祭坛阶梯",
        "kind": "trash",
        "via": [
          {
            "x": 755,
            "y": 370
          }
        ],
        "enemies": [
          "Blade of the Altar"
        ],
        "packGroup": 41
      },
      {
        "bossName": "Zul'jan",
        "area": "祖尔加祭坛",
        "kind": "boss",
        "via": [
          {
            "x": 755,
            "y": 145
          },
          {
            "x": 680,
            "y": 145
          }
        ],
        "display": "Zul'jan",
        "x": 639.48,
        "y": 133.07,
        "bossIndex": 2
      }
    ],
    "sourceCommit": "04e5b122918ebf1cf1c2459677a01f55c13c2f07"
  },
  "murder": {
    "width": 1000,
    "height": 666.6667,
    "image": "/games/keystone/maps/murder-1.webp",
    "entrance": {
      "x": 779.77130254431,
      "y": 509.595640162
    },
    "bosses": [
      "Kystia Manaheart",
      "Zaen Bladesorrow",
      "Xathuux the Annihilator",
      "Lithiel Cinderfury"
    ],
    "route": [
      {
        "x": 765,
        "y": 450,
        "area": "密谋小径入口",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Bribed Guard",
          "Row Hooligan"
        ],
        "packGroup": 9
      },
      {
        "x": 685,
        "y": 405,
        "area": "银月街巷",
        "kind": "trash",
        "via": [
          {
            "x": 730,
            "y": 405
          }
        ],
        "enemies": [
          "Bribed Captain"
        ],
        "packGroup": 4
      },
      {
        "x": 675,
        "y": 335,
        "area": "法力庭院",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Street Sneak",
          "Row Hooligan"
        ],
        "packGroup": 8
      },
      {
        "bossName": "Kystia Manaheart",
        "area": "法力庭院",
        "kind": "boss",
        "via": [],
        "display": "Kystia Manaheart",
        "x": 668.61,
        "y": 268.1,
        "bossIndex": 0
      },
      {
        "x": 575,
        "y": 320,
        "area": "酒馆外街",
        "kind": "trash",
        "via": [
          {
            "x": 620,
            "y": 310
          }
        ],
        "enemies": [
          "Row Hooligan"
        ],
        "packGroup": 11
      },
      {
        "x": 515,
        "y": 355,
        "area": "密谋集市",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Tiny Felwyrm",
          "Massive Felwyrm",
          "Felwyrm"
        ],
        "packGroup": 15
      },
      {
        "x": 435,
        "y": 310,
        "area": "林荫圆庭",
        "kind": "trash",
        "via": [
          {
            "x": 450,
            "y": 350
          }
        ],
        "enemies": [
          "Crate Loader",
          "Forbidden Freight"
        ],
        "packGroup": 17
      },
      {
        "bossName": "Zaen Bladesorrow",
        "area": "林荫圆庭",
        "kind": "boss",
        "via": [],
        "display": "Zaen Bladesorrow",
        "x": 427.16,
        "y": 245.9,
        "bossIndex": 1
      },
      {
        "x": 410,
        "y": 375,
        "area": "南侧小径",
        "kind": "trash",
        "via": [
          {
            "x": 440,
            "y": 335
          }
        ],
        "enemies": [
          "Tiny Felwyrm",
          "Massive Felwyrm",
          "Felwyrm"
        ],
        "packGroup": 15
      },
      {
        "x": 345,
        "y": 430,
        "area": "奥古尔平台",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Unleashed Imp"
        ],
        "packGroup": 42
      },
      {
        "x": 290,
        "y": 490,
        "area": "毁灭者之阶",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Wrathguard Flayer"
        ],
        "packGroup": 41
      },
      {
        "bossName": "Xathuux the Annihilator",
        "area": "毁灭者平台",
        "kind": "boss",
        "via": [],
        "display": "Xathuux the Annihilator",
        "x": 286.18,
        "y": 544.03,
        "bossIndex": 2
      },
      {
        "x": 200,
        "y": 425,
        "area": "西侧回廊",
        "kind": "trash",
        "via": [
          {
            "x": 235,
            "y": 520
          }
        ],
        "enemies": [
          "Shivan Punisher",
          "Fel Invoker"
        ],
        "packGroup": 33
      },
      {
        "x": 185,
        "y": 300,
        "area": "焰怒花园",
        "kind": "trash",
        "via": [
          {
            "x": 175,
            "y": 365
          }
        ],
        "enemies": [
          "Seductive Sayaad",
          "Unleashed Imp"
        ],
        "packGroup": 25
      },
      {
        "x": 235,
        "y": 160,
        "area": "北侧阶梯",
        "kind": "trash",
        "via": [
          {
            "x": 235,
            "y": 235
          }
        ],
        "enemies": [
          "Defiled Golem"
        ],
        "packGroup": 51
      },
      {
        "bossName": "Lithiel Cinderfury",
        "area": "焰怒终庭",
        "kind": "boss",
        "via": [
          {
            "x": 235,
            "y": 100
          }
        ],
        "display": "Lithiel Cinderfury",
        "x": 193.22,
        "y": 54.69,
        "bossIndex": 3
      }
    ],
    "sourceCommit": "04e5b122918ebf1cf1c2459677a01f55c13c2f07"
  },
  "nalorakk": {
    "width": 1000,
    "height": 666.6667,
    "image": "/games/keystone/maps/nalorakk-1.webp",
    "entrance": {
      "x": 40.9,
      "y": 313.6
    },
    "bosses": [
      "The Hoardmonger",
      "Sentinel of Winter",
      "Nalorakk"
    ],
    "route": [
      {
        "x": 80,
        "y": 340,
        "area": "纳洛拉克洞口",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Starvation Effigy",
          "Spirit of Hunger"
        ],
        "packGroup": 3
      },
      {
        "x": 135,
        "y": 410,
        "area": "祭品小径",
        "kind": "trash",
        "via": [
          {
            "x": 90,
            "y": 390
          }
        ],
        "enemies": [
          "Thornclaw Gatherer",
          "Curious Yearling",
          "Earthwhisper Tender"
        ],
        "packGroup": 18
      },
      {
        "x": 215,
        "y": 425,
        "area": "贪藏者洞窟",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Keen-Eyed Striker"
        ],
        "packGroup": 21
      },
      {
        "bossName": "The Hoardmonger",
        "area": "贪藏者洞窟",
        "kind": "boss",
        "via": [],
        "display": "The Hoardmonger",
        "x": 265.38,
        "y": 394.8,
        "bossIndex": 0
      },
      {
        "x": 290,
        "y": 320,
        "area": "山腹坡道",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Thornclaw Gatherer",
          "Earthwhisper Tender"
        ],
        "packGroup": 66
      },
      {
        "x": 245,
        "y": 265,
        "area": "寒冬洞窟",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Thornclaw Gatherer",
          "Earthwhisper Tender"
        ],
        "packGroup": 66
      },
      {
        "x": 240,
        "y": 205,
        "area": "寒冬洞窟",
        "kind": "trash",
        "via": [],
        "enemies": [
          "The Pale Eye"
        ],
        "packGroup": 65
      },
      {
        "bossName": "Sentinel of Winter",
        "area": "寒冬洞窟",
        "kind": "boss",
        "via": [],
        "display": "Sentinel of Winter",
        "x": 238.9,
        "y": 147.1,
        "bossIndex": 1
      },
      {
        "x": 340,
        "y": 190,
        "area": "冰桥",
        "kind": "trash",
        "via": [
          {
            "x": 290,
            "y": 185
          }
        ],
        "enemies": [
          "Avatar of Determination",
          "Glacial Revenant",
          "Terra Rumbler"
        ],
        "packGroup": 59
      },
      {
        "x": 445,
        "y": 215,
        "area": "山间河道",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Glacial Revenant",
          "Terra Rumbler"
        ],
        "packGroup": 50
      },
      {
        "x": 590,
        "y": 165,
        "area": "祖灵石阶",
        "kind": "trash",
        "via": [
          {
            "x": 520,
            "y": 190
          }
        ],
        "enemies": [
          "Ruthless Totemcaller",
          "Bonded Beasttamer",
          "Loyal Saberfang"
        ],
        "packGroup": 71
      },
      {
        "bossName": "Nalorakk",
        "area": "纳洛拉克神殿",
        "kind": "boss",
        "via": [
          {
            "x": 645,
            "y": 150
          }
        ],
        "display": "Nalorakk",
        "x": 646.76,
        "y": 86.32,
        "bossIndex": 2
      }
    ],
    "sourceCommit": "04e5b122918ebf1cf1c2459677a01f55c13c2f07"
  },
  "vale": {
    "width": 1000,
    "height": 666.6667,
    "image": "/games/keystone/maps/vale-1.webp",
    "entrance": {
      "x": 18.072239513564,
      "y": 300.48592404747
    },
    "bosses": [
      "Meittik",
      "Ikuzz the Light Hunter",
      "Lightwarden Ruia",
      "Ziekket"
    ],
    "route": [
      {
        "x": 85,
        "y": 270,
        "area": "夺目谷入口",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Lightgorged Lasher",
          "Lasher",
          "Radiant Spellsower"
        ],
        "packGroup": 21
      },
      {
        "x": 200,
        "y": 185,
        "area": "北侧林道",
        "kind": "trash",
        "via": [
          {
            "x": 135,
            "y": 220
          }
        ],
        "enemies": [
          "Lasher"
        ],
        "packGroup": 34
      },
      {
        "x": 325,
        "y": 120,
        "area": "虫巢坡道",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Lightgorged Lasher",
          "Lasher",
          "Radiant Spellsower"
        ],
        "packGroup": 39
      },
      {
        "bossName": "Meittik",
        "area": "虫巢",
        "kind": "boss",
        "via": [],
        "display": "Meittik",
        "x": 402.8,
        "y": 97.5,
        "bossIndex": 0
      },
      {
        "x": 470,
        "y": 160,
        "area": "林冠小径",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Lightgorged Lasher",
          "Lasher"
        ],
        "packGroup": 47
      },
      {
        "x": 520,
        "y": 245,
        "area": "花谷支路",
        "kind": "trash",
        "via": [
          {
            "x": 505,
            "y": 190
          }
        ],
        "enemies": [
          "Potatoad Matriarch"
        ],
        "packGroup": 70
      },
      {
        "x": 465,
        "y": 335,
        "area": "光猎者巢穴",
        "kind": "trash",
        "via": [
          {
            "x": 520,
            "y": 300
          }
        ],
        "enemies": [
          "Lightfeather Petalwing"
        ],
        "packGroup": 72
      },
      {
        "bossName": "Ikuzz the Light Hunter",
        "area": "光猎者巢穴",
        "kind": "boss",
        "via": [],
        "display": "Ikuzz the Light Hunter",
        "x": 405.9,
        "y": 355.6,
        "bossIndex": 1
      },
      {
        "x": 540,
        "y": 340,
        "area": "东侧根径",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Lightgorged Lasher",
          "Lasher"
        ],
        "packGroup": 71
      },
      {
        "x": 665,
        "y": 300,
        "area": "光守者石阶",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Lightfeather Petalwing",
          "Leafy Grovecrawler",
          "Thorny Saptor"
        ],
        "packGroup": 59
      },
      {
        "x": 760,
        "y": 250,
        "area": "光守者平台",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Luminous Thornmaw"
        ],
        "packGroup": 63
      },
      {
        "bossName": "Lightwarden Ruia",
        "area": "光守者平台",
        "kind": "boss",
        "via": [],
        "display": "Lightwarden Ruia",
        "x": 819.52,
        "y": 236.76,
        "bossIndex": 2
      },
      {
        "x": 750,
        "y": 340,
        "area": "南侧崖道",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Thorny Saptor"
        ],
        "packGroup": 62
      },
      {
        "x": 570,
        "y": 420,
        "area": "古树环道",
        "kind": "trash",
        "via": [
          {
            "x": 660,
            "y": 395
          }
        ],
        "enemies": [
          "Lightgorged Lasher",
          "Lasher"
        ],
        "packGroup": 71
      },
      {
        "x": 340,
        "y": 390,
        "area": "溪流坡道",
        "kind": "trash",
        "via": [
          {
            "x": 450,
            "y": 420
          }
        ],
        "enemies": [
          "Spineshield Beetle",
          "Lightfeather Petalwing",
          "Sporeblight Belcher"
        ],
        "packGroup": 20
      },
      {
        "bossName": "Ziekket",
        "area": "溪流圆环",
        "kind": "boss",
        "via": [
          {
            "x": 255,
            "y": 350
          }
        ],
        "display": "Ziekket",
        "x": 223.9,
        "y": 285.02,
        "bossIndex": 3
      }
    ],
    "sourceCommit": "04e5b122918ebf1cf1c2459677a01f55c13c2f07"
  },
  "arena": {
    "width": 1000,
    "height": 666.6667,
    "image": "/games/keystone/maps/arena-1.webp",
    "entrance": {
      "x": 199.7,
      "y": 539.6
    },
    "bosses": [
      "Taz'Rah",
      "Atroxus",
      "Charonus"
    ],
    "route": [
      {
        "x": 200,
        "y": 485,
        "area": "竞技场入口",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Feral Saberon",
          "Lost Sethrak",
          "Enthralled Shaman"
        ],
        "packGroup": 5
      },
      {
        "x": 270,
        "y": 430,
        "area": "入场回廊",
        "kind": "trash",
        "via": [
          {
            "x": 240,
            "y": 475
          }
        ],
        "enemies": [
          "Enthralled Shaman"
        ],
        "packGroup": 2
      },
      {
        "x": 200,
        "y": 330,
        "area": "西侧竞技场",
        "kind": "trash",
        "via": [
          {
            "x": 295,
            "y": 360
          },
          {
            "x": 230,
            "y": 345
          }
        ],
        "enemies": [
          "Kilivore Screamer",
          "Savage Shredclaw",
          "Enthralled Shaman"
        ],
        "packGroup": 19
      },
      {
        "bossName": "Taz'Rah",
        "area": "塔兹拉竞技场",
        "kind": "boss",
        "via": [],
        "display": "Taz'Rah",
        "x": 199.41,
        "y": 243.58,
        "bossIndex": 0
      },
      {
        "x": 285,
        "y": 200,
        "area": "竞技场上环",
        "kind": "trash",
        "via": [
          {
            "x": 200,
            "y": 175
          }
        ],
        "enemies": [
          "Blistercreep"
        ],
        "packGroup": 23
      },
      {
        "x": 450,
        "y": 265,
        "area": "连接长桥",
        "kind": "trash",
        "via": [
          {
            "x": 350,
            "y": 210
          },
          {
            "x": 400,
            "y": 250
          }
        ],
        "enemies": [
          "Agitated Voidscythe",
          "Brutal Overseer"
        ],
        "packGroup": 42
      },
      {
        "x": 600,
        "y": 385,
        "area": "东侧阶梯",
        "kind": "trash",
        "via": [
          {
            "x": 525,
            "y": 305
          },
          {
            "x": 610,
            "y": 335
          }
        ],
        "enemies": [
          "Savage Shredclaw",
          "Enthralled Shaman"
        ],
        "packGroup": 36
      },
      {
        "bossName": "Atroxus",
        "area": "阿特罗克斯竞技场",
        "kind": "boss",
        "via": [],
        "display": "Atroxus",
        "x": 642.79,
        "y": 488.73,
        "bossIndex": 1
      },
      {
        "x": 745,
        "y": 430,
        "area": "东侧环道",
        "kind": "trash",
        "via": [
          {
            "x": 700,
            "y": 480
          }
        ],
        "enemies": [
          "Scavenging Siphoid"
        ],
        "packGroup": 61
      },
      {
        "x": 745,
        "y": 315,
        "area": "竞技场看台",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Kilivore Screamer",
          "Brutal Overseer"
        ],
        "packGroup": 59
      },
      {
        "x": 680,
        "y": 275,
        "area": "卡洛努斯竞技场",
        "kind": "trash",
        "via": [
          {
            "x": 710,
            "y": 275
          }
        ],
        "enemies": [
          "Scavenging Siphoid"
        ],
        "packGroup": 62
      },
      {
        "bossName": "Charonus",
        "area": "卡洛努斯竞技场",
        "kind": "boss",
        "via": [],
        "display": "Charonus",
        "x": 641.44,
        "y": 220.59,
        "bossIndex": 2
      }
    ],
    "sourceCommit": "04e5b122918ebf1cf1c2459677a01f55c13c2f07"
  },
  "kings": {
    "width": 1000,
    "height": 666.6667,
    "image": "/games/keystone/maps/kings-1.webp",
    "entrance": {
      "x": 806.3,
      "y": 288.3
    },
    "bosses": [
      "The Golden Serpent",
      "Mchimba the Embalmer",
      "The Council of Tribes",
      "King Dazar"
    ],
    "route": [
      {
        "x": 805,
        "y": 335,
        "area": "黄金走廊",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Umbral Warrior",
          "Shadow-Borne Champion"
        ],
        "packGroup": 5
      },
      {
        "x": 800,
        "y": 390,
        "area": "黄金大厅",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Umbral Warrior",
          "Shadow-Borne Champion"
        ],
        "packGroup": 5
      },
      {
        "x": 775,
        "y": 425,
        "area": "黄金大厅",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Umbral Warrior",
          "Risen Hexer"
        ],
        "packGroup": 6
      },
      {
        "bossName": "The Golden Serpent",
        "area": "黄金大厅",
        "kind": "boss",
        "via": [],
        "display": "The Golden Serpent",
        "x": 749.0,
        "y": 412.64,
        "bossIndex": 0
      },
      {
        "x": 750,
        "y": 285,
        "area": "亡者大厅",
        "kind": "trash",
        "via": [
          {
            "x": 750,
            "y": 350
          }
        ],
        "enemies": [
          "Umbral Warrior",
          "Shadow-Borne Champion"
        ],
        "packGroup": 5
      },
      {
        "x": 650,
        "y": 265,
        "area": "墓穴长廊",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Minion of Zul"
        ],
        "packGroup": 2
      },
      {
        "x": 515,
        "y": 220,
        "area": "防腐密室",
        "kind": "trash",
        "via": [
          {
            "x": 540,
            "y": 265
          }
        ],
        "enemies": [
          "Half-Finished Mummy",
          "Interment Construct"
        ],
        "packGroup": 13
      },
      {
        "bossName": "Mchimba the Embalmer",
        "area": "防腐密室",
        "kind": "boss",
        "via": [
          {
            "x": 485,
            "y": 180
          }
        ],
        "display": "Mchimba the Embalmer",
        "x": 484.28,
        "y": 123.27,
        "bossIndex": 1
      },
      {
        "x": 485,
        "y": 300,
        "area": "王庭下阶",
        "kind": "trash",
        "via": [
          {
            "x": 485,
            "y": 220
          }
        ],
        "enemies": [
          "Purification Construct"
        ],
        "packGroup": 12
      },
      {
        "x": 470,
        "y": 410,
        "area": "部族王庭",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Purification Construct"
        ],
        "packGroup": 12
      },
      {
        "x": 405,
        "y": 475,
        "area": "部族议会",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Thundering Totem",
          "Explosive Totem",
          "Torrent Totem"
        ],
        "packGroup": 27
      },
      {
        "bossName": "Aka'ali the Conqueror",
        "area": "部族议会",
        "kind": "boss",
        "via": [],
        "display": "The Council of Tribes",
        "x": 324.77,
        "y": 502.92,
        "bossIndex": 2
      },
      {
        "x": 325,
        "y": 390,
        "area": "先王之路",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Royal Berserker",
          "Honored Raptor"
        ],
        "packGroup": 26
      },
      {
        "x": 300,
        "y": 300,
        "area": "王墓长廊",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Ghostly Brute"
        ],
        "packGroup": 25
      },
      {
        "x": 180,
        "y": 290,
        "area": "始皇墓室",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Minion of Zul",
          "Shadow of Zul"
        ],
        "packGroup": 28
      },
      {
        "bossName": "King Dazar",
        "area": "达萨之墓",
        "kind": "boss",
        "via": [],
        "display": "King Dazar",
        "x": 64.78,
        "y": 292.05,
        "bossIndex": 3
      }
    ],
    "sourceCommit": "04e5b122918ebf1cf1c2459677a01f55c13c2f07"
  },
  "temple": {
    "width": 1000,
    "height": 666.6667,
    "image": "/games/keystone/maps/temple-1.webp",
    "entrance": {
      "x": 705.5,
      "y": 542.3
    },
    "bosses": [
      "Adderis & Aspix",
      "Merektha",
      "Galvazzt",
      "Avatar of Sethraliss"
    ],
    "route": [
      {
        "x": 705,
        "y": 510,
        "area": "蛇庙入口",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Barbed Krolusk",
          "Storm Adept",
          "Sandswept Hunter"
        ],
        "packGroup": 1
      },
      {
        "x": 660,
        "y": 500,
        "area": "祭仪石阶",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Sandfury Stonefist",
          "Sandswept Hunter"
        ],
        "packGroup": 6
      },
      {
        "x": 645,
        "y": 470,
        "area": "双蛇平台",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Sandfury Stonefist",
          "Sandswept Hunter"
        ],
        "packGroup": 6
      },
      {
        "bossName": "Adderis",
        "area": "阿德里斯与阿斯匹克斯",
        "kind": "boss",
        "via": [],
        "display": "Adderis & Aspix",
        "x": 644.7,
        "y": 429.24,
        "bossIndex": 0
      },
      {
        "x": 560,
        "y": 435,
        "area": "蜿蜒石窟",
        "kind": "trash",
        "via": [
          {
            "x": 600,
            "y": 460
          }
        ],
        "enemies": [
          "Poisonous Viper",
          "Lightning Serpent",
          "Storm Adept"
        ],
        "packGroup": 13
      },
      {
        "x": 475,
        "y": 380,
        "area": "通往蛇巢",
        "kind": "trash",
        "via": [
          {
            "x": 500,
            "y": 425
          }
        ],
        "enemies": [
          "Poisonous Viper",
          "Lightning Serpent",
          "Sandswept Hunter"
        ],
        "packGroup": 16
      },
      {
        "x": 440,
        "y": 300,
        "area": "米利克萨巢穴",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Poisonous Viper",
          "Lightning Serpent"
        ],
        "packGroup": 26
      },
      {
        "bossName": "Merektha",
        "area": "米利克萨巢穴",
        "kind": "boss",
        "via": [],
        "display": "Merektha",
        "x": 414.85,
        "y": 228.05,
        "bossIndex": 1
      },
      {
        "x": 500,
        "y": 235,
        "area": "闪电长廊",
        "kind": "trash",
        "via": [
          {
            "x": 485,
            "y": 255
          }
        ],
        "enemies": [
          "Poisonous Viper"
        ],
        "packGroup": 22
      },
      {
        "x": 520,
        "y": 180,
        "area": "雷电平台",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Agitated Nimbus",
          "Imbued Stormcaller"
        ],
        "packGroup": 30
      },
      {
        "x": 465,
        "y": 155,
        "area": "加瓦兹特平台",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Lightning Spire",
          "Polarized Spire"
        ],
        "packGroup": 33
      },
      {
        "bossName": "Galvazzt",
        "area": "加瓦兹特平台",
        "kind": "boss",
        "via": [],
        "display": "Galvazzt",
        "x": 438.35,
        "y": 149.49,
        "bossIndex": 2
      },
      {
        "x": 345,
        "y": 265,
        "area": "蛇眼回廊",
        "kind": "trash",
        "via": [
          {
            "x": 380,
            "y": 200
          }
        ],
        "enemies": [
          "Storm Serpent",
          "Toxic Viper"
        ],
        "packGroup": 35
      },
      {
        "x": 240,
        "y": 330,
        "area": "塞塔里斯之眼",
        "kind": "trash",
        "via": [
          {
            "x": 300,
            "y": 325
          }
        ],
        "enemies": [
          "Temple Disruptor",
          "Eye of Sethraliss",
          "Orb Watcher"
        ],
        "packGroup": 37
      },
      {
        "x": 95,
        "y": 210,
        "area": "神灵石阶",
        "kind": "trash",
        "via": [
          {
            "x": 145,
            "y": 300
          },
          {
            "x": 95,
            "y": 270
          }
        ],
        "enemies": [
          "Faithless Conscript"
        ],
        "packGroup": 39
      },
      {
        "bossName": "Avatar of Sethraliss",
        "area": "塞塔里斯神殿",
        "kind": "boss",
        "via": [
          {
            "x": 95,
            "y": 135
          }
        ],
        "display": "Avatar of Sethraliss",
        "x": 66.53,
        "y": 80.43,
        "bossIndex": 3
      }
    ],
    "sourceCommit": "04e5b122918ebf1cf1c2459677a01f55c13c2f07"
  },
  "ruby": {
    "width": 1000,
    "height": 666.6667,
    "image": "/games/keystone/maps/ruby-1.webp",
    "entrance": {
      "x": 119.9,
      "y": 514.5
    },
    "bosses": [
      "Melidrussa Chillworn",
      "Kokia Blazehoof",
      "Kyrakka & Erkhart Stormvein"
    ],
    "route": [
      {
        "x": 115,
        "y": 445,
        "area": "注能大厅",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Earthbound Guardian",
          "Primal Juggernaut",
          "Deepstone Earthshaper"
        ],
        "packGroup": 32
      },
      {
        "x": 110,
        "y": 345,
        "area": "红玉孵化池",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Flashfrost Chillweaver",
          "Deepstone Earthshaper"
        ],
        "packGroup": 2
      },
      {
        "x": 190,
        "y": 240,
        "area": "寒妆前厅",
        "kind": "trash",
        "via": [
          {
            "x": 110,
            "y": 260
          }
        ],
        "enemies": [
          "Infused Whelp"
        ],
        "packGroup": 11
      },
      {
        "bossName": "Melidrussa Chillworn",
        "area": "红玉孵化池",
        "kind": "boss",
        "via": [],
        "display": "Melidrussa Chillworn",
        "x": 281.26,
        "y": 290.54,
        "bossIndex": 0
      },
      {
        "x": 810,
        "y": 260,
        "area": "红玉高台",
        "kind": "trash",
        "via": [
          {
            "x": 750,
            "y": 190
          }
        ],
        "enemies": [
          "Ashseer Flamelasher",
          "Blazebound Destroyer",
          "Primalist Cinderweaver"
        ],
        "packGroup": 17,
        "transport": {
          "x": 630,
          "y": 190,
          "label": "乘坐龙骑前往红玉高台"
        }
      },
      {
        "x": 820,
        "y": 455,
        "area": "高台环道",
        "kind": "trash",
        "via": [
          {
            "x": 825,
            "y": 355
          }
        ],
        "enemies": [
          "Ashseer Flamelasher",
          "Primalist Cinderweaver"
        ],
        "packGroup": 38
      },
      {
        "x": 650,
        "y": 580,
        "area": "高台巡逻",
        "kind": "trash",
        "via": [
          {
            "x": 810,
            "y": 540
          },
          {
            "x": 740,
            "y": 580
          }
        ],
        "enemies": [
          "Ashseer Flamelasher",
          "Primalist Cinderweaver"
        ],
        "packGroup": 39
      },
      {
        "bossName": "Kokia Blazehoof",
        "area": "高台上坡",
        "kind": "boss",
        "via": [
          {
            "x": 540,
            "y": 560
          },
          {
            "x": 480,
            "y": 480
          },
          {
            "x": 480,
            "y": 355
          }
        ],
        "display": "Kokia Blazehoof",
        "x": 479.88,
        "y": 232.88,
        "bossIndex": 1
      },
      {
        "x": 410,
        "y": 150,
        "area": "龙族回廊",
        "kind": "trash",
        "via": [
          {
            "x": 445,
            "y": 195
          }
        ],
        "enemies": [
          "Tempest Channeler",
          "Primal Thundercloud"
        ],
        "packGroup": 23
      },
      {
        "x": 330,
        "y": 95,
        "area": "仪式平台",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Primal Thundercloud",
          "Primalist Cinderweaver",
          "Tempest Channeler"
        ],
        "packGroup": 25
      },
      {
        "x": 275,
        "y": 65,
        "area": "风脉平台",
        "kind": "trash",
        "via": [],
        "enemies": [
          "Primal Thundercloud",
          "Storm Warrior"
        ],
        "packGroup": 27
      },
      {
        "bossName": "Kyrakka",
        "area": "红玉之巅",
        "kind": "boss",
        "via": [],
        "display": "Kyrakka & Erkhart Stormvein",
        "x": 226.45,
        "y": 49.24,
        "bossIndex": 2
      }
    ],
    "sourceCommit": "04e5b122918ebf1cf1c2459677a01f55c13c2f07"
  }
};
export const getMap = id => DUNGEON_MAPS[id];
