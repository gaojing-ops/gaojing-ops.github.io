// ─── Boss 系统 ──────────────────────────
// Boss 每 5 分钟出现，拥有技能和预警机制
const { now: perfNow, vibrate } = require('./platform');
const { fastSin, fastCos } = require('./MathLUT');

const { drawFrostTitan, drawPlagueSource } = require('./Renderer');
const SFX = require('./SFX');
const Art = require('./Art');
const Pickup = require('./Pickup');
const { checkEvolutions, isEvolutionUnlocked, EVOLUTION_RECIPES } = require('./Evolution');

// ─── Boss 定义（从 JSON 数据文件加载） ────────────────
// WeChat game packaging has been flaky with JSON modules; load the data from a JS module instead.
const _bossRawData = require('./BossData.js');

// drawFunc 映射：JSON 中的 drawFuncName 字符串 → 实际绘制函数
const _DRAW_FUNC_MAP = {
    drawFrostTitan,
    drawPlagueSource,
};

const BOSS_DEFS = _bossRawData.map(def => {
    if (def.drawFuncName && _DRAW_FUNC_MAP[def.drawFuncName]) {
        def.drawFunc = _DRAW_FUNC_MAP[def.drawFuncName];
    }
    return def;
});

class Boss {
    constructor(game, wave) {
        this.game = game;
        const defIdx = Math.min(wave - 1, BOSS_DEFS.length - 1);
        const def = BOSS_DEFS[defIdx];
        this.artIndex = defIdx;

        this.name = def.name;
        this.color = def.color;
        this.glowColor = def.glowColor;
        this.radius = def.radius;
        this.speed = def.speed;
        this.damage = def.damage;
        this.skills = def.skills;
        this.drawFunc = def.drawFunc || null; // Custom drawing function

        this.maxHp = Math.floor(def.baseHp * Math.pow(1.5, wave - 1));
        this.hp = this.maxHp;
        this.shield = 0; // 护盾
        this.active = true;
        this.flashTimer = 0;
        this.frozen = 0; // 冻结状态
        this.slowed = 0; this.slowAmount = 1;
        this._deathHandled = false;

        // 在屏幕外生成
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.max(game.width, game.height) / 2 + 150;
        this.x = game.player.x + fastCos(angle) * dist;
        this.y = game.player.y + fastSin(angle) * dist;

        // 技能系统
        this.skillTimer = 3; // 3 秒后开始释放技能
        this.currentSkill = null;
        this.skillPhase = 0; // 0=准备, 1=预警, 2=执行
        this.skillData = {};

        // 多阶段系统
        this.phase = 1; // 1=普通, 2=狂暴(70%HP), 3=拼命(35%HP)
        this.baseSpeed = this.speed; // 保存原始速度
        this.baseSkillCooldown = 1.8; // 基础技能冷却

        // 移动AI行为
        this._behaviorTimer = 3 + Math.random() * 4; // 行为切换计时器
        this._circling = false; // 是否绕行玩家
        this._circleDir = 1; // 绕行方向 (1 或 -1)

        // 持续技能效果
        this._sustainedEffect = null;

        // 预警线
        this.telegraph = null; // { type, x, y, angle, width, duration, timer }

        // 伤害来源追踪（用于死亡时显示各武器贡献）
        this._damageLog = {};
    }

    update(dt) {
        if (!this.active) return;
        if (this.flashTimer > 0) this.flashTimer -= dt;

        // 冻结状态：减速并计时
        let moveDt = dt;
        if (this.frozen > 0) {
            this.frozen -= dt;
            if (this.frozen < 0) this.frozen = 0;
            // 冻结时移动速度减半（只影响移动，不影响计时器）
            moveDt = dt * 0.5;
        }

        // Moon blessings and frost skills slow movement, never attack timers.
        // Freeze and slow use the stronger penalty rather than multiplying.
        if (this.slowed > 0) {
            const duration = Math.min(dt, this.slowed);
            const factor = Math.max(0.25, Math.min(1, this.slowAmount || 0.6));
            moveDt = Math.min(moveDt, dt - duration * (1 - factor));
            this.slowed = Math.max(0, this.slowed - dt);
        }

        // 移动AI行为切换计时器（用原始 dt，不受冻结影响）
        this._behaviorTimer -= dt;
        if (this._behaviorTimer <= 0) {
            // 根据phase决定绕行概率：phase1=25%, phase2=50%, phase3=70%
            const circlingChance = this.phase === 1 ? 0.25 : (this.phase === 2 ? 0.5 : 0.7);
            this._circling = Math.random() < circlingChance;
            this._circleDir = Math.random() < 0.5 ? 1 : -1;
            this._behaviorTimer = 3 + Math.random() * 4;
        }

        // 移动：追击玩家（技能施放期间速度减半，但仍移动）
        const p = this.game.player;
        const dx = p.x - this.x, dy = p.y - this.y;
        const dSq = dx * dx + dy * dy;
        const d = Math.sqrt(dSq);

        // 技能施放期间移动速度降低
        const speedMult = this.currentSkill ? 0.4 : 1.0;

        if (d > this.radius + p.radius + 30) {
            if (this._circling && d < 400) {
                // 绕行模式：混合追击+侧向移动
                const perpX = -dy / d, perpY = dx / d; // 垂直于追击方向
                const chaseWeight = 0.35; // 追击权重
                const circleWeight = 0.65 * this._circleDir; // 绕行权重
                this.x += ((dx / d) * chaseWeight + perpX * circleWeight) * this.speed * speedMult * moveDt;
                this.y += ((dy / d) * chaseWeight + perpY * circleWeight) * this.speed * speedMult * moveDt;
            } else {
                // 直线追击
                this.x += (dx / d) * this.speed * speedMult * moveDt;
                this.y += (dy / d) * this.speed * speedMult * moveDt;
            }
        }

        // Contact damage is owned by CollisionSystem: one time-scaled hit,
        // including armor, curse multipliers and the attacker's thorn return.

        // 技能计时
        this.skillTimer -= dt;
        if (this.skillTimer <= 0 && !this.currentSkill && !this._sustainedEffect) {
            this._startSkill();
        }

        // 更新预警
        if (this.telegraph) {
            this.telegraph.timer -= dt;
            if (this.telegraph.timer <= 0) {
                this._executeSkill();
                this.telegraph = null;
            }
        }

        // 持续技能效果
        if (this._sustainedEffect) {
            const eff = this._sustainedEffect;
            eff.timer -= dt;
            this._updateSustainedEffect(eff, dt);
            if (eff.timer <= 0) {
                this._onSustainedEffectEnd(eff);
                this._sustainedEffect = null;
            }
        }
    }

    takeDamage(amount, weaponId = null) {
        if (!this.active || this.hp <= 0 || !Number.isFinite(amount) || amount <= 0) return;

        // 护盾吸收
        if (this.shield > 0) {
            this.shield -= amount;
            this.game.spawnDamageNumber(this.x, this.y - this.radius - 10, Math.ceil(amount), '#8888ff');
            if (this.shield < 0) {
                amount = -this.shield;
                this.shield = 0;
            } else {
                this.flashTimer = 0.08;
                return; // 护盾完全吸收
            }
        }

        // 猎人本能：对Boss额外伤害
        const _p = this.game.player;
        if (_p && _p.hunterDamage > 0) amount *= (1 + _p.hunterDamage);

        // 记录伤害来源（在所有加成之后）
        if (weaponId) {
            let wId = String(weaponId);
            if (wId.includes('_')) {
                const WEAPONS = require('./Weapons').WEAPON_DEFS || {};
                if (!WEAPONS[wId] && !wId.startsWith('boon_') && !wId.startsWith('skill_')) {
                    wId = wId.split('_')[0]; // fallback
                }
            }
            this._damageLog[wId] = (this._damageLog[wId] || 0) + amount;
        } else {
            this._damageLog['_other'] = (this._damageLog['_other'] || 0) + amount;
        }

        // Boss damage belongs in the same run totals as normal enemy damage.
        // Exclude the boss's own overcharge self-damage.
        if (!String(weaponId || '').startsWith('_')) {
            const p = this.game.player;
            p.totalDamage = (p.totalDamage || 0) + amount;
            if (weaponId && this.game._weaponDamageStats) this.game._weaponDamageStats[weaponId] = (this.game._weaponDamageStats[weaponId] || 0) + amount;
        }
        this.hp -= amount;
        this.flashTimer = 0.08;
        this.game.spawnDamageNumber(this.x, this.y - this.radius - 10, Math.ceil(amount), '#ff8800');

        // 受击震屏
        this.game.shakeAmount = 3;
        this.game.shakeDuration = 0.06;

        if (this.hp <= 0) {
            this.active = false;
            this._onDeath();
        } else {
            // 检查阶段转换
            this._checkPhaseTransition();
        }
    }

