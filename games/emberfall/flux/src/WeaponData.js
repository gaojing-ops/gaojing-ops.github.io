module.exports = {
    "weapons": {
        "flux_bolt": {
            "id": "flux_bolt",
            "name": "流光弹",
            "element": "flux",
            "desc": "追踪光弹，弱归巢",
            "baseCooldown": 0.8,
            "baseDamage": 12,
            "color": "#00ffcc",
            "maxLevel": 6,
            "shape": "bolt",
            "evolveWith": "overclocker",
            "evolveTo": "streamline"
        },
        "chain_spark": {
            "id": "chain_spark",
            "name": "链式火花",
            "element": "flux",
            "desc": "命中后弹射到附近敌人",
            "baseCooldown": 1.2,
            "baseDamage": 10,
            "color": "#44ddff",
            "maxLevel": 6,
            "shape": "spark",
            "evolveWith": "bracer",
            "evolveTo": "thunder_net"
        },
        "pulse_ring": {
            "id": "pulse_ring",
            "name": "脉冲环",
            "element": "flux",
            "desc": "快速扩散的环形冲击波",
            "baseCooldown": 1.3,
            "baseDamage": 12,
            "color": "#66ffdd",
            "maxLevel": 6,
            "shape": "circle",
            "evolveWith": "wings",
            "evolveTo": "flux_storm"
        },
        "radiation_field": {
            "id": "radiation_field",
            "name": "辐射力场",
            "element": "void",
            "desc": "环绕玩家的持续伤害光环",
            "baseCooldown": 0.5,
            "baseDamage": 12,
            "color": "#aa44ff",
            "maxLevel": 6,
            "evolveWith": "nano_repair",
            "evolveTo": "void_singularity"
        },
        "soul_drain": {
            "id": "soul_drain",
            "name": "灵魂虹吸",
            "element": "void",
            "desc": "连线最弱敌人持续吸血",
            "baseCooldown": 1.5,
            "baseDamage": 5,
            "color": "#cc44ff",
            "maxLevel": 6,
            "evolveWith": "armor",
            "evolveTo": "life_siphon"
        },
        "shadow_clone": {
            "id": "shadow_clone",
            "name": "影分身",
            "element": "void",
            "desc": "召唤分身复制攻击",
            "baseCooldown": 4.0,
            "baseDamage": 15,
            "color": "#8844cc",
            "maxLevel": 6,
            "evolveWith": "attractorb",
            "evolveTo": "phantom_army"
        },
        "plasma_arc": {
            "id": "plasma_arc",
            "name": "等离子弧",
            "element": "plasma",
            "desc": "高伤害穿透投射物",
            "baseCooldown": 1.6,
            "baseDamage": 18,
            "color": "#ff6600",
            "maxLevel": 6,
            "shape": "crescent",
            "evolveWith": "energy_amp",
            "evolveTo": "helix_nova"
        },
        "napalm": {
            "id": "napalm",
            "name": "凝固汽油弹",
            "element": "plasma",
            "desc": "落地形成持续伤害火池",
            "baseCooldown": 2.0,
            "baseDamage": 12,
            "color": "#ff4400",
            "maxLevel": 6,
            "evolveWith": "spinach",
            "evolveTo": "inferno_zone"
        },
        "rocket_swarm": {
            "id": "rocket_swarm",
            "name": "火箭蜂群",
            "element": "plasma",
            "desc": "多枚追踪导弹",
            "baseCooldown": 1.8,
            "baseDamage": 14,
            "color": "#ff8844",
            "maxLevel": 6,
            "shape": "rocket",
            "evolveWith": "duplicator",
            "evolveTo": "orbital_strike"
        },
        "ice_shard": {
            "id": "ice_shard",
            "name": "冰晶碎片",
            "element": "cryo",
            "desc": "穿刺冰晶，命中减速敌人",
            "baseCooldown": 1.0,
            "baseDamage": 12,
            "color": "#66ccff",
            "maxLevel": 6,
            "shape": "crystal",
            "evolveWith": "cryo_core",
            "evolveTo": "absolute_zero"
        },
        "glacial_nova": {
            "id": "glacial_nova",
            "name": "冰川新星",
            "element": "cryo",
            "desc": "爆发冻结范围敌人",
            "baseCooldown": 2.5,
            "baseDamage": 10,
            "color": "#88ddff",
            "maxLevel": 6,
            "shape": "circle",
            "evolveWith": "frost_armor",
            "evolveTo": "permafrost_domain"
        },
        "frozen_orb": {
            "id": "frozen_orb",
            "name": "冻结宝珠",
            "element": "cryo",
            "desc": "旋转冰球喷射冰锥",
            "baseCooldown": 2.5,
            "baseDamage": 8,
            "color": "#aaeeff",
            "maxLevel": 6,
            "shape": "orb",
            "evolveWith": "chill_aura",
            "evolveTo": "blizzard"
        },
        "toxin_spray": {
            "id": "toxin_spray",
            "name": "毒雾喷射",
            "element": "toxic",
            "desc": "扇形毒雾持续伤害",
            "baseCooldown": 0.6,
            "baseDamage": 7,
            "color": "#88ff00",
            "maxLevel": 6,
            "shape": "cloud",
            "evolveWith": "toxic_sac",
            "evolveTo": "plague_cloud"
        },
        "acid_pool": {
            "id": "acid_pool",
            "name": "酸性池",
            "element": "toxic",
            "desc": "生成腐蚀池",
            "baseCooldown": 1.8,
            "baseDamage": 8,
            "color": "#aaff00",
            "maxLevel": 6,
            "shape": "circle",
            "evolveWith": "corrosion",
            "evolveTo": "acid_rain"
        },
        "venom_sting": {
            "id": "venom_sting",
            "name": "剧毒之刺",
            "element": "toxic",
            "desc": "叠加中毒层数",
            "baseCooldown": 1.2,
            "baseDamage": 8,
            "color": "#ccff00",
            "maxLevel": 6,
            "shape": "sting",
            "evolveWith": "plague_spread",
            "evolveTo": "pestilence"
        },
        "boomerang": {
            "id": "boomerang",
            "name": "回旋镖",
            "element": "kinetic",
            "desc": "掷出后原路返回的骨镖，穿透所有敌人",
            "baseCooldown": 1.5,
            "baseDamage": 14,
            "color": "#dddd88",
            "maxLevel": 6,
            "shape": "boomerang",
            "evolveWith": "bracer",
            "evolveTo": "blood_boomerang"
        },
        "chain_drill": {
            "id": "chain_drill",
            "name": "链锯",
            "element": "melee",
            "desc": "在正前方生成持续旋转切割的链锯",
            "baseCooldown": 0.1,
            "baseDamage": 4,
            "color": "#ff2255",
            "maxLevel": 6,
            "shape": "saw",
            "evolveWith": "armor",
            "evolveTo": "blood_ripper"
        },
        "holy_water": {
            "id": "holy_water",
            "name": "圣水瓶",
            "element": "toxic",
            "desc": "抛出一个瓶身落地碎裂，形成大面积火焰/神圣减速判定区",
            "baseCooldown": 2.2,
            "baseDamage": 10,
            "color": "#aaddff",
            "maxLevel": 6,
            "shape": "flask",
            "evolveWith": "spinach",
            "evolveTo": "holy_fire_zone"
        },
        "phase_blade": {
            "id": "phase_blade",
            "name": "相位刃",
            "element": "void",
            "desc": "近战弧形斩击，瞬间伤害范围内所有敌人",
            "baseCooldown": 0.7,
            "baseDamage": 18,
            "color": "#aa44ff",
            "maxLevel": 6,
            "shape": "blade",
            "evolveWith": "nano_repair",
            "evolveTo": "phantom_blade"
        },
        "gravity_cannon": {
            "id": "gravity_cannon",
            "name": "引力炮",
            "element": "plasma",
            "desc": "在目标处制造引力场，吸引周围敌人并引爆",
            "baseCooldown": 3.0,
            "baseDamage": 35,
            "color": "#ff9900",
            "maxLevel": 6,
            "shape": "orb",
            "evolveWith": "energy_amp",
            "evolveTo": "singularity_cannon"
        },
        "nano_swarm": {
            "id": "nano_swarm",
            "name": "纳米蜂群",
            "element": "toxic",
            "desc": "持续旋绕的纳米机器人，不断对敌人施毒",
            "baseCooldown": 0.3,
            "baseDamage": 4,
            "color": "#44ff88",
            "maxLevel": 6,
            "shape": "swarm",
            "evolveWith": "corrosion",
            "evolveTo": "nano_plague"
        },
        "fusion_orbital_cannon": {
            "id": "fusion_orbital_cannon",
            "name": "天罚轨道炮",
            "element": "plasma",
            "desc": "【神兵】降下毁天灭地的轨道死光，摧毁范围内一切",
            "baseCooldown": 5.0,
            "baseDamage": 100,
            "color": "#ffcc00",
            "maxLevel": 1,
            "shape": "beam",
            "isFusion": true
        },
        "fusion_absolute_zero": {
            "id": "fusion_absolute_zero",
            "name": "绝对零度泥沼",
            "element": "cryo",
            "desc": "【神兵】展开极寒酸液领域，彻底冻结并腐蚀全场",
            "baseCooldown": 5.0,
            "baseDamage": 60,
            "color": "#66ffcc",
            "maxLevel": 1,
            "shape": "zone",
            "isFusion": true
        },
        "fusion_singularity": {
            "id": "fusion_singularity",
            "name": "虚空奇点枪",
            "element": "void",
            "desc": "【神兵】发射缓慢移动的微型黑洞，无情吞噬并绞碎敌人",
            "baseCooldown": 6.0,
            "baseDamage": 80,
            "color": "#9900ff",
            "maxLevel": 1,
            "shape": "singularity",
            "isFusion": true
        },
        "void_singularity": {
            "id": "void_singularity",
            "name": "虚空奇点",
            "element": "void",
            "desc": "【进化】吸附圈+吸血。",
            "baseCooldown": 0.5,
            "baseDamage": 20,
            "color": "#cc66ff",
            "maxLevel": 1,
            "evolved": true
        },
        "singularity_cannon": {
            "id": "singularity_cannon",
            "name": "奇点炮",
            "element": "plasma",
            "desc": "【进化】发射微型引力奇点",
            "baseCooldown": 2.5,
            "baseDamage": 45,
            "color": "#ff66aa",
            "maxLevel": 1,
            "evolved": true
        },
        "blood_boomerang": {
            "id": "blood_boomerang",
            "name": "血色回旋",
            "element": "kinetic",
            "desc": "【进化】无限穿透+吸血回旋镖",
            "baseCooldown": 1.2,
            "baseDamage": 18,
            "color": "#ff4444",
            "maxLevel": 1,
            "evolved": true,
            "shape": "boomerang"
        },
        "blood_ripper": {
            "id": "blood_ripper",
            "name": "血肉绞碎者",
            "element": "melee",
            "desc": "【进化】范围翻倍的致命链锯",
            "baseCooldown": 0.1,
            "baseDamage": 6,
            "color": "#ff0033",
            "maxLevel": 1,
            "evolved": true,
            "shape": "saw"
        },
        "holy_fire_zone": {
            "id": "holy_fire_zone",
            "name": "圣火裁决",
            "element": "toxic",
            "desc": "【进化】巨型圣火审判区域",
            "baseCooldown": 1.8,
            "baseDamage": 14,
            "color": "#ffdd44",
            "maxLevel": 1,
            "evolved": true,
            "shape": "flask"
        },
        "phantom_blade": {
            "id": "phantom_blade",
            "name": "幻影之刃",
            "element": "void",
            "desc": "【进化】虚空波动斩+吸血",
            "baseCooldown": 0.5,
            "baseDamage": 22,
            "color": "#cc44ff",
            "maxLevel": 1,
            "evolved": true,
            "shape": "blade"
        },
        "nano_plague": {
            "id": "nano_plague",
            "name": "纳米瘟疫",
            "element": "toxic",
            "desc": "【进化】全屏纳米腐蚀",
            "baseCooldown": 0.2,
            "baseDamage": 5,
            "color": "#00ff66",
            "maxLevel": 1,
            "evolved": true,
            "shape": "swarm"
        },
        "fusion_meat_grinder": {
            "id": "fusion_meat_grinder",
            "name": "绞肉旋风",
            "element": "melee",
            "desc": "【神兵】化身死亡绞肉机，全方位近战毁灭",
            "baseCooldown": 0.08,
            "baseDamage": 8,
            "color": "#ff2288",
            "maxLevel": 1,
            "shape": "saw",
            "isFusion": true
        },
        "fusion_cryo_toxic": {
            "id": "fusion_cryo_toxic",
            "name": "冰毒领域",
            "element": "cryo",
            "desc": "【神兵】冻结+中毒双重领域，敌人无法逃脱",
            "baseCooldown": 4.0,
            "baseDamage": 50,
            "color": "#44ffaa",
            "maxLevel": 1,
            "shape": "zone",
            "isFusion": true
        },
        "fusion_doom_storm": {
            "id": "fusion_doom_storm",
            "name": "末日风暴",
            "element": "plasma",
            "desc": "【神兵】爆炸回旋弹幕覆盖全屏",
            "baseCooldown": 3.0,
            "baseDamage": 70,
            "color": "#ff8800",
            "maxLevel": 1,
            "shape": "boomerang",
            "isFusion": true
        }
    },
    "passives": {
        "overclocker": {
            "id": "overclocker",
            "name": "超频芯片",
            "desc": "武器冷却 -6%",
            "maxLevel": 5,
            "stat": "bonusCdr",
            "perLevel": 0.06
        },
        "nano_repair": {
            "id": "nano_repair",
            "name": "纳米修复",
            "desc": "恢复 +0.3 HP/秒",
            "maxLevel": 5,
            "stat": "bonusRegen",
            "perLevel": 0.5
        },
        "energy_amp": {
            "id": "energy_amp",
            "name": "能量增幅",
            "desc": "攻击范围 +10%",
            "maxLevel": 5,
            "stat": "bonusArea",
            "perLevel": 0.1
        },
        "spinach": {
            "id": "spinach",
            "name": "力量核心",
            "desc": "伤害 +10%",
            "maxLevel": 5,
            "stat": "bonusMight",
            "perLevel": 0.1
        },
        "bracer": {
            "id": "bracer",
            "name": "加速器",
            "desc": "弹速 +10%",
            "maxLevel": 5,
            "stat": "bonusProjSpeed",
            "perLevel": 0.1
        },
        "duplicator": {
            "id": "duplicator",
            "name": "复制器",
            "desc": "投射物 +1",
            "maxLevel": 2,
            "stat": "bonusProjectile",
            "perLevel": 1
        },
        "armor": {
            "id": "armor",
            "name": "装甲板",
            "desc": "护甲 +1",
            "maxLevel": 5,
            "stat": "bonusArmor",
            "perLevel": 1
        },
        "wings": {
            "id": "wings",
            "name": "推进翼",
            "desc": "移速 +10%",
            "maxLevel": 5,
            "stat": "bonusSpeed",
            "perLevel": 0.1
        },
        "attractorb": {
            "id": "attractorb",
            "name": "引力球",
            "desc": "拾取范围 +20%",
            "maxLevel": 3,
            "stat": "bonusPickup",
            "perLevel": 0.2
        },
        "cryo_core": {
            "id": "cryo_core",
            "name": "冰晶核心",
            "desc": "冰冻持续 +15%",
            "maxLevel": 5,
            "stat": "bonusFreezeDur",
            "perLevel": 0.15
        },
        "frost_armor": {
            "id": "frost_armor",
            "name": "霜冻护甲",
            "desc": "受伤时冻结攻击者",
            "maxLevel": 1,
            "special": "frostArmorActive"
        },
        "chill_aura": {
            "id": "chill_aura",
            "name": "寒气光环",
            "desc": "周围敌人减速",
            "maxLevel": 5,
            "special": "chillAuraRadius",
            "perLevel": 30
        },
        "toxic_sac": {
            "id": "toxic_sac",
            "name": "毒囊",
            "desc": "毒素伤害 +20%",
            "maxLevel": 5,
            "stat": "bonusToxicDmg",
            "perLevel": 0.2
        },
        "corrosion": {
            "id": "corrosion",
            "name": "腐蚀",
            "desc": "对中毒敌人伤害 +10%",
            "maxLevel": 5,
            "stat": "corrosionBonus",
            "perLevel": 0.1
        },
        "plague_spread": {
            "id": "plague_spread",
            "name": "瘟疫传播",
            "desc": "中毒死亡时传染",
            "maxLevel": 1,
            "special": "plagueSpread"
        },
        "lucky_shot": {
            "id": "lucky_shot",
            "name": "幸运射击",
            "desc": "5%双倍伤害几率",
            "maxLevel": 5,
            "stat": "luckyChance",
            "perLevel": 0.05
        },
        "void_core": {
            "id": "void_core",
            "name": "虚空核心",
            "desc": "击杀敌人回复 1 HP",
            "maxLevel": 5,
            "special": "voidLeech",
            "perLevel": 1
        },
        "shadow_step": {
            "id": "shadow_step",
            "name": "暗影步",
            "desc": "受伤时有几率无敌",
            "maxLevel": 5,
            "stat": "dodgeChance",
            "perLevel": 0.1
        },
        "soul_harvest": {
            "id": "soul_harvest",
            "name": "灵魂收割",
            "desc": "击杀敌人伤害+2% (最高+50%)",
            "maxLevel": 5,
            "special": "soulHarvest",
            "perLevel": 0.02
        },
        "thermal_core": {
            "id": "thermal_core",
            "name": "热能核心",
            "desc": "燃烧伤害 +25%",
            "maxLevel": 5,
            "stat": "bonusBurnDmg",
            "perLevel": 0.25
        },
        "explosive_rounds": {
            "id": "explosive_rounds",
            "name": "爆破弹",
            "desc": "攻击有爆炸效果",
            "maxLevel": 3,
            "special": "explosiveRounds",
            "perLevel": 30
        },
        "overheat": {
            "id": "overheat",
            "name": "过载",
            "desc": "连续攻击伤害递增",
            "maxLevel": 5,
            "special": "overheat",
            "perLevel": 0.05
        },
        "xp_magnet": {
            "id": "xp_magnet",
            "name": "经验磁铁",
            "desc": "经验获取 +15%",
            "maxLevel": 5,
            "stat": "bonusXp",
            "perLevel": 0.15
        },
        "critical_eye": {
            "id": "critical_eye",
            "name": "鹰眼",
            "desc": "暴击伤害 +50%",
            "maxLevel": 5,
            "stat": "criticalDamage",
            "perLevel": 0.5
        },
        "second_wind": {
            "id": "second_wind",
            "name": "背水一战",
            "desc": "低 HP 时伤害 +30%",
            "maxLevel": 1,
            "special": "secondWind"
        },
        "hunter_instinct": {
            "id": "hunter_instinct",
            "name": "猎人本能",
            "desc": "对精英/Boss 伤害 +12%",
            "maxLevel": 5,
            "stat": "hunterDamage",
            "perLevel": 0.12
        }
    }
};
