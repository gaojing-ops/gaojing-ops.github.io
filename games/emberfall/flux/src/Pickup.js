const { drawPickup } = require('./Renderer');
const { fastSin, fastCos } = require('./MathLUT');
const { sfxGem } = require('./SFX');
const { useEvolutionCore, checkEvolutions, EVOLUTION_RECIPES, UNION_RECIPES } = require('./Evolution');

// 模块级常量，避免每帧每拾取物重建数组
const _MAGNETIC_ITEMS = new Set(['magnet', 'bomb', 'potion', 'evolution_core']);
const _BLOCKED_ITEMS = new Set(['magnet', 'bomb', 'potion', 'shield_orb', 'xp_orb', 'lucky_coin', 'heal_shrine', 'power_shrine', 'speed_shrine']);
// 不播放收集音效的拾取物类型
const _NO_GEM_SFX = new Set(['trap', 'grass', 'merchant', 'teleporter']);

const TYPES = {
    magnet: { color: '#4444ff', radius: 8, label: '🧲' },
    bomb: { color: '#000000', radius: 10, label: '💣' },
    potion: { color: '#ff4444', radius: 8, label: '🍗' },
    chest: { color: '#ffcc00', radius: 12, label: '🎁' },
    evolution_core: { color: '#ff00ff', radius: 10, label: '💎' },

    // ═══ 新增地图互动元素 ═══
    weapon_altar: { color: '#00ffcc', radius: 15, label: '⚔️' },  // 武器祭坛
    merchant: { color: '#ffcc00', radius: 18, label: '🏪' },      // 流浪商人
    grass: { color: '#22aa22', radius: 25, label: '' },          // 隐藏草丛
    teleporter: { color: '#aa44ff', radius: 12, label: '🌀' },   // 传送门

    // ═══ 新地图元素 ═══
    heal_shrine: { color: '#44ff88', radius: 14, label: '💗' },   // 治疗神殿
    power_shrine: { color: '#ff4444', radius: 14, label: '⚡' },  // 力量神殿
    speed_shrine: { color: '#44aaff', radius: 14, label: '💨' },  // 速度神殿
    shield_orb: { color: '#88aaff', radius: 10, label: '🛡️' },    // 护盾球
    xp_orb: { color: '#ffcc00', radius: 8, label: '✨' },         // 经验球（大）
    lucky_coin: { color: '#ffdd00', radius: 8, label: '🪙' },     // 幸运币
    trap: { color: '#ff0000', radius: 20, label: '⚠️' },          // 陷阱
};

class Pickup {
    constructor(game, x, y, type, opts = {}) {
        this.game = game;
        this.x = x; this.y = y;
        this.type = type;
        this.data = TYPES[type] || TYPES.potion;
        this.active = true;
        this.radius = this.data.radius;
        this.timer = 30; // 30s lifetime
        this.opts = opts; // 额外选项，如进化核心对应的武器
        this._collectCooldown = 0; // 持久型拾取物的交互冷却（秒）

        // Chests, evolution cores, and map elements don't expire
        if (['chest', 'evolution_core', 'weapon_altar', 'merchant', 'grass', 'teleporter',
            'heal_shrine', 'power_shrine', 'speed_shrine', 'shield_orb', 'xp_orb', 'lucky_coin', 'trap'].includes(type)) {
            this.timer = 99999;
        }
    }

    update(dt) {
        const p = this.game.player;
        const dx = p.x - this.x;
        const dy = p.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 冷却递减
        if (this._collectCooldown > 0) this._collectCooldown -= dt;

        // 磁性物品被吸引
        if (_MAGNETIC_ITEMS.has(this.type) && dist < p.pickup && dist > 1) {
            const mag = 400 * (1 - dist / p.pickup);
            this.x += (dx / dist) * mag * dt;
            this.y += (dy / dist) * mag * dt;
        }

        // 收集检测（冷却中不触发）
        const _noPickup = this.game.curseNoPickup && _BLOCKED_ITEMS.has(this.type);
        if (dist < p.radius + this.radius && this._collectCooldown <= 0 && !_noPickup) {
            this._collect();
        }

        // 草丛特殊逻辑：玩家在草丛中敌人丢失目标
        if (this.type === 'grass' && dist < this.radius) {
            p.inGrass = true;
        }

        this.timer -= dt;
        if (this.timer <= 0) this.active = false;
    }