    _onDeath() {
        if (this._deathHandled) return;
        this._deathHandled = true;
        this.game.bossKills = (this.game.bossKills || 0) + 1;
        if (this.game.particles) this.game.particles.bossExplosion(this.x, this.y, this.color);

        // 触发 Boss 伤害来源面板
        if (this.game._showBossDamageBreakdown) {
            this.game._showBossDamageBreakdown(this._damageLog, this.name);
        }

        // 大爆炸震屏 + 命中停顿（增强反馈）
        this.game.shakeAmount = 20;
        this.game.shakeDuration = 1.2;
        this.game.triggerHitPause(0.12); // Boss 死亡更长停顿
        this.game.triggerScreenPulse(this.color, 0.4);
        vibrate('heavy');

        // 记录击败的Boss（用于成就）
        if (!this.game.defeatedBosses) this.game.defeatedBosses = [];
        if (!this.game.defeatedBosses.includes(this.name)) {
            this.game.defeatedBosses.push(this.name);
        }

        // 掉落大量经验 (增强: 40个经验球，每个30点 = 1200经验)
        for (let i = 0; i < 40; i++) {
            const ox = (Math.random() - 0.5) * 100;
            const oy = (Math.random() - 0.5) * 100;
            this.game.spawnGem(this.x + ox, this.y + oy, 30);
        }

        // 必定掉落宝箱（Boss Rush 模式下跳过，避免 triggerChest 设置 isRunning=false）
        if (!this.game.bossRushMode) {
            this.game.spawnPickup(this.x, this.y, 'chest');
        }

        // 掉落进化核心（优先选择玩家已满级且有被动的武器）
        const p = this.game.player;
        const evolvableWeapons = checkEvolutions(p);
        // 过滤出未解锁的进化
        const lockedEvolutions = evolvableWeapons.filter(evo => !isEvolutionUnlocked(evo.weaponId, evo.isUnion, p, this.game));

        if (lockedEvolutions.length > 0) {
            // 随机选择一个未解锁的进化（而不是总是第一个）
            const chosenEvolution = lockedEvolutions[Math.floor(Math.random() * lockedEvolutions.length)];
            // 掉落进化核心
            const coreX = this.x + (Math.random() - 0.5) * 30;
            const coreY = this.y + (Math.random() - 0.5) * 30;
            this.game.pickups.push(new Pickup(this.game, coreX, coreY, 'evolution_core', { weaponId: chosenEvolution.weaponId, isUnion: chosenEvolution.isUnion }));
            this.game.spawnDamageNumber(coreX, coreY - 20, '💎 进化核心!', '#ff00ff');
        }

        // 额外奖励: 随机掉落2个道具
        const rewardTypes = ['magnet', 'bomb', 'potion'];
        for (let i = 0; i < 2; i++) {
            const reward = rewardTypes[Math.floor(Math.random() * rewardTypes.length)];
            const rx = this.x + (Math.random() - 0.5) * 60;
            const ry = this.y + (Math.random() - 0.5) * 60;
            this.game.spawnPickup(rx, ry, reward);
        }

        this.game.player.kills += 10; // Boss
        // Boss击杀后的恢复时间：下一个Boss至少45秒后才来
        if (this.game.bossTimer < 45) this.game.bossTimer = 45; // 额外击杀数

        // 遗物掉落（Boss Rush模式跳过）
        if (!this.game.bossRushMode) {
            const { grantRelic, getRandomRelics } = require('./Relic');
            const p = this.game.player;
            if (!p.relics) p.relics = [];
            if (p.relics.length < 3) {
                // 第一个Boss必掉遗物，后续40%概率
                const bossCount = this.game.defeatedBosses ? this.game.defeatedBosses.length : 1;
                const dropChance = bossCount <= 1 ? 1.0 : 0.4;
                if (Math.random() < dropChance) {
                    const relics = getRandomRelics(p, 1, { automatic: true });
                    if (relics.length > 0) {
                        const relic = relics[0];
                        grantRelic(p, relic);
                        this.game.spawnDamageNumber(
                            this.x, this.y - 100,
                            '★ 遗物: ' + relic.name, relic.color || '#ffcc00'
                        );
                        if (this.game.triggerScreenPulse) {
                            this.game.triggerScreenPulse((relic.color || '#ffcc00') + '44', 0.8);
                        }
                    }
                }
            }
        }

        this.game.spawnDamageNumber(this.x, this.y - 40, 'BOSS 已击杀!', '#ffcc00');
        SFX.sfxVictory();
    }

    // ─── 技能系统 ───

