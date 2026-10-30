// ─── 高潮事件系统 ──────────────────────────────────
// 特殊事件在游戏中触发，增加紧张感和奖励

const { Enemy } = require('./Enemy');
const { fastSin, fastCos } = require('./MathLUT');

/**
 * 事件类型:
 * - BloodMoon (血月): 敌人数量x3，掉落x2，持续60秒
 * - Reaper (死神): 每隔30秒一只死神追杀你，击杀获得大量奖励
 * - LuckyWheel (幸运轮盘): 选择奖励
 * - GoldRush (淘金热): 所有敌人掉落金币翻倍
 */

class EventEnhancer {
    constructor(game) {
        this.game = game;
        this.activeEvents = [];
        this.eventQueue = [];
        this.reaperTimer = 0;
        this.reaperCount = 0;
    }

    update(dt) {
        // Boss Rush 模式下禁用高潮事件（专注于 Boss 战斗）
        if (this.game.bossRushMode) return;

        const t = this.game.time;

        // ═══ 血月事件 (15分钟触发) ═══
        if (t >= 900 && !this.bloodMoonTriggered) {
            this.bloodMoonTriggered = true;
            this.triggerBloodMoon();
        }

        // ═══ 死神事件 (12分钟后开始) ═══
        if (t >= 720) {
            this.reaperTimer += dt;
            if (this.reaperTimer >= 30) {
                this.reaperTimer = 0;
                this.spawnReaper();
            }
        }

        // ═══ 更新活跃事件 ═══
        for (const event of this.activeEvents) {
            event.timer -= dt;
            if (event.timer <= 0) {
                this.endEvent(event);
            }
        }
        this.activeEvents = this.activeEvents.filter(e => e.timer > 0);
    }

    /**
     * 触发血月事件
     */
    triggerBloodMoon() {
        const event = {
            type: 'bloodMoon',
            timer: 60, // 60秒
            spawnMult: 3,
            dropMult: 2,
        };
        this.activeEvents.push(event);

        // 视觉提示
        this.game.spawnDamageNumber(
            this.game.player.x, this.game.player.y - 100,
            '🌙 血月降临!', '#ff0044'
        );
        this.game.shakeAmount = 8;
        this.game.shakeDuration = 0.5;
        this.game.triggerScreenPulse('#ff0044', 1.0);
    }

    /**
     * 生成死神
     */
    spawnReaper() {
        this.reaperCount++;

        // 死神是一个强化版精英怪
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.max(this.game.width, this.game.height) / 2 + 100;
        const x = this.game.player.x + fastCos(angle) * dist;
        const y = this.game.player.y + fastSin(angle) * dist;

        const reaper = this.game.enemyPool.get().reset(this.game, x, y, 'GlitchEntity', {
            hpMult: 5 + this.reaperCount,  // 越来越强
            dmgMult: 2,
        });

        // 死神特性
        reaper.isReaper = true;
        reaper.speed = 120; // 快速
        reaper.radius = 18;
        reaper.xpValue = 100 + this.reaperCount * 20;

        this.game.enemies.push(reaper);

        // 警告
        this.game.spawnDamageNumber(
            this.game.player.x, this.game.player.y - 80,
            `⚠ 死神 #${this.reaperCount}!`, '#8800ff'
        );
        this.game.shakeAmount = 4;
        this.game.shakeDuration = 0.3;
    }

    /**
     * 结束事件
     */
    endEvent(event) {
        if (event.type === 'bloodMoon') {
            this.game.spawnDamageNumber(
                this.game.player.x, this.game.player.y - 60,
                '血月结束', '#888888'
            );
        }
    }

    /**
     * 获取当前生成倍率
     */
    getSpawnMultiplier() {
        let mult = 1;
        for (const event of this.activeEvents) {
            if (event.spawnMult) mult *= event.spawnMult;
        }
        return mult;
    }

    /**
     * 获取当前掉落倍率
     */
    getDropMultiplier() {
        let mult = 1;
        for (const event of this.activeEvents) {
            if (event.dropMult) mult *= event.dropMult;
        }
        return mult;
    }

    /**
     * 绘制事件状态
     */
    draw(ctx, w, h) {
        // 显示活跃事件
        const topOffset = (this.game.safeAreaTop || 0);
        let y = topOffset + 45;

        for (const event of this.activeEvents) {
            if (event.type === 'bloodMoon') {
                // 状态文字
                ctx.fillStyle = '#ff0044';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`🌙 血月 ${Math.ceil(event.timer)}s`, w / 2, y);
                ctx.textAlign = 'left';
            }
        }

        // 死神生成计数
        if (this.reaperCount > 0) {
            ctx.fillStyle = '#8800ff';
            ctx.font = '12px sans-serif';
            ctx.fillText(`死神出现: ${this.reaperCount}`, 10, y + 20);
        }
    }
}

module.exports = { EventEnhancer };
