const { drawBat, drawSkeleton, drawGhost, drawDataWorm, drawSwarmDrone,
    drawFrostWisp, drawSlimeGlob, drawCyberSpider, drawGlitchEntity,
    drawFrostTitan, drawPlagueSource,
    drawFireFly, drawCrawler, drawWarpMite, drawSpiralCaster, drawIronGolem, drawLootGoblin,
    drawFrozenEffect, drawPoisonedEffect } = require('./Renderer');
const { fastSin, fastCos } = require('./MathLUT');
const spriteCache = require('./SpriteCache');
const Art = require('./Art');

// ─── 精英词缀定义 ───
const AFFIX_DEFS = {
    // 护盾：额外血量护盾
    shielded: {
        name: '护盾',
        color: '#8888ff',
        desc: '拥有额外护盾',
        apply: (enemy) => {
            enemy.shield = enemy.maxHp * 0.5;
        },
    },
    // 狂暴：低血量时攻速+50%，移速+30%
    berserker: {
        name: '狂暴',
        color: '#ff4444',
        desc: '低血量时伤害+50%',
        apply: (enemy) => {
            enemy.berserkerAffix = true;
        },
    },
    // 分裂：死亡分裂成2个小怪
    splitting: {
        name: '分裂',
        color: '#aa44ff',
        desc: '死亡时分裂',
        apply: (enemy) => {
            enemy.affix = 'splitting';
        },
    },
    // 隐身：周期性隐身
    invisible: {
        name: '隐身',
        color: '#44aaff',
        desc: '周期性隐身',
        apply: (enemy) => {
            enemy.invisibleAffix = true;
            enemy.invisibleTimer = 3;
            enemy.isInvisible = false;
        },
    },
    // 再生：持续回复HP
    regenerating: {
        name: '再生',
        color: '#44ff44',
        desc: '持续恢复HP',
        apply: (enemy) => {
            enemy.regeneratingAffix = true;
        },
    },
    // 加速：移速+80%
    swift: {
        name: '加速',
        color: '#44ffff',
        desc: '移动速度+80%',
        apply: (enemy) => {
            enemy.speed *= 1.8;
        },
    },
    // 自爆：死亡时爆炸
    explosive: {
        name: '自爆',
        color: '#ff8844',
        desc: '死亡时爆炸',
        apply: (enemy) => {
            enemy.explosiveAffix = true;
            enemy.explosionRadius = 100;
            enemy.explosionDamage = enemy.damage * 2;
        },
    },
    // 传送：周期性瞬移
    teleporting: {
        name: '传送',
        color: '#ff44ff',
        desc: '周期性传送',
        apply: (enemy) => {
            enemy.teleportAffix = true;
            enemy.teleportTimer = 4;
        },
    },
    // 巨型：体型+50%，血量+100%
    giant: {
        name: '巨型',
        color: '#ffcc00',
        desc: '巨型化',
        apply: (enemy) => {
            enemy.radius *= 1.5;
            enemy.maxHp *= 2;
            enemy.hp = enemy.maxHp;
        },
    },
    // 吸血：攻击回复HP
    vampiric: {
        name: '吸血',
        color: '#cc0044',
        desc: '攻击回复HP',
        apply: (enemy) => {
            enemy.vampiricAffix = true;
        },
    },
};

// 随机选择词缀（可多选）
function rollAffixes(enemy, count = 1, exclude = []) {
    const available = Object.keys(AFFIX_DEFS).filter(a => !exclude.includes(a));
    const selected = [];
    for (let i = 0; i < count && available.length > 0; i++) {
        const idx = Math.floor(Math.random() * available.length);
        selected.push(available.splice(idx, 1)[0]);
    }
    return selected;
}

function drawCharger(ctx, x, y, size) {
    const r = size / 1.3;
    ctx.save();
    ctx.translate(x, y);
    // 像一只厚重的犀牛甲虫
    ctx.fillStyle = '#885544';
    ctx.beginPath();
    // 躯干
    ctx.ellipse(0, 0, r, r * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // 前方的大角
    ctx.fillStyle = '#ffccaa';
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.8);
    ctx.lineTo(r * 0.4, -r * 0.8);
    ctx.lineTo(0, -r * 1.8);
    ctx.fill();
    ctx.restore();
}

function drawShieldPriest(ctx, x, y, size) {
    const r = size / 1.3;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#ffbbbb';
    ctx.beginPath();
    // 画一个类似主教帽子的形状
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.8, r);
    ctx.lineTo(-r * 0.8, r);
    ctx.fill();

    // 闪烁的核心
    ctx.fillStyle = '#ffff00';
    // 这里没法直接拿到 time，直接使用快速闪烁或者移除闪烁
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(0, r * 0.2, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
}

