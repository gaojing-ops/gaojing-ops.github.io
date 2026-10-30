const { drawGem } = require('./Renderer');
const { sfxGem, sfxGemChain } = require('./SFX');

class Gem {
    constructor(game, x, y, value) {
        this.game = game;
        this.x = x; this.y = y;
        this.value = Math.min(value, 50); // Cap individual gem value
        this.radius = 4 + Math.min(this.value, 20) * 0.15;
        this.active = true;
        this.collecting = false; // 是否正在被磁吸
    }

    update(dt) {
        const p = this.game.player;
        const dx = p.x - this.x;
        const dy = p.y - this.y;
        const dSq = dx * dx + dy * dy;
        const pickupSq = p.pickup * p.pickup;

        // 范围外提前返回，跳过 sqrt
        if (dSq >= pickupSq) {
            this.collecting = false;
            return;
        }
        const d = Math.sqrt(dSq);

        // Magnet - optimized
        if (d > 1) {
            const mag = 500 * (1 - d / p.pickup);
            this.x += (dx / d) * mag * dt;
            this.y += (dy / d) * mag * dt;
            this.collecting = true;
        } else {
            this.collecting = false;
        }

        // Collect
        if (d < p.radius + this.radius) {
            this.active = false;
            p.totalGemsCollected++; // 统计追踪

            // 连锁收集系统
            const g = this.game;
            g._gemChainCount = (g._gemChainCount || 0) + 1;
            g._gemChainTimer = 1.0; // 1秒内连续收集

            let xpValue = this.value;
            // 连锁收集 10+ 时 XP +10%
            if (g._gemChainCount > 10) {
                xpValue = Math.floor(xpValue * 1.1);
            }
            p.gainXp(xpValue);

            // 粒子特效仅对大经验球显示，减少渲染负担
            if (this.value >= 10 && g.particles) {
                g.particles.gemCollect(this.x, this.y);
            }

            // 连锁收集音效：递增音调
            if (g._gemChainCount <= 12) {
                sfxGemChain(g._gemChainCount);
            } else if (Math.random() < 0.15) {
                sfxGemChain(12); // 超过12后随机播放最高音
            }

            // 连锁里程碑提示
            if (g._gemChainCount === 15) {
                g.spawnDamageNumber(p.x, p.y - 50, '\u6536\u96C6\u8FDE\u9501!', '#44ffcc', false);
                g.spawnDamageNumber(p.x, p.y - 35, 'XP +10%', '#88ffdd', false);
            }
        }
    }

    draw(ctx) {
        // 磁吸拖尾
        if (this.collecting) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#44ffcc';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        drawGem(ctx, this.x, this.y, this.radius);
    }
}

// ─── 经验球合并优化 ───
// 将附近的经验球合并成更大的经验球，减少实体数量
function mergeGems(gems, mergeRadius = 30) {
    if (gems.length < 10) return gems; // 数量少时不合并

    const merged = [];
    const used = new Set();

    for (let i = 0; i < gems.length; i++) {
        if (used.has(i)) continue;
        const g = gems[i];
        let totalValue = g.value;
        let avgX = g.x * g.value;
        let avgY = g.y * g.value;
        let count = 1;

        // 查找附近可合并的经验球
        for (let j = i + 1; j < gems.length; j++) {
            if (used.has(j)) continue;
            const g2 = gems[j];
            const mdx = g.x - g2.x, mdy = g.y - g2.y;
            if (mdx * mdx + mdy * mdy < mergeRadius * mergeRadius) {
                totalValue += g2.value;
                avgX += g2.x * g2.value;
                avgY += g2.y * g2.value;
                count++;
                used.add(j);
            }
        }

        used.add(i);
        if (totalValue > 0) {
            avgX /= totalValue;
            avgY /= totalValue;
        } else {
            avgX = g.x;
            avgY = g.y;
        }

        merged.push({ x: avgX, y: avgY, value: totalValue });
    }

    return merged;
}

module.exports = Gem;
module.exports.mergeGems = mergeGems;