    _collect() {
        this.active = false;
        const p = this.game.player;

        switch (this.type) {
            case 'magnet':
                // Pull all gems
                for (const g of this.game.gems) {
                    if (g.active) g.magnetized = true;
                }
                this.game.spawnDamageNumber(p.x, p.y - 30, 'MAGNET!', '#4444ff');
                break;
            case 'bomb': {
                // 范围爆破：震退周围 250px 内敌人并击破贴身最多 16 只怪，不再清空全屏
                const innerSq = 160 * 160;
                const blastR = 250;
                const blastSq = blastR * blastR;
                const blastDmg = 75 * (p.might || 1);
                let lethalHits = 0;
                for (const e of this.game.enemies) {
                    if (!e.active) continue;
                    const edx = e.x - p.x;
                    const edy = e.y - p.y;
                    const dSq = edx * edx + edy * edy;
                    if (dSq < blastSq) {
                        const d = Math.sqrt(dSq) || 1;
                        const resist = e.knockbackResist || 0;
                        e.knockbackVx = (edx / d) * 300 * (1 - resist);
                        e.knockbackVy = (edy / d) * 300 * (1 - resist);
                        if (dSq < innerSq && lethalHits < 16) {
                            lethalHits++;
                            e.takeDamage(blastDmg);
                        } else if (e.hp > 2) {
                            e.takeDamage(Math.min(e.hp - 1, blastDmg * 0.4));
                        }
                    }
                }
                this.game.radiationPulse = { x: p.x, y: p.y, r: blastR, a: 0.8, color: '#ff8844' };
                this.game.shakeAmount = 8;
                this.game.shakeDuration = 0.35;
                this.game.spawnDamageNumber(p.x, p.y - 30, '烈焰爆破!', '#ffaa44');
                break;
            }
            case 'potion':
                // Heal (诅咒: 禁止回血时无效)
                if (this.game.curseNoHeal) {
                    this.game.spawnDamageNumber(p.x, p.y - 30, '回血被封锁!', '#ff4444');
                } else {
                    p.hp = Math.min(p.maxHp, p.hp + 30);
                    this.game.spawnDamageNumber(p.x, p.y - 30, '+30 HP', '#00ff00');
                }
                break;
            case 'chest':
                // Give chest reward (Gold/Upgrade)
                this.game.triggerChest();
                break;
            case 'evolution_core':
                // 解锁一个可进化的武器
                const weaponId = this.opts.weaponId;
                const isUnion = this.opts.isUnion;
                if (weaponId) {
                    useEvolutionCore(weaponId, p);
                    const recipe = isUnion ? UNION_RECIPES[weaponId] : EVOLUTION_RECIPES[weaponId];
                    const weaponName = recipe ? recipe.resultName : weaponId;
                    this.game.spawnDamageNumber(p.x, p.y - 30, `💎 ${weaponName}`, '#ff00ff');
                    this.game.shakeAmount = 4;
                    this.game.shakeDuration = 0.2;
                    // 粒子效果
                    if (this.game.particles) {
                        this.game.particles.emit(p.x, p.y, { count: 15, speed: 100, life: 0.5, color: '#ff00ff', size: 4 });
                    }
                }
                break;
            case 'weapon_altar':
                // 武器祭坛：获得一个随机武器
                this._giveRandomWeapon();
                break;
            case 'merchant':
                // 流浪商人：随机奖励（消耗金币，价格基于游戏时间）
                this._merchantTrade();
                this._collectCooldown = 3; // 3秒冷却防止连续触发
                break;
            case 'teleporter':
                // 裂隙法阵：付与相位疾行与短暂无敌，并震退贴身怪物（避免镜头瞬移导致全屏怪物突兀跳变）
                this.game.playerInvincible = Math.max(this.game.playerInvincible || 0, 2.5);
                if (!this.game._speedBurst) {
                    this.game._speedBurst = { timer: 4, speedBonus: 0.35 };
                    p.bonusSpeed = (p.bonusSpeed || 0) + 0.35;
                } else {
                    this.game._speedBurst.timer = Math.max(this.game._speedBurst.timer, 4);
                }
                for (const e of this.game.enemies) {
                    if (!e.active) continue;
                    const edx = e.x - p.x;
                    const edy = e.y - p.y;
                    const edSq = edx * edx + edy * edy;
                    if (edSq < 180 * 180 && edSq > 0.01) {
                        const ed = Math.sqrt(edSq);
                        e.knockbackVx = (edx / ed) * 280;
                        e.knockbackVy = (edy / ed) * 280;
                    }
                }
                this.game.spawnDamageNumber(p.x, p.y - 30, '🌀 裂隙相位! 疾行无敌', '#aa44ff');
                if (this.game.particles) {
                    this.game.particles.emit(p.x, p.y, { count: 20, speed: 150, life: 0.4, color: '#aa44ff', size: 5 });
                }
                break;
            case 'grass':
                // 草丛不消失，只是标记
                this.active = true;
                this._collectCooldown = 1; // 草丛 1 秒冷却（仅防止音效重复播放）
                break;

            // ═══ 新地图元素效果 ═══
            case 'heal_shrine':
                // 治疗神殿：回复50%生命
                const healAmount = Math.floor(p.maxHp * 0.5);
                p.hp = Math.min(p.maxHp, p.hp + healAmount);
                p.totalHealed += healAmount;
                this.game.spawnDamageNumber(p.x, p.y - 40, `💗 +${healAmount} HP`, '#44ff88');
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 25, speed: 80, life: 0.5, color: '#44ff88', size: 4 });
                }
                break;

            case 'power_shrine':
                // 力量神殿：永久+10%伤害
                p.bonusMight += 0.1;
                this.game.spawnDamageNumber(p.x, p.y - 40, '⚡ 伤害+10%', '#ff4444');
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 20, speed: 100, life: 0.4, color: '#ff4444', size: 4 });
                }
                break;

            case 'speed_shrine':
                // 速度神殿：永久+15%移速
                p.bonusSpeed += 0.15;
                this.game.spawnDamageNumber(p.x, p.y - 40, '💨 移速+15%', '#44aaff');
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 20, speed: 100, life: 0.4, color: '#44aaff', size: 4 });
                }
                break;

            case 'shield_orb':
                // 护盾球：获得临时护盾
                p.shieldBoost = (p.shieldBoost || 0) + 30;
                this.game.spawnDamageNumber(p.x, p.y - 40, '🛡️ +30 护盾', '#88aaff');
                break;

            case 'xp_orb':
                // 大经验球：获得大量经验
                const xpGain = 100 + Math.floor(this.game.time / 30) * 20;
                p.gainXp(xpGain);
                this.game.spawnDamageNumber(p.x, p.y - 40, `✨ +${xpGain} XP`, '#ffcc00');
                break;

            case 'lucky_coin':
                // 幸运币：增加暴击率
                p.luckyChance = (p.luckyChance || 0) + 0.05;
                this.game.spawnDamageNumber(p.x, p.y - 40, '🪙 暴击+5%', '#ffdd00');
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 15, speed: 60, life: 0.3, color: '#ffdd00', size: 3 });
                }
                break;

            case 'trap':
                // 陷阱：造成伤害但有概率获得奖励
                const dmg = 15 + Math.floor(this.game.time / 60) * 2;
                p.takeDamage(dmg);
                if (Math.random() < 0.5) {
                    // 50%概率获得奖励
                    const reward = Math.random();
                    if (reward < 0.5) {
                        p.gainXp(50);
                        this.game.spawnDamageNumber(p.x, p.y - 60, '✨ +50 XP', '#ffcc00');
                    } else {
                        p.bonusMight += 0.05;
                        this.game.spawnDamageNumber(p.x, p.y - 60, '⚡ 伤害+5%', '#ff4444');
                    }
                }
                this.game.shakeAmount = 5;
                this.game.shakeDuration = 0.15;
                break;
        }
        if (!_NO_GEM_SFX.has(this.type)) sfxGem();
    }

    _giveRandomWeapon() {
        const p = this.game.player;
        const { WEAPON_DEFS } = require('./Weapons');

        // 找出玩家还没有的基础武器（排除进化和融合武器）
        const ownedIds = new Set(p.weapons.map(w => w.id));
        const availableWeapons = Object.keys(WEAPON_DEFS).filter(id => {
            if (ownedIds.has(id)) return false;
            const def = WEAPON_DEFS[id];
            if (def.evolved || def.isFusion) return false;
            return true;
        });

        if (availableWeapons.length > 0 && p.weapons.length < 6) {
            const weaponId = availableWeapons[Math.floor(Math.random() * availableWeapons.length)];
            const { Weapon } = require('./Weapons');
            p.weapons.push(new Weapon(this.game, weaponId));
            const def = WEAPON_DEFS[weaponId];
            this.game.spawnDamageNumber(p.x, p.y - 40, `⚔️ ${def.name}`, def.color);
            if (this.game.particles) {
                this.game.particles.emit(this.x, this.y, { count: 20, speed: 100, life: 0.4, color: '#00ffcc', size: 4 });
            }
        } else {
            // 已满或没有新武器，给经验
            p.gainXp(50);
            this.game.spawnDamageNumber(p.x, p.y - 40, '+50 XP', '#88ff88');
        }
    }

    _merchantTrade() {
        const p = this.game.player;
        // 商人不消失，可以重复交互
        this.active = true;

        // 随机给予效果（简化版，不消耗金币）
        const roll = Math.random();
        if (roll < 0.4) {
            // 回血
            const heal = 30 + Math.floor(this.game.time / 60) * 5;
            p.hp = Math.min(p.maxHp, p.hp + heal);
            this.game.spawnDamageNumber(p.x, p.y - 40, `+${heal} HP`, '#00ff00');
        } else if (roll < 0.7) {
            // 经验
            const xp = 30 + Math.floor(this.game.time / 60) * 3;
            p.gainXp(xp);
            this.game.spawnDamageNumber(p.x, p.y - 40, `+${xp} XP`, '#ffcc00');
        } else {
            // 随机被动提升
            const stats = ['bonusMight', 'bonusSpeed', 'bonusArmor', 'bonusArea'];
            const stat = stats[Math.floor(Math.random() * stats.length)];
            const amount = stat === 'bonusArmor' ? 1 : 0.05;
            p[stat] += amount;
            this.game.spawnDamageNumber(p.x, p.y - 40, '🏪 增强!', '#ffcc00');
        }

        if (this.game.particles) {
            this.game.particles.emit(this.x, this.y, { count: 15, speed: 80, life: 0.3, color: '#ffcc00', size: 3 });
        }
    }

    draw(ctx) {
        drawPickup(ctx, this.x, this.y, this.type, this.active ? 1 : 0);
    }
}

module.exports = Pickup;
