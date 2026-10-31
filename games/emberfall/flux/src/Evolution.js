// ─── 超武进化系统 ──────────────────────────
// 当武器满级 + 拥有特定被动时，可以进化为超级武器
// 需要满足击杀条件 或 拾取进化核心才能解锁

// const { WEAPON_DEFS } = require('./Weapons'); // Removed to fix Circular Dependency

const EVOLUTION_RECIPES = {
    // ── Flux 系 ──
    flux_bolt: {
        requirePassive: 'overclocker',
        resultName: '光流洪荒',
        resultColor: '#00ffdd',
        resultDesc: '无冷却穿透激光',
        bonuses: { damage: 3.0, pierce: 10, projCount: 4, homing: 1.0, speed: 1.5, cooldown: 0.6 },
        unlockCondition: { type: 'kills', count: 200 },
    },
    chain_spark: {
        requirePassive: 'bracer',
        resultName: '雷霆天网',
        resultColor: '#22eeff',
        resultDesc: '弹射 8 次，每次分裂',
        bonuses: { damage: 3.0, pierce: 10, projCount: 3, homing: 1.0, speed: 1.2, bounceCount: 8 },
        unlockCondition: { type: 'kills', count: 250 },
    },
    pulse_ring: {
        requirePassive: 'wings',
        resultName: '流光风暴',
        resultColor: '#88ffee',
        resultDesc: '全屏闪电链清场',
        bonuses: { damage: 3.0, pierce: 15, radius: 2.0, cooldown: 0.7 },
        unlockCondition: { type: 'kills', count: 350 },
    },
    // ── Void 系 ──
    radiation_field: {
        requirePassive: 'nano_repair',
        resultName: '虚空奇点',
        resultColor: '#cc66ff',
        resultDesc: '黑洞吸引 + 吸血',
        bonuses: { damage: 3.0, radius: 2.0, lifesteal: 0.05 },
        unlockCondition: { type: 'bossKills', count: 2 },
    },
    soul_drain: {
        requirePassive: 'armor',
        resultName: '生命虹吸',
        resultColor: '#ee66ff',
        resultDesc: '同时锁定 5 个目标吸血',
        bonuses: { damage: 2.5, targetCount: 5, lifesteal: 0.08 },
        unlockCondition: { type: 'healed', count: 500 },
    },
    shadow_clone: {
        requirePassive: 'attractorb',
        resultName: '幻影军团',
        resultColor: '#aa66dd',
        resultDesc: '3 个分身各自独立攻击',
        bonuses: { damage: 2.5, cloneCount: 3 },
        unlockCondition: { type: 'gemsCollected', count: 300 },
    },
    // ── Plasma 系 ──
    plasma_arc: {
        requirePassive: 'energy_amp',
        resultName: '螺旋新星',
        resultColor: '#ff8833',
        resultDesc: '360° 螺旋火波',
        bonuses: { damage: 3.0, pierce: 15, radius: 1.8, speed: 1.0, projCount: 5 },
        unlockCondition: { type: 'kills', count: 400 },
    },
    napalm: {
        requirePassive: 'spinach',
        resultName: '地狱区',
        resultColor: '#ff3300',
        resultDesc: '火池面积 ×3，燃烧时间强化',
        bonuses: { damage: 2.5, radius: 3.0, duration: 1.2 },
        unlockCondition: { type: 'kills', count: 300 },
    },
    rocket_swarm: {
        requirePassive: 'duplicator',
        resultName: '轨道打击',
        resultColor: '#ffaa44',
        resultDesc: '全屏随机导弹轰炸',
        bonuses: { damage: 3.0, homing: 1.0, speed: 2.0, projCount: 6, autoTarget: true },
        unlockCondition: { type: 'bossKills', count: 2 },
    },
    // ── Cryo 系 ──
    ice_shard: {
        requirePassive: 'cryo_core',
        resultName: '绝对零度',
        resultColor: '#44aaff',
        resultDesc: '穿透×12 + 爆炸冻结',
        bonuses: { damage: 3.0, pierce: 12, freezeChance: 1.0, freezeDur: 2.5, explosionFreeze: true },
        unlockCondition: { type: 'frozenKills', count: 40 },
    },
    glacial_nova: {
        requirePassive: 'frost_armor',
        resultName: '永冻领域',
        resultColor: '#66ccff',
        resultDesc: '持续冻结光环',
        bonuses: { damage: 2.5, radius: 2.0, freezeAura: true, cooldown: 0.8 },
        unlockCondition: { type: 'frozenKills', count: 50 },
    },
    frozen_orb: {
        requirePassive: 'chill_aura',
        resultName: '暴风雪',
        resultColor: '#88ddff',
        resultDesc: '全屏暴风雪',
        bonuses: { damage: 2.5, projCount: 5, freezeChance: 0.9, radius: 1.5 },
        unlockCondition: { type: 'frozenKills', count: 60 },
    },
    // ── Toxic 系 ──
    toxin_spray: {
        requirePassive: 'toxic_sac',
        resultName: '瘟疫云',
        resultColor: '#66ff00',
        resultDesc: '全屏毒雾',
        bonuses: { damage: 3.0, poisonDmg: 8, poisonStacks: 4, radius: 1.8 },
        unlockCondition: { type: 'poisonKills', count: 40 },
    },
    acid_pool: {
        requirePassive: 'corrosion',
        resultName: '酸雨',
        resultColor: '#aaff00',
        resultDesc: '全图腐蚀',
        bonuses: { damage: 2.5, radius: 3.0, poisonDmg: 6, duration: 1.5 },
        unlockCondition: { type: 'poisonKills', count: 50 },
    },
    venom_sting: {
        requirePassive: 'plague_spread',
        resultName: '瘟疫',
        resultColor: '#ccff00',
        resultDesc: '死亡传染毒爆',
        bonuses: { damage: 3.0, poisonStacks: 8, plagueExplosion: true, projCount: 3 },
        unlockCondition: { type: 'poisonKills', count: 60 },
    },
    // ── 新增武器进化 ──
    boomerang: {
        requirePassive: 'bracer',
        resultName: '血色回旋',
        resultColor: '#ff4444',
        resultDesc: '回旋镖吸血 + 穿透无限',
        bonuses: { damage: 3.0, pierce: 99, lifesteal: 0.03, speed: 1.5, projCount: 3 },
        unlockCondition: { type: 'kills', count: 300 },
    },
    chain_drill: {
        requirePassive: 'armor',
        resultName: '血肉绞碎者',
        resultColor: '#ff0033',
        resultDesc: '链锯范围×2，击杀回血',
        bonuses: { damage: 2.5, radius: 2.0, lifesteal: 0.05 },
        unlockCondition: { type: 'kills', count: 500 },
    },
    holy_water: {
        requirePassive: 'spinach',
        resultName: '圣火裁决',
        resultColor: '#ffdd44',
        resultDesc: '火焰区域×3，灼烧+减速',
        bonuses: { damage: 2.5, radius: 3.0, duration: 1.5, burnDmg: 10 },
        unlockCondition: { type: 'kills', count: 400 },
    },
    phase_blade: {
        requirePassive: 'nano_repair',
        resultName: '幻影之刃',
        resultColor: '#cc44ff',
        resultDesc: '斩击释放虚空波，吸血',
        bonuses: { damage: 3.0, radius: 1.8, lifesteal: 0.04, projCount: 3, cooldown: 0.7 },
        unlockCondition: { type: 'bossKills', count: 3 },
    },
    gravity_cannon: {
        requirePassive: 'energy_amp',
        resultName: '奇点炮',
        resultColor: '#ff66aa',
        resultDesc: '引力场吸引范围×2，引爆伤害×3',
        bonuses: { damage: 3.0, radius: 2.0, pullForce: 2.0, cooldown: 0.7 },
        unlockCondition: { type: 'bossKills', count: 4 },
    },
    nano_swarm: {
        requirePassive: 'corrosion',
        resultName: '纳米瘟疫',
        resultColor: '#00ff66',
        resultDesc: '纳米虫扩散全屏，持续腐蚀',
        bonuses: { damage: 2.5, radius: 2.5, poisonDmg: 12, poisonStacks: 5 },
        unlockCondition: { type: 'poisonKills', count: 40 },
    },
};

