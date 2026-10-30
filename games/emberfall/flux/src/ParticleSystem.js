const { fastSin, fastCos } = require('./MathLUT');
// ─── 粒子特效系统 ──────────────────────────
// 轻量级粒子系统，用于爆炸、命中、收集等效果

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 80; // 性能保护：最大粒子数
    }

    /** 发射粒子 */
    emit(x, y, config) {
        // 性能保护：粒子数量上限
        if (this.particles.length >= this.maxParticles) return;

        const count = Math.min(config.count || 8, this.maxParticles - this.particles.length);
        for (let i = 0; i < count; i++) {
            const angle = config.angle !== undefined
                ? config.angle + (Math.random() - 0.5) * (config.spread || Math.PI * 2)
                : Math.random() * Math.PI * 2;
            const speed = (config.speed || 100) * (0.5 + Math.random() * 0.5);

            this.particles.push({
                x, y,
                vx: fastCos(angle) * speed,
                vy: fastSin(angle) * speed,
                life: config.life || 0.5,
                maxLife: config.life || 0.5,
                size: config.size || 2,
                sizeEnd: config.sizeEnd || 0,
                color: config.color || '#ffcc00',
                gravity: config.gravity || 0,
                friction: config.friction || 0.98,
            });
        }
    }

    /** 敌人死亡爆炸 */
    enemyDeath(x, y, color) {
        this.emit(x, y, {
            count: 4, speed: 150, life: 0.25,
            size: 2.5, sizeEnd: 0, color,
        });
    }

    /** 命中火花 */
    hitSpark(x, y, color) {
        if (this.particles.length > 20) return;
        this.emit(x, y, {
            count: 1, speed: 60, life: 0.08,
            size: 1.5, sizeEnd: 0, color,
        });
    }

    /** 终极武器命中特效（优化：减少粒子数） */
    evolvedHit(x, y, color) {
        if (this.particles.length > 50) return;
        this.emit(x, y, {
            count: 3, speed: 150, life: 0.2,
            size: 2.5, sizeEnd: 0, color,
        });
        // 核心爆发
        this.emit(x, y, {
            count: 1, speed: 80, life: 0.12,
            size: 2, sizeEnd: 0, color: '#ffffff',
        });
    }

    /** 冰冻命中 */
    freezeHit(x, y) {
        if (this.particles.length > 40) return;
        this.emit(x, y, {
            count: 3, speed: 100, life: 0.2,
            size: 2, sizeEnd: 0, color: '#88ddff',
        });
    }

    /** 毒素命中 */
    poisonHit(x, y) {
        if (this.particles.length > 40) return;
        this.emit(x, y, {
            count: 3, speed: 40, life: 0.3,
            size: 3, sizeEnd: 1, color: '#88ff00',
            gravity: -20,
        });
    }

    /** 宝石收集 */
    gemCollect(x, y) {
        this.emit(x, y, {
            count: 2, speed: 40, life: 0.15,
            size: 1.5, sizeEnd: 0, color: '#aaff44',
        });
    }

    /** Boss 死亡大爆炸 */
    bossExplosion(x, y, color) {
        this.emit(x, y, {
            count: 12, speed: 250, life: 0.5,
            size: 4, sizeEnd: 1, color,
        });
        this.emit(x, y, {
            count: 6, speed: 80, life: 0.6,
            size: 2, sizeEnd: 0, color: '#ffffff',
        });
    }

    /** 升级闪光 */
    levelUp(x, y) {
        this.emit(x, y, {
            count: 8, speed: 200, life: 0.4,
            size: 2, sizeEnd: 0, color: '#ffcc00',
        });
        this.emit(x, y, {
            count: 4, speed: 120, life: 0.5,
            size: 2, sizeEnd: 0, color: '#ffffff',
        });
    }

    update(dt) {
        // 原地更新，避免创建新数组
        let alive = 0;
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const _f = 1 - (1 - p.friction) * dt * 60; // 线性近似替代 Math.pow，误差<0.2%
            p.vx *= _f;
            p.vy *= _f;
            p.vy += p.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life > 0) {
                this.particles[alive++] = p;
            }
        }
        this.particles.length = alive;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter'; // 💥 让特效叠加发亮，有更强视觉冲击
        for (const p of this.particles) {
            const t = p.life / p.maxLife;
            const size = p.sizeEnd + (p.size - p.sizeEnd) * t;
            ctx.globalAlpha = t;
            ctx.fillStyle = p.color;
            ctx.beginPath();

            // 如果速度足够大，画成拉长火花状，而不是圆形
            const speedSq = p.vx * p.vx + p.vy * p.vy;
            if (speedSq > 10000 && p.color !== '#ffffff') { // 速度 > 100
                const angle = Math.atan2(p.vy, p.vx);
                const stretch = Math.min(size * 3, Math.sqrt(speedSq) * 0.05); // 根据速度拉伸
                ctx.ellipse(p.x, p.y, stretch, size * 0.6, angle, 0, Math.PI * 2);
            } else {
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            }
            ctx.fill();
        }
        ctx.restore();
    }
}

module.exports = ParticleSystem;
