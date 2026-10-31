const { drawTracer, drawWalker, drawGunner, drawCryomancer, drawBiohazard,
    drawBerserker, drawArcane, drawEngineer, drawAssassin, setPlayerMoving } = require('./Renderer');
const { sfxLevelUp, sfxPlayerHit } = require('./SFX');
const { fastSin, fastCos } = require('./MathLUT');
const { CharacterTraitHandler } = require('./Character');
const { getSkinTheme } = require('./Skins');
const { now: perfNow, vibrate } = require('./platform');
const { Pet } = require('./Pet');
const { updateAuras, drawAuras } = require('./Auras');

class Player {
    constructor(game) {
        this.game = game;
        this.x = 0; this.y = 0;
        this.radius = 15;

        // Base stats (can be modified by meta-progression)
        this.baseMaxHp = 120;
        this.baseMight = 1.0;
        this.baseSpeed = 210;
        this.basePickup = 90;

        // Stat bonuses from passives
        this.bonusMight = 0;
        this.bonusSpeed = 0;
        this.bonusCdr = 0;
        this.bonusArea = 0;
        this.bonusPickup = 0;
        this.bonusProjectile = 0;
        this.bonusArmor = 0;
        this.bonusProjSpeed = 0;
        this.bonusRegen = 0;

        // Cryo passive bonuses
        this.bonusFreezeDur = 0;    // +freeze duration %
        this.frostArmorActive = false; // Frost armor passive
        this.chillAuraRadius = 0;   // Chill aura range

        // Toxic passive bonuses
        this.bonusToxicDmg = 0;     // +toxic damage %
        this._skillPower = null;
        this.corrosionBonus = 0;    // +damage to poisoned enemies %
        this.plagueSpread = false;  // Poison spreads on death

        // Generic passives
        this.luckyChance = 0;       // % chance for double damage

        // 角色特性属性
        this.characterId = null;
        this.momentumStacks = 0;    // 赛博猎手：动量叠加
        this.stillTime = 0;         // 精准射手：静止时间
        this.thornDamage = 0;       // 重装卫士：反伤比例
        this.freezeExplosion = false; // 冰霜术士：冻结爆炸
        this.poisonLeech = false;   // 瘟疫使者：毒素吸血
        this.inGrass = false;       // 是否在草丛中

        // 新被动属性初始化（防止 NaN）
        this.soulHarvestBonus = 0;    // 灵魂收割：累积伤害加成
        this.soulHarvestMax = 0.3;    // 灵魂收割上限
        this.soulHarvestPerKill = 0;  // 每次击杀收割量（由被动等级决定）
        this.overheatBonus = 0;       // 过载：连续攻击伤害加成
        this.voidLeech = 0;           // 虚空核心：击杀回复 HP
        this.dodgeChance = 0;         // 暗影步：闪避几率
        this.secondWind = false;      // 背水一战

        // 闪避/冲刺系统 (Dash)
        this.dashCooldown = 0;
        this.dashMaxCooldown = 3.0;   // 3秒CD
        this.dashActiveTimer = 0;     // 冲刺持续时间 (0.2秒左右)
        this.dashAngle = 0;           // 冲刺方向
        this.dashSpeedMult = 3.5;     // 正常移速的 3.5 倍

        // 进化解锁系统
        this.evolutionCores = {};   // 使用核心解锁的武器

        // 统计追踪（用于进化解锁条件）
        this.totalHealed = 0;       // 累计治疗量
        this.totalGemsCollected = 0; // 累计收集经验球数量
        this.totalDamage = 0;        // 累计造成伤害
        this.totalXp = 0;            // 累计获得经验

        this.hp = 100; this.maxHp = 100;
        this.level = 1; this.xp = 0; this.maxXp = 32; // 平滑前期升级曲线
        this.kills = 0;

        // Weapons
        this.weapons = [];
        // Passive items {id, level}
        this.passives = [];
        // Pets
        this.pets = [];

        // Trail
        this.trail = [];
        this.trailTimer = 0;

        this.facingAngle = -Math.PI / 2; // Default facing up
        this.isMoving = false; // 是否正在移动（用于行走动画）

        // 角色特性处理器
        this.traitHandler = new CharacterTraitHandler(this);

        // 外观主题
        this.skinTheme = null;
    }