// ─── 终极双拼神器系统 (Union Weapons) ───
// 需要主要武器满级，并且拥有另一把满级的副手武器（进化或未进化均可，但通常限定未进化）
// 融合后，副手武器会被吞噬（移除），空出一个武器槽位。
const UNION_RECIPES = {
    // 天罚轨道炮: 等离子弧 (Plasma) + 脉冲环 (Flux)
    plasma_arc: {
        requireWeapon: 'pulse_ring',
        resultId: 'fusion_orbital_cannon',
        resultName: '天罚轨道炮',
        resultColor: '#ffcc00',
        resultDesc: '【神兵】降下毁天灭地的轨道死光',
        unlockCondition: { type: 'bossKills', count: 5 },
    },
    // 绝对零度泥沼: 酸性池 (Toxic) + 冰川新星 (Cryo)
    acid_pool: {
        requireWeapon: 'glacial_nova',
        resultId: 'fusion_absolute_zero',
        resultName: '绝对零度泥沼',
        resultColor: '#66ffcc',
        resultDesc: '【神兵】展开极寒酸液领域',
        unlockCondition: { type: 'bossKills', count: 5 },
    },
    // 虚空奇点枪: 引力炮 (Plasma) + 辐射力场 (Void)
    gravity_cannon: {
        requireWeapon: 'radiation_field',
        resultId: 'fusion_singularity',
        resultName: '虚空奇点枪',
        resultColor: '#9900ff',
        resultDesc: '【神兵】发射缓慢移动的微型黑洞',
        unlockCondition: { type: 'bossKills', count: 5 },
    },
    // ── 新增融合 ──
    // 绞肉旋风: 链锯 (Melee) + 相位刃 (Void)
    chain_drill: {
        requireWeapon: 'phase_blade',
        resultId: 'fusion_meat_grinder',
        resultName: '绞肉旋风',
        resultColor: '#ff2288',
        resultDesc: '【神兵】化身死亡绞肉机，全方位近战毁灭',
        unlockCondition: { type: 'kills', count: 1000 },
    },
    // 冰毒领域: 冰晶碎片 (Cryo) + 毒雾喷射 (Toxic)
    ice_shard: {
        requireWeapon: 'toxin_spray',
        resultId: 'fusion_cryo_toxic',
        resultName: '冰毒领域',
        resultColor: '#44ffaa',
        resultDesc: '【神兵】冻结+中毒双重领域，敌人无法逃脱',
        unlockCondition: { type: 'frozenKills', count: 30 },
    },
    // 末日风暴: 回旋镖 (Kinetic) + 火箭蜂群 (Plasma)
    boomerang: {
        requireWeapon: 'rocket_swarm',
        resultId: 'fusion_doom_storm',
        resultName: '末日风暴',
        resultColor: '#ff8800',
        resultDesc: '【神兵】爆炸回旋弹幕覆盖全屏',
        unlockCondition: { type: 'bossKills', count: 4 },
    },
};

