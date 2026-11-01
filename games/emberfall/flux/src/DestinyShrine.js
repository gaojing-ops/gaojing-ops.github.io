const { fastSin, fastCos } = require('./MathLUT');
const SFX = require('./SFX');
const Art = require('./Art');

class DestinyShrine {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.active = true;
        this.radius = 40; // 交互半径

        // 视觉效果
        this.timer = 0;
        this.color = '#ffcc00'; // 金黄色
    }

    update(dt) {
        if (!this.active) return;
        this.timer += dt;

        // 检查玩家靠近
        const p = this.game.player;
        if (!p) return;
        // Risky shrines can replace the core weapon or summon elite enemies.
        // The helper must leave that decision to the player moving manually.
        if (this.game.autoPlay && !this.game.input?.active) return;
        const dx = p.x - this.x;
        const dy = p.y - this.y;
        if (dx * dx + dy * dy < this.radius * this.radius) {
            this.triggerEvent();
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        Art.drawArea(ctx, this.x, this.y, this.radius, '#e7bd70', this.timer,
            this.game.qualityLevel >= 0.5 ? 0.06 : 0, this.game.qualityLevel >= 0.5);
        Art.drawIcon(ctx, 'rune', this.x - 18, this.y - 43, 36);
        if (this.game.autoPlay) {
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffe2a6';
            ctx.strokeStyle = '#09130f';
            ctx.lineWidth = 4;
            ctx.strokeText('手动靠近 · 命运难测', this.x, this.y - 52);
            ctx.fillText('手动靠近 · 命运难测', this.x, this.y - 52);
        }
        ctx.restore();
    }

    triggerEvent() {
        if (!this.game.player) return;
        const roll = Math.random();

        // 视觉和声音反馈
        SFX.sfxUpgrade();
        this.game.triggerScreenPulse('#ffffffdd', 1.0);
        this.game.shakeAmount = 15;
        this.game.shakeDuration = 0.5;
        if (this.game.particles) {
            this.game.particles.emit(this.x, this.y, { count: 50, speed: 300, life: 1.0, color: '#ffcc00', size: 6 });
        }

        if (roll < 0.33) {
            this._eventGood();
        } else if (roll < 0.66) {
            this._eventBad();
        } else {
            this._eventWeird();
        }
    }

    _eventGood() {
        // 大吉：天降宝箱与神恩冲击（仅净化神龛周围最多 12 只普通小怪，避免全屏怪瞬间消失）
        const p = this.game.player;
        this.game.spawnDamageNumber(p.x, p.y - 120, '【大吉】天降横财！！', '#ffcc00', true);

        const purifyRadiusSq = 210 * 210;
        let purified = 0;
        for (const e of this.game.enemies) {
            if (!e.active) continue;
            const dx = e.x - p.x;
            const dy = e.y - p.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < purifyRadiusSq) {
                const d = Math.sqrt(dSq) || 1;
                e.knockbackVx = (dx / d) * 280;
                e.knockbackVy = (dy / d) * 280;
                if (!e.isElite && purified < 12) {
                    purified++;
                    e.hp = 0;
                    this.game.onEnemyKilled(e);
                    e.active = false;
                    if (this.game.particles) this.game.particles.emit(e.x, e.y, { count: 4, speed: 60, life: 0.3, color: '#ffcc00', size: 3 });
                    this.game.spawnGem(e.x, e.y, 20);
                }
            }
        }

        // 生成 2 个宝箱与周围散落经验晶石
        for (let i = 0; i < 2; i++) {
            const cx = p.x + (Math.random() - 0.5) * 180;
            const cy = p.y + (Math.random() - 0.5) * 180;
            this.game.spawnPickup(cx, cy, 'chest');
        }
        for (let i = 0; i < 12; i++) {
            const gx = p.x + (Math.random() - 0.5) * 260;
            const gy = p.y + (Math.random() - 0.5) * 260;
            this.game.spawnGem(gx, gy, 15);
        }
    }

    _eventBad() {
        // 大凶：猩红狂潮（强化周围怪物并召唤一队精锐，避免全图怪移速翻倍不可躲避）
        const p = this.game.player;
        this.game.spawnDamageNumber(p.x, p.y - 120, '【大凶】猩红狂潮！！', '#ff0000', true);
        this.game.triggerScreenPulse('#ff000066', 2.0);

        const rageRadiusSq = 320 * 320;
        for (const e of this.game.enemies) {
            if (e.active && !e.hasRageAura) {
                const dx = e.x - p.x;
                const dy = e.y - p.y;
                if (dx * dx + dy * dy < rageRadiusSq) {
                    e.speed *= 1.25;
                    e.maxHp = Math.ceil(e.maxHp * 1.5);
                    e.hp = e.maxHp;
                    e.hasRageAura = true;
                    e.radius *= 1.15;
                }
            }
        }

        // 刷出 8 只猩红精英守卫
        const types = ['Assassin', 'Bomber', 'ShieldBearer', 'Splitter', 'Phantom', 'FrostTitan', 'Charger'];
        for (let i = 0; i < 8 && this.game.enemies.length < 195; i++) {
            const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
            const dist = 360 + Math.random() * 80;
            const ex = p.x + fastCos(angle) * dist;
            const ey = p.y + fastSin(angle) * dist;

            const type = types[Math.floor(Math.random() * types.length)];
            let en = this.game.enemyPool.get();
            if (!en) continue;
            en.reset(this.game, ex, ey, type);
            en.isElite = true;
            en.speed *= 1.25;
            en.maxHp *= 1.8;
            en.hp = en.maxHp;
            en.radius *= 1.25;
            en.hasRageAura = true;
            this.game.enemies.push(en);
        }
    }

    _eventWeird() {
        // 诡异：把玩家手里的随机一把武器，强制突变成完全不同的满级武器。
        const p = this.game.player;
        if (!p.weapons || p.weapons.length === 0) {
            this._eventGood(); // 如果没有武器，补偿个大吉
            return;
        }

        this.game.spawnDamageNumber(this.game.player.x, this.game.player.y - 120, '【异兆】炉火重铸', '#aa44ff', true);

        // 随机挑一把
        const idx = Math.floor(Math.random() * p.weapons.length);
        const w = p.weapons[idx];
        const oldName = w.def.name;

        // 挑一个新的没拿过的普通武器
        const WEAPON_DEFS = require('./Weapons').WEAPON_DEFS;
        const allKeys = Object.keys(WEAPON_DEFS).filter(k =>
            !WEAPON_DEFS[k].isFusion && !WEAPON_DEFS[k].evolved &&
            !p.weapons.find(pw => pw.id === k)
        );

        if (allKeys.length > 0) {
            const newKey = allKeys[Math.floor(Math.random() * allKeys.length)];
            const def = WEAPON_DEFS[newKey];
            // A fresh weapon cannot carry another weapon's awakening multipliers,
            // clones, gravity fields or nano swarm after the shrine changes its type.
            const replacement = new (require('./Weapons').Weapon)(this.game, newKey);
            replacement.level = def.maxLevel;
            p.weapons[idx] = replacement;
            this.game.synergy?.check();

            this.game.spawnDamageNumber(this.game.player.x, this.game.player.y - 80, oldName + ' -> ' + def.name, '#aa44ff', true);
        } else {
            this.game.spawnDamageNumber(this.game.player.x, this.game.player.y - 80, '神龛未作回应', '#aaaaaa', true);
        }
    }
}

module.exports = DestinyShrine;