    get might() {
        const total = this._mightAtBonus(this.bonusMight);
        const power = this._skillPower;
        return power ? Math.max(total, this._mightAtBonus(this.bonusMight - power.bonus) * (1 + power.floor)) : total;
    }

    _mightAtBonus(bonus) {
        // 递减公式：bonusMight 边际递减，防止大量meta/天赋叠爆
        // +50% → 实际+38%, +100% → 实际+59%, +117% → 实际+67%
        const diminished = bonus / (1 + bonus * 0.4);
        let total = this.baseMight + diminished;
        // 添加角色特性加成
        if (this.traitHandler) {
            total += this.traitHandler.getExtraMight();
        }
        // 背水一战：低血量时伤害加成
        if (this.secondWind && this.hp <= this.maxHp * 0.3) {
            total += 0.3;
        }
        // 灵魂收割：累积伤害加成
        if (this.soulHarvestBonus) {
            total += this.soulHarvestBonus;
        }
        // 过载：连续攻击加成（上限 1.5x，防止无限叠加）
        if (this.overheatBonus) {
            total += Math.min(this.overheatBonus, 1.5);
        }
        // 遗物：共鸣核心 — 拥有3种以上武器时伤害+20%
        if (this.relicFlags && this.relicFlags.resonanceCore && this.weapons.length >= 3) {
            total += 0.2;
        }
        // 遗物：血怒模块 — HP越低伤害越高（最高×2.5）
        if (this.relicFlags && this.relicFlags.bloodrage) {
            const ratio = Math.max(0, this.hp / this.maxHp);
            total *= (1 + (1 - ratio) * 1.5);
        }
        // 遗物：暴走模块 — 连杀不中断时越战越强（最高+50%）
        if (this.relicFlags && this.relicFlags.frenzyModule) {
            const combo = (this.game && this.game.killCombo) || 0;
            total *= (1 + Math.min(combo * 0.02, 0.5));
        }
        if (this.relicFlags?.overloadCore) total *= 2;
        return total;
    }
    get speed() {
        const bonus = Number.isFinite(this.bonusSpeed) ? this.bonusSpeed : 0;
        let s = this.baseSpeed * (1 + bonus);
        if (this.slowed > 0 && Number.isFinite(this.slowAmount)) s *= this.slowAmount;
        return s;
    }
    get cdr() { return Math.min(this.bonusCdr, 0.50); }
    get area() { return 1 + this.bonusArea; }
    get pickup() { return this.basePickup * (1 + this.bonusPickup) * 1.25; }
    // 护甲改为百分比减伤：每点护甲减 8% 伤害，上限 60%
    get armor() { const base = Math.min(0.6, this.bonusArmor * 0.08); return (this.game && this.game.curseArmorBreak) ? base * 0.5 : base; }
    get projSpeed() { return 1 + this.bonusProjSpeed; }
    get regen() { return this.bonusRegen; }

    get canHeal() { return this.hp > 0 && !this.game._runSettled && !this.game.curseNoHeal && !this.relicFlags?.overloadCore; }

    heal(amount) {
        if (!this.canHeal || !Number.isFinite(amount) || amount <= 0) return 0;
        const actual = Math.max(0, Math.min(amount, this.maxHp - this.hp));
        this.hp += actual;
        this.totalHealed = (this.totalHealed || 0) + actual;
        return actual;
    }