/**
 * 检查玩家是否有可进化的武器（未考虑解锁条件）
 */
function checkEvolutions(player) {
    const evolvable = [];
    for (const w of player.weapons) {
        const def = w.def;
        if (!def || def.isFusion) continue;
        if (w.level < def.maxLevel) continue;

        // 1. 检查双武器融合 (Union)
        const unionRecipe = UNION_RECIPES[w.id];
        if (unionRecipe) {
            // 需要副武器也存在且达到满级
            const reqWeapon = player.weapons.find(subW => subW.id === unionRecipe.requireWeapon);
            if (reqWeapon && reqWeapon.level >= (reqWeapon.def ? reqWeapon.def.maxLevel : 6)) {
                evolvable.push({ weaponId: w.id, recipe: unionRecipe, isUnion: true, consumeId: unionRecipe.requireWeapon });
                // Ordinary awakening remains a separate choice while building toward fusion.
            }
        }

        // 2. 检查普通被动进化
        const recipe = EVOLUTION_RECIPES[w.id];
        if (!recipe || w.evolved) continue;

        if (player.hasPassive(recipe.requirePassive)) {
            evolvable.push({ weaponId: w.id, recipe });
        }
    }
    return evolvable;
}

/**
 * 检查进化是否已解锁（通过条件或核心）
 * @param {string} weaponId - 武器ID
 * @param {boolean} isUnion - 是否是双拼融合
 * @param {Object} player - 玩家对象
 * @param {Object} game - 游戏对象
 * @returns {boolean} 是否已解锁
 */