const TYPES = {
    // ═══ 基础敌人（追击型） ═══
    Bat: { hp: 15, speed: 90, radius: 10, damage: 5, xp: 3, draw: drawBat },
    Skeleton: { hp: 45, speed: 60, radius: 12, damage: 10, xp: 10, draw: drawSkeleton },
    Ghost: { hp: 30, speed: 50, radius: 11, damage: 12, xp: 8, draw: drawGhost },
    DataWorm: { hp: 90, speed: 35, radius: 14, damage: 15, xp: 15, draw: drawDataWorm },

    // ═══ 快速群怪（低血量，大量刷新） ═══
    SwarmDrone: { hp: 6, speed: 170, radius: 6, damage: 3, xp: 2, draw: drawSwarmDrone },
    Hornet: { hp: 3, speed: 250, radius: 5, damage: 3, xp: 1, draw: drawSwarmDrone },
    // 新增群怪
    FireFly: { hp: 3, speed: 220, radius: 4, damage: 3, xp: 1, draw: drawFireFly },
    Crawler: { hp: 15, speed: 160, radius: 7, damage: 5, xp: 3, draw: drawCrawler, deathEffect: 'miniPoison' },
    WarpMite: { hp: 9, speed: 100, radius: 6, damage: 7, xp: 4, draw: drawWarpMite, behavior: 'warper' },

    // ═══ 远程敌人（发射子弹，需要躲避） ═══
    Turret: { hp: 60, speed: 30, radius: 12, damage: 10, xp: 15, draw: drawSkeleton, behavior: 'shooter', shootInterval: 1.5, bulletSpeed: 160 },
    LaserDrone: { hp: 36, speed: 55, radius: 10, damage: 8, xp: 12, draw: drawGlitchEntity, behavior: 'shooter', shootInterval: 1.2, bulletSpeed: 220 },
    ScatterGun: { hp: 75, speed: 25, radius: 13, damage: 6, xp: 18, draw: drawDataWorm, behavior: 'shooter', shootInterval: 2.0, bulletSpeed: 150, bulletCount: 3 },
    // 新增射击怪
    SpiralCaster: { hp: 60, speed: 40, radius: 12, damage: 8, xp: 18, draw: drawSpiralCaster, behavior: 'spiral_shooter', shootInterval: 2.5, bulletSpeed: 120, bulletCount: 6 },
    MortarDrone: { hp: 90, speed: 25, radius: 13, damage: 20, xp: 22, draw: drawSkeleton, behavior: 'mortar', shootInterval: 3.0 },
    ChainGunner: { hp: 54, speed: 50, radius: 11, damage: 5, xp: 15, draw: drawGlitchEntity, behavior: 'burst_shooter', shootInterval: 2.0, bulletSpeed: 200, burstCount: 5 },

    // ═══ 中型敌人（特殊行为） ═══
    FrostWisp: { hp: 30, speed: 60, radius: 11, damage: 10, xp: 8, draw: drawFrostWisp, deathEffect: 'frostExplosion' },
    SlimeGlob: { hp: 60, speed: 40, radius: 13, damage: 12, xp: 12, draw: drawSlimeGlob, deathEffect: 'poisonPool' },
    CyberSpider: { hp: 36, speed: 100, radius: 10, damage: 12, xp: 10, draw: drawCyberSpider, behavior: 'jumper' },
    GlitchEntity: { hp: 105, speed: 50, radius: 14, damage: 15, xp: 18, draw: drawGlitchEntity, behavior: 'teleporter' },

    // ═══ 坦克敌人（高血量慢速） ═══
    FrostTitan: { hp: 450, speed: 15, radius: 20, damage: 28, xp: 40, draw: drawFrostTitan, knockbackResist: 0.8 },
    PlagueSource: { hp: 600, speed: 10, radius: 22, damage: 20, xp: 50, draw: drawPlagueSource, behavior: 'spawner', knockbackResist: 0.9 },
    // 新增坦克
    IronGolem: { hp: 360, speed: 12, radius: 22, damage: 35, xp: 50, draw: drawIronGolem, deathEffect: 'split', knockbackResist: 0.85 },
    RoyalSlime: { hp: 1200, speed: 8, radius: 26, damage: 35, xp: 80, draw: drawSlimeGlob, deathEffect: 'royal_split', knockbackResist: 0.9 },
    VoidLeech: { hp: 180, speed: 30, radius: 14, damage: 12, xp: 30, draw: drawGhost, behavior: 'leech', knockbackResist: 0.5 },

    // ═══ 精英小怪 ═══
    Assassin: { hp: 36, speed: 180, radius: 8, damage: 18, xp: 15, draw: drawGhost, behavior: 'jumper' },
    Bomber: { hp: 45, speed: 70, radius: 12, damage: 35, xp: 20, draw: drawSlimeGlob, deathEffect: 'explosion' },
    ShieldBearer: { hp: 135, speed: 40, radius: 14, damage: 12, xp: 25, draw: drawDataWorm, hasShield: true },
    Charger: { hp: 160, speed: 40, radius: 16, damage: 30, xp: 30, draw: drawCharger, behavior: 'charger', knockbackResist: 0.95 },

    // ═══ 召唤物 ═══
    MiniSpider: { hp: 9, speed: 120, radius: 5, damage: 5, xp: 2, draw: drawCyberSpider },
    ToxicBlob: { hp: 15, speed: 60, radius: 7, damage: 7, xp: 3, draw: drawSlimeGlob, deathEffect: 'miniPoison' },

    // ═══ 特殊敌人 ═══
    Healer: { hp: 75, speed: 50, radius: 11, damage: 8, xp: 25, draw: drawFrostWisp, behavior: 'healer' },
    ShieldPriest: { hp: 120, speed: 30, radius: 14, damage: 0, xp: 35, draw: drawShieldPriest, behavior: 'priest', knockbackResist: 0.9 },
    LootGoblin: { hp: 500, speed: 200, radius: 14, damage: 0, xp: 0, draw: drawLootGoblin, behavior: 'flee' },
    Splitter: { hp: 60, speed: 80, radius: 10, damage: 10, xp: 12, draw: drawSwarmDrone, deathEffect: 'split' },
    Phantom: { hp: 45, speed: 100, radius: 10, damage: 15, xp: 18, draw: drawGhost, behavior: 'teleporter', teleportInterval: 3 },
};

class Enemy {
    constructor(game, x, y, type, opts = {}) {
        const t = TYPES[type] || TYPES.Bat;
        this.game = game;
        this.type = type;
        this.x = x; this.y = y;

        // Dynamic Difficulty Multipliers
        const hpMult = opts.hpMult || 1;
        const dmgMult = opts.dmgMult || 1;

        this.hp = Math.floor(t.hp * hpMult);
        this.maxHp = this.hp;
        this.speed = t.speed;
        this.radius = t.radius;
        this.damage = Math.ceil(t.damage * dmgMult);
        this.xpValue = t.xp;
        this._draw = t.draw;
        this.active = true;
        this.flashTimer = 0;

        // Apply Curse HP Mult (Global)
        if (game.curseEnemyHpMult && game.curseEnemyHpMult > 1) {
            this.hp = Math.floor(this.hp * game.curseEnemyHpMult);
            this.maxHp = this.hp;
        }

        // 精英词缀
        this.isElite = false;
        this.affix = null;
        this.affixes = []; // 支持多词缀
        this.shield = 0;

        // 词缀相关状态
        this.berserkerAffix = false;
        this.invisibleAffix = false;
        this.invisibleTimer = 0;
        this.isInvisible = false;
        this.regeneratingAffix = false;
        this.hasRageAura = false;
        this.explosiveAffix = false;
        this.explosionRadius = 0;
        this.explosionDamage = 0;
        this.teleportAffix = false;
        this.vampiricAffix = false;

        // Status effects
        this.frozen = 0;
        this.poisoned = 0;
        this.poisonStacks = 0;
        this.poisonTickTimer = 0;
        this.slowed = 0;
        this.slowAmount = 1;

        // 燃烧状态（协同效果）
        this.burning = 0;
        this.burnDamage = 0;
        this.burnTickTimer = 0;

        // Invincibility (from Priest)
        this.invincibleTimer = 0;

        // Special behaviors
        this.behavior = t.behavior || null;
        this.deathEffect = t.deathEffect || null;
        this.jumpTimer = 0;
        this.teleportTimer = t.teleportInterval || 2;

        // Shooter behavior
        this._shootInterval = t.shootInterval || 2;
        this.shootTimer = this._shootInterval + Math.random(); // 随机初始延迟
        this.bulletSpeed = t.bulletSpeed || 200;
        this.bulletCount = t.bulletCount || 1;
        this.burstCount = t.burstCount || 1;

        // Burst shooter state
        this._burstState = null; // { remaining, angle, timer }

        // Spawner behavior
        this.spawnTimer = 3;

        // ═══ Knockback (micro-knockback 系统) ═══
        this.knockbackVx = 0;
        this.knockbackVy = 0;
        this.knockbackResist = t.knockbackResist || 0; // 0=无抵抗 1=完全免疫

        // 动态行为状态（与 reset() 同步）
        this._chargeState = null;
        this._chargeTimer = 0;
        this._chargeAngle = 0;
        this.vx = 0;
        this.vy = 0;
        this.warpTimer = 0;
        this.fleeTimer = 0;
        this.healTimer = 0;
        this.leechTimer = 0;
        this._spiralAngle = 0;
        this._sfxToggle = false;
        this.color = null;
        this._affixColors = null;
        this._isBounty = false;
        this._priestLinked = false;
    }

