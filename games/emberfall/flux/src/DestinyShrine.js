const { fastSin, fastCos } = require('./MathLUT');
const SFX = require('./SFX');

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
        const dx = p.x - this.x;
        const dy = p.y - this.y;
        if (dx * dx + dy * dy < this.radius * this.radius) {
            this.triggerEvent();
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.active) return;

        // 绘制发光的金色法阵和光柱
        ctx.save();
        ctx.translate(this.x, this.y);

        // 呼吸效果
        const scale = 1.0 + fastSin(this.timer * 3) * 0.1;
        ctx.scale(scale, scale);

        // 外层光环
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 15, 0, Math.PI * 2);
        ctx.fillStyle = '#ffaa0044';
        ctx.fill();

        // 内层法阵
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 旋转的符文点
        ctx.rotate(this.timer);
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(this.radius * fastCos(i * Math.PI * 2 / 3), this.radius * fastSin(i * Math.PI * 2 / 3), 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
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
        // 大吉：天降满地的满级宝箱/经验，瞬间成型。
        this.game.spawnDamageNumber(this.game.player.x, this.game.player.y - 120, '【大吉】天降横财！！', '#ffcc00', true);

        // 秒杀所有普通敌人，变成红宝石
        for (const e of this.game.enemies) {
            if (e.active) {
                e.hp = 0;
                // 先回调再标记死亡，确保 onEnemyKilled 中的 active 检查不被绕过
                this.game.onEnemyKilled(e);
                e.active = false;
                if (this.game.particles) this.game.particles.emit(e.x, e.y, { count: 3, speed: 50, life: 0.3, color: '#ff0000', size: 3 });
                this.game.spawnGem(e.x, e.y, 50);
            }
        }

        // 生成 3 个宝箱
        for (let i = 0; i < 3; i++) {
            const cx = this.game.player.x + (Math.random() - 0.5) * 200;
            const cy = this.game.player.y + (Math.random() - 0.5) * 200;
            this.game.spawnPickup(cx, cy, 'chest');
        }
    }

    _eventBad() {
        // 大凶：猩红狂潮
        this.game.spawnDamageNumber(this.game.player.x, this.game.player.y - 120, '【大凶】猩红狂潮！！', '#ff0000', true);
        this.game.triggerScreenPulse('#ff000066', 2.0);

        // 敌人狂暴化（加速+加血）
        for (const e of this.game.enemies) {
            if (e.active) {
                e.speed *= 2.0;
                e.maxHp *= 3.0;
                e.hp = e.maxHp;
                e.hasRageAura = true; // 变红光环标记
                e.radius *= 1.2;
            }
        }

        // 临时提高刷怪倍率 (通过 EventSystem 或直接在游戏里控制，暂时使用简单方法：刷出大量精英怪)
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 500 + Math.random() * 200;
            const ex = this.game.player.x + fastCos(angle) * dist;
            const ey = this.game.player.y + fastSin(angle) * dist;

            const types = ['Assassin', 'Bomber', 'ShieldBearer', 'Splitter', 'Phantom', 'FrostTitan'];
            const type = types[Math.floor(Math.random() * types.length)];
            let en = this.game.enemyPool.get();
            if (!en) continue;
            en.reset(this.game, ex, ey, type);
            en.isElite = true;
            en.speed *= 1.5;
            en.maxHp *= 2;
            en.hp = en.maxHp;
            en.radius *= 1.3; // 修正：应用到 radius 才会实际变大
            en.hasRageAura = true; // 变红光环标记
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

        this.game.spawnDamageNumber(this.game.player.x, this.game.player.y - 120, '【诡异】基因突变！！', '#aa44ff', true);

        // 随机挑一把
        const idx = Math.floor(Math.random() * p.weapons.length);
        const w = p.weapons[idx];
        const oldName = w.def.name;

        // 挑一个新的没拿过的普通武器
        const WEAPON_DEFS = require('./Weapons').WEAPON_DEFS;
        const allKeys = Object.keys(WEAPON_DEFS).filter(k =>
            !WEAPON_DEFS[k].isFusion &&
            !p.weapons.find(pw => pw.id === k)
        );

        if (allKeys.length > 0) {
            const newKey = allKeys[Math.floor(Math.random() * allKeys.length)];
            const def = WEAPON_DEFS[newKey];
            w.id = newKey;
            w.def = def;
            w.level = def.maxLevel; // 直接满级
            // damage 是 getter 属性，不能直接赋值；cooldown 是倒计时
            w.cooldown = 0;
            w.evolved = false;

            this.game.spawnDamageNumber(this.game.player.x, this.game.player.y - 80, oldName + ' -> ' + def.name, '#aa44ff', true);
        } else {
            this.game.spawnDamageNumber(this.game.player.x, this.game.player.y - 80, '无事发生...', '#aaaaaa', true);
        }
    }
}

module.exports = DestinyShrine;