    reset() {
        this._skillPower = null;
        this.x = this.game.width / 2;
        this.y = this.game.height / 2;
        this.maxHp = this.baseMaxHp;
        this.hp = this.maxHp;
        this.xp = 0; this.maxXp = 32; // 平滑前期升级曲线
        this.level = 1; this.kills = 0;
        this.weapons = []; this.passives = []; this.pets = [];
        this.bonusMight = 0; this.bonusSpeed = 0;
        this.bonusCdr = 0; this.bonusArea = 0;
        this.bonusPickup = 0; this.bonusProjectile = 0;
        this.bonusArmor = 0; this.bonusProjSpeed = 0;
        this.bonusRegen = 0;
        // 重置遗物计时器（护盾发生器、时间碎片等）
        this.shieldGenTimer = 0; this.shieldArmorExpiry = 0;
        // Reset new passives
        this.bonusFreezeDur = 0; this.frostArmorActive = false; this.chillAuraRadius = 0;
        this.bonusToxicDmg = 0; this.corrosionBonus = 0; this.plagueSpread = false;
        this.luckyChance = 0;
        // Reset new advanced passives
        this.voidLeech = 0; this.dodgeChance = 0; this.soulHarvestBonus = 0;
        this.bonusBurnDmg = 0; this.explosiveRounds = 0; this.overheatBonus = 0;
        this.bonusXp = 0; this.criticalDamage = 0; this.secondWind = false;
        this.hunterDamage = 0;
        this.dashCooldown = 0; this.dashActiveTimer = 0;
        // Reset character traits
        this.momentumStacks = 0;
        this.stillTime = 0;
        this.thornDamage = 0;
        this.freezeExplosion = false;
        this.poisonLeech = false;
        this.trail = [];
        // Relic system
        this.relics = [];
        this.relicFlags = {};
        this.characterId = null;
        this.stillTimer = 0;
        this.skinTheme = null;
        // 遗物一次性标志重置
        this.limitBreakUsed = false;
        this.revivalUsed = false;
        // 过热系统
        this.overheatMax = 0;
        // Boss减速支持
        this.slowed = 0;
        this.slowAmount = 1;

        // Auto spawn equipped pets
        if (this.game && this.game.meta && this.game.meta.data.equippedPets) {
            for (const petId of this.game.meta.data.equippedPets) {
                this.pets.push(new Pet(this.game, petId));
            }
        }
    }

    setSkinTheme(charId) {
        if (this.game && this.game.meta) {
            const skinId = this.game.meta.getSelectedSkin(charId);
            this.skinTheme = getSkinTheme(charId, skinId);
            this.isDefaultSkin = !skinId || skinId.endsWith('_default');
        }
    }

