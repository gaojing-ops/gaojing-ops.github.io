// ─── 连杀狂潮系统（从 Game.js 提取） ──────────────────────────
// 挂载到 Game.prototype，保持 this 指向 Game 实例

const { vibrate } = require('./platform');
const SFX = require('./SFX');

function installComboSystem(GameClass) {

	// ═══ 连杀狂潮系统 ═══
	GameClass.prototype._checkComboRewards = function () {
		const combo = this.killCombo;
		const p = this.player;

		// 15连杀: XP +20% 持续 5 秒
		if (combo >= 15 && this.lastComboReward < 15) {
			this.lastComboReward = 15;
			p.bonusXp = (p.bonusXp || 0) + 0.2;
			this._comboBuffTimer15 = 5;
			const self15 = this;
			this._comboBuffRestore15 = function () { self15.player.bonusXp = (self15.player.bonusXp || 0) - 0.2; };
			this.spawnDamageNumber(p.x, p.y - 80, '15 连杀! XP+20%', '#88ff44');
			this.triggerScreenPulse('#88ff44', 0.3);
			SFX.sfxCombo();
			vibrate('light');
		}

		// 30连杀: 移速 +30% 持续 5 秒 + 角色拖尾增强
		if (combo >= 30 && this.lastComboReward < 30) {
			this.lastComboReward = 30;
			p.bonusSpeed += 0.3;
			this._comboBuffTimer30 = 5;
			const self30 = this;
			this._comboBuffRestore30 = function () { self30.player.bonusSpeed -= 0.3; };
			this.spawnDamageNumber(p.x, p.y - 80, '30 连杀! 移速+30%', '#00ccff');
			this.triggerScreenPulse('#00ccff', 0.4);
			if (this.particles) {
				this.particles.emit(p.x, p.y, { count: 15, speed: 100, life: 0.4, color: '#00ccff', size: 3 });
			}
			SFX.sfxCombo();
			vibrate('medium');
		}

		// 50连杀: 全武器 CDR -50% 持续 5 秒
		if (combo >= 50 && this.lastComboReward < 50) {
			this.lastComboReward = 50;
			p.bonusCdr = (p.bonusCdr || 0) + 0.5;
			this._comboBuffTimer50 = 5;
			const self50 = this;
			this._comboBuffRestore50 = function () { self50.player.bonusCdr = (self50.player.bonusCdr || 0) - 0.5; };
			this.playerInvincible = 2;
			this.spawnDamageNumber(p.x, p.y - 80, '50 连杀! 极速射击!', '#ff8800');
			this.triggerScreenPulse('#ff8800', 0.5);
			this.shakeAmount = 5;
			this.shakeDuration = 0.3;
			if (this.particles) {
				this.particles.emit(p.x, p.y, { count: 25, speed: 150, life: 0.5, color: '#ff8800', size: 5 });
			}
			SFX.sfxCombo();
			vibrate('medium');
		}

		// 75连杀: 清屏冲击波（杀死所有可视范围小怪）
		if (combo >= 75 && this.lastComboReward < 75) {
			this.lastComboReward = 75;
			this._screenClear();
			this.spawnDamageNumber(p.x, p.y - 100, '75 连杀! 冲击波!', '#ff44ff');
			this.shakeAmount = 12;
			this.shakeDuration = 0.5;
			this.triggerScreenPulse('#ff44ff', 0.6);
			SFX.sfxCombo();
			vibrate('heavy');
		}

		// 100连杀: 无敌 3 秒 + 伤害 x3 + 金色全屏脉冲
		if (combo >= 100 && this.lastComboReward < 100) {
			this.lastComboReward = 100;
			this.playerInvincible = 3;
			p.bonusMight += 2.0; // +200% = x3 damage
			this._comboBuffTimer100 = 3;
			const self100 = this;
			this._comboBuffRestore100 = function () { self100.player.bonusMight -= 2.0; };
			this.spawnDamageNumber(p.x, p.y - 100, '100 连杀! 神之一击!', '#ffd700');
			this.triggerScreenPulse('#ffd700', 0.8);
			this.shakeAmount = 15;
			this.shakeDuration = 0.8;
			if (this.particles) {
				this.particles.emit(p.x, p.y, { count: 60, speed: 300, life: 0.8, color: '#ffd700', size: 8 });
			}
			SFX.sfxCombo();
			vibrate('heavy');
		}
	};

	// 重置连杀系统（新游戏开始时调用）
	GameClass.prototype._resetComboBuffs = function () {
		if (this._comboBuffTimer15 > 0 && this._comboBuffRestore15) { this._comboBuffRestore15(); }
		if (this._comboBuffTimer30 > 0 && this._comboBuffRestore30) { this._comboBuffRestore30(); }
		if (this._comboBuffTimer50 > 0 && this._comboBuffRestore50) { this._comboBuffRestore50(); }
		if (this._comboBuffTimer100 > 0 && this._comboBuffRestore100) { this._comboBuffRestore100(); }
		this._comboBuffTimer15 = 0; this._comboBuffRestore15 = null;
		this._comboBuffTimer30 = 0; this._comboBuffRestore30 = null;
		this._comboBuffTimer50 = 0; this._comboBuffRestore50 = null;
		this._comboBuffTimer100 = 0; this._comboBuffRestore100 = null;
	};

	// 连杀临时 Buff 衰减（在 update 中调用）
	GameClass.prototype._updateComboBuffs = function (dt) {
		if (this._comboBuffTimer15 > 0) {
			this._comboBuffTimer15 -= dt;
			if (this._comboBuffTimer15 <= 0 && this._comboBuffRestore15) {
				this._comboBuffRestore15();
				this._comboBuffRestore15 = null;
			}
		}
		if (this._comboBuffTimer30 > 0) {
			this._comboBuffTimer30 -= dt;
			if (this._comboBuffTimer30 <= 0 && this._comboBuffRestore30) {
				this._comboBuffRestore30();
				this._comboBuffRestore30 = null;
			}
		}
		if (this._comboBuffTimer50 > 0) {
			this._comboBuffTimer50 -= dt;
			if (this._comboBuffTimer50 <= 0 && this._comboBuffRestore50) {
				this._comboBuffRestore50();
				this._comboBuffRestore50 = null;
			}
		}
		if (this._comboBuffTimer100 > 0) {
			this._comboBuffTimer100 -= dt;
			if (this._comboBuffTimer100 <= 0 && this._comboBuffRestore100) {
				this._comboBuffRestore100();
				this._comboBuffRestore100 = null;
			}
		}
	};

	// 连杀爆炸
	GameClass.prototype._comboExplosion = function (radius, damage) {
		const p = this.player;
		const radiusSq = radius * radius;

		for (const e of this.enemies) {
			if (!e.active) continue;
			const dx = e.x - p.x;
			const dy = e.y - p.y;
			if (dx * dx + dy * dy < radiusSq) {
				e.takeDamage(damage);
			}
		}

		// 视觉效果
		if (this.particles) {
			this.particles.emit(p.x, p.y, { count: 25, speed: 200, life: 0.4, color: '#ff6600', size: 5 });
		}
		this.radiationPulse = { x: p.x, y: p.y, r: radius, a: 0.6, color: '#ff6600' };
	};

	// 清屏冲击波
	GameClass.prototype._screenClear = function () {
		const p = this.player;
		const damage = 100 * p.might;

		// 所有敌人受到大量伤害
		for (const e of this.enemies) {
			if (e.active) {
				e.takeDamage(damage);
			}
		}

		// Boss也受到伤害
		for (const b of this.bosses) {
			if (b.active) {
				b.takeDamage(damage * 0.5);
			}
		}

		// 收集所有宝石
		for (const g of this.gems) {
			if (g.active) {
				p.gainXp(g.value);
				g.active = false;
			}
		}

		// 大范围视觉特效
		if (this.particles) {
			this.particles.emit(p.x, p.y, { count: 50, speed: 400, life: 0.6, color: '#ff00ff', size: 8 });
		}
		this.radiationPulse = { x: p.x, y: p.y, r: 500, a: 0.8, color: '#ff00ff' };
	};
}

module.exports = installComboSystem;