    _startSkill() {
        const skillId = this.skills[Math.floor(Math.random() * this.skills.length)];
        this.currentSkill = skillId;

        const p = this.game.player;
        const dx = p.x - this.x, dy = p.y - this.y;
        const angle = Math.atan2(dy, dx);

        switch (skillId) {
            case 'charge':
                // 冲撞: 红色箭头预警 1.2 秒
                this.telegraph = {
                    type: 'line', x: this.x, y: this.y,
                    angle: angle, width: 40, length: 400,
                    color: 'rgba(255,0,85,0.4)',
                    timer: 1.2,
                };
                this.skillData = { angle, speed: 600 };
                break;

            case 'nova':
                // 360° 弹幕: 圆形预警 1 秒
                this.telegraph = {
                    type: 'circle', x: this.x, y: this.y,
                    radius: 200, color: 'rgba(255,0,85,0.3)',
                    timer: 1.0,
                };
                break;

            case 'summon':
                // 召唤: 无预警，直接执行
                this.telegraph = { type: 'none', timer: 0.5 };
                break;

            case 'slam':
                // 地面冲击: 圆形预警
                this.telegraph = {
                    type: 'circle', x: p.x, y: p.y,
                    radius: 100, color: 'rgba(170,68,255,0.4)',
                    timer: 1.5,
                };
                this.skillData = { targetX: p.x, targetY: p.y };
                break;

            case 'flameColumn':
                // 多方向火柱
                this.telegraph = {
                    type: 'multi_line', x: this.x, y: this.y,
                    angles: [0, Math.PI / 3, Math.PI * 2 / 3, Math.PI, Math.PI * 4 / 3, Math.PI * 5 / 3],
                    width: 30, length: 350,
                    color: 'rgba(255,102,0,0.35)',
                    timer: 1.3,
                };
                break;

            // Frost Titan skills
            case 'iceWave':
                // 冰波：扇形冰冻波
                this.telegraph = {
                    type: 'cone', x: this.x, y: this.y,
                    angle: angle, width: Math.PI / 3, length: 300,
                    color: 'rgba(102, 204, 255, 0.4)',
                    timer: 1.0,
                };
                this.skillData = { angle };
                break;

            case 'shatter':
                // 碎裂：冰冻所有被冻结敌人造成额外伤害
                this.telegraph = { type: 'none', timer: 0.3 };
                break;

            case 'blizzard':
                // 暴风雪：全屏减速 + 冰冻
                this.telegraph = {
                    type: 'fullscreen', color: 'rgba(102, 204, 255, 0.2)',
                    timer: 1.5,
                };
                break;

            case 'instantFreeze':
                // 瞬冻：瞬间冻结周围
                this.telegraph = {
                    type: 'circle', x: this.x, y: this.y,
                    radius: 200, color: 'rgba(102, 204, 255, 0.5)',
                    timer: 0.8,
                };
                break;

            // Plague Source skills
            case 'poisonRain':
                // 毒雨：全屏毒雨
                this.telegraph = {
                    type: 'fullscreen', color: 'rgba(136, 255, 0, 0.15)',
                    timer: 1.2,
                };
                break;

            case 'plagueCloud':
                // 瘟疫云：召唤毒云
                this.telegraph = {
                    type: 'circle', x: p.x, y: p.y,
                    radius: 80, color: 'rgba(136, 255, 0, 0.4)',
                    timer: 1.0,
                };
                this.skillData = { targetX: p.x, targetY: p.y };
                break;

            case 'mutation':
                // 变异：强化所有敌人
                this.telegraph = { type: 'none', timer: 0.5 };
                break;

            case 'decay':
                // 腐朽：持续伤害光环
                this.telegraph = {
                    type: 'circle', x: this.x, y: this.y,
                    radius: 250, color: 'rgba(136, 255, 0, 0.3)',
                    timer: 1.5,
                };
                break;

            // ═══ 时空裂隙技能 ═══
            case 'timeWarp':
                // 时间扭曲：减缓玩家和子弹
                this.telegraph = {
                    type: 'circle', x: this.x, y: this.y,
                    radius: 300, color: 'rgba(255, 0, 255, 0.2)',
                    timer: 1.0,
                };
                break;

            case 'teleportStorm':
                // 传送风暴：多次瞬移攻击
                this.telegraph = { type: 'none', timer: 0.3 };
                break;

            case 'voidRift':
                // 虚空裂隙：在玩家位置创建伤害区域
                this.telegraph = {
                    type: 'circle', x: p.x, y: p.y,
                    radius: 100, color: 'rgba(255, 0, 255, 0.4)',
                    timer: 1.2,
                };
                this.skillData = { targetX: p.x, targetY: p.y };
                break;

            case 'cloneArmy':
                // 分身大军：召唤幻影
                this.telegraph = { type: 'none', timer: 0.5 };
                break;

            // ═══ 机械统帅技能 ═══
            case 'laserGrid':
                // 激光网格：交叉激光
                this.telegraph = {
                    type: 'multi_line', x: this.x, y: this.y,
                    angles: [0, Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4, Math.PI, Math.PI * 5 / 4, Math.PI * 3 / 2, Math.PI * 7 / 4],
                    width: 15, length: 400,
                    color: 'rgba(255, 204, 0, 0.3)',
                    timer: 1.5,
                };
                break;

            case 'missileBarrage':
                // 导弹轰炸：大量追踪导弹
                this.telegraph = { type: 'none', timer: 0.3 };
                break;

            case 'shieldWall':
                // 护盾墙：获得护盾
                this.telegraph = { type: 'none', timer: 0.3 };
                break;

            case 'overcharge':
                // 过载：自爆式攻击
                this.telegraph = {
                    type: 'circle', x: this.x, y: this.y,
                    radius: 250, color: 'rgba(255, 204, 0, 0.5)',
                    timer: 2.0,
                };
                break;

            // ═══ 新通用技能 ═══
            case 'bulletHell':
                // 弹幕地狱：密集子弹覆盖
                this.telegraph = {
                    type: 'circle', x: this.x, y: this.y,
                    radius: 350, color: `rgba(255,80,80,0.2)`,
                    timer: 0.8,
                };
                break;

            case 'gravitySuck':
                // 引力吸附：将玩家拉向Boss
                this.telegraph = {
                    type: 'circle', x: this.x, y: this.y,
                    radius: 300, color: 'rgba(255,0,85,0.25)',
                    timer: 1.5,
                };
                break;

            case 'spiralBurst':
                // 螺旋爆发：旋转弹幕
                this.telegraph = {
                    type: 'circle', x: this.x, y: this.y,
                    radius: 250, color: `rgba(${this.color === '#aa44ff' ? '170,68,255' : '255,0,255'},0.25)`,
                    timer: 1.0,
                };
                this.skillData = { startAngle: Math.random() * Math.PI * 2 };
                break;

            case 'darkPulse':
                // 暗脉冲：全屏冲击波
                this.telegraph = {
                    type: 'fullscreen', color: 'rgba(80,0,200,0.3)',
                    timer: 1.8,
                };
                break;

            case 'electricField':
                // 电磁场：在玩家位置生成电击区
                this.telegraph = {
                    type: 'circle', x: p.x, y: p.y,
                    radius: 120, color: 'rgba(255,255,0,0.35)',
                    timer: 1.2,
                };
                this.skillData = { targetX: p.x, targetY: p.y };
                break;

            case 'dash':
                // 瞬步突进：快速冲刺到玩家附近（预警极短）
                this.telegraph = {
                    type: 'line', x: this.x, y: this.y,
                    angle: angle, width: 25, length: 200,
                    color: `rgba(${parseInt(this.color.slice(1,3),16)},${parseInt(this.color.slice(3,5),16)},${parseInt(this.color.slice(5,7),16)},0.5)`,
                    timer: 0.4,
                };
                this.skillData = { targetAngle: angle };
                break;

            case 'carpetBombing':
                // 地毯轰炸: 同时在周围投下多个大范围圆形预警，延时爆炸
                const bombTargets = [];
                for (let i = 0; i < 6; i++) {
                    bombTargets.push({
                        x: p.x + (Math.random() - 0.5) * 400,
                        y: p.y + (Math.random() - 0.5) * 400
                    });
                }
                this.telegraph = {
                    type: 'multi_circle',
                    targets: bombTargets,
                    radius: 120, color: 'rgba(255, 50, 0, 0.4)',
                    timer: 2.0,
                };
                this.skillData = { bombTargets };
                break;

            case 'deathRay':
                // 死亡射线: Boss 锁定玩家并射出一道随着时间缓慢旋转的极粗激光
                const rayAngle = Math.atan2(p.y - this.y, p.x - this.x);
                this.telegraph = {
                    type: 'line',
                    x: this.x, y: this.y,
                    angle: rayAngle, width: 80, length: 1200, // 霸屏长粗激光
                    color: 'rgba(255, 0, 255, 0.6)',
                    timer: 1.5,
                };
                // 保存初始照射角度，以供扫射旋转
                this.skillData = { angle: rayAngle, rotateSpeed: Math.random() < 0.5 ? 0.8 : -0.8 };
                break;

            // ═══ 新持续技能 ═══
            case 'laserSweep': {
                // 旋转激光：从背后起始扫过玩家
                const laserStartA = Math.atan2(p.y - this.y, p.x - this.x) + Math.PI;
                this.telegraph = {
                    type: 'line', x: this.x, y: this.y,
                    angle: laserStartA, width: 22, length: 385,
                    color: 'rgba(255,255,0,0.45)',
                    timer: 1.3,
                };
                this.skillData = { laserStartA };
                break;
            }
            case 'deathMark':
                // 死亡标记：标记玩家位置，2秒后AOE爆炸
                this.telegraph = {
                    type: 'circle', x: p.x, y: p.y,
                    radius: 130, color: 'rgba(255,30,30,0.3)',
                    timer: 1.2,
                };
                this.skillData = { targetX: p.x, targetY: p.y };
                break;

            case 'shockwave':
                // 冲击波：向外扩展的圆形波，接触即伤
                this.telegraph = {
                    type: 'circle', x: this.x, y: this.y,
                    radius: 60, color: 'rgba(255,255,255,0.3)',
                    timer: 0.8,
                };
                break;

            case 'mineField':
                // 地雷阵：无预警，标记玩家当前位置
                this.telegraph = { type: 'none', timer: 0.5 };
                this.skillData = { targetX: p.x, targetY: p.y };
                break;

            case 'tripleChase': {
                // 三连追踪：精准对准玩家
                const tcA = Math.atan2(p.y - this.y, p.x - this.x);
                this.telegraph = {
                    type: 'line', x: this.x, y: this.y,
                    angle: tcA, width: 28, length: 360,
                    color: 'rgba(255,200,0,0.55)',
                    timer: 0.8,
                };
                this.skillData = { angle: tcA };
                break;
            }

            case 'crescentBlast':
                // 连环爆发：连续3波全向弹幕
                this.telegraph = {
                    type: 'circle', x: this.x, y: this.y,
                    radius: 320, color: 'rgba(255,100,50,0.2)',
                    timer: 0.9,
                };
                break;

            case 'scatter': {
                // 分散冲刺：向3个方向同时冲刺并释放弹幕
                const baseA = Math.atan2(p.y - this.y, p.x - this.x);
                const scatterAngles = [baseA - 0.7, baseA, baseA + 0.7];
                this.telegraph = {
                    type: 'multi_line', x: this.x, y: this.y,
                    angles: scatterAngles, width: 18, length: 300,
                    color: 'rgba(255,160,50,0.3)',
                    timer: 1.0,
                };
                this.skillData = { scatterAngles };
                break;
            }
            case 'poisonOrbs':
                // 毒素球：7个低速大型毒素球扩散填满场地
                this.telegraph = {
                    type: 'fullscreen', color: 'rgba(136,255,0,0.1)',
                    timer: 0.8,
                };
                break;

            // ═══ 幻影刺客技能 ═══
            case 'shadowStrike':
                // 暗影突袭：标记玩家背后位置，短时间后传送并挥斩
                const backAngle = angle + Math.PI;
                const distOffset = 80;
                this.skillData = {
                    targetX: p.x + fastCos(backAngle) * distOffset,
                    targetY: p.y + fastSin(backAngle) * distOffset,
                    angle: angle,
                };
                this.telegraph = {
                    type: 'circle', x: this.skillData.targetX, y: this.skillData.targetY,
                    radius: 40, color: 'rgba(255,0,0,0.5)',
                    timer: 0.6,
                };
                break;
            case 'shurikenSprink':
                // 散花手里剑：无预警（或圆形快速预警）
                this.telegraph = {
                    type: 'circle', x: this.x, y: this.y,
                    radius: 150, color: 'rgba(50,50,50,0.3)',
                    timer: 0.5,
                };
                break;

            // ═══ 鲜血领主技能 ═══
            case 'bloodPool':
                // 血池：在玩家脚下生成一个逐渐扩大的血池预警
                this.skillData = { targetX: p.x, targetY: p.y };
                this.telegraph = {
                    type: 'circle', x: p.x, y: p.y,
                    radius: 120, color: 'rgba(200,0,0,0.4)',
                    timer: 1.5,
                };
                break;
            case 'lifeDrain':
                // 生命汲取：连线预警
                this.telegraph = {
                    type: 'line', x: this.x, y: this.y,
                    angle: angle, width: 20, length: 500,
                    color: 'rgba(255,50,50,0.6)',
                    timer: 1.0,
                };
                this.skillData = { targetX: p.x, targetY: p.y };
                break;
            case 'bloodBeam':
                // 鲜血死光：超宽的直线激光预警
                this.telegraph = {
                    type: 'line', x: this.x, y: this.y,
                    angle: angle, width: 80, length: 800,
                    color: 'rgba(255,0,0,0.3)',
                    timer: 1.8,
                };
                this.skillData = { angle };
                break;
            case 'summonBats':
                // 召唤血蝙蝠：瞬间全屏红光预警
                this.telegraph = { type: 'fullscreen', color: 'rgba(200,0,0,0.2)', timer: 0.5 };
                break;
        }

        // 根据阶段缩短预警时间（提高压迫感）
        if (this.telegraph && this.telegraph.timer) {
            if (this.phase === 2) this.telegraph.timer *= 0.8;   // 狂暴: -20%
            if (this.phase === 3) this.telegraph.timer *= 0.65;  // 拼命: -35%
        }
    }