    update(dt) {
        // 重置草丛状态（由Pickup设置）
        this.inGrass = false;

        // Boss减速效果衰减
        if (this.slowed > 0) {
            this.slowed -= dt;
            if (this.slowed <= 0) { this.slowed = 0; this.slowAmount = 1; }
        }

        // Dash cooldown tick
        if (this.dashCooldown > 0) this.dashCooldown -= dt;

        let overrideV = null;
        if (this.dashActiveTimer > 0) {
            this.dashActiveTimer -= dt;
            // Override movement with dash velocity
            overrideV = {
                x: fastCos(this.dashAngle) * this.dashSpeedMult,
                y: fastSin(this.dashAngle) * this.dashSpeedMult
            };
            // 冲刺时强制生成残影
            if (this.trailTimer > Math.max(0, this.dashActiveTimer)) {
                this.trailTimer = 0;
            }
        }

        const rawV = this.game.input.getVector();
        const v = overrideV || rawV;

        if (!isNaN(v.x) && !isNaN(v.y) && (v.x !== 0 || v.y !== 0)) {
            const nextX = this.x + v.x * this.speed * dt;
            const nextY = this.y + v.y * this.speed * dt;
            // Only update if valid numbers
            if (!isNaN(nextX) && !isNaN(nextY)) {
                this.x = nextX;
                this.y = nextY;
            }
            // 障碍物碰撞分辨

            // Update facing angle
            if (!overrideV) {
                this.facingAngle = Math.atan2(v.y, v.x);
            }
            this.isMoving = true;

            // 遗物：反物质引擎 — 移动时对附近敌人造成伤害
            if (this.relicFlags && this.relicFlags.antimatterEngine) {
                this._antimatterTimer = (this._antimatterTimer || 0) + dt;
                if (this._antimatterTimer >= 0.25) {
                    this._antimatterTimer = 0;
                    const dmg = Math.ceil(this.might * 10 * (this.relicFlags.destructionTrail ? 2 : 1));
                    const r = 95 * (this.area || 1), rSq = r * r;
                    for (const e of this.game.enemies) {
                        if (!e.active) continue;
                        const dx = e.x - this.x, dy = e.y - this.y;
                        if (dx * dx + dy * dy < rSq) {
                            e.takeDamage(dmg, 'antimatter_engine');
                        }
                    }
                }
            }
        } else {
            // 停止移动时重置反物质引擎计时器
            if (this.relicFlags && this.relicFlags.antimatterEngine) {
                this._antimatterTimer = 0;
            }
            this.isMoving = false;
        }

        // 角色特性更新
        if (this.traitHandler) {
            this.traitHandler.update(dt);
        }

        // 通用静止时间追踪（timeShard 遗物）—— 炮手角色由 CharacterTrait 处理
        if (this.characterId !== 'gunner') {
            if (v.x === 0 && v.y === 0) {
                this.stillTime = (this.stillTime || 0) + dt;
            } else {
                this.stillTime = 0;
            }
        }

        // Regen (诅咒: 禁止回血, 遗物: 过载核心也禁止回血)
        const noHeal = this.game.curseNoHeal || (this.relicFlags && this.relicFlags.overloadCore);
        if (this.regen > 0 && !noHeal) {
            this.heal(this.regen * dt);
        }

        // Update weapons
        for (const w of this.weapons) w.update(dt);
        // Update pets
        if (this.pets) {
            for (const pet of this.pets) pet.update(dt);
        }

        // Update Auras
        updateAuras(this, dt, this.game);

        // Trail
        this.trailTimer -= dt;
        if (this.trailTimer <= 0 && (v.x !== 0 || v.y !== 0)) {
            this.trail.push({ x: this.x, y: this.y, a: 0.5, angle: this.facingAngle, time: perfNow() / 1000 });
            if (this.trail.length > 12) this.trail.shift();
            // 在冲刺期间，残影生成更频繁
            this.trailTimer = this.dashActiveTimer > 0 ? 0.015 : 0.03;
        }
        this.trail.forEach(t => t.a -= dt * 1.5);
        // 就地压缩，避免 .filter() 分配新数组
        let tw = 0;
        for (let i = 0; i < this.trail.length; i++) {
            if (this.trail[i].a > 0) this.trail[tw++] = this.trail[i];
        }
        this.trail.length = tw;
    }

