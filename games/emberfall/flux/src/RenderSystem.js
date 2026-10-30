// ─── 统一主渲染系统 (从 Game.js 分离) ──────────────────────────
// 挂载到 Game.prototype，维护 Game 类瘦身
const { drawDamageNumber } = require('./Renderer');
const { fastSin, fastCos } = require('./MathLUT');
const { now: perfNow } = require('./platform');
const SpeedRunSceneModule = require('./scenes/SpeedRunScene');

// 炮台六边形预计算表
const _HEX_COS = [], _HEX_SIN = [];
for (let _i = 0; _i < 6; _i++) {
    const _a = (_i / 6) * Math.PI * 2 - Math.PI / 6;
    _HEX_COS.push(fastCos(_a));
    _HEX_SIN.push(fastSin(_a));
}

function installRenderSystem(GameClass) {
    // 注意: _drawLastStand 和 _drawBossEntrance 在 HUD.js 中定义，此处不再重复定义

    GameClass.prototype.draw = function () {
        try {
            const dt = this.frameDt || 0.016;
            if (this.screenPulse > 0) this.screenPulse -= dt;
            if (this.shakeAmount > 0) this.shakeAmount -= 30 * dt;

            const ctx = this.ctx;

            if (this.isPaused || this._tutorialStep >= 0) {
                ctx.fillStyle = '#0a0a12';
                ctx.fillRect(0, 0, this.width, this.height);
                if (this.isPaused) this._drawPauseMenu();
                if (this._tutorialStep >= 0) this._drawTutorial();
                return;
            }

            if (!this.stageSystem) {
                this.mapManager.updateStyleByTime(this.time);
            }
            this.mapManager.draw(ctx, this.camera.x, this.camera.y, this.width, this.height, this.frameDt || 0.016);

            ctx.save();
            let sx = 0, sy = 0;
            // 依据用户需求，已全局关闭屏幕震动
            ctx.translate(-this.camera.x + sx, -this.camera.y + sy);



            if (this.radiationPulse) {
                const rp = this.radiationPulse;
                ctx.save();
                ctx.globalAlpha = rp.a;
                ctx.strokeStyle = rp.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
                ctx.stroke();
                for (let i = 1; i <= 3; i++) {
                    const innerR = rp.r * (1 - i * 0.25);
                    ctx.globalAlpha = rp.a * (0.3 - i * 0.08);
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(rp.x, rp.y, innerR, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.restore();
            }

            try { this.eventSystem.drawWorld(ctx); } catch (_eErr) {
                throw new Error('eventSystem.drawWorld: ' + _eErr.message);
            }

            for (const w of this.player.weapons) { try { if (w.drawGroundEffects) w.drawGroundEffects(ctx); } catch (_e) { throw new Error('weapon.drawGroundEffects(' + w.id + '): ' + _e.message); } }

            // 绘制命运神龛
            if (this.destinyShrines) {
                for (const s of this.destinyShrines) s.draw(ctx);
            }

            const camLeft = this.camera.x - 50;
            const camRight = this.camera.x + this.width + 50;
            const camTop = this.camera.y - 50;
            const camBottom = this.camera.y + this.height + 50;

            for (const g of this.gems) {
                if (g.x > camLeft && g.x < camRight && g.y > camTop && g.y < camBottom) {
                    g.draw(ctx);
                }
            }
            for (const p of this.pickups) p.draw(ctx);

            // Share the first game's foot-height layering with the new actors.
            const worldDrawables = this.mapManager.visibleProps(this.camera.x, this.camera.y, this.width, this.height, this.player);
            for (const e of this.enemies) {
                if (e.x > camLeft && e.x < camRight && e.y > camTop && e.y < camBottom) worldDrawables.push(e);
            }
            worldDrawables.push(...this.bosses, this.player);
            worldDrawables.sort((a, b) => a.y - b.y);
            for (const actor of worldDrawables) actor.draw(ctx);

            // 绘制屏幕外的 Boss 和盗宝地精指示器
            const screenCx = this.camera.x + this.width / 2;
            const screenCy = this.camera.y + this.height / 2;
            const drawOffscreenPointer = (target, color) => {
                const dx = target.x - screenCx;
                const dy = target.y - screenCy;
                const distSq = dx * dx + dy * dy;
                // 检测是否在屏幕外 (半对角线)
                const outDistSq = (this.width / 2) * (this.width / 2) + (this.height / 2) * (this.height / 2);
                if (distSq > outDistSq) {
                    const angle = Math.atan2(dy, dx);
                    ctx.save();
                    const edgeDist = Math.min(this.width, this.height) / 2 - 40;
                    ctx.translate(screenCx + fastCos(angle) * edgeDist, screenCy + fastSin(angle) * edgeDist);
                    ctx.rotate(angle);
                    ctx.globalAlpha = 0.5 + 0.5 * fastSin(this.time * 5);
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.moveTo(20, 0);
                    ctx.lineTo(-10, -15);
                    ctx.lineTo(-5, 0);
                    ctx.lineTo(-10, 15);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
            };

            for (const b of this.bosses) {
                if (b.active) drawOffscreenPointer(b, '#ff0055');
            }
            for (const e of this.enemies) {
                if (e.active && e.type === 'LootGoblin') drawOffscreenPointer(e, '#ffcc00');
            }

            for (const bul of this.bullets) {
                if (bul.x > camLeft && bul.x < camRight && bul.y > camTop && bul.y < camBottom) {
                    bul.draw(ctx);
                }
            }

            {
                if (!this._ebGroups) this._ebGroups = new Map();
                const ebGroups = this._ebGroups;
                for (const arr of ebGroups.values()) arr.length = 0;
                for (const eb of this.enemyBullets) {
                    if (eb.active && eb.x > camLeft && eb.x < camRight && eb.y > camTop && eb.y < camBottom) {
                        let group = ebGroups.get(eb.color);
                        if (!group) { group = []; ebGroups.set(eb.color, group); }
                        group.push(eb);
                    }
                }
                for (const [color, group] of ebGroups) {
                    if (group.length === 0) continue;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    for (const eb of group) {
                        ctx.moveTo(eb.x + eb.radius, eb.y);
                        ctx.arc(eb.x, eb.y, eb.radius, 0, Math.PI * 2);
                    }
                    ctx.fill();
                }
            }

            if (this.mortarWarnings) {
                for (const mw of this.mortarWarnings) {
                    if (!mw.active) continue;
                    ctx.save();
                    const alpha = 0.3 + fastSin(this.time * 10) * 0.2;
                    const progress = 1 - (mw.timer / 1.5);
                    ctx.globalAlpha = alpha;
                    ctx.strokeStyle = '#ff4422';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(mw.x, mw.y, mw.radius, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(255, 68, 34, 0.15)';
                    ctx.beginPath();
                    ctx.arc(mw.x, mw.y, mw.radius * progress, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            try { this.particles.draw(ctx); } catch (_e) { throw new Error('particles.draw: ' + _e.message); }

            if (this.player.turrets) {
                for (const t of this.player.turrets) {
                    if (!t.active) continue;
                    ctx.save();
                    ctx.translate(t.x, t.y);
                    ctx.fillStyle = '#1a1808';
                    ctx.strokeStyle = '#ffcc00';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        const px = _HEX_COS[i] * 12;
                        const py = _HEX_SIN[i] * 12;
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    const pulse = 0.5 + fastSin(this.time * 5) * 0.3;
                    ctx.fillStyle = `rgba(255, 204, 0, ${pulse})`;
                    ctx.beginPath();
                    ctx.arc(0, 0, 5, 0, Math.PI * 2);
                    ctx.fill();
                    const hpRatio = t.hp / t.maxHp;
                    ctx.fillStyle = '#333';
                    ctx.fillRect(-10, 15, 20, 3);
                    ctx.fillStyle = hpRatio > 0.5 ? '#ffcc00' : '#ff6600';
                    ctx.fillRect(-10, 15, 20 * hpRatio, 3);
                    if (t.lastTarget && this.time - t.lastShootTime < 0.15) {
                        ctx.strokeStyle = 'rgba(255, 204, 0, ' + (1 - (this.time - t.lastShootTime) / 0.15) + ')';
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(t.lastTarget.x - t.x, t.lastTarget.y - t.y);
                        ctx.stroke();
                    }
                    ctx.restore();
                }
            }

            // Player was drawn with the scenery above.

            for (const w of this.player.weapons) { try { if (w.drawEffects) w.drawEffects(ctx); } catch (_e) { throw new Error('weapon.drawEffects(' + w.id + '): ' + _e.message); } }

            if (this.drainLine) {
                const dl = this.drainLine;
                ctx.save();
                ctx.globalAlpha = dl.a;
                ctx.strokeStyle = dl.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(dl.x1, dl.y1);
                ctx.lineTo(dl.x2, dl.y2);
                ctx.stroke();
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(dl.x2, dl.y2, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            for (const d of this.damageNumbers) { drawDamageNumber(ctx, d.x, d.y, d.text, d.a, d.color, d.scale || 1, d.glow || false, d.bounce || false, d.bouncePhase || -1); }
            ctx.restore();

            if (this.input.active) this._drawJoystick();
            this.eventSystem.draw(ctx, this.width, this.height);
            this.eventEnhancer.draw(ctx, this.width, this.height);
            this.achievements.draw(ctx, this.width, this.height);

            this._drawComboDisplay(ctx, dt);
            this._drawBossEntrance(ctx);

            if (this.curseFogRadius > 0) {
                ctx.save();
                ctx.fillStyle = 'rgba(0,0,0,0.95)';
                const r = this.curseFogRadius;
                const cx = this.width / 2;
                const cy = this.height / 2;
                ctx.fillRect(0, 0, this.width, cy - r);
                ctx.fillRect(0, cy + r, this.width, this.height - (cy + r));
                ctx.fillRect(0, cy - r, cx - r, r * 2);
                ctx.fillRect(cx + r, cy - r, this.width - (cx + r), r * 2);
                ctx.restore();
            }

            try { this._drawHUD(); } catch (_e) { throw new Error('_drawHUD: ' + _e.message); }

            if (this.isSpeedRunMode) {
                const { KILL_TARGET, formatTime } = SpeedRunSceneModule;
                const _srKills = this.speedRunKills || 0;
                const _srElapsed = Math.floor((this.time - (this.speedRunStartTime || 0)) * 1000);
                const _ctx = this.ctx;
                _ctx.save();
                _ctx.font = 'bold 14px sans-serif';
                _ctx.fillStyle = '#ff9900';
                _ctx.textAlign = 'center';
                const _srY = (this.safeAreaTop || 0) + 18;
                _ctx.fillText('⏱ ' + formatTime(_srElapsed) + '  击杀 ' + _srKills + '/' + KILL_TARGET, this.width / 2, _srY);
                const _barW = Math.min(160, this.width * 0.5);
                const _barX = this.width / 2 - _barW / 2;
                const _barY = _srY + 4;
                _ctx.fillStyle = 'rgba(255,153,0,0.2)';
                _ctx.fillRect(_barX, _barY, _barW, 4);
                _ctx.fillStyle = '#ff9900';
                _ctx.fillRect(_barX, _barY, _barW * Math.min(1, _srKills / KILL_TARGET), 4);
                _ctx.textAlign = 'left';
                _ctx.restore();
            }
            this._drawBountyIndicator();
            this._drawPauseButton();

            if (this._bossDamageDisplay) {
                this._drawBossDamagePanel();
            }

            this._drawLastStand(ctx);

            if (this.bossRushMode) {
                this.bossRushMode.draw(ctx, this.width, this.height);
            }

            if (this.stageSystem) {
                this.stageSystem.draw(ctx, this.width, this.height);
            }

            if (this.skillSystem && !this.isPaused) {
                this.skillSystem.draw(ctx, this.width, this.height);
            }

        } catch (e) {
            console.error('Draw Error:', e);
            try { this.ctx.restore(); } catch (_) { }
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            const _cw = this.canvas.width, _ch = this.canvas.height;
            const _dpr = _cw / (this.width || 390);
            this.ctx.fillStyle = '#880000';
            this.ctx.fillRect(0, 0, _cw, _ch);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold ' + Math.round(44 * _dpr) + 'px sans-serif';
            const _msg = String(e && e.message ? e.message : e);
            const _chunkSize = 28;
            const _lines = [];
            for (let _i = 0; _i < _msg.length; _i += _chunkSize) _lines.push(_msg.slice(_i, _i + _chunkSize));
            this.ctx.fillText('DRAW ERROR:', 30 * _dpr, 80 * _dpr);
            _lines.forEach((_l, _i) => this.ctx.fillText(_l, 30 * _dpr, (130 + _i * 55) * _dpr));
        }
    }
}

module.exports = installRenderSystem;