    _executeSkill() {
        const p = this.game.player;

        switch (this.currentSkill) {
            case 'charge': {
                // 快速冲向锁定方向
                const a = this.skillData.angle;
                const targetX = this.x + fastCos(a) * 400;
                const targetY = this.y + fastSin(a) * 400;
                // 瞬移到目标附近
                this.x = targetX;
                this.y = targetY;
                // 路径上的伤害
                const d = Math.hypot(p.x - targetX, p.y - targetY);
                if (d < 50) p.takeDamage(45);
                this.game.shakeAmount = 5;
                this.game.shakeDuration = 0.15;
                break;
            }
            case 'nova': {
                // 12 方向弹幕
                for (let i = 0; i < 18; i++) {
                    const a = (i / 18) * Math.PI * 2;
                    this.game.spawnEnemyBullet(
                        this.x, this.y,
                        fastCos(a) * 210, fastSin(a) * 210,
                        5, 22, 3, this.color
                    );
                }
                break;
            }
            case 'summon': {
                // 召唤一波敌人
                for (let i = 0; i < 6; i++) {
                    const a = Math.random() * Math.PI * 2;
                    const dist = 80 + Math.random() * 40;
                    this.game.spawnEnemyAt(
                        this.x + fastCos(a) * dist,
                        this.y + fastSin(a) * dist,
                        'Bat'
                    );
                }
                break;
            }
            case 'slam': {
                // 目标位置 AOE 伤害
                const td = Math.hypot(p.x - this.skillData.targetX, p.y - this.skillData.targetY);
                if (td < 100) p.takeDamage(38);
                this.game.shakeAmount = 4;
                this.game.shakeDuration = 0.12;
                break;
            }
            case 'flameColumn': {
                // 多方向伤害检测
                const angles = [0, Math.PI / 3, Math.PI * 2 / 3, Math.PI, Math.PI * 4 / 3, Math.PI * 5 / 3];
                for (const a of angles) {
                    // 检查玩家是否在火柱上
                    const pdx = p.x - this.x, pdy = p.y - this.y;
                    const pd = Math.hypot(pdx, pdy);
                    if (pd < 350) {
                        const pa = Math.atan2(pdy, pdx);
                        const diff = Math.abs(pa - a);
                        if (diff < 0.15 || Math.abs(diff - Math.PI * 2) < 0.15) {
                            p.takeDamage(30);
                        }
                    }
                }
                this.game.shakeAmount = 3;
                this.game.shakeDuration = 0.1;
                break;
            }

            // Frost Titan skill execution
            case 'iceWave': {
                // Ice wave in cone - damage + slow + freeze
                const waveAngle = this.skillData.angle;
                for (const e of [p]) {
                    const dx = e.x - this.x, dy = e.y - this.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < 300) {
                        const a = Math.atan2(dy, dx);
                        let angleDiff = Math.abs(a - waveAngle);
                        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
                        if (angleDiff < Math.PI / 6) {
                            p.takeDamage(38);
                            if (p.slowAmount) p.slowAmount = 0.5;
                            if (p.slowed !== undefined) p.slowed = 3;
                        }
                    }
                }
                // Visual particles
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 20, speed: 300, life: 0.5, color: '#66ccff', size: 5 });
                }
                break;
            }

            case 'shatter': {
                // Shatter all frozen enemies - bonus damage
                for (const e of this.game.enemies) {
                    if (e.active && e.frozen > 0) {
                        e.takeDamage(30);
                        e.frozen = 0;
                        if (this.game.particles) {
                            this.game.particles.emit(e.x, e.y, { count: 10, speed: 100, life: 0.3, color: '#66ccff', size: 3 });
                        }
                    }
                }
                // 碎裂也伤害玩家（冰霜冲击波）
                if (Math.hypot(p.x - this.x, p.y - this.y) < 300) {
                    p.takeDamage(25);
                }
                this.game.shakeAmount = 5;
                this.game.shakeDuration = 0.2;
                break;
            }

            case 'blizzard': {
                // Blizzard - slow all + random freezes
                for (const e of this.game.enemies) {
                    if (e.active) {
                        e.slowed = 5;
                        e.slowAmount = 0.5;
                        if (Math.random() < 0.3) e.frozen = 2;
                    }
                }
                // 暴风雪也减速和伤害玩家
                p.slowed = 4;
                p.slowAmount = 0.6;
                p.takeDamage(15);
                this.game.shakeAmount = 2;
                this.game.shakeDuration = 0.3;
                break;
            }

            case 'instantFreeze': {
                // Freeze nearby enemies and player
                for (const e of this.game.enemies) {
                    if (e.active && Math.hypot(e.x - this.x, e.y - this.y) < 200) {
                        e.frozen = 3;
                    }
                }
                if (Math.hypot(p.x - this.x, p.y - this.y) < 200) {
                    p.takeDamage(15);
                }
                break;
            }

            // Plague Source skill execution
            case 'poisonRain': {
                // Poison rain on all enemies
                for (let i = 0; i < 15; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * 300;
                    const tx = this.x + fastCos(angle) * dist;
                    const ty = this.y + fastSin(angle) * dist;
                    // Create poison bullet falling
                    this.game.spawnEnemyBullet(
                        tx, ty - 200, 0, 200,
                        4, 8, 1.5, '#88ff00'
                    );
                }
                break;
            }

            case 'plagueCloud': {
                // Create poison cloud at target location
                const { targetX, targetY } = this.skillData;
                // Damage enemies in radius
                for (const e of this.game.enemies) {
                    if (e.active && Math.hypot(e.x - targetX, e.y - targetY) < 80) {
                        e.poisoned = 5;
                        e.poisonStacks += 3;
                    }
                }
                if (Math.hypot(p.x - targetX, p.y - targetY) < 80) {
                    p.takeDamage(20);
                }
                break;
            }

            case 'mutation': {
                // Buff all enemies
                for (const e of this.game.enemies) {
                    if (e.active) {
                        e.hp *= 1.5;
                        e.maxHp *= 1.5;
                        e.speed *= 1.3;
                    }
                }
                break;
            }

            case 'decay': {
                // Decay aura - damage over time
                for (const e of this.game.enemies) {
                    if (e.active && Math.hypot(e.x - this.x, e.y - this.y) < 250) {
                        e.poisoned = 3;
                        e.poisonStacks += 2;
                    }
                }
                if (Math.hypot(p.x - this.x, p.y - this.y) < 250) {
                    p.takeDamage(10);
                }
                break;
            }

            // ═══ 时空裂隙技能执行 ═══
            case 'timeWarp': {
                // 时间扭曲：减缓玩家
                if (Math.hypot(p.x - this.x, p.y - this.y) < 300) {
                    p.slowed = 3;
                    p.slowAmount = 0.5;
                }
                // 减缓玩家子弹
                for (const b of this.game.bullets) {
                    b.vx *= 0.5;
                    b.vy *= 0.5;
                }
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 30, speed: 100, life: 0.5, color: '#ff00ff', size: 4 });
                }
                break;
            }

            case 'teleportStorm': {
                // 传送风暴：多次瞬移攻击
                for (let i = 0; i < 5; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 100 + Math.random() * 100;
                    const tx = p.x + fastCos(angle) * dist;
                    const ty = p.y + fastSin(angle) * dist;
                    // 在当前位置发射弹幕
                    for (let j = 0; j < 4; j++) {
                        const a = (j / 4) * Math.PI * 2;
                        this.game.spawnEnemyBullet(
                            this.x, this.y,
                            fastCos(a) * 200, fastSin(a) * 200,
                            4, 10, 2, '#ff00ff'
                        );
                    }
                    // 瞬移
                    this.x = tx;
                    this.y = ty;
                }
                this.game.shakeAmount = 6;
                this.game.shakeDuration = 0.3;
                break;
            }

            case 'voidRift': {
                // 虚空裂隙：创建持续伤害区域
                const { targetX, targetY } = this.skillData;
                this._sustainedEffect = {
                    type: 'voidRift',
                    timer: 3.0,
                    x: targetX,
                    y: targetY,
                    radius: 100,
                    _tick: 0,
                };
                // 生成视觉效果
                if (this.game.particles) {
                    this.game.particles.emit(targetX, targetY, { count: 40, speed: 150, life: 0.6, color: '#ff00ff', size: 5 });
                }
                this.game.shakeAmount = 4;
                this.game.shakeDuration = 0.2;
                break;
            }

            case 'cloneArmy': {
                // 分身大军：召唤幻影敌人
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const dist = 120;
                    this.game.spawnEnemyAt(
                        this.x + fastCos(angle) * dist,
                        this.y + fastSin(angle) * dist,
                        'Phantom'
                    );
                }
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 20, speed: 80, life: 0.4, color: '#ff88ff', size: 3 });
                }
                break;
            }

            // ═══ 机械统帅技能执行 ═══
            case 'laserGrid': {
                // 激光网格：多方向激光
                const angles = [0, Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4, Math.PI, Math.PI * 5 / 4, Math.PI * 3 / 2, Math.PI * 7 / 4];
                for (const a of angles) {
                    const pdx = p.x - this.x, pdy = p.y - this.y;
                    const pd = Math.hypot(pdx, pdy);
                    if (pd < 400) {
                        const pa = Math.atan2(pdy, pdx);
                        const diff = Math.abs(pa - a);
                        if (diff < 0.1 || Math.abs(diff - Math.PI * 2) < 0.1 || Math.abs(diff - Math.PI) < 0.1) {
                            p.takeDamage(30);
                        }
                    }
                }
                this.game.shakeAmount = 5;
                this.game.shakeDuration = 0.2;
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 50, speed: 300, life: 0.3, color: '#ffcc00', size: 3 });
                }
                break;
            }

            case 'missileBarrage': {
                // 导弹轰炸：大量追踪导弹
                for (let i = 0; i < 12; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    this.game.spawnEnemyBullet(
                        this.x, this.y,
                        fastCos(angle) * 100, fastSin(angle) * 100,
                        6, 12, 5, '#ffcc00'
                    );
                }
                break;
            }

            case 'shieldWall': {
                // 护盾墙：获得护盾
                this.shield = this.maxHp * 0.3;
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 15, speed: 60, life: 0.4, color: '#ffcc00', size: 4 });
                }
                break;
            }

            case 'overcharge': {
                // 过载：自爆式攻击
                const damage = 50;
                if (Math.hypot(p.x - this.x, p.y - this.y) < 250) {
                    p.takeDamage(damage);
                }
                // 自身也受伤害（走 takeDamage 以触发阶段转换）
                this.takeDamage(this.maxHp * 0.05, '_overcharge');
                this.game.shakeAmount = 15;
                this.game.shakeDuration = 0.5;
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 80, speed: 400, life: 0.8, color: '#ffcc00', size: 8 });
                }
                break;
            }

            case 'carpetBombing': {
                // 地毯轰炸：预定位置爆炸（最多命中一次，防止重叠区域叠加伤害）
                const targets = this.skillData.bombTargets || [];
                let bombHit = false;
                for (const target of targets) {
                    if (!bombHit && Math.hypot(p.x - target.x, p.y - target.y) < 120) {
                        p.takeDamage(45);
                        bombHit = true;
                    }
                    if (this.game.particles) {
                        this.game.particles.emit(target.x, target.y, { count: 30, speed: 180, life: 0.5, color: '#ff3300', size: 6 });
                    }
                }
                this.game.shakeAmount = 15;
                this.game.shakeDuration = 0.5;
                break;
            }

            case 'deathRay': {
                // 死亡射线：转为持续技能，在 _updateSustainedEffect 里处理扫射
                this._sustainedEffect = {
                    type: 'deathRay',
                    timer: 3.0, // 扫射持续3秒
                    angle: this.skillData.angle,
                    rotateSpeed: this.skillData.rotateSpeed,
                    _tick: 0,
                    _hitCooldown: 0
                };
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 40, speed: 200, life: 0.4, color: '#ff00ff', size: 5 });
                }
                break;
            }

            // ═══ 幻影刺客技能执行 ═══
            case 'shadowStrike': {
                // 暗影突袭：瞬移到预测位置并挥斩
                this.x = this.skillData.targetX;
                this.y = this.skillData.targetY;
                if (Math.hypot(p.x - this.x, p.y - this.y) < 60) {
                    p.takeDamage(60);
                }
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 30, speed: 200, life: 0.4, color: '#ff2222', size: 5 });
                }
                this.game.shakeAmount = 8;
                this.game.shakeDuration = 0.2;
                break;
            }
            case 'shurikenSprink': {
                // 散花手里剑：快速向四周发射一圈高速手里剑
                for (let i = 0; i < 18; i++) {
                    const a = (i / 18) * Math.PI * 2;
                    this.game.spawnEnemyBullet(
                        this.x, this.y,
                        fastCos(a) * 350, fastSin(a) * 350,
                        4, 15, 2.5, '#555555'
                    );
                }
                break;
            }

            // ═══ 鲜血领主技能执行 ═══
            case 'bloodPool': {
                // 血池：生成一个血池持续伤害区域
                this._sustainedEffect = {
                    type: 'bloodPool',
                    timer: 6.0,
                    x: this.skillData.targetX,
                    y: this.skillData.targetY,
                    radius: 120,
                    _tick: 0
                };
                break;
            }
            case 'lifeDrain': {
                // 生命汲取：汲取大范围内的生命
                const dist = Math.hypot(p.x - this.x, p.y - this.y);
                if (dist < 450) { // 稍微宽松一点判定
                    if (p.takeDamage(35)) {
                        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.05); // 回血 5%
                    }
                    if (this.game.particles) {
                        this.game.particles.emit(this.x, this.y, { count: 40, speed: 100, life: 0.5, color: '#ff2222', size: 3 });
                    }
                    // 连线特效由发射部分处理，此处不再补充
                }
                break;
            }
            case 'bloodBeam': {
                // 鲜血死光：直线宽范围伤害
                const a = this.skillData.angle;
                const distMatch = Math.hypot(p.x - this.x, p.y - this.y);
                const angleMatch = Math.atan2(p.y - this.y, p.x - this.x);
                let diff = Math.abs(angleMatch - a);
                while (diff > Math.PI) diff -= Math.PI * 2;
                diff = Math.abs(diff);

                if (distMatch < 800 && diff < 0.15) { // 极宽的激光
                    p.takeDamage(65);
                }
                this.game.shakeAmount = 12;
                this.game.shakeDuration = 0.5;
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 60, speed: 400, life: 0.6, color: '#ff0022', size: 6 });
                }
                break;
            }
            case 'summonBats': {
                // 召唤血蝙蝠：在周围生成一波吸血蝙蝠精英
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    const dist = 120;
                    const e = this.game.spawnEnemyAt(
                        this.x + fastCos(angle) * dist,
                        this.y + fastSin(angle) * dist,
                        'Bat'
                    );
                    if (e) {
                        e.isElite = true;
                        e.hp *= 3;
                        e.maxHp = e.hp;
                        e.vampiricAffix = true;
                        e.color = '#ff0033';
                    }
                }
                break;
            }

            // ═══ 新通用技能执行 ═══
            case 'bulletHell': {
                // 弹幕地狱：30颗高速子弹全覆盖
                for (let i = 0; i < 30; i++) {
                    const a = (i / 30) * Math.PI * 2;
                    const speed = 170 + Math.random() * 130;
                    this.game.spawnEnemyBullet(
                        this.x, this.y,
                        fastCos(a) * speed, fastSin(a) * speed,
                        5, 16, 3.5, this.color
                    );
                }
                // 第二圈错位弹幕
                for (let i = 0; i < 22; i++) {
                    const a = (i / 22) * Math.PI * 2 + Math.PI / 22;
                    this.game.spawnEnemyBullet(
                        this.x, this.y,
                        fastCos(a) * 130, fastSin(a) * 130,
                        4, 12, 4, this.color
                    );
                }
                this.game.shakeAmount = 5;
                this.game.shakeDuration = 0.2;
                break;
            }

            case 'gravitySuck': {
                // 引力吸附：将玩家快速拉向 Boss
                const gdx = this.x - p.x, gdy = this.y - p.y;
                const gdSq = gdx * gdx + gdy * gdy;
                if (gdSq > 25) {
                    const gd = Math.sqrt(gdSq);
                    // 修复瞬移 Bug: 把单帧瞬移 200 像素的最大拉力削弱到极小范围的打断
                    const pullStrength = Math.min(gd * 0.1, 30);
                    p.x += (gdx / gd) * pullStrength;
                    p.y += (gdy / gd) * pullStrength;
                }
                // 拉近后造成爆发伤害
                const gAfterDx = p.x - this.x, gAfterDy = p.y - this.y;
                if (gAfterDx * gAfterDx + gAfterDy * gAfterDy < 6400) {
                    p.takeDamage(50);
                }
                // 粒子效果
                if (this.game.particles) {
                    for (let i = 0; i < 8; i++) {
                        const a = (i / 8) * Math.PI * 2;
                        this.game.particles.emit(p.x + fastCos(a) * 40, p.y + fastSin(a) * 40,
                            { count: 3, speed: 80, life: 0.3, color: this.color, size: 4 });
                    }
                }
                this.game.shakeAmount = 6;
                this.game.shakeDuration = 0.25;
                break;
            }

            case 'spiralBurst': {
                // 螺旋爆发：两圈错位螺旋弹幕
                const startA = this.skillData.startAngle || 0;
                for (let i = 0; i < 24; i++) {
                    const a = startA + (i / 24) * Math.PI * 2;
                    this.game.spawnEnemyBullet(
                        this.x, this.y,
                        fastCos(a) * 220, fastSin(a) * 220,
                        5, 16, 3, this.color
                    );
                }
                for (let i = 0; i < 16; i++) {
                    const a = startA + Math.PI / 18 + (i / 16) * Math.PI * 2;
                    this.game.spawnEnemyBullet(
                        this.x, this.y,
                        fastCos(a) * 155, fastSin(a) * 155,
                        4, 10, 4.5, this.glowColor
                    );
                }
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 20, speed: 120, life: 0.4, color: this.color, size: 4 });
                }
                break;
            }

            case 'darkPulse': {
                // 暗脉冲：全屏AOE，伤害随距离衰减
                const dpDx = p.x - this.x, dpDy = p.y - this.y;
                const dist2p = Math.sqrt(dpDx * dpDx + dpDy * dpDy);
                const dmgFalloff = Math.max(0.3, 1 - dist2p / 500);
                p.takeDamage(Math.ceil(58 * dmgFalloff));
                // 推飞附近敌人（便于玩家喘息，增加节奏变化）
                for (const e of this.game.enemies) {
                    if (!e.active) continue;
                    const ed = Math.hypot(e.x - this.x, e.y - this.y);
                    if (ed < 300 && ed > 0) {
                        e.x += (e.x - this.x) / ed * 80;
                        e.y += (e.y - this.y) / ed * 80;
                    }
                }
                this.game.shakeAmount = 12;
                this.game.shakeDuration = 0.4;
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 60, speed: 350, life: 0.6, color: '#8844ff', size: 6 });
                }
                if (this.game.triggerScreenPulse) {
                    this.game.triggerScreenPulse('#44008844', 0.5);
                }
                break;
            }

            case 'electricField': {
                // 电磁场：目标位置8方向电弧
                const { targetX, targetY } = this.skillData;
                for (let i = 0; i < 8; i++) {
                    const a = (i / 8) * Math.PI * 2;
                    this.game.spawnEnemyBullet(
                        targetX, targetY,
                        fastCos(a) * 180, fastSin(a) * 180,
                        5, 18, 2.5, '#ffff00'
                    );
                }
                if (Math.hypot(p.x - targetX, p.y - targetY) < 120) {
                    p.takeDamage(35);
                }
                if (this.game.particles) {
                    this.game.particles.emit(targetX, targetY, { count: 30, speed: 200, life: 0.4, color: '#ffff44', size: 4 });
                }
                this.game.shakeAmount = 4;
                this.game.shakeDuration = 0.15;
                break;
            }

            case 'dash': {
                // 瞬步突进：快速冲刺到玩家附近
                const tAngle = this.skillData.targetAngle;
                const dashDist = 140 + Math.random() * 60; // 140-200px
                this.x = p.x - fastCos(tAngle) * dashDist;
                this.y = p.y - fastSin(tAngle) * dashDist;
                // 冲刺到位后造成伤害（范围略大于接触判定）
                const dAfterDx = p.x - this.x, dAfterDy = p.y - this.y;
                if (dAfterDx * dAfterDx + dAfterDy * dAfterDy < 10000) { // 100px
                    p.takeDamage(42);
                }
                // 拖尾粒子
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 15, speed: 100, life: 0.3, color: this.color, size: 5 });
                }
                this.game.shakeAmount = 5;
                this.game.shakeDuration = 0.2;
                break;
            }

            // ═══ 新持续技能执行 ═══
            case 'laserSweep': {
                // 启动旋转激光持续效果
                this._sustainedEffect = {
                    type: 'laserSweep',
                    timer: 2.5,
                    angle: (this.skillData && this.skillData.laserStartA != null) ? this.skillData.laserStartA : Math.random() * Math.PI * 2,
                    rotSpeed: Math.PI * 0.86, // 约155°/秒，2.3秒扫一圈
                    _hitCooldown: 0,
                };
                break;
            }
            case 'deathMark': {
                // 启动死亡标记，2秒后爆炸
                this._sustainedEffect = {
                    type: 'deathMark',
                    timer: 2.0,
                    targetX: this.skillData.targetX,
                    targetY: this.skillData.targetY,
                };
                break;
            }
            case 'shockwave': {
                // 启动扩展冲击波
                this._sustainedEffect = {
                    type: 'shockwave',
                    timer: 0.7,
                    radius: this.radius + 15,
                    speed: 520,
                    triggered: false,
                };
                this.game.shakeAmount = 4;
                this.game.shakeDuration = 0.1;
                break;
            }
            case 'crescentBlast': {
                // 第一波立即发射
                for (let i = 0; i < 16; i++) {
                    const a = (i / 16) * Math.PI * 2;
                    this.game.spawnEnemyBullet(
                        this.x, this.y,
                        fastCos(a) * 175, fastSin(a) * 175,
                        5, 15, 3.5, this.color
                    );
                }
                // 后续2波由持续效果处理
                this._sustainedEffect = {
                    type: 'crescentBlast',
                    timer: 0.9,
                    salvosLeft: 2,
                    nextSalvo: 0.42,
                };
                this.game.shakeAmount = 5;
                this.game.shakeDuration = 0.15;
                break;
            }

            case 'mineField': {
                // 地雷阵：在玩家原始位置放6个缓速大型地雷
                const offsets = [[0, 0], [85, 0], [-85, 0], [0, 85], [0, -85], [60, -60]];
                for (const [ox, oy] of offsets) {
                    const mx = this.skillData.targetX + ox + (Math.random() - 0.5) * 50;
                    const my = this.skillData.targetY + oy + (Math.random() - 0.5) * 50;
                    const va = Math.random() * Math.PI * 2;
                    this.game.spawnEnemyBullet(mx, my, fastCos(va) * 22, fastSin(va) * 22, 18, 40, 4.0, '#ff5500');
                }
                if (this.game.particles) {
                    this.game.particles.emit(this.skillData.targetX, this.skillData.targetY, { count: 20, speed: 150, life: 0.4, color: '#ff5500', size: 5 });
                }
                this.game.shakeAmount = 4;
                this.game.shakeDuration = 0.15;
                break;
            }

            case 'tripleChase': {
                // 三连追踪：向玩家方向发射扇形弹幕，追3波
                const tcBaseA = this.skillData.angle;
                for (let i = 0; i < 5; i++) {
                    const spread = (i - 2) * 0.18;
                    const a = tcBaseA + spread;
                    this.game.spawnEnemyBullet(this.x, this.y, fastCos(a) * 265, fastSin(a) * 265, 5, 22, 2.5, this.color);
                }
                this._sustainedEffect = {
                    type: 'tripleChase',
                    timer: 0.75,
                    salvosLeft: 2,
                    nextSalvo: 0.32,
                };
                this.game.shakeAmount = 4;
                this.game.shakeDuration = 0.12;
                break;
            }

            case 'scatter': {
                // 向3个方向同时爆炸冲刺
                const origX = this.x, origY = this.y;
                const angles = (this.skillData && this.skillData.scatterAngles) || [];
                for (const sa of angles) {
                    const tx = origX + fastCos(sa) * 270;
                    const ty = origY + fastSin(sa) * 270;
                    for (let i = 0; i < 6; i++) {
                        const ba = (i / 6) * Math.PI * 2;
                        this.game.spawnEnemyBullet(
                            tx, ty,
                            fastCos(ba) * 165, fastSin(ba) * 165,
                            5, 18, 3.2, this.color
                        );
                    }
                    const ddx = p.x - tx, ddy = p.y - ty;
                    if (ddx * ddx + ddy * ddy < 6400) p.takeDamage(28); // 80px
                    if (this.game.particles) {
                        this.game.particles.emit(tx, ty, { count: 10, speed: 130, life: 0.3, color: this.glowColor, size: 5 });
                    }
                }
                this.game.shakeAmount = 8;
                this.game.shakeDuration = 0.3;
                break;
            }
            case 'poisonOrbs': {
                // 7个低速大型毒素球
                for (let i = 0; i < 7; i++) {
                    const a = (i / 7) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
                    this.game.spawnEnemyBullet(
                        this.x, this.y,
                        fastCos(a) * 45, fastSin(a) * 45,
                        14, 14, 7.0, '#88ff00'
                    );
                }
                if (this.game.particles) {
                    this.game.particles.emit(this.x, this.y, { count: 18, speed: 55, life: 0.5, color: '#88ff00', size: 6 });
                }
                break;
            }
        }

        this.currentSkill = null;
        // 技能冷却受阶段影响
        let cooldownMult = 1;
        if (this.phase === 2) cooldownMult = 0.7;  // 狂暴: -30%
        if (this.phase === 3) cooldownMult = 0.45; // 拼命: -55%
        this.skillTimer = (this.baseSkillCooldown + Math.random() * 1.5) * cooldownMult;

        // 拼命阶段：35% 概率技能连招（0.6秒后立即再来一个技能）
        if (this.phase === 3 && Math.random() < 0.50) {
            this.skillTimer = 0.6;
        }
    }

    // ─── 多阶段系统 ───

    _checkPhaseTransition() {
        const hpPercent = this.hp / this.maxHp;
        let newPhase = 1;
        if (hpPercent <= 0.35) newPhase = 3;
        else if (hpPercent <= 0.70) newPhase = 2;

        if (newPhase > this.phase) {
            this.phase = newPhase;
            this._onPhaseChange(newPhase);
        }
    }

    _onPhaseChange(phase) {
        if (phase === 2) {
            // 狂暴阶段: 速度+25%
            this.speed = this.baseSpeed * 1.25;
            this.game.shakeAmount = 8;
            this.game.shakeDuration = 0.5;
            this.game.spawnDamageNumber(this.x, this.y - this.radius - 30, '⚠️ 狂暴!', '#ff4444');
            if (this.game.particles) {
                this.game.particles.bossExplosion(this.x, this.y, '#ff4444');
            }
            this.game.triggerScreenPulse('rgba(255,68,68,0.5)', 0.5);
            SFX.sfxBossPhase();
        } else if (phase === 3) {
            // 拼命阶段: 速度+50%，强制进入激进绕行模式
            this.speed = this.baseSpeed * 1.5;
            this._circling = true; // 激怒后开始绕行
            this.game.triggerHitPause(0.2); // 长达0.2s的卡顿
            this.game.shakeAmount = 15;
            this.game.shakeDuration = 0.8;
            this.game.triggerScreenPulse('rgba(255,0,0,0.3)', 0.5); // 降低 Boss 转阶时的疯狂红屏

            // 播放转阶段音效
            this.game.spawnDamageNumber(this.x, this.y - this.radius - 30, '🔥 拼命!', '#ff0000');
            if (this.game.particles) {
                this.game.particles.bossExplosion(this.x, this.y, '#ff0000');
            }
            SFX.sfxBossPhase();
        }
    }

    // ─── 绘制 ───

    draw(ctx) {
        if (Art.drawBossActor(ctx, this)) return;
        // 绘制持续技能效果（在Boss本体之下）
        if (this._sustainedEffect) {
            this._drawSustainedEffect(ctx);
        }
        // 绘制预警
        if (this.telegraph) {
            this._drawTelegraph(ctx);
        }

        // Use custom draw function if available
        if (Art.drawBoss(ctx,this)) {
            // Keep original telegraphs above and health bar below.
        } else if (this.drawFunc) {
            this.drawFunc(ctx, this.x, this.y, this.radius, this.flashTimer, this.game.time);
        } else {
            // Default drawing
            ctx.save();
            ctx.translate(this.x, this.y);

            // 外圈光环（用双描边替代 shadowBlur 以提升性能）
            ctx.strokeStyle = this.glowColor;
            ctx.lineWidth = 5;
            // 下方先画一层宽的发光色，再画主色
            ctx.strokeStyle = this.flashTimer > 0 ? '#ffffff' : this.color;
            ctx.lineWidth = 3;

            // 六边形 Boss 主体
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
                ctx.lineTo(fastCos(a) * this.radius, fastSin(a) * this.radius);
            }
            ctx.closePath();
            ctx.stroke();

            // 内部填充
            ctx.fillStyle = this.flashTimer > 0 ? '#ffffff' : this.glowColor;
            ctx.globalAlpha = 0.3;
            ctx.fill();
            ctx.globalAlpha = 1;

            // 核心
            ctx.fillStyle = this.glowColor;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.25, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // 血条
        this._drawHealthBar(ctx);
    }

    _drawHealthBar(ctx) {
        const barW = this.radius * 2.5;
        const barH = 6;
        const x = this.x - barW / 2;
        const y = this.y - this.radius - 16;
        const pct = Math.max(0, this.hp / this.maxHp);

        // 背景
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x, y, barW, barH);

        // 血条颜色随阶段变化
        let barColor;
        if (pct > 0.70) barColor = '#44ff88';
        else if (pct > 0.35) barColor = '#ffcc00';
        else barColor = '#ff3300';
        ctx.fillStyle = barColor;
        ctx.fillRect(x, y, barW * pct, barH);

        // 阶段分界线：70% 和 35%
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(x + barW * 0.70 - 1, y, 2, barH);
        ctx.fillRect(x + barW * 0.35 - 1, y, 2, barH);

        // Boss 名字 + 阶段标识
        const phaseLabel = this.phase === 3 ? ' 🔥' : (this.phase === 2 ? ' ⚠' : '');
        ctx.fillStyle = this.phase === 3 ? '#ff3300' : (this.phase === 2 ? '#ffcc00' : 'rgba(255,255,255,0.6)');
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.name + phaseLabel, this.x, y - 3);
        ctx.textAlign = 'left';
    }

    // ─── 持续技能效果系统 ───

    _updateSustainedEffect(eff, dt) {
        const p = this.game.player;
        switch (eff.type) {
            case 'laserSweep': {
                eff.angle += eff.rotSpeed * dt;
                const ldx = p.x - this.x, ldy = p.y - this.y;
                const ld = Math.sqrt(ldx * ldx + ldy * ldy);
                if (ld > this.radius && ld < 390) {
                    let ad = Math.atan2(ldy, ldx) - eff.angle;
                    while (ad > Math.PI) ad -= Math.PI * 2;
                    while (ad < -Math.PI) ad += Math.PI * 2;
                    if (Math.abs(ad) < 0.13) { // ~7° 波束半宽
                        p.takeDamage(18 * dt, null, true);
                        if (eff._hitCooldown <= 0) {
                            this.game.shakeAmount = 2;
                            this.game.shakeDuration = 0.05;
                            eff._hitCooldown = 0.12;
                        }
                    }
                }
                if (eff._hitCooldown > 0) eff._hitCooldown -= dt;
                break;
            }
            case 'deathRay': {
                // 死亡射线：极其粗犷的缓慢追踪扫射
                eff.angle += eff.rotateSpeed * dt;
                const ldx = p.x - this.x, ldy = p.y - this.y;
                const ld = Math.sqrt(ldx * ldx + ldy * ldy);
                if (ld > this.radius && ld < 1200) { // 极长的射程
                    let ad = Math.atan2(ldy, ldx) - eff.angle;
                    while (ad > Math.PI) ad -= Math.PI * 2;
                    while (ad < -Math.PI) ad += Math.PI * 2;
                    if (Math.abs(ad) < 0.22) { // 宽阔的射线区域 (~25度)
                        p.takeDamage(35 * dt, null, true); // 很高的持续倍率
                        if (eff._hitCooldown <= 0) {
                            this.game.shakeAmount = 4;
                            this.game.shakeDuration = 0.1;
                            eff._hitCooldown = 0.12;
                        }
                    }
                }
                if (eff._hitCooldown > 0) eff._hitCooldown -= dt;

                // 偶尔发射粒子
                if (this.game.particles && Math.random() < 0.3) {
                    const rDist = this.radius + Math.random() * 800;
                    this.game.particles.emit(
                        this.x + fastCos(eff.angle) * rDist,
                        this.y + fastSin(eff.angle) * rDist,
                        { count: 1, speed: 60, life: 0.3, color: '#ff00ff', size: 6 }
                    );
                }
                break;
            }
            case 'shockwave': {
                eff.radius += eff.speed * dt;
                if (!eff.triggered) {
                    const sdx = p.x - this.x, sdy = p.y - this.y;
                    const pd = Math.sqrt(sdx * sdx + sdy * sdy);
                    if (Math.abs(pd - eff.radius) < 42) {
                        p.takeDamage(35);
                        eff.triggered = true;
                        this.game.shakeAmount = 7;
                        this.game.shakeDuration = 0.2;
                    }
                }
                break;
            }
            case 'crescentBlast': {
                eff.nextSalvo -= dt;
                if (eff.nextSalvo <= 0 && eff.salvosLeft > 0) {
                    eff.salvosLeft--;
                    eff.nextSalvo = 0.38;
                    const dir = Math.atan2(p.y - this.y, p.x - this.x);
                    for (let i = 0; i < 16; i++) {
                        const a = dir - Math.PI / 2 + (i / 16) * Math.PI * 2;
                        this.game.spawnEnemyBullet(
                            this.x, this.y,
                            fastCos(a) * (150 + Math.random() * 80), fastSin(a) * (150 + Math.random() * 80),
                            5, 14, 3.5, this.color
                        );
                    }
                    this.game.shakeAmount = 4;
                    this.game.shakeDuration = 0.12;
                }
                break;
            }
            case 'tripleChase': {
                // 后续2波再次瞄准玩家当前位置
                eff.nextSalvo -= dt;
                if (eff.nextSalvo <= 0 && eff.salvosLeft > 0) {
                    eff.salvosLeft--;
                    eff.nextSalvo = 0.32;
                    const cha = Math.atan2(p.y - this.y, p.x - this.x);
                    for (let i = 0; i < 5; i++) {
                        const spread = (i - 2) * 0.18;
                        const a = cha + spread;
                        this.game.spawnEnemyBullet(this.x, this.y, fastCos(a) * 265, fastSin(a) * 265, 5, 22, 2.5, this.color);
                    }
                    this.game.shakeAmount = 3;
                    this.game.shakeDuration = 0.1;
                }
                break;
            }

            case 'voidRift': {
                eff._tick -= dt;
                if (eff._tick <= 0) {
                    eff._tick = 0.5;
                    const vdx = p.x - eff.x, vdy = p.y - eff.y;
                    if (vdx * vdx + vdy * vdy < eff.radius * eff.radius) {
                        p.takeDamage(20);
                    }
                }
                break;
            }

            case 'deathMark':
                break; // 仅等待timer归零，由_onSustainedEffectEnd处理

            case 'bloodPool': {
                eff._tick -= dt;
                if (eff._tick <= 0) {
                    eff._tick = 0.5;
                    const bdx = p.x - eff.x, bdy = p.y - eff.y;
                    if (bdx * bdx + bdy * bdy < eff.radius * eff.radius) {
                        p.takeDamage(25);
                    }
                }
                break;
            }
        }
    }

    _onSustainedEffectEnd(eff) {
        if (eff.type === 'deathMark') {
            const p = this.game.player;
            const dx = p.x - eff.targetX, dy = p.y - eff.targetY;
            if (dx * dx + dy * dy < 130 * 130) {
                p.takeDamage(70);
            }
            this.game.shakeAmount = 14;
            this.game.shakeDuration = 0.5;
            if (this.game.particles) {
                this.game.particles.emit(eff.targetX, eff.targetY, { count: 60, speed: 300, life: 0.7, color: '#ff2222', size: 7 });
            }
            if (this.game.triggerScreenPulse) {
                this.game.triggerScreenPulse('rgba(255,20,20,0.5)', 0.6);
            }
        }
    }

    _drawSustainedEffect(ctx) {
        const eff = this._sustainedEffect;
        if (!eff) return;
        ctx.save();
        if (eff.type === 'laserSweep') {
            ctx.globalAlpha = 0.85;
            ctx.lineCap = 'round';
            ctx.strokeStyle = this.glowColor;
            ctx.lineWidth = 22;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + fastCos(eff.angle) * 385, this.y + fastSin(eff.angle) * 385);
            ctx.stroke();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 6;
            ctx.stroke();
        } else if (eff.type === 'deathMark') {
            const pulse = 0.5 + 0.5 * fastSin(perfNow() / 80);
            ctx.globalAlpha = 0.4 + 0.3 * pulse;
            ctx.strokeStyle = '#ff2222';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(eff.targetX, eff.targetY, 130, 0, Math.PI * 2);
            ctx.stroke();
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.7 + 0.3 * pulse;
            const s = 20;
            ctx.beginPath();
            ctx.moveTo(eff.targetX - s, eff.targetY - s);
            ctx.lineTo(eff.targetX + s, eff.targetY + s);
            ctx.moveTo(eff.targetX + s, eff.targetY - s);
            ctx.lineTo(eff.targetX - s, eff.targetY + s);
            ctx.stroke();
        } else if (eff.type === 'shockwave') {
            const alpha = Math.max(0, (eff.timer / 0.7) * 0.7);
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = this.glowColor;
            ctx.lineWidth = Math.max(1, (eff.timer / 0.7) * 9);
            ctx.beginPath();
            ctx.arc(this.x, this.y, eff.radius, 0, Math.PI * 2);
            ctx.stroke();
        } else if (eff.type === 'bloodPool') {
            ctx.fillStyle = 'rgba(200, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.arc(eff.x, eff.y, eff.radius, 0, Math.PI * 2);
            ctx.fill();
            const pulse = 0.5 + 0.5 * fastSin(perfNow() / 150);
            ctx.strokeStyle = `rgba(255, 0, 0, ${0.4 + 0.4 * pulse})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        } else if (eff.type === 'voidRift') {
            const pulse = 0.5 + 0.5 * fastSin(perfNow() / 120);
            ctx.globalAlpha = 0.35 + 0.15 * pulse;
            ctx.fillStyle = '#aa00ff';
            ctx.beginPath();
            ctx.arc(eff.x, eff.y, eff.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = `rgba(255, 0, 255, ${0.5 + 0.3 * pulse})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        } else if (eff.type === 'deathRay') {
            ctx.globalAlpha = 0.9;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 60;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + fastCos(eff.angle) * 1200, this.y + fastSin(eff.angle) * 1200);
            ctx.stroke();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 15;
            ctx.stroke();
        }
        ctx.restore();
    }

    _drawTelegraph(ctx) {
        const t = this.telegraph;
        if (!t || t.type === 'none') return;

        ctx.save();
        ctx.globalAlpha = 0.5 + 0.3 * fastSin(perfNow() / 100); // 闪烁

        if (t.type === 'line') {
            ctx.translate(t.x, t.y);
            ctx.rotate(t.angle);
            ctx.fillStyle = t.color;
            ctx.fillRect(0, -t.width / 2, t.length, t.width);
        } else if (t.type === 'circle') {
            ctx.strokeStyle = t.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = t.color;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
            ctx.fill();
        } else if (t.type === 'multi_line') {
            ctx.fillStyle = t.color;
            for (const angle of t.angles) {
                ctx.save();
                ctx.translate(t.x, t.y);
                ctx.rotate(angle);
                ctx.fillRect(0, -t.width / 2, t.length, t.width);
                ctx.restore();
            }
        } else if (t.type === 'multi_circle') {
            ctx.strokeStyle = t.color;
            ctx.fillStyle = t.color;
            ctx.lineWidth = 3;
            for (const target of t.targets) {
                ctx.beginPath();
                ctx.arc(target.x, target.y, t.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(target.x, target.y, t.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (t.type === 'fullscreen') {
            // Fullscreen effect (blizzard, poison rain)
            ctx.fillStyle = t.color;
            ctx.fillRect(this.game.camera.x, this.game.camera.y, this.game.width, this.game.height);
        } else if (t.type === 'cone') {
            // Cone attack (ice wave)
            ctx.translate(t.x, t.y);
            ctx.rotate(t.angle);
            ctx.fillStyle = t.color;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, t.length, -t.width / 2, t.width / 2);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }
}

module.exports = Boss;
