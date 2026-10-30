const { drawBullet } = require('./Renderer');

class Bullet {
    constructor(game, x, y, vx, vy, damage, opts = {}) {
        this.reset(game, x, y, vx, vy, damage, opts);
    }

    reset(game, x, y, vx, vy, damage, opts = {}) {
        this.game = game;
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.speed = opts.speed || 400;
        this.damage = damage;
        this.radius = opts.radius || 5;
        this._baseRadius = this.radius; // 用于 bolt 抖动
        this.color = opts.color || '#ffcc00';
        this.pierce = opts.pierce || 0;
        this.pierced = 0;
        this.lifetime = opts.lifetime || 3;
        this.active = true;
        this.homing = opts.homing || 0; // 追踪强度 0~1
        this.element = opts.element || null; // 武器元素（用于协同伤害）
        this.shape = opts.shape || 'circle';

        // 终极武器标记
        this.evolved = opts.evolved || false;

        // 回旋镖专属属性
        this.isBoomerang = opts.isBoomerang || false;
        this.initialTimer = opts.initialTimer || 0;
        this.returnTimer = opts.returnTimer || 0;

        // 链锯专属属性
        this.isAttachedToPlayer = opts.isAttachedToPlayer || false;
        this.attachOffsetX = opts.attachOffsetX || 0;
        this.attachOffsetY = opts.attachOffsetY || 0;

        // 记录已经命中的敌人，防止穿透子弹对同一个敌人重复造成伤害
        if (this._hitSet) this._hitSet.clear();
        else this._hitSet = new Set();

        // 环形缓冲区轨迹缓存（避免 push/shift 的 GC 压力）
        // 进化武器有更长的拖尾
        const baseHistory = (opts.shape === 'bolt') ? 12 : 6;
        this.maxHistory = this.evolved ? baseHistory * 2 : baseHistory;
        if (!this.historyX || this.historyX.length < this.maxHistory) {
            this.historyX = new Float32Array(this.maxHistory);
            this.historyY = new Float32Array(this.maxHistory);
        }

        this.historyHead = 0; // 写入位置
        this.historyCount = 0; // 当前数量

        this.glowTimer = Math.random() * Math.PI * 2;

        // Status effects (Cryo/Toxic)
        this.freezeChance = opts.freezeChance || 0;
        this.freezeDur = opts.freezeDur || 0;
        this.poisonChance = opts.poisonChance || 0;
        this.poisonDmg = opts.poisonDmg || 0;
        this.poisonStacks = opts.poisonStacks || 0;
        this.slowAmount = opts.slowAmount || 0; // Slow effect (Cryo)

        this._homingTarget = null;
        this._homingFrame = 0;
        return this;
    }

