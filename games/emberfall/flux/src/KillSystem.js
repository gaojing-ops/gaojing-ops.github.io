// ─── 击杀处理系统 (从 Game.js 提取) ────────────────────
// 击杀 XP/掉落/连杀/遗物触发 + 精英赏金系统

const SFX = require('./SFX');
const Gem = require('./Gem');
const { vibrate } = require('./platform');

function installKillSystem(Game) {

	/**
	 * 敌人死亡回调 — XP、掉落、连杀、遗物触发
	 */
	Game.prototype.onEnemyKilled = function (enemy) {
		this.player.kills++;

		// 速通模式：击杀计数 + 目标达成检测
		if (this.isSpeedRunMode) {
			this.speedRunKills = (this.speedRunKills || 0) + 1;
			const { KILL_TARGET, saveRecord, formatTime } = require('./scenes/SpeedRunScene');
			if (this.speedRunKills >= KILL_TARGET) {
				const elapsedMs = Math.floor((this.time - (this.speedRunStartTime || 0)) * 1000);
				saveRecord(elapsedMs, this.speedRunCharId || '');
				this.isSpeedRunMode = false;
				this.spawnDamageNumber(this.player.x, this.player.y - 70,
					'速通完成! ' + formatTime(elapsedMs), '#ff9900', false);
				if (this.triggerScreenPulse) this.triggerScreenPulse('#ff990044', 1.5);
				// [R6-2 FIX] 使用游戏循环计时器替代 setTimeout，防止跨局幽灵结算
				this._speedRunWinPending = {
					timer: 1.5,
					elapsedMs: elapsedMs,
				};
			}
		}

		// 濒死反击击杀追踪
		if (this._lastStandTimer > 0) {
			this._lastStandKills++;
		}

		let xp = enemy.xpValue || 5;
		if (this.timeRift) xp = Math.floor(xp * this.timeRift.xpMult);
		if (this._xpSurge) xp = Math.floor(xp * this._xpSurge.mult);
		if (this._densitySurge && this._densitySurge.xpMult) xp = Math.floor(xp * this._densitySurge.xpMult);
		// Player-wide experience bonuses are applied once when collecting the gem.

		// 事件掉落加成（血月等）
		const eventDropMult = this.eventEnhancer ? this.eventEnhancer.getDropMultiplier() : 1;
		xp = Math.floor(xp * eventDropMult);

		// 精英怪经验显示（已包含3倍加成）
		if (enemy.isElite) {
			this.spawnDamageNumber(enemy.x, enemy.y - 30, `+${xp} XP!`, '#ffcc00');
		}

		// 赏金目标击杀
		if (enemy._isBounty && this._bountyTarget === enemy) {
			this._onBountyKilled(enemy);
		}

		// 角色特性：冻结爆炸
		if (enemy.frozen > 0 && this.player.traitHandler) {
			this.player.traitHandler.onFrozenEnemyKilled(enemy);
		}

		// 角色特性：毒素吸血
		if (enemy.poisoned > 0 && this.player.traitHandler) {
			this.player.traitHandler.onPoisonedEnemyKilled(enemy);
		}

		// ═══ 新被动道具效果 ═══
		// 虚空核心：击杀回复HP
		if (this.player.voidLeech && this.player.voidLeech > 0) {
			this.player.heal(this.player.voidLeech);
		}

		// 灵魂收割：累积伤害加成
		if (this.player.soulHarvestBonus !== undefined) {
			this.player.soulHarvestBonus = Math.min(
				this.player.soulHarvestMax ?? 0.3,
				this.player.soulHarvestBonus + (this.player.soulHarvestPerKill ?? 0.02)
			);
		}

		// ═══ 击杀爆炸粒子（按敌人大小分级）═══
		const pCount = enemy.isElite ? 20 : (enemy.radius > 20 ? 12 : 6);
		const pColor = enemy.isElite ? '#ffcc00' : (enemy.poisoned > 0 ? '#88ff00' : '#ff8844');
		this.particles.emit(enemy.x, enemy.y, { count: pCount, speed: 120, life: 0.4, color: pColor, size: 3 });
		// 精英/Boss先锋击杀时额外屏幕震动
		if (enemy.isElite || enemy.isBossVanguard) {
			this.shakeAmount = Math.max(this.shakeAmount, 6);
			this.shakeDuration = 0.25;
		}

		this.gems.push(new Gem(this, enemy.x, enemy.y, xp));
		this.killCombo++;
		this.comboTimer = 2;
		this.highestCombo = Math.max(this.highestCombo, this.killCombo);

		if ([5, 10, 30, 50, 100].includes(this.killCombo)) {
			SFX.sfxStreak(this.killCombo);
		}

		// 遗物：虚空契约 — 每100击杀获得随机遗物
		if (this.player.relicFlags && this.player.relicFlags.voidContract) {
			this.player.voidContractKills = (this.player.voidContractKills || 0) + 1;
			if (this.player.voidContractKills >= 100) {
				this.player.voidContractKills = 0;
				if (!this.player.relics) this.player.relics = [];
				if (this.player.relics.length < 3) {
					const { grantRelic, getRandomRelics } = require('./Relic');
					const relics = getRandomRelics(this.player, 1, { automatic: true });
					if (relics.length > 0) {
						grantRelic(this.player, relics[0]);
						this.spawnDamageNumber(this.player.x, this.player.y - 60, '★ 虚空契约: ' + relics[0].name, '#ff4444');
					}
				}
			}
		}

		// 遗物：吸血契约 — 每5次击杀回复1 HP
		if (this.player.relicFlags && this.player.relicFlags.vampirePact) {
			this.player.vampireKillCount = (this.player.vampireKillCount || 0) + 1;
			if (this.player.vampireKillCount >= 5) {
				this.player.vampireKillCount = 0;
				this.player.heal(1);
			}
		}

		// 通知事件系统（怪物巢穴/虚空猎手/Boss先锋击杀奖励）
		if (this.eventSystem) this.eventSystem.onEnemyKilled(enemy);

		// ═══ 连杀奖励系统 ═══
		this._checkComboRewards();

		this.particles.enemyDeath(enemy.x, enemy.y, enemy.isElite ? '#ff8800' : '#ff0055');
		SFX.sfxKill();
		if (enemy.type !== 'Bat') {
			this.shakeAmount = 2;
			this.shakeDuration = 0.06;
		}

		// [NEW] Drops
		if (enemy.type === 'LootGoblin') {
			// 盗宝地精必定掉落宝箱，并产生大范围金币雨（全屏经验）
			this.spawnPickup(enemy.x, enemy.y, 'chest');
			this.spawnDamageNumber(enemy.x, enemy.y - 40, '💥 大爆! 💥', '#ffcc00');
			for (let i = 0; i < 20; i++) {
				const ox = enemy.x + (Math.random() - 0.5) * 150;
				const oy = enemy.y + (Math.random() - 0.5) * 150;
				this.spawnGem(ox, oy, 20); // 掉落大量高价值经验石
			}
			this.triggerScreenPulse('#ffcc00', 0.8);
			this.shakeAmount = 10;
			this.shakeDuration = 0.5;
		} else if (enemy.isElite) {
			// Elite drops Chest with 10% chance (nerfed for curse balance)
			if (Math.random() < 0.10) {
				this.spawnPickup(enemy.x, enemy.y, 'chest');
			} else if (Math.random() < 0.35) {
				// 35% chance for random pickup, lower bomb rate (potion: 60%, magnet: 35%, bomb: 5%)
				const r = Math.random();
				const type = r < 0.6 ? 'potion' : (r < 0.95 ? 'magnet' : 'bomb');
				this.spawnPickup(enemy.x, enemy.y, type);
			}
			// otherwise no drop (55% chance of nothing)
		} else {
			// Normal drops
			// 0.2% chance (1/500)
			if (Math.random() < 0.002) {
				const r = Math.random();
				const type = r < 0.6 ? 'potion' : (r < 0.95 ? 'magnet' : 'bomb');
				this.spawnPickup(enemy.x, enemy.y, type);
			}
		}
	};

	// ─── 精英赏金系统 ───

	/**
	 * 每帧更新赏金目标状态（由 Game.update() 调用）
	 */
	Game.prototype._updateBounty = function (dt) {
		// 当前有赏金目标
		if (this._bountyTarget) {
			if (!this._bountyTarget.active) {
				// 目标已死（可能被其他方式击杀）
				this._bountyTarget = null;
				this._bountyTimer = 45;
				return;
			}
			this._bountyTimeLeft -= dt;
			if (this._bountyTimeLeft <= 0) {
				// 超时：目标逃走，正确调用 die() 触发死亡效果
				const bt = this._bountyTarget;
				this._bountyTarget = null;
				this._bountyTimer = 45;
				this.spawnDamageNumber(bt.x, bt.y - 30, '\u8D4F\u91D1\u9003\u8DF1!', '#ff4444', false);
				if (bt.active) bt.die();
			}
			return;
		}

		// 无赏金目标：倒计时
		this._bountyTimer -= dt;
		if (this._bountyTimer <= 0) {
			this._bountyTimer = 45;
			if (Math.random() < 0.3) {
				// 寻找一个精英怪作为赏金目标
				for (let i = 0; i < this.enemies.length; i++) {
					const e = this.enemies[i];
					if (e.active && e.isElite) {
						this._bountyTarget = e;
						this._bountyTimeLeft = 15;
						e._isBounty = true;
						this.spawnDamageNumber(e.x, e.y - 40, '\u2666 \u8D4F\u91D1\u76EE\u6807 \u2666', '#ffcc00', false);
						this.triggerScreenPulse('#ffcc00', 0.3);
						break;
					}
				}
			}
		}
	};

	/**
	 * 赏金目标被击杀时的奖励发放
	 */
	Game.prototype._onBountyKilled = function (enemy) {
		this.triggerScreenPulse('#ffcc00', 0.6);
		this.shakeAmount = 5;
		this.shakeDuration = 0.3;
		vibrate('medium');

		// 随机奖励
		const roll = Math.random();
		if (roll < 0.25) {
			// 宝箱
			this.spawnPickup(enemy.x, enemy.y, 'chest');
			this.spawnDamageNumber(enemy.x, enemy.y - 40, '\u8D4F\u91D1: \u5B9D\u7BB1!', '#ffcc00', false);
		} else if (roll < 0.5) {
			// 回血 50%
			const heal = this.player.heal(Math.floor(this.player.maxHp * 0.5));

			this.spawnDamageNumber(enemy.x, enemy.y - 40, '\u8D4F\u91D1: +' + heal + ' HP', '#44ff88', false);
		} else if (roll < 0.75) {
			// 金币
			const gold = 80 + Math.floor(Math.random() * 120);
			if (this.meta) this.meta.addChips(gold);
			this.spawnDamageNumber(enemy.x, enemy.y - 40, '\u8D4F\u91D1: +' + gold + ' \u82AF\u7247', '#ffcc00', false);
		} else {
			// XP 大量经验
			const xp = Math.floor(this.player.maxXp * 0.8);
			this.player.gainXp(xp);
			this.spawnDamageNumber(enemy.x, enemy.y - 40, '\u8D4F\u91D1: +' + xp + ' XP', '#00ffcc', false);
		}

		if (this.particles) {
			this.particles.emit(enemy.x, enemy.y, { count: 15, speed: 120, life: 0.5, color: '#ffcc00', size: 4 });
		}

		this._bountyTarget = null;
		this._bountyTimer = 45;
	};
}

module.exports = installKillSystem;