    draw(ctx) {
        // Draw Auras (underneath player and trails if needed, or above. Let's draw underneath first)
        const gameTime = this.game ? this.game.time : 0;
        drawAuras(ctx, this, gameTime);

        // Trail - 使用角色主题色并渲染完整幻影
        const trailColor = (this.skinTheme && this.skinTheme.main) || '#00ffcc';
        const time = perfNow() / 1000;
        const theme = this.skinTheme || { main: trailColor, glow: trailColor, core: trailColor, accent: trailColor };

        // 当处于冲刺状态时，绘制华丽全尺寸幻影
        if (this.dashActiveTimer > 0 || this.trail.some(t => t.a > 0.3)) {
            // 使用 lighter 叠加模式让残影更明亮
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (const t of this.trail) {
                if (t.a <= 0) continue;
                ctx.globalAlpha = t.a * 0.6; // 稍微调高透明度

                // 选择对应的绘制函数绘制幻影
                // 这里为了性能，可以复写主题色为全单色发光
                const ghostTheme = {
                    main: trailColor,
                    glow: trailColor,
                    core: '#ffffff',
                    accent: trailColor
                };

                if (this.characterId === 'tracer') drawTracer(ctx, t.x, t.y, this.radius, t.time, t.angle, ghostTheme);
                else if (this.characterId === 'walker') drawWalker(ctx, t.x, t.y, this.radius, t.time, t.angle, ghostTheme);
                else if (this.characterId === 'gunner') drawGunner(ctx, t.x, t.y, this.radius, t.time, t.angle, ghostTheme);
                else if (this.characterId === 'cryomancer') drawCryomancer(ctx, t.x, t.y, this.radius, t.time, t.angle, ghostTheme);
                else if (this.characterId === 'biohazard') drawBiohazard(ctx, t.x, t.y, this.radius, t.time, t.angle, ghostTheme);
                else if (this.characterId === 'berserker') drawBerserker(ctx, t.x, t.y, this.radius, t.time, t.angle, ghostTheme);
                else if (this.characterId === 'arcane') drawArcane(ctx, t.x, t.y, this.radius, t.time, t.angle, ghostTheme);
                else if (this.characterId === 'engineer') drawEngineer(ctx, t.x, t.y, this.radius, t.time, t.angle, ghostTheme);
                else if (this.characterId === 'assassin') drawAssassin(ctx, t.x, t.y, this.radius, t.time, t.angle, ghostTheme);
                else drawTracer(ctx, t.x, t.y, this.radius, t.time, t.angle, ghostTheme);
            }
            ctx.restore();
        } else {
            // 普通移动时，仅绘制简单圆点以节省性能
            for (const t of this.trail) {
                ctx.globalAlpha = t.a * 0.4;
                ctx.fillStyle = trailColor;
                ctx.shadowBlur = 0;
                ctx.shadowColor = trailColor;
                ctx.beginPath();
                ctx.arc(t.x, t.y, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // 无敌状态光环
        if (this.game.playerInvincible > 0) {
            ctx.globalAlpha = 0.5 + 0.3 * fastSin(time * 10);
            ctx.strokeStyle = '#44ff88';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // 默认皮肤用精灵图(theme=null)，自定义皮肤用代码绘制(传theme)
        const drawTheme = this.isDefaultSkin ? null : theme;

        // 设置移动状态标记（用于精灵图行走动画）
        setPlayerMoving(this.isMoving);

        if (this.characterId === 'tracer') drawTracer(ctx, this.x, this.y, this.radius, time, this.facingAngle, drawTheme);
        else if (this.characterId === 'walker') drawWalker(ctx, this.x, this.y, this.radius, time, this.facingAngle, drawTheme);
        else if (this.characterId === 'gunner') drawGunner(ctx, this.x, this.y, this.radius, time, this.facingAngle, drawTheme);
        else if (this.characterId === 'cryomancer') drawCryomancer(ctx, this.x, this.y, this.radius, time, this.facingAngle, drawTheme);
        else if (this.characterId === 'biohazard') drawBiohazard(ctx, this.x, this.y, this.radius, time, this.facingAngle, drawTheme);
        // 新角色
        else if (this.characterId === 'berserker') drawBerserker(ctx, this.x, this.y, this.radius, time, this.facingAngle, drawTheme);
        else if (this.characterId === 'arcane') drawArcane(ctx, this.x, this.y, this.radius, time, this.facingAngle, drawTheme);
        else if (this.characterId === 'engineer') drawEngineer(ctx, this.x, this.y, this.radius, time, this.facingAngle, drawTheme);
        else if (this.characterId === 'assassin') drawAssassin(ctx, this.x, this.y, this.radius, time, this.facingAngle, drawTheme);
        else drawTracer(ctx, this.x, this.y, this.radius, time, this.facingAngle, drawTheme);

        // Draw pets
        if (this.pets) {
            for (const pet of this.pets) pet.draw(ctx);
        }
    }

    takeDamage(amount, enemy = null, continuous = false) {
        if (!Number.isFinite(amount) || amount <= 0 || this.hp <= 0) return false;

        // 无敌状态免疫伤害
        if (this.game.playerInvincible > 0) {
            return false;
        }

        // 闪避判定（shadow_step 被动）
        if (this.dodgeChance > 0 && Math.random() < this.dodgeChance) {
            this.game.spawnDamageNumber(this.x, this.y - 20, 'DODGE!', '#44ffff');
            if (this.game.particles) {
                this.game.particles.emit(this.x, this.y, { count: 8, speed: 100, life: 0.3, color: '#44ffff', size: 3 });
            }
            this.game.playerInvincible = Math.max(this.game.playerInvincible || 0, 0.3);
            return false;
        }

        // Contact damage already includes dt. A per-frame minimum turns a
        // 4 damage/second enemy into 60+ damage/second at higher frame rates.
        const dmg = Math.max(continuous ? 0 : 1, amount * (1 - this.armor));
        const _wasAbove25 = this.hp > this.maxHp * 0.25;
        this.hp -= dmg;
        this.game.spawnDamageNumber(this.x, this.y - 20, Math.ceil(dmg), '#ff4444');
        // 首次跌至25%血量以下，播放警告音
        if (_wasAbove25 && this.hp > 0 && this.hp <= this.maxHp * 0.25) {
            sfxPlayerHit();
        }
        // 只有单次受到超过最大生命值 15% 的巨额伤害时，才给一点微弱的提示
        if (dmg >= this.maxHp * 0.15) {
            this.game.triggerHitPause(0.02);
            this.game.triggerScreenPulse('rgba(255,0,0,0.1)', 0.1);
        }

        // ═══ 濒死反击 (Last Stand) ═══
        if (this.hp > 0 && this.hp / this.maxHp < 0.15 && !this.game._lastStandUsed) {
            this.game._lastStandUsed = true;
            this.game._lastStandTimer = 3; // 3 秒增伤
            this.game._lastStandKills = 0;
            this.game.triggerHitPause(0.15); // 长停顿
            this.game.triggerScreenPulse('rgba(255,0,0,0.3)', 0.5); // 大幅降低闪光强度
            this.game.shakeAmount = 10;
            this.game.shakeDuration = 0.5;
            // 临时增伤 +50%
            this.bonusMight += 0.5;
            this.game.spawnDamageNumber(this.x, this.y - 60, 'LAST STAND!', '#ff0000', false);
            this.game.spawnDamageNumber(this.x, this.y - 40, '\u4F24\u5BB3+50%', '#ff4444', false);
            vibrate('heavy');
        }

        // 反伤机制（重装卫士特性）
        if (this.thornDamage > 0 && enemy && enemy.active) {
            const reflected = dmg * this.thornDamage;
            const thornDmg = continuous ? reflected : Math.ceil(reflected);
            enemy.takeDamage(thornDmg);
            this.game.spawnDamageNumber(enemy.x, enemy.y - 20, thornDmg, '#aa44ff');
            if (this.game.particles) {
                this.game.particles.emit(enemy.x, enemy.y, { count: 5, speed: 30, life: 0.2, color: '#aa44ff' });
            }
        }

        // 遗物：极限突破 — HP < 10% 时无敌3秒（每局一次）
        if (this.hp > 0 && this.hp / this.maxHp < 0.1 &&
            this.relicFlags && this.relicFlags.limitBreak && !this.limitBreakUsed) {
            this.limitBreakUsed = true;
            this.game.playerInvincible = (this.game.playerInvincible || 0) + 3;
            this.game.spawnDamageNumber(this.x, this.y - 60, '极限突破! 无敌3秒', '#ff4444', false);
            if (this.game.triggerScreenPulse) this.game.triggerScreenPulse('#ff000044', 1.0);
        }

        // 遗物：时间膨胀 — 受伤时减速附近敌人
        if (this.relicFlags && this.relicFlags.timeDilation) {
            const slowR = 150, slowRSq = slowR * slowR;
            for (const e of this.game.enemies) {
                if (!e.active) continue;
                const dx = e.x - this.x, dy = e.y - this.y;
                if (dx * dx + dy * dy < slowRSq) {
                    e.slowed = Math.max(e.slowed || 0, 1.5);
                    e.slowAmount = 0.5;
                }
            }
        }

        // 遗物：相位护盾 — 受击后1.5秒无敌
        if (this.relicFlags && this.relicFlags.phaseShield && this.hp > 0) {
            this.game.playerInvincible = Math.max(this.game.playerInvincible || 0, 1.5);
        }

        // 遗物：爆裂血液 — 受伤时对周围敌人造成伤害
        if (this.relicFlags && this.relicFlags.explosiveBlood) {
            const burstR = 100, burstRSq = burstR * burstR;
            const burstDmg = Math.ceil(dmg * 0.5);
            for (const e of this.game.enemies) {
                if (!e.active) continue;
                const dx = e.x - this.x, dy = e.y - this.y;
                if (dx * dx + dy * dy < burstRSq) {
                    e.takeDamage(burstDmg);
                }
            }
        }

        if (this.hp <= 0) {
            // 遗物：复活节点 — 以30% HP复活一次
            if (this.relicFlags && this.relicFlags.revivalNode && !this.revivalUsed) {
                this.revivalUsed = true;
                this.hp = Math.floor(this.maxHp * 0.3);
                this.game.playerInvincible = (this.game.playerInvincible || 0) + 2;
                this.game.spawnDamageNumber(this.x, this.y - 60, '复活节点! 30% HP', '#ff4444', false);
                if (this.game.triggerScreenPulse) this.game.triggerScreenPulse('#ff000066', 1.0);
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 30, speed: 120, life: 0.6, color: '#ff4444', size: 5 });
                }
                return true;
            }
            this.hp = 0;
            this.game.endGame();
        }
        return true;
    }

    gainXp(amount) {
        // 诅咒: 经验衰减，bonusXp 额外倍率
        const xpMult = (this.game.curseXpMult || 1) * (1 + (this.bonusXp || 0)) * (this.relicFlags?.xpBoost ? 1.25 : 1);
        const actualXp = amount * xpMult;
        this.xp += actualXp;
        this.totalXp = (this.totalXp || 0) + actualXp; // 统计追踪
        while (this.xp >= this.maxXp) {
            this.xp -= this.maxXp;
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.maxXp = Math.floor(16 + this.level * 14 + Math.pow(this.level, 1.78) * 6.5);
        // 诅咒: 禁止回血时跳过升级回血
        this.heal(Math.max(10, Math.floor(this.maxHp * 0.12)));
        if (this.game.particles) this.game.particles.levelUp(this.x, this.y);
        this.game.triggerScreenPulse('#00ffcc', 0.6);
        sfxLevelUp();
        this.game.showUpgradeScreen();
    }

    hasWeapon(id) { return this.weapons.some(w => w.id === id); }
    hasPassive(id) { return this.passives.some(p => p.id === id); }
    getPassiveLevel(id) { const p = this.passives.find(i => i.id === id); return p ? p.level : 0; }
    getWeaponLevel(id) { const w = this.weapons.find(i => i.id === id); return w ? w.level : 0; }

    dash(angle) {
        if (this.dashCooldown > 0) return;
        this.dashCooldown = this.dashMaxCooldown;
        this.dashActiveTimer = 0.25; // 0.25秒冲刺
        this.dashAngle = angle;
        this.facingAngle = angle;
        // 冲刺期间无敌
        this.game.playerInvincible = Math.max(this.game.playerInvincible || 0, 0.35); // 提供0.35秒无敌帧
    }
}

module.exports = Player;