function isEvolutionUnlocked(weaponId, isUnion, player, game) {
    const recipe = isUnion ? UNION_RECIPES[weaponId] : EVOLUTION_RECIPES[weaponId];
    if (!recipe) return false;

    // 检查是否使用过进化核心
    if (player.evolutionCores && player.evolutionCores[weaponId]) {
        return true;
    }

    // 检查击杀条件
    const cond = recipe.unlockCondition;
    if (!cond) return true; // 没有条件默认解锁

    switch (cond.type) {
        case 'kills':
            return player.kills >= cond.count;
        case 'frozenKills':
            return game.frozenKills >= cond.count;
        case 'poisonKills':
            return game.poisonKills >= cond.count;
        case 'bossKills':
            return (game.bossKills || 0) >= cond.count;
        case 'healed':
            return (player.totalHealed || 0) >= cond.count;
        case 'gemsCollected':
            return (player.totalGemsCollected || 0) >= cond.count;
        default:
            return false;
    }
}

/**
 * 获取进化解锁进度
 * @returns {Object} { current, required, type }
 */
function getEvolutionProgress(weaponId, isUnion, player, game) {
    const recipe = isUnion ? UNION_RECIPES[weaponId] : EVOLUTION_RECIPES[weaponId];
    if (!recipe || !recipe.unlockCondition) {
        return { current: 1, required: 1, type: 'none', unlocked: true };
    }

    // 已经用核心解锁
    if (player.evolutionCores && player.evolutionCores[weaponId]) {
        return { current: 1, required: 1, type: 'core', unlocked: true };
    }

    const cond = recipe.unlockCondition;
    let current = 0;

    switch (cond.type) {
        case 'kills':
            current = player.kills;
            break;
        case 'frozenKills':
            current = game.frozenKills;
            break;
        case 'poisonKills':
            current = game.poisonKills;
            break;
        case 'bossKills':
            current = game.bossKills || 0;
            break;
        case 'healed':
            current = player.totalHealed || 0;
            break;
        case 'gemsCollected':
            current = player.totalGemsCollected || 0;
            break;
    }

    return {
        current,
        required: cond.count,
        type: cond.type,
        unlocked: current >= cond.count,
    };
}

/**
 * 使用进化核心解锁武器
 */
function useEvolutionCore(weaponId, player) {
    if (!player.evolutionCores) player.evolutionCores = {};
    player.evolutionCores[weaponId] = true;
}

/**
 * 执行进化
 */