    // All applications and death/chain transfers share the existing 50-stack
    // poison limit. Capping only DOT left synergy bursts growing exponentially.
    get poisonStacks() { return this._poisonStacks || 0; }
    set poisonStacks(value) {
        const stacks = Number(value);
        this._poisonStacks = Number.isNaN(stacks) ? 0 : Math.max(0, Math.min(50, stacks));
    }

    /**
     * 就地重置所有属性（对象池复用，绝对禁止 new）
     * 必须与 constructor 完全同步
     */
    reset(game, x, y, type, opts = {}) {
        const t = TYPES[type] || TYPES.Bat;
        this.game = game;
        this.type = type;
        this.x = x; this.y = y;

        const hpMult = opts.hpMult || 1;
        const dmgMult = opts.dmgMult || 1;

        this.hp = Math.floor(t.hp * hpMult);
        this.maxHp = this.hp;
        this.speed = t.speed;
        this.radius = t.radius;
        this.damage = Math.ceil(t.damage * dmgMult);
        this.xpValue = t.xp;
        this._draw = t.draw;
        this.active = true;
        this.flashTimer = 0;

        if (game.curseEnemyHpMult && game.curseEnemyHpMult > 1) {
            this.hp = Math.floor(this.hp * game.curseEnemyHpMult);
            this.maxHp = this.hp;
        }

        // 精英词缀 — 重置
        this.isElite = false;
        this.affix = null;
        this.affixes.length = 0; // 复用数组，清零不释放
        this.shield = 0;
        this._affixColors = null;

        // 词缀状态
        this.berserkerAffix = false;
        this.invisibleAffix = false;
        this.invisibleTimer = 0;
        this.isInvisible = false;
        this.regeneratingAffix = false;
        this.hasRageAura = false;
        this.explosiveAffix = false;
        this.explosionRadius = 0;
        this.explosionDamage = 0;
        this.teleportAffix = false;
        this.vampiricAffix = false;

        // 状态效果
        this.frozen = 0;
        this.poisoned = 0;
        this.poisonStacks = 0;
        this.poisonTickTimer = 0;
        this.slowed = 0;
        this.slowAmount = 1;
        this.burning = 0;
        this.burnDamage = 0;
        this.burnTickTimer = 0;

        this.invincibleTimer = 0;

        // 行为
        this.behavior = t.behavior || null;
        this.deathEffect = t.deathEffect || null;
        this.jumpTimer = 0;
        this.teleportTimer = t.teleportInterval || 2;

        // 射击
        this._shootInterval = t.shootInterval || 2;
        this.shootTimer = this._shootInterval + Math.random();
        this.bulletSpeed = t.bulletSpeed || 200;
        this.bulletCount = t.bulletCount || 1;
        this.burstCount = t.burstCount || 1;
        this._burstState = null;

        // 生成器
        this.spawnTimer = 3;

        // Knockback
        this.knockbackVx = 0;
        this.knockbackVy = 0;
        this.knockbackResist = t.knockbackResist || 0;

        // 动态行为状态 — 必须清除，防止对象池复用时残留
        this._chargeState = null;
        this._chargeTimer = 0;
        this._chargeAngle = 0;
        this.vx = 0;
        this.vy = 0;
        this.warpTimer = 0;
        this.fleeTimer = 0;
        this.healTimer = 0;
        this.leechTimer = 0;
        this._spiralAngle = 0;
        this._sfxToggle = false;
        this.color = null;

        // 清除赏金标记和牧师连接标记
        this._isBounty = false;
        this._priestLinked = false;
        this._affixColors = null;

        // 清理命中日志（如果有）
        if (this._hitLogW) { this._hitLogW.length = 0; this._hitLogT.length = 0; }

        return this;
    }

    // 应用精英词缀
    applyEliteAffixes(affixList) {
        this.isElite = true;
        this.affixes = affixList;
        // 缓存词缀颜色，避免每帧 draw 中 .map().filter()
        this._affixColors = [];
        for (const affixId of affixList) {
            const def = AFFIX_DEFS[affixId];
            if (def && def.apply) {
                def.apply(this);
            }
            if (def && def.color) {
                this._affixColors.push(def.color);
            }
        }
        // 精英基础加成
        this.maxHp *= 1.5;
        this.hp = this.maxHp;
        this.damage = Math.ceil(this.damage * 1.3);
        this.xpValue = Math.floor(this.xpValue * 2);
    }

