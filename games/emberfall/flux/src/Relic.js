// ─── 遗物系统 ──────────────────────────
// 强力局内随机道具，改变玩法规则，每局最多 3 个

const RELIC_DEFS = [
    // ═══ 红色遗物 (传说) ═══
    {
        id: 'antimatter_engine',
        name: '反物质引擎',
        desc: '移动时对路径上的敌人造成伤害',
        rarity: 'red',
        color: '#ff4444',
        apply: (player) => { player.relicFlags.antimatterEngine = true; },
    },
    {
        id: 'time_shard',
        name: '时间碎片',
        desc: '静止 2 秒后攻速 ×3',
        rarity: 'red',
        color: '#ff4444',
        apply: (player) => { player.relicFlags.timeShard = true; player.stillTimer = 0; },
    },
    {
        id: 'overload_core',
        requiresChoice: true,
        name: '过载核心',
        desc: '伤害 ×2，无法回血',
        rarity: 'red',
        color: '#ff4444',
        apply: (player) => {
            player.relicFlags.overloadCore = true;
        },
    },
    {
        id: 'revival_node',
        name: '复活节点',
        desc: '死亡时以 30% HP 复活一次',
        rarity: 'red',
        color: '#ff4444',
        apply: (player) => { player.relicFlags.revivalNode = true; },
    },
    {
        id: 'mirror_chip',
        name: '镜像芯片',
        desc: '15% 概率复制获得的被动',
        rarity: 'red',
        color: '#ff4444',
        apply: (player) => { player.relicFlags.mirrorChip = true; },
    },
    {
        id: 'critical_mass',
        name: '临界质量',
        desc: '暴击时造成范围伤害',
        rarity: 'red',
        color: '#ff4444',
        apply: (player) => { player.relicFlags.criticalMass = true; },
    },
    {
        id: 'void_contract',
        name: '虚空契约',
        desc: '每击杀 100 敌人获得随机遗物',
        rarity: 'red',
        color: '#ff4444',
        apply: (player) => { player.relicFlags.voidContract = true; player.voidContractKills = 0; },
    },
    {
        id: 'limit_break',
        name: '极限突破',
        desc: 'HP 低于 10% 时无敌 3 秒（每局一次）',
        rarity: 'red',
        color: '#ff4444',
        apply: (player) => { player.relicFlags.limitBreak = true; player.limitBreakUsed = false; },
    },

    // ═══ 金色遗物 (稀有) ═══
    {
        id: 'quantum_dice',
        name: '量子骰子',
        desc: '升级选项变为 5 选 1',
        rarity: 'gold',
        color: '#ffcc00',
        apply: (player) => { player.relicFlags.quantumDice = true; },
    },
    {
        id: 'greed_protocol',
        requiresChoice: true,
        name: '贪婪协议',
        desc: '芯片掉落 ×2，最大 HP -30%',
        rarity: 'gold',
        color: '#ffcc00',
        apply: (player) => {
            player.relicFlags.greedProtocol = true;
            player.maxHp = Math.floor(player.maxHp * 0.7);
            player.hp = Math.min(player.hp, player.maxHp);
        },
    },
    {
        id: 'echo_chip',
        name: '回声芯片',
        desc: '每次攻击 20% 概率双击',
        rarity: 'gold',
        color: '#ffcc00',
        apply: (player) => { player.relicFlags.echoChip = true; },
    },
    {
        id: 'bloodrage',
        name: '血怒模块',
        desc: 'HP 越低伤害越高（最高 ×2.5）',
        rarity: 'gold',
        color: '#ffcc00',
        apply: (player) => { player.relicFlags.bloodrage = true; },
    },
    {
        id: 'elemental_core',
        name: '元素核心',
        desc: '任一元素武器伤害 +30%',
        rarity: 'gold',
        color: '#ffcc00',
        apply: (player) => { player.relicFlags.elementalCore = true; player.bonusMight += 0.3; },
    },
    {
        id: 'frenzy_module',
        name: '暴走模块',
        desc: '连杀不中断时越战越强',
        rarity: 'gold',
        color: '#ffcc00',
        apply: (player) => { player.relicFlags.frenzyModule = true; },
    },
    {
        id: 'lucky_coin',
        name: '幸运硬币',
        desc: '暴击率 +15%',
        rarity: 'gold',
        color: '#ffcc00',
        apply: (player) => { player.luckyChance = (player.luckyChance || 0) + 0.15; },
    },
    {
        id: 'magnet_core',
        name: '磁力核心',
        desc: '拾取范围 +100%',
        rarity: 'gold',
        color: '#ffcc00',
        apply: (player) => { player.bonusPickup += 1.0; },
    },
    {
        id: 'time_dilation',
        name: '时间膨胀',
        desc: '子弹时间：受伤时短暂减速周围敌人',
        rarity: 'gold',
        color: '#ffcc00',
        apply: (player) => { player.relicFlags.timeDilation = true; },
    },
    {
        id: 'explosive_blood',
        name: '爆裂血液',
        desc: '受伤时对周围敌人造成伤害',
        rarity: 'gold',
        color: '#ffcc00',
        apply: (player) => { player.relicFlags.explosiveBlood = true; },
    },

    // ═══ 白色遗物 (普通) ═══
    {
        id: 'shield_gen',
        name: '护盾发生器',
        desc: '每 30 秒获得临时护盾',
        rarity: 'white',
        color: '#aaaaaa',
        apply: (player) => { player.relicFlags.shieldGen = true; player.shieldGenTimer = 30; },
    },
    {
        id: 'tiny_wings',
        name: '微型翅膀',
        desc: '移速 +20%',
        rarity: 'white',
        color: '#aaaaaa',
        apply: (player) => { player.bonusSpeed += 0.2; },
    },
    {
        id: 'regen_drone',
        name: '修复无人机',
        desc: '每秒回复 1 HP',
        rarity: 'white',
        color: '#aaaaaa',
        apply: (player) => { player.relicFlags.regenDrone = true; },
    },
    {
        id: 'xp_boost',
        name: '经验增幅器',
        desc: '经验获取 +25%',
        rarity: 'white',
        color: '#aaaaaa',
        apply: (player) => { player.relicFlags.xpBoost = true; },
    },

    // ── 新增遗物 ──
    {
        id: 'phase_shield',
        name: '相位护盾',
        desc: '每次受击后获得1.5秒无敌',
        rarity: 'red',
        color: '#ff4444',
        apply: (player) => { player.relicFlags.phaseShield = true; },
    },
    {
        id: 'bullet_matrix',
        name: '弹幕矩阵',
        desc: '每20秒自动发射8方向弹幕',
        rarity: 'gold',
        color: '#ffcc00',
        apply: (player) => { player.relicFlags.bulletMatrix = true; player.bulletMatrixTimer = 20; },
    },
    {
        id: 'vampire_pact',
        name: '吸血契约',
        desc: '每5次击杀回复1点HP',
        rarity: 'gold',
        color: '#ffcc00',
        apply: (player) => { player.relicFlags.vampirePact = true; player.vampireKillCount = 0; },
    },
    {
        id: 'resonance_core',
        name: '共鸣核心',
        desc: '拥有3种以上武器时伤害+20%',
        rarity: 'white',
        color: '#aaaaaa',
        apply: (player) => { player.relicFlags.resonanceCore = true; },
    },
    {
        id: 'scrap_recycle',
        name: '废铁回收',
        desc: '放逐升级选项时获得10芯片',
        rarity: 'white',
        color: '#aaaaaa',
        apply: (player) => { player.relicFlags.scrapRecycle = true; },
    },
];