function evolveWeapon(weapon, recipe, consumeId = null) {
    const p = weapon.game && weapon.game.player;
    const isUnion = !!consumeId;
    const expected = isUnion ? UNION_RECIPES[weapon.id] : EVOLUTION_RECIPES[weapon.id];
    if (!p || expected !== recipe || !p.weapons.includes(weapon) || weapon.level < weapon.def.maxLevel
        || !isEvolutionUnlocked(weapon.id, isUnion, p, weapon.game)) return false;
    if (isUnion) {
        const secondary = p.weapons.find(w => w !== weapon && w.id === recipe.requireWeapon);
        if (consumeId !== recipe.requireWeapon || !secondary || secondary.level < secondary.def.maxLevel) return false;
    } else if (weapon.evolved || !p.hasPassive(recipe.requirePassive)) return false;
    if (recipe.resultId) {
        // [神兵融合]：完全替换为全新的武器 ID 和定义
        const { WEAPON_DEFS } = require('./Weapons');
        const newDef = WEAPON_DEFS[recipe.resultId];
        if (!newDef) { console.warn('[Evolution] unknown resultId:', recipe.resultId); return; }
        weapon.evolved = true;
        weapon._evolutionBonuses = null; // Fusion uses its own definition, not the previous awakening multiplier.
        weapon._clones.length = weapon._orbList.length = weapon._firePools.length = weapon._acidPools.length = weapon._gravityZones.length = weapon._nanoSwarm.length = 0;
        weapon.id = recipe.resultId;
        weapon.def = newDef;
        weapon.level = 1; // 融合武器固定为1级或满级
        // damage 是 getter，无需赋值，会自动从 weapon.def.baseDamage 计算
        weapon.cooldown = weapon.def.baseCooldown;
    } else {
        // [常规进化]：保留原 ID，只替换名字、颜色和加成
        weapon.evolved = true;
        weapon.def = {
            ...weapon.def,
            name: recipe.resultName,
            color: recipe.resultColor,
            desc: recipe.resultDesc,
        };
        weapon._evolutionBonuses = recipe.bonuses;
    }

    if (weapon.game && weapon.game.meta) {
        weapon.game.meta.unlockItem(recipe.resultName);
    }

    // 处理双拼吞噬：移除副手武器，让出一个火力槽
    if (consumeId && weapon.game && weapon.game.player) {
        const p = weapon.game.player;
        const subIndex = p.weapons.findIndex(w => w.id === consumeId);
        if (subIndex !== -1) {
            p.weapons.splice(subIndex, 1);
            if (weapon.game.particles) {
                weapon.game.particles.emit(weapon.game.player.x, weapon.game.player.y, { count: 40, speed: 200, life: 0.8, color: '#ff00ff', size: 6 });
            }
            weapon.game.spawnDamageNumber(p.x, p.y - 80, '合体进化!', '#ff00ff', false);
            weapon.game.triggerScreenPulse('#ff00ff44', 1.0);
        }
    }

    if (weapon.game && weapon.game.synergy) weapon.game.synergy.check();

    // 进化视觉反馈
    if (weapon.game) {
        weapon.game.triggerHitPause(0.1);
        weapon.game.shakeAmount = consumeId ? 15 : 10;
        weapon.game.shakeDuration = consumeId ? 0.8 : 0.5;
        weapon.game.triggerScreenPulse(recipe.resultColor, 0.8);
        if (weapon.game.particles) {
            weapon.game.particles.levelUp(weapon.game.player.x, weapon.game.player.y);
        }
    }
    return true;
}

/** 获取进化后的伤害倍率 */
function getEvolutionDamageMult(weapon) {
    if (!weapon._evolutionBonuses) return 1;
    return weapon._evolutionBonuses.damage || 1;
}

/** 获取进化后的穿透 */
function getEvolutionPierce(weapon) {
    if (!weapon._evolutionBonuses) return 0;
    return weapon._evolutionBonuses.pierce || 0;
}

/** 获取进化后的追踪强度 */
function getEvolutionHoming(weapon) {
    if (!weapon._evolutionBonuses) return 0;
    return weapon._evolutionBonuses.homing || 0;
}

/** 获取条件类型的中文名 */
function getConditionTypeName(type) {
    const names = {
        kills: '击杀敌人',
        frozenKills: '冻结击杀',
        poisonKills: '毒杀敌人',
        bossKills: '击杀Boss',
        healed: '累计治疗',
        gemsCollected: '收集经验',
    };
    return names[type] || type;
}

module.exports = {
    checkEvolutions,
    EVOLUTION_RECIPES,
    UNION_RECIPES,
    evolveWeapon,
    getEvolutionHoming,
    getEvolutionDamageMult,
    getEvolutionPierce,
    isEvolutionUnlocked,
    getEvolutionProgress,
    useEvolutionCore,
    getConditionTypeName,
};