    update(dt) {
        // 屏幕外剔除：子弹飞出视口 + 100px 后消失
        const maxRange = Math.max(this.game.width, this.game.height) * 0.5 + 100;
        const pdx = this.x - this.game.player.x;
        const pdy = this.y - this.game.player.y;
        if (pdx * pdx + pdy * pdy > maxRange * maxRange) {
            this.active = false;
            return;
        }

        // 追踪最近敌人（降频搜索：每3帧重新扫描，其他帧沿用旧目标）
        if (this.homing > 0) {
            this._homingFrame = (this._homingFrame || 0) + 1;
            if (this._homingFrame >= 3 || !this._homingTarget || !this._homingTarget.active) {
                this._homingFrame = 0;
                let nearest = null, minDSq = Infinity;
                const maxRangeSq = 400 * 400;

                // 走空间网格，避免遍历全部敌人 O(N) → O(nearby)
                const nearby = this.game._getNearbyEnemies(this.x, this.y, 400);
                for (let ni = 0; ni < nearby.length; ni++) {
                    const e = nearby[ni];
                    const dx = e.x - this.x;
                    const dy = e.y - this.y;
                    const dSq = dx * dx + dy * dy;
                    if (dSq < minDSq && dSq < maxRangeSq) {
                        minDSq = dSq;
                        nearest = e;
                    }
                }
                for (const b of this.game.bosses) {
                    if (!b.active) continue;
                    const dx = b.x - this.x;
                    const dy = b.y - this.y;
                    const dSq = dx * dx + dy * dy;
                    if (dSq < minDSq && dSq < maxRangeSq) {
                        minDSq = dSq;
                        nearest = b;
                    }
                }
                this._homingTarget = nearest;
            }
            const nearest = this._homingTarget;
            if (nearest) {
                const dx = nearest.x - this.x;
                const dy = nearest.y - this.y;
                const dSq = dx * dx + dy * dy;
                if (dSq > 0.0001) {
                    const invD = 1 / Math.sqrt(dSq); // 单次 sqrt，方向归一化
                    const targetVx = dx * invD;
                    const targetVy = dy * invD;
                    this.vx += (targetVx - this.vx) * this.homing * dt * 8;
                    this.vy += (targetVy - this.vy) * this.homing * dt * 8;
                    // 每4帧才精确归一化一次，减少 sqrt 调用
                    if (((this._normTick = (this._normTick || 0) + 1) & 3) === 0) {
                        const len = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                        if (len > 0.001) { this.vx /= len; this.vy /= len; }
                    }
                }
            }
        }

        // [NEW] Boomerang returning logic
        if (this.isBoomerang) {
            this.initialTimer += dt;
            if (this.initialTimer >= this.returnTimer) {
                // Return to player
                const dx = this.game.player.x - this.x;
                const dy = this.game.player.y - this.y;
                const distSq = dx * dx + dy * dy;

                // If close enough to player, destroy it
                if (distSq < 900) { // 30^2
                    this.active = false;
                    return;
                }

                // Accelerate back towards player
                const invD = 1 / Math.sqrt(distSq);
                const targetVx = dx * invD;
                const targetVy = dy * invD;
                const returnAccel = 600 * dt; // 加速度
                this.vx += (targetVx - this.vx) * returnAccel;
                this.vy += (targetVy - this.vy) * returnAccel;

                // 归一化并提速（返程提速）
                const len = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (len > 0.001) {
                    this.vx /= len;
                    this.vy /= len;
                }
                // 返回时速度逐渐增加
                this.speed = Math.min(this.speed + 800 * dt, 800);
            }
        }

        // [NEW] Attached to player logic (Chain Drill)
        if (this.isAttachedToPlayer) {
            this.x = this.game.player.x + this.attachOffsetX;
            this.y = this.game.player.y + this.attachOffsetY;
        } else {
            this.x += this.vx * this.speed * dt;
            this.y += this.vy * this.speed * dt;
        }

        // 更新轨迹（环形缓冲区）
        this.historyX[this.historyHead] = this.x;
        this.historyY[this.historyHead] = this.y;
        this.historyHead = (this.historyHead + 1) % this.maxHistory;
        if (this.historyCount < this.maxHistory) this.historyCount++;

        // [OPT] Rocket Smoke（降频 + 低画质跳过）
        if (this.shape === 'rocket' && this.game.particles && this.game.qualityLevel > 0 && Math.random() < 0.15) {
            this.game.particles.emit(this.x, this.y, {
                count: 1, speed: 20, life: 0.3, size: 2, color: '#666'
            });
        }

        // [OPT] 终极武器粒子效果（降频 + 低画质跳过）
        if (this.evolved && this.game.particles && this.game.qualityLevel > 0.3 && Math.random() < 0.1) {
            this.game.particles.emit(this.x, this.y, {
                count: 1, speed: 30, life: 0.3, size: 2, color: this.color
            });
        }

        // Laser Jitter
        if (this.shape === 'bolt') {
            this.radius = this._baseRadius * (0.9 + Math.random() * 0.2);
        }

        this.glowTimer += dt * 5;
        this.lifetime -= dt;
        if (this.lifetime <= 0) this.active = false;
    }

    onHit() {
        this.pierced++;
        if (this.game.particles) {
            // [OPT] 终极武器命中特效（隔一次显示，减少粒子风暴）
            if (this.evolved) {
                this._hitToggle = !this._hitToggle;
                if (this._hitToggle) this.game.particles.evolvedHit(this.x, this.y, this.color);
            }
            // 冰冻命中
            else if (this.freezeChance > 0 && Math.random() < this.freezeChance) {
                this.game.particles.freezeHit(this.x, this.y);
            }
            // 毒素命中
            else if (this.poisonChance > 0) {
                this.game.particles.poisonHit(this.x, this.y);
            }
            // 普通命中
            else {
                this.game.particles.hitSpark(this.x, this.y, this.color);
            }
        }
        if (this.pierce >= 0 && this.pierced > this.pierce) {
            this.active = false;
        }
    }

    draw(ctx) {
        // 简化拖尾绘制（减少状态切换）
        if (this.historyCount > 1) {
            const startIdx = (this.historyHead - this.historyCount + this.maxHistory) % this.maxHistory;
            ctx.globalAlpha = this.evolved ? 0.5 : 0.3;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.radius * (this.evolved ? 0.8 : 0.6);
            ctx.beginPath();
            for (let i = 0; i < this.historyCount; i++) {
                const idx = (startIdx + i) % this.maxHistory;
                if (i === 0) ctx.moveTo(this.historyX[idx], this.historyY[idx]);
                else ctx.lineTo(this.historyX[idx], this.historyY[idx]);
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // 终极武器外发光（无 shadowBlur）
        if (this.evolved) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        const angle = Math.atan2(this.vy, this.vx);
        let drawAngle = angle;
        if (this.shape === 'crescent' || this.shape === 'spark') {
            drawAngle += this.glowTimer * 2;
        }

        // 终极武器使用稍大尺寸，但不给 glowIntensity（避免 drawBullet 里的 shadowBlur）
        const drawSize = this.evolved ? this.radius * 1.3 : this.radius;
        drawBullet(ctx, this.x, this.y, drawSize, this.color, this.shape, drawAngle, 0, this.evolved);
    }
}

module.exports = Bullet;
