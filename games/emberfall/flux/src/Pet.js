const { fastSin, fastCos } = require('./MathLUT');
const Bullet = require('./Bullet');

const PET_TYPES = {
    dog: { name: '拾荒机器狗', speed: 250, radius: 8, color: '#cc8844', desc: '自动拾取全图经验和金币' },
    medic: { name: '急救精灵', speed: 150, radius: 10, color: '#44ff88', desc: '每60秒提供护盾或治疗' },
    drone: { name: '火力浮游炮', speed: 200, radius: 10, color: '#ff4444', desc: '自动攻击附近精英怪或Boss' }
};

class Pet {
    constructor(game, type) {
        this.game = game;
        this.type = type;
        this.def = PET_TYPES[type] || PET_TYPES.dog;
        this.x = game.player.x;
        this.y = game.player.y;
        this.target = null;
        this.timer = 0;
        this.angle = 0;
        this.level = 1;
    }

    update(dt) {
        const p = this.game.player;
        if (!p) return;

        this.timer += dt;

        if (this.type === 'dog') {
            // Find nearest gem/coin
            if (!this.target || !this.target.active) {
                let bestDistSq = Infinity;
                let bestObj = null;
                for (const g of this.game.gems) {
                    if (!g.active) continue;
                    const dx = g.x - this.x, dy = g.y - this.y;
                    const dSq = dx * dx + dy * dy;
                    if (dSq < bestDistSq) { bestDistSq = dSq; bestObj = g; }
                }
                for (const pk of this.game.pickups) {
                    if (!pk.active || !['chest_gold', 'potion'].includes(pk.type)) continue;
                    const dx = pk.x - this.x, dy = pk.y - this.y;
                    const dSq = dx * dx + dy * dy;
                    if (dSq < bestDistSq) { bestDistSq = dSq; bestObj = pk; }
                }
                this.target = bestObj;
            }

            if (this.target && this.target.active) {
                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < this.def.radius + 15) {
                    // Make player pickup this item
                    if (this.target.type) {
                        this.target._collect();
                    } else { // gem 
                        p.gainXp(this.target.value);
                        this.target.active = false;
                        const SFX = require('./SFX');
                        SFX.sfxGem();
                    }
                    this.target = null;
                } else {
                    this.x += (dx / d) * this.def.speed * dt;
                    this.y += (dy / d) * this.def.speed * dt;
                    this.angle = Math.atan2(dy, dx);
                }
            } else {
                // Follow player if no target
                this._followPlayer(p, dt, 60);
            }
        }
        else if (this.type === 'medic') {
            // orbit player
            this.angle += dt * 1.5;
            const orbitR = 40;
            this.x = p.x + fastCos(this.angle) * orbitR;
            this.y = p.y + fastSin(this.angle) * orbitR;

            // 护盾到期时移除临时护甲
            if (p.shieldArmorExpiry > 0) {
                p.shieldArmorExpiry -= dt;
                if (p.shieldArmorExpiry <= 0) {
                    p.bonusArmor -= (p._medicBonusArmor || 0);
                    p._medicBonusArmor = 0;
                }
            }
            if (this.timer >= 60) {
                this.timer = 0;
                // 先移除旧护甲再加新的
                p.bonusArmor -= (p._medicBonusArmor || 0);
                p._medicBonusArmor = 5;
                p.bonusArmor += 5;
                p.shieldArmorExpiry = 10;
                const healed = p.heal(30); // 回复30HP
                this.game.spawnDamageNumber(p.x, p.y - 40, '+' + Math.floor(healed) + ' HP +护盾', '#44ff88');
                if (this.game.particles) {
                    this.game.particles.emit(p.x, p.y, { count: 10, speed: 60, life: 1, color: '#44ff88', size: 4 });
                }
            }
        }
        else if (this.type === 'drone') {
            // orbit player
            this.angle += dt * 2.0;
            const orbitR = 50;
            const tx = p.x + fastCos(this.angle) * orbitR;
            const ty = p.y + fastSin(this.angle) * orbitR;

            this.x += (tx - this.x) * 5 * dt;
            this.y += (ty - this.y) * 5 * dt;

            if (this.timer >= 1.0) { // Shoot every 1 second
                this.timer = 0;
                let bestObj = null;
                let bestDistSq = Infinity;
                // [OPT] 使用空间网格替代全量敌人遍历
                const searchRadius = 300;
                const nearbyEnemies = this.game._getNearbyEnemies ? this.game._getNearbyEnemies(this.x, this.y, searchRadius) : this.game.enemies;
                for (const e of nearbyEnemies) {
                    if (e.active && (e.isElite || e.hp > 100)) {
                        const dx = e.x - this.x, dy = e.y - this.y;
                        const dSq = dx * dx + dy * dy;
                        if (dSq < searchRadius * searchRadius && dSq < bestDistSq) {
                            bestDistSq = dSq; bestObj = e;
                        }
                    }
                }
                // Fallback to boss
                if (!bestObj) {
                    for (const boss of this.game.bosses) {
                        if (boss.active) {
                            const dx = boss.x - this.x, dy = boss.y - this.y;
                            const dSq = dx * dx + dy * dy;
                            if (dSq < 500 * 500 && dSq < bestDistSq) {
                                bestDistSq = dSq; bestObj = boss;
                            }
                        }
                    }
                }

                if (bestObj) {
                    const dx = bestObj.x - this.x;
                    const dy = bestObj.y - this.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    // [R6-1 FIX] 防止 d=0 时 dx/d 产生 NaN 毒化子弹
                    const dirX = d < 1 ? 1 : dx / d;
                    const dirY = d < 1 ? 0 : dy / d;
                    let pool = this.game.bulletPool;
                    let bulletReq = require('./Bullet');
                    let newBullet = pool ? pool.get() : new bulletReq();
                    newBullet.reset(this.game, this.x, this.y, dirX, dirY, p.might * 30, {
                        color: this.def.color, speed: 400, radius: 4, pierce: 1, lifetime: 1.5
                    });
                    this.game.bullets.push(newBullet);

                    if (this.game.particles && this.game.qualityLevel > 0) {
                        this.game.particles.emit(this.x, this.y, { count: 2, speed: 40, life: 0.15, color: '#ff4444', size: 2 });
                    }
                }
            }
        }
    }

    _followPlayer(p, dt, dist = 50) {
        const dx = p.x - this.x;
        const dy = p.y - this.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > dist) {
            this.x += (dx / d) * this.def.speed * dt;
            this.y += (dy / d) * this.def.speed * dt;
            this.angle = Math.atan2(dy, dx);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.fillStyle = this.def.color;

        if (this.type === 'dog') {
            ctx.fillRect(-6, -4, 12, 8);
            ctx.fillStyle = '#fff';
            ctx.fillRect(4, -2, 2, 2);
            ctx.fillRect(-8, -6, 2, 4);
            ctx.fillRect(4, -6, 2, 3);
        } else if (this.type === 'medic') {
            ctx.fillRect(-2, -6, 4, 12);
            ctx.fillRect(-6, -2, 12, 4);
            ctx.globalAlpha = 0.5 + 0.5 * fastSin(this.timer * 10);
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-4, -6, 4, 0, Math.PI); ctx.fill();
            ctx.beginPath(); ctx.arc(4, -6, 4, 0, Math.PI); ctx.fill();
        } else if (this.type === 'drone') {
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#222';
            ctx.fillRect(-2, -2, 4, 4);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-10, -10); ctx.lineTo(10, 10);
            ctx.moveTo(10, -10); ctx.lineTo(-10, 10);
            ctx.stroke();
        }

        ctx.restore();
    }
}

module.exports = { Pet, PET_TYPES };