// ═══ 遗物协同效果 ═══
const RELIC_SYNERGIES = [
    {
        relics: ['time_shard', 'frenzy_module'],
        name: '时间风暴',
        desc: '静止时暴击率 +30%',
        apply: (player) => { player.relicFlags.timeStorm = true; },
    },
    {
        relics: ['greed_protocol', 'lucky_coin'],
        name: '财富女神',
        desc: '芯片掉落 ×3',
        apply: (player) => { player.relicFlags.wealthGod = true; },
    },
    {
        relics: ['antimatter_engine', 'bloodrage'],
        name: '毁灭轨迹',
        desc: '移动伤害翻倍',
        apply: (player) => { player.relicFlags.destructionTrail = true; },
    },
    {
        relics: ['overload_core', 'explosive_blood'],
        name: '活体炸弹',
        desc: '受伤时爆炸范围和伤害 +100%',
        apply: (player) => { player.relicFlags.livingBomb = true; },
    },
    {
        relics: ['echo_chip', 'critical_mass'],
        name: '连锁反应',
        desc: '双击也会触发范围伤害',
        apply: (player) => { player.relicFlags.chainReaction = true; },
    },
];

/**
 * 检查并应用遗物协同
 */
function checkRelicSynergies(player) {
    if (!player.relics) return;
    const ownedIds = player.relics.map(r => r.id);

    for (const synergy of RELIC_SYNERGIES) {
        // 检查是否拥有所有需要的遗物
        if (synergy.relics.every(id => ownedIds.includes(id))) {
            // 检查是否已经应用过
            const key = `synergy_${synergy.relics.join('_')}`;
            if (!player.relicFlags[key]) {
                player.relicFlags[key] = true;
                synergy.apply(player);
                // 提示文字
                if (player.game) {
                    player.game.spawnDamageNumber(
                        player.x, player.y - 60,
                        `⚡ ${synergy.name}!`, '#ff00ff'
                    );
                }
            }
        }
    }
}

/**
 * 从遗物池中随机取 n 个
 */
function getRandomRelics(player, n = 1, { automatic = false } = {}) {
    const owned = player.relics || [];
    const available = RELIC_DEFS.filter(r => !owned.find(o => o.id === r.id) && (!automatic || !r.requiresChoice));
    const result = [];
    const pool = [...available];
    for (let i = 0; i < n && pool.length > 0; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        result.push(pool.splice(idx, 1)[0]);
    }
    return result;
}

/**
 * 授予玩家遗物
 */
function grantRelic(player, relic) {
    if (!player.relics) player.relics = [];
    if (!player.relicFlags) player.relicFlags = {};
    if (player.relics.length >= 3) return false;

    player.relics.push(relic);
    relic.apply(player);

    // 检查协同
    checkRelicSynergies(player);

    return true;
}

/**
 * 血怒伤害倍率
 */
function getBloodrageMult(player) {
    if (!player.relicFlags || !player.relicFlags.bloodrage) return 1;
    const ratio = player.hp / player.maxHp;
    return 1 + (1 - ratio) * 1.5; // 最大 ×2.5 at 0% HP
}

/**
 * 暴走模块连杀加成
 */
function getFrenzyMult(player) {
    if (!player.relicFlags || !player.relicFlags.frenzyModule) return 1;
    const combo = (player.game && player.game.killCombo) || 0;
    return 1 + Math.min(combo * 0.02, 0.5); // 最高 +50%
}

/**
 * 时间碎片攻速加成
 */
function getTimeShardMult(player) {
    if (!player.relicFlags || !player.relicFlags.timeShard) return 1;
    if ((player.stillTime || 0) >= 2) return 3;
    return 1;
}

module.exports = {
    RELIC_DEFS,
    RELIC_SYNERGIES,
    grantRelic,
    getBloodrageMult,
    getFrenzyMult,
    getTimeShardMult,
    getRandomRelics,
    checkRelicSynergies,
};