    update(dt) {
        // ─── Status Effect Updates ───
        // Invincibility timer (from Priest)
        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;

        // Frozen: Cannot move
        const frozenThisFrame = this.frozen > 0;
        if (frozenThisFrame) {
            this.frozen -= dt;
            if (this.frozen < 0) this.frozen = 0;
        }

        // Poisoned: Damage over time
        if (this.poisoned > 0) {
            this.poisoned -= dt;
            this.poisonTickTimer -= dt;
            if (this.poisonTickTimer <= 0) {
                // Deal poison damage based on stacks (capped at 50)
                const cappedStacks = Math.min(this.poisonStacks, 50);
                const poisonDmg = cappedStacks * 2 * (1 + (this.game.player.bonusToxicDmg || 0));
                const dealt = Math.min(Math.max(0, this.hp), poisonDmg);
                this.game.player.totalDamage = (this.game.player.totalDamage || 0) + dealt;
                if (this.game._weaponDamageStats) this.game._weaponDamageStats.poison = (this.game._weaponDamageStats.poison || 0) + dealt;
                this.hp -= poisonDmg;
                this.game.spawnDamageNumber(this.x, this.y - this.radius, Math.ceil(poisonDmg), '#88ff00');
                this.poisonTickTimer = 0.5; // Tick every 0.5s
                this.flashTimer = 0.05;

                if (this.hp <= 0) {
                    this.die();
                    return;
                }
            }
        }

        // Slow effect
        if (this.slowed > 0) {
            this.slowed -= dt;
            if (this.slowed <= 0) {
                this.slowAmount = 1;
            }
        }

        // Burning effect (毒火协同)
        if (this.burning > 0) {
            this.burning -= dt;
            this.burnTickTimer -= dt;
            if (this.burnTickTimer <= 0 && this.burnDamage > 0) {
                this.burnTickTimer = 0.5;
                const burnDmg = this.burnDamage * 0.5;
                const dealtBurn = Math.min(Math.max(0, this.hp), burnDmg);
                this.game.player.totalDamage = (this.game.player.totalDamage || 0) + dealtBurn;
                if (this.game._weaponDamageStats) this.game._weaponDamageStats.burn = (this.game._weaponDamageStats.burn || 0) + dealtBurn;
                this.hp -= burnDmg;
                this.game.spawnDamageNumber(this.x, this.y - this.radius, Math.ceil(burnDmg), '#ff6600');
                this.flashTimer = 0.05;

                if (this.hp <= 0) {
                    this.die();
                    return;
                }
            }
            // 燃烧粒子效果
            if (this.game.particles && Math.random() < 0.15) {
                this.game.particles.emit(
                    this.x + (Math.random() - 0.5) * 10,
                    this.y - this.radius,
                    { count: 1, speed: 40, life: 0.3, color: '#ff6600', size: 2 }
                );
            }
        }

        if (frozenThisFrame) {
            if (this.flashTimer > 0) this.flashTimer -= dt;
            return; // Control stops movement and attacks, not poison/burn timers.
        }

        // ─── Movement ───
        const p = this.game.player;
        const dx = p.x - this.x;
        const dy = p.y - this.y;
        const dSq = dx * dx + dy * dy;
        const d = dSq > 0.01 ? Math.sqrt(dSq) : 0;

        // 草丛隐藏：玩家在草丛中时敌人随机游荡
        if (p.inGrass) {
            // 随机游荡
            const wanderAngle = Math.random() * Math.PI * 2;
            this.x += fastCos(wanderAngle) * this.speed * 0.3 * dt;
            this.y += fastSin(wanderAngle) * this.speed * 0.3 * dt;
            if (this.flashTimer > 0) this.flashTimer -= dt;
            return;
        }

        // Time rift speed
        let speedMult = 1;
        if (this.game.timeRift) speedMult = this.game.timeRift.speedMult;

        // Curse speed
        if (this.game.curseSpeedMult) speedMult *= this.game.curseSpeedMult;

        // Slow multiplier
        speedMult *= this.slowAmount;

        // Chill aura from player (复用已计算的距离 d)
        if (p.chillAuraRadius > 0 && d < p.chillAuraRadius) {
            speedMult *= 0.7; // 30% slow in chill aura
        }

        // ─── Special Behaviors ───
        if (this.behavior === 'jumper') {
            this.jumpTimer -= dt;
            if (this.jumpTimer <= 0) {
                // Jump toward player
                if (d > 1) {
                    const jumpDist = 80;
                    this.x += (dx / d) * jumpDist;
                    this.y += (dy / d) * jumpDist;
                }
                this.jumpTimer = 1.5 + Math.random(); // Random jump interval
            }
        }

        if (this.behavior === 'teleporter') {
            this.teleportTimer -= dt;
            if (this.teleportTimer <= 0) {
                // Random teleport near player
                const angle = Math.random() * Math.PI * 2;
                const dist = 100 + Math.random() * 100;
                this.x = p.x + fastCos(angle) * dist;
                this.y = p.y + fastSin(angle) * dist;
                this.teleportTimer = 2 + Math.random() * 2;
                // Visual effect
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 10, speed: 50, life: 0.3, color: '#00ffff' });
                }
            }
        }

        // ─── Shooter Behavior ───
        if (this.behavior === 'shooter') {
            this.shootTimer -= dt;
            if (this.shootTimer <= 0 && d > 50 && d < 400) {
                this.shootTimer = (this._shootInterval || 2);
                const angle = Math.atan2(dy, dx);

                // 发射子弹
                const bulletCount = this.bulletCount || 1;
                const spread = bulletCount > 1 ? 0.3 : 0;

                for (let i = 0; i < bulletCount; i++) {
                    const a = angle + (i - (bulletCount - 1) / 2) * spread;
                    this.game.spawnEnemyBullet(
                        this.x, this.y,
                        fastCos(a) * this.bulletSpeed,
                        fastSin(a) * this.bulletSpeed,
                        5, this.damage, 3, '#ff4444'
                    );
                }

                // 视觉
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 5, speed: 30, life: 0.2, color: '#ff4444' });
                }
            }
        }

        // ─── Warper Behavior（短距闪现） ───
        if (this.behavior === 'warper') {
            this.warpTimer = (this.warpTimer || 2) - dt;
            if (this.warpTimer <= 0 && d > 30) {
                this.warpTimer = 1.5 + Math.random();
                // 朝玩家方向闪现 40-80 像素
                const warpDist = 40 + Math.random() * 40;
                this.x += (dx / d) * warpDist;
                this.y += (dy / d) * warpDist;
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 6, speed: 40, life: 0.2, color: '#aa44ff' });
                }
            }
        }

        // ─── Spiral Shooter（螺旋弹幕） ───
        if (this.behavior === 'spiral_shooter') {
            this.shootTimer -= dt;
            if (this.shootTimer <= 0 && d > 50 && d < 400) {
                this.shootTimer = (this._shootInterval || 2.5);
                this._spiralAngle = (this._spiralAngle || 0) + 0.8; // 每次旋转偏移
                const count = this.bulletCount || 6;
                for (let i = 0; i < count; i++) {
                    const a = this._spiralAngle + (i / count) * Math.PI * 2;
                    this.game.spawnEnemyBullet(
                        this.x, this.y,
                        fastCos(a) * (this.bulletSpeed || 120),
                        fastSin(a) * (this.bulletSpeed || 120),
                        4, this.damage, 3.5, '#ff44aa'
                    );
                }
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 8, speed: 40, life: 0.3, color: '#ff44aa' });
                }
            }
        }

        // ─── Mortar（迫击炮：预瞄AOE） ───
        if (this.behavior === 'mortar') {
            this.shootTimer -= dt;
            if (this.shootTimer <= 0 && d > 80 && d < 500) {
                this.shootTimer = (this._shootInterval || 3.0);
                // 在玩家当前位置创建延迟爆炸
                const targetX = p.x + (Math.random() - 0.5) * 40;
                const targetY = p.y + (Math.random() - 0.5) * 40;
                // 预警标记
                this.game.mortarWarnings = this.game.mortarWarnings || [];
                this.game.mortarWarnings.push({
                    x: targetX, y: targetY,
                    radius: 60, damage: this.damage * 2,
                    timer: 1.5, // 1.5秒后爆炸
                    active: true, color: '#ff8844',
                });
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 3, speed: 20, life: 0.3, color: '#ff8844' });
                }
            }
        }

        // ─── Burst Shooter（连射） ───
        if (this.behavior === 'burst_shooter') {
            // 处理正在进行的连射
            if (this._burstState) {
                this._burstState.timer -= dt;
                if (this._burstState.timer <= 0 && this._burstState.remaining > 0) {
                    this._burstState.timer = 0.12;
                    this._burstState.remaining--;
                    const spread = (Math.random() - 0.5) * 0.1;
                    const a = this._burstState.angle + spread;
                    this.game.spawnEnemyBullet(
                        this.x, this.y,
                        fastCos(a) * (this.bulletSpeed || 200),
                        fastSin(a) * (this.bulletSpeed || 200),
                        4, this.damage, 2.5, '#ffaa44'
                    );
                    if (this._burstState.remaining <= 0) {
                        this._burstState = null;
                    }
                }
            } else {
                this.shootTimer -= dt;
                if (this.shootTimer <= 0 && d > 50 && d < 400) {
                    this.shootTimer = (this._shootInterval || 2.0);
                    const angle = Math.atan2(dy, dx);
                    this._burstState = {
                        remaining: this.burstCount || 5,
                        angle: angle,
                        timer: 0,
                    };
                }
            }
        }

        // ─── Charger (冲锋兽) ───
        if (this.behavior === 'charger') {
            const angle = Math.atan2(dy, dx);
            if (!this._chargeState) {
                // idle
                this.shootTimer -= dt;
                if (this.shootTimer <= 0 && d < 600 && d > 100) {
                    this._chargeState = 'aiming';
                    this._chargeTimer = 1.5; // 预瞄 1.5 秒
                    this._chargeAngle = angle;
                    this.speed = TYPES[this.type].speed * 0.1; // 极速减慢
                }
            } else if (this._chargeState === 'aiming') {
                this._chargeTimer -= dt;
                // 缓慢更新瞄准
                const angleDiff = angle - this._chargeAngle;
                // 归一化 angleDiff 到 -PI ~ PI
                let normDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
                this._chargeAngle += normDiff * dt * 2.5;

                if (this._chargeTimer <= 0) {
                    this._chargeState = 'dashing';
                    this._chargeTimer = 0.8; // 冲刺最多 0.8 秒或者撞墙
                    this.speed = TYPES[this.type].speed * 12; // 极高移速
                    // 改变方向朝向锁定的角度
                    this.vx = fastCos(this._chargeAngle);
                    this.vy = fastSin(this._chargeAngle);
                }
            } else if (this._chargeState === 'dashing') {
                this._chargeTimer -= dt;
                // 强制按刚才预定的角度直线无脑移动（受减速影响）
                this.x += this.vx * this.speed * speedMult * dt;
                this.y += this.vy * this.speed * speedMult * dt;

                // [BUG-13 FIX] 世界是无限地图，不能用视口宽高作为边界
                // 改为仅当冲刺计时器到期才进入晕眩
                if (this._chargeTimer <= 0) {
                    this._chargeState = 'stunned';
                    this._chargeTimer = 1.5; // 晕眩 1.5s
                    this.speed = 0;
                    this.game.shakeAmount = 8;
                    this.game.shakeDuration = 0.3;
                    if (this.game.particles) {
                        this.game.particles.emit(this.x, this.y, { count: 8, speed: 60, life: 0.5, color: '#ffccaa' });
                    }
                }
            } else if (this._chargeState === 'stunned') {
                this._chargeTimer -= dt;
                if (this._chargeTimer <= 0) {
                    this._chargeState = null;
                    this.shootTimer = 2.0;
                    this.speed = TYPES[this.type].speed;
                }
            }
        }

        // ─── Leech Behavior（吸血） ───
        if (this.behavior === 'leech') {
            this.leechTimer = (this.leechTimer || 0) - dt;
            if (this.leechTimer <= 0 && d < 120) {
                this.leechTimer = 1.0;
                const leechDmg = 3;
                p.takeDamage(leechDmg);
                this.hp = Math.min(this.maxHp, this.hp + leechDmg * 2);
                this.game.spawnDamageNumber(this.x, this.y - this.radius, `+${leechDmg * 2}`, '#cc44ff');
                if (this.game.particles) {
                    this.game.particles.emit(p.x, p.y, { count: 3, speed: 30, life: 0.3, color: '#cc44ff' });
                }
            }
        }

        // ─── Spawner Behavior ───
        if (this.behavior === 'spawner') {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0 && this.game.enemies.length < 180) {
                this.spawnTimer = 3 + Math.random() * 2;
                // 生成小怪
                const count = 2 + Math.floor(Math.random() * 2);
                for (let i = 0; i < count && this.game.enemies.length < 180; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = this.radius + 20;
                    const child = this.game._createEnemy(
                        this.x + fastCos(angle) * dist,
                        this.y + fastSin(angle) * dist,
                        'SlimeGlob'
                    );
                    child.hp *= 0.5;
                    child.maxHp = child.hp;
                    child.speed *= 1.5;
                    this.game.enemies.push(child);
                }
                // 视觉
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 10, speed: 60, life: 0.3, color: '#88ff00' });
                }
            }
        }

        // ─── Flee Behavior ───
        if (this.behavior === 'flee') {
            this.fleeTimer = (this.fleeTimer || 20) - dt; // 存在20秒后自动消失
            if (this.fleeTimer <= 0) {
                this.active = false;
                if (this.game.particles) this.game.particles.emit(this.x, this.y, { count: 30, speed: 200, life: 0.6, color: '#ffdd44' });
            } else if (d < 600) {
                // 逃脱逻辑: 反向全速移动
                this.x -= (dx / Math.max(d, 1)) * this.speed * speedMult * dt;
                this.y -= (dy / Math.max(d, 1)) * this.speed * speedMult * dt;
                // 掉落金币/视觉提示
                if (Math.random() < 0.1) this.game.spawnDamageNumber(this.x, this.y + 20, '$', '#ffcc00');
            }
            return; // 逃跑行为覆盖默认移动，但不影响碰撞、异常状态等
        }

        // ─── Healer Behavior ───
        if (this.behavior === 'healer') {
            this.healTimer = (this.healTimer || 0) - dt;
            if (this.healTimer <= 0) {
                this.healTimer = 2; // 每2秒治疗一次
                const healRange = 150;
                const healRangeSq = healRange * healRange;
                for (const e of this.game.enemies) {
                    if (e === this || !e.active || e.hp >= e.maxHp) continue;
                    const edx = e.x - this.x;
                    const edy = e.y - this.y;
                    if (edx * edx + edy * edy < healRangeSq) {
                        e.hp = Math.min(e.maxHp, e.hp + 5);
                        // 治疗视觉
                        this.game.spawnDamageNumber(e.x, e.y - e.radius, '+5', '#44ff44');
                    }
                }
                // 治疗光环
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 8, speed: 40, life: 0.4, color: '#44ff44', size: 3 });
                }
            }
        }

        // ─── Priest Behavior（群体无敌） ───
        if (this.behavior === 'priest') {
            // 每帧为周围固定范围内的所有敌人施加极短的无敌 buff (0.2s)
            // 离开范围的敌人能迅速被解除无敌
            const auraRadius = 160;
            const auraRadiusSq = auraRadius * auraRadius;
            for (const e of this.game.enemies) {
                if (e.active && e !== this) {
                    const edx = e.x - this.x;
                    const edy = e.y - this.y;
                    if (edx * edx + edy * edy < auraRadiusSq) {
                        e.invincibleTimer = 0.2; // 极短闪躲
                        // 记录一个连线标记 (渲染需要)
                        e._priestLinked = true;
                    }
                }
            }
        }

        // ─── Normal Movement ───
        // 冲锋兽在非idle状态下跳过普通移动（避免双重移动）
        if (d > 1 && !(this.behavior === 'charger' && this._chargeState)) {
            this.x += (dx / d) * this.speed * speedMult * dt;
            this.y += (dy / d) * this.speed * speedMult * dt;
        }

        // ─── Knockback 衰减 ───
        if (this.knockbackVx !== 0 || this.knockbackVy !== 0) {
            this.x += this.knockbackVx * dt;
            this.y += this.knockbackVy * dt;
            // 指数衰减 (0.9^60 ≈ 0.002，1秒内基本消失)
            const decay = Math.max(0, 1 - dt * 3); // 等效线性近似替代 Math.pow // 快速衰减
            this.knockbackVx *= decay;
            this.knockbackVy *= decay;
            // 小于门槛归零
            if (this.knockbackVx * this.knockbackVx + this.knockbackVy * this.knockbackVy < 1) {
                this.knockbackVx = 0;
                this.knockbackVy = 0;
            }
        }

        if (this.flashTimer > 0) this.flashTimer -= dt;

        // 障碍物碰撞分辨（推出）


        // ─── 词缀效果更新 ───
        // 隐身词缀
        if (this.invisibleAffix) {
            this.invisibleTimer -= dt;
            if (this.invisibleTimer <= 0) {
                this.isInvisible = !this.isInvisible;
                this.invisibleTimer = this.isInvisible ? 1.5 : 3; // 隐身1.5秒，显形3秒
                if (!this.isInvisible && this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 10, speed: 50, life: 0.3, color: '#44aaff' });
                }
            }
        }

        // 再生词缀
        if (this.regeneratingAffix && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + 3 * dt);
            if (Math.random() < 0.1 && this.game.particles) {
                this.game.particles.emit(this.x, this.y - this.radius, { count: 1, speed: 20, life: 0.4, color: '#44ff44', size: 2 });
            }
        }

        // 传送词缀（区别于传送行为）
        if (this.teleportAffix && this.behavior !== 'teleporter') {
            this.teleportTimer -= dt;
            if (this.teleportTimer <= 0) {
                this.teleportTimer = 4 + Math.random() * 2;
                const angle = Math.random() * Math.PI * 2;
                const dist = 80 + Math.random() * 80;
                const newX = p.x + fastCos(angle) * dist;
                const newY = p.y + fastSin(angle) * dist;
                // 视觉
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 15, speed: 80, life: 0.4, color: '#ff44ff' });
                }
                this.x = newX;
                this.y = newY;
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 15, speed: 80, life: 0.4, color: '#ff44ff' });
                }
            }
        }
    }

    /**
     * 施加 micro-knockback 后退速度
     * @param {number} vx 击退方向 X 分量（像素/秒）
     * @param {number} vy 击退方向 Y 分量（像素/秒）
     */
    applyKnockback(vx, vy) {
        const factor = 1 - this.knockbackResist;
        if (factor <= 0) return;
        this.knockbackVx += vx * factor;
        this.knockbackVy += vy * factor;
    }

    takeDamage(amount, bulletOrWeaponId = null) {
        if (!this.active || !Number.isFinite(amount) || amount <= 0) return;
        // Priest invincibility shield
        if (this.invincibleTimer > 0) return;

        // Apply corrosion bonus to poisoned enemies
        const p = this.game.player;
        if (this.poisoned > 0 && p.corrosionBonus > 0) {
            amount *= (1 + p.corrosionBonus);
        }

        // 猎人本能：对精英敌人额外伤害
        if (this.isElite && p.hunterDamage > 0) {
            amount *= (1 + p.hunterDamage);
        }

        // Lucky shot chance (暴击)
        const isCrit = p.luckyChance > 0 && Math.random() < p.luckyChance;
        if (isCrit) {
            amount *= (2 + (p.criticalDamage || 0));
            this.game.spawnDamageNumber(this.x, this.y - this.radius - 20, 'CRIT!', '#ffcc00', true);
            // 暴击命中停顿
            this.game.triggerHitPause(0.02);

            // 遗物：临界质量 — 暴击时对周围敌人造成范围伤害
            // [R5-1 FIX] _critMassActive 递归守卫：AOE 伤害不再触发二次 critical_mass
            if (p.relicFlags && p.relicFlags.criticalMass && !this.game._critMassActive) {
                this.game._critMassActive = true; // 上锁
                const aoeDmg = Math.ceil(amount * 0.3);
                const aoeR = 80, aoeRSq = aoeR * aoeR;
                for (const nb of this.game.enemies) {
                    if (!nb.active || nb === this) continue;
                    const ndx = nb.x - this.x, ndy = nb.y - this.y;
                    if (ndx * ndx + ndy * ndy < aoeRSq) {
                        nb.takeDamage(aoeDmg, 'critical_mass');
                    }
                }
                this.game._critMassActive = false; // 解锁
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 8, speed: 120, life: 0.3, color: '#ffcc00', size: 3 });
                }
            }
        }

        // 统计追踪：累计造成伤害
        p.totalDamage = (p.totalDamage || 0) + amount;

        // 分武器伤害统计（用于 DPS 面板）
        // 支持 bullet 对象 或 直接传 weaponId 字符串
        let wid = null;
        if (typeof bulletOrWeaponId === 'string') {
            wid = bulletOrWeaponId;
        } else if (bulletOrWeaponId && bulletOrWeaponId.weaponId) {
            wid = bulletOrWeaponId.weaponId;
        }
        if (wid && this.game._weaponDamageStats) {
            this.game._weaponDamageStats[wid] = (this.game._weaponDamageStats[wid] || 0) + amount;
        }

        // Frost armor: freeze attacker when hit
        const bullet = (typeof bulletOrWeaponId === 'object') ? bulletOrWeaponId : null;
        if (p.frostArmorActive && bullet && Math.random() < 0.3) {
            // This applies to enemies that damage player, not here
        }

        // Shield handling
        if (this.shield > 0) {
            this.shield -= amount;
            this.game.spawnDamageNumber(this.x, this.y - this.radius, Math.ceil(amount), '#8888ff');
            if (this.shield < 0) {
                this.hp += this.shield;
                this.shield = 0;
            }
        } else {
            this.hp -= amount;
        }

        this.flashTimer = 0.1;
        if (!this.shield || this.shield <= 0) {
            this.game.spawnDamageNumber(this.x, this.y - this.radius, Math.ceil(amount), '#ffcc00');
        }

        // Resolve the hit's statuses before death callbacks. A lethal first
        // poison/frost hit must still count for traits and fusion trials, while
        // damage multipliers above continue to use the pre-hit status.
        if (bullet) {
            if (bullet.freezeChance && Math.random() < bullet.freezeChance) {
                this.frozen = Math.max(this.frozen || 0, bullet.freezeDur || 1);
                this.game.totalFreezeApplies++;
            }
            if (bullet.slowAmount && bullet.slowAmount < 1) {
                this.slowed = 2;
                this.slowAmount = bullet.slowAmount;
            }
            if (bullet.poisonChance && Math.random() < bullet.poisonChance) {
                this.poisoned = 3;
                this.poisonStacks = Math.min(50, this.poisonStacks + (bullet.poisonStacks || 1));
                this.game.totalPoisonApplies++;
            }
        }
        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        if (!this.active) return;
        this.active = false;

        // Cryo/Toxic 成就统计
        if (this.frozen > 0) this.game.frozenKills++;
        if (this.poisoned > 0) this.game.poisonKills++;

        // Plague spread: poison nearby enemies
        const p = this.game.player;
        if (p.plagueSpread && this.poisoned > 0) {
            const rangeSq = 100 * 100;
            for (const e of this.game.enemies) {
                if (e === this || !e.active) continue;
                const dx = e.x - this.x;
                const dy = e.y - this.y;
                if (dx * dx + dy * dy < rangeSq) {
                    e.poisoned = 3;
                    e.poisonStacks += this.poisonStacks;
                }
            }
            // Visual
            if (this.game.particles) {
                this.game.particles.emit(this.x, this.y, { count: 15, speed: 80, life: 0.4, color: '#88ff00' });
            }
        }

        // Death effects based on enemy type
        if (this.deathEffect === 'frostExplosion') {
            // FrostWisp: Freeze nearby enemies
            const rangeSq = 80 * 80;
            for (const e of this.game.enemies) {
                if (e === this || !e.active) continue;
                const dx = e.x - this.x;
                const dy = e.y - this.y;
                if (dx * dx + dy * dy < rangeSq) {
                    e.frozen = 1.5;
                }
            }
            // Particles
            if (this.game.particles) {
                this.game.particles.emit(this.x, this.y, { count: 20, speed: 100, life: 0.4, color: '#66ccff' });
            }
        }

        if (this.deathEffect === 'poisonPool') {
            // SlimeGlob: Leave poison pool (handled in Game as hazard)
            // For now, just apply poison to enemies near death spot
            const rangeSq = 50 * 50;
            for (const e of this.game.enemies) {
                if (e === this || !e.active) continue;
                const dx = e.x - this.x;
                const dy = e.y - this.y;
                if (dx * dx + dy * dy < rangeSq) {
                    e.poisoned = 2;
                    e.poisonStacks += 2;
                }
            }
        }

        // ═══ 新死亡效果 ═══
        // Leave a readable fuse after death instead of punishing a point-blank kill instantly.
        // Copy values: the corpse can return to the enemy pool before the blast resolves.
        if (this.deathEffect === 'explosion' || this.explosiveAffix) {
            const radius = Math.max(this.deathEffect === 'explosion' ? 100 : 0, this.explosionRadius || 0);
            const damage = (this.deathEffect === 'explosion' ? this.damage : 0) + (this.explosiveAffix ? this.explosionDamage : 0);
            this.game.mortarWarnings = this.game.mortarWarnings || [];
            this.game.mortarWarnings.push({ x: this.x, y: this.y, radius, damage,
                timer: 0.85, duration: 0.85, active: true, color: '#edb674', source: 'death_blast' });
            this.game.spawnDamageNumber(this.x, this.y - 30, '余爆将至', '#edb674');
        }

        if (this.deathEffect === 'miniPoison') {
            // ToxicBlob: 小范围毒池
            const rangeSq = 30 * 30;
            for (const e of this.game.enemies) {
                if (e === this || !e.active) continue;
                const dx = e.x - this.x;
                const dy = e.y - this.y;
                if (dx * dx + dy * dy < rangeSq) {
                    e.poisoned = 2;
                    e.poisonStacks += 1;
                }
            }
        }

        if (this.deathEffect === 'split') {
            // Splitter: 分裂成小怪（限制最大敌人数防止卡顿）
            if (this.game.enemies.length < 180) {
                for (let i = 0; i < 3 && this.game.enemies.length < 180; i++) {
                    const angle = (i / 3) * Math.PI * 2;
                    const child = this.game._createEnemy(
                        this.x + fastCos(angle) * 15,
                        this.y + fastSin(angle) * 15,
                        'MiniSpider'
                    );
                    child.hp = 3;
                    child.maxHp = 3;
                    this.game.enemies.push(child);
                }
            }
            if (this.game.particles) {
                this.game.particles.emit(this.x, this.y, { count: 10, speed: 80, life: 0.3, color: '#aa44ff', size: 3 });
            }
        }

        if (this.deathEffect === 'royal_split') {
            // RoyalSlime 分裂出 4 个中小史莱姆 (Bomber / SlimeGlob)
            if (this.game.enemies.length < 180) {
                for (let i = 0; i < 4 && this.game.enemies.length < 180; i++) {
                    const angle = (i / 4) * Math.PI * 2 + Math.random();
                    const child = this.game._createEnemy(
                        this.x + fastCos(angle) * 20,
                        this.y + fastSin(angle) * 20,
                        'SlimeGlob'
                    );
                    // 增强分裂怪血量，让清屏有压力
                    child.hp = 120;
                    child.maxHp = 120;
                    // 给分裂的中型史莱姆也加上分裂行为，死后再变成群怪
                    child.deathEffect = 'split';
                    this.game.enemies.push(child);
                }
            }
            if (this.game.particles) {
                this.game.particles.emit(this.x, this.y, { count: 30, speed: 120, life: 0.4, color: '#88ff00', size: 6 });
            }
        }

        // Splitting affix（限制最大敌人数和最小体积防止无限分裂）
        if (this.affix === 'splitting' && this.radius > 8 && this.game.enemies.length < 180) {
            for (let i = 0; i < 2 && this.game.enemies.length < 180; i++) {
                const ox = (Math.random() - 0.5) * 20;
                const oy = (Math.random() - 0.5) * 20;
                const child = this.game._createEnemy(this.x + ox, this.y + oy, 'Bat');
                child.hp = this.maxHp * 0.3;
                child.maxHp = child.hp;
                child.radius = this.radius * 0.6;
                child.xpValue = Math.floor(this.xpValue * 0.3);
                child.affix = null; // 防止子体继续分裂
                this.game.enemies.push(child);
            }
        }

        this.game.onEnemyKilled(this);
    }

    draw(ctx) {
        if (Art.drawEnemyActor(ctx, this)) {
            if (this.invincibleTimer > 0 && this._priestLinked) this._priestLinked = false;
            return;
        }
        // [NEW] Charger 预警红线 (画在最底层)
        if (this.behavior === 'charger' && this._chargeState === 'aiming') {
            ctx.save();
            ctx.globalAlpha = 0.5 + Math.sin(this.game.time * 15) * 0.3; // 闪烁效果
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + fastCos(this._chargeAngle) * 800, this.y + fastSin(this._chargeAngle) * 800);
            ctx.stroke();
            ctx.restore();
        }

        const isFrozen = this.frozen > 0;
        const isPoisoned = this.poisoned > 0;
        const time = this.game.time;
        const highQuality = this.game.qualityLevel >= 0.5;

        // 无敌特效 (Priest 赐予)
        if (this.invincibleTimer > 0) {
            ctx.globalAlpha = 0.6 + Math.sin(time * 10) * 0.4;
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            // 绘制六边形护盾效果
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 + time;
                const r = this.radius * 1.5;
                if (i === 0) ctx.moveTo(this.x + Math.cos(angle) * r, this.y + Math.sin(angle) * r);
                else ctx.lineTo(this.x + Math.cos(angle) * r, this.y + Math.sin(angle) * r);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.globalAlpha = 1;

            // 如果记录了连接者，画一条淡淡的连接线到赐予者
            if (this._priestLinked) {
                this._priestLinked = false; // 只在一帧内有效，防止残留在死亡后
            }
        }

        // 中毒覆盖层
        if (isPoisoned) {
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = '#88ff00';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            // 毒气泡（仅高画质）
            if (highQuality) {
                for (let i = 0; i < 3; i++) {
                    const a = time * 2 + i * Math.PI * 2 / 3;
                    const r = this.radius * 0.7;
                    ctx.globalAlpha = 0.5;
                    ctx.fillStyle = '#aaff44';
                    ctx.beginPath();
                    ctx.arc(
                        this.x + fastCos(a) * r,
                        this.y + fastSin(a) * r - this.radius * 0.3,
                        3,
                        0, Math.PI * 2
                    );
                    ctx.fill();
                }
            }
            ctx.globalAlpha = 1;
        }

        // 冻结覆盖层（增强）
        if (isFrozen) {
            // 外圈冰晶
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = '#66ccff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.4, 0, Math.PI * 2);
            ctx.fill();
            // 冰晶纹路（仅高画质）
            if (highQuality) {
                ctx.strokeStyle = '#aaeeff';
                ctx.lineWidth = 1.5;
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * Math.PI * 2 + time * 0.5;
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(
                        this.x + fastCos(a) * this.radius * 1.5,
                        this.y + fastSin(a) * this.radius * 1.5
                    );
                    ctx.stroke();
                }
            }
            ctx.globalAlpha = 1;
        }

        // 主体绘制（优先用精灵缓存）
        const sprite = spriteCache.getEnemySprite(this._draw, this.flashTimer > 0);
        if (Art.drawMonster(ctx,this)) {
            // Hand-painted sprite, with original status overlays below.
        } else if (sprite) {
            const scale = this.radius / sprite.cachedRadius;
            if (Math.abs(scale - 1) < 0.05) {
                ctx.drawImage(sprite.canvas, this.x - sprite.offset, this.y - sprite.offset);
            } else {
                // 使用 ctx.scale 代替 drawImage 带参拉伸（Canvas2D 下性能更好）
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.scale(scale, scale);
                ctx.drawImage(sprite.canvas, -sprite.offset, -sprite.offset);
                ctx.restore();
            }
        } else {
            // 回退实时绘制
            this._draw(ctx, this.x, this.y, this.radius * 1.3, this.flashTimer, time);
        }

        // DestinyShrine 狂暴光环（红色）
        if (this.hasRageAura) {
            ctx.globalAlpha = 0.4 + fastSin(time * 8) * 0.2;
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // 精英标记与词缀视觉
        if (this.isElite) {
            // 外圈脉冲（简化：移除 shadowBlur）
            const pulse = 1 + fastSin(time * 5) * 0.15;
            ctx.strokeStyle = '#ff8800';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, (this.radius + 6) * pulse, 0, Math.PI * 2);
            ctx.stroke();

            // 词缀图标/颜色（仅高画质）
            if (highQuality) {
                const affixColors = this._affixColors || [];
                if (affixColors.length > 0) {
                    for (let i = 0; i < affixColors.length; i++) {
                        const angle = (i / affixColors.length) * Math.PI * 2 - Math.PI / 2;
                        const cx = this.x + fastCos(angle) * (this.radius + 12);
                        const cy = this.y + fastSin(angle) * (this.radius + 12);
                        ctx.fillStyle = affixColors[i];
                        ctx.beginPath();
                        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }

        // 隐身词缀视觉
        if (this.isInvisible) {
            ctx.globalAlpha = 0.25;
        }

        // 狂暴词缀视觉（低血量） - 仅高画质
        if (highQuality && this.berserkerAffix && this.hp / this.maxHp < 0.5) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.6, 0, Math.PI * 2);
            ctx.fill();
        }

        // 再生词缀视觉 - 仅高画质
        if (highQuality && this.regeneratingAffix) {
            ctx.globalAlpha = 0.2 + fastSin(time * 4) * 0.1;
            ctx.strokeStyle = '#44ff44';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.3 + fastSin(time * 3) * 3, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 护盾条
        if (this.shield > 0) {
            ctx.globalAlpha = 1;
            ctx.fillStyle = 'rgba(136, 136, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // 赏金目标金色光环
        if (this._isBounty) {
            ctx.globalAlpha = 0.4 + fastSin(time * 5) * 0.2;
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 6 + fastSin(time * 3) * 2, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 确保 globalAlpha 归位，防止泄漏到后续绘制
        ctx.globalAlpha = 1;
    }
}

module.exports = { Enemy, TYPES, AFFIX_DEFS, rollAffixes };
module.exports.default = Enemy;
