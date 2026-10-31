// ─── 碰撞检测系统 (从 Game.js 提取) ────────────────────
// 处理子弹↔敌人、子弹↔Boss、敌人↔玩家、敌人子弹↔玩家 四类碰撞

function installCollisionSystem(Game) {

	Game.prototype._checkCollisions = function (dt) {
		const p = this.player;

		// 网格已在 update() 开头构建，此处无需重建

		for (const b of this.bullets) {
			if (!b.active) continue;

			// 只检查附近的敌人 (使用独立的子弹专用查询数组防止被 onHit/Synergy 的嵌套查询冲刷)
			if (!this._bulletNearbyArr) this._bulletNearbyArr = [];
			const checkRadius = b.radius + 50; // 最大敌人半径
			const nearbyEnemies = this._getNearbyEnemies(b.x, b.y, checkRadius, this._bulletNearbyArr);

			const br = b.radius;
			for (const e of nearbyEnemies) {
				if (b._hitSet && b._hitSet.has(e)) continue; // [性能修复] 穿透弹防止每帧对同一怪物重复触发伤害

				const dx = b.x - e.x, dy = b.y - e.y;
				const rSum = br + e.radius;
				if (dx * dx + dy * dy < rSum * rSum) {
					if (b._hitSet) b._hitSet.add(e);
					e.takeDamage(b.damage, b);

					// ═══ Hit-stop: 大伤害触发更长停顿 ═══
					if (b.damage > 15) {
						this.triggerHitPause(0.04);   // 大伤害：40ms 停顿
					} else if (Math.random() < 0.25) {
						this.triggerHitPause(0.02);   // 25% 概率小停顿
					}

					// ═══ Micro-knockback: 子弹击中后推敌人 ═══
					{
						const bSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
						if (bSpeed > 0.01) {
							const kbStrength = 60; // 击退强度 px/s
							e.applyKnockback(
								(b.vx / bSpeed) * kbStrength,
								(b.vy / bSpeed) * kbStrength
							);
						}
					}

					// 记录武器命中（用于连携系统）
					if (b.weaponId) {
						// 并行数组替代对象数组，避免每次命中创建小对象
						if (!e._hitLogW) { e._hitLogW = []; e._hitLogT = []; }
						e._hitLogW.push(b.weaponId);
						e._hitLogT.push(this.time);
						// 就地压缩过时记录，替代 splice
						const cutTime = this.time - 0.5;
						let trimIdx = 0;
						while (trimIdx < e._hitLogT.length && e._hitLogT[trimIdx] < cutTime) trimIdx++;
						if (trimIdx > 0) {
							const newLen = e._hitLogW.length - trimIdx;
							for (let _i = 0; _i < newLen; _i++) {
								e._hitLogW[_i] = e._hitLogW[_i + trimIdx];
								e._hitLogT[_i] = e._hitLogT[_i + trimIdx];
							}
							e._hitLogW.length = newLen;
							e._hitLogT.length = newLen;
						}
						this._checkWeaponCombo(e, b.weaponId);
					}

					// 处理元素协同（在伤害应用后）
					if (b.element && this.synergy) {
						this.synergy.processSynergy(e, b, b.damage);
					}

					// Apply status effects from bullet
					if (b.freezeChance && Math.random() < b.freezeChance) {
						e.frozen = Math.max(e.frozen || 0, b.freezeDur || 1);
						this.totalFreezeApplies++;
					}
					if (b.slowAmount && b.slowAmount < 1) {
						e.slowed = 2;
						e.slowAmount = b.slowAmount;
					}
					if (b.poisonChance && Math.random() < b.poisonChance) {
						e.poisoned = 3;
						e.poisonStacks += b.poisonStacks || 1;
						this.totalPoisonApplies++;
					}

					b.onHit();
					if (!b.active) break;
				}
			}
			if (!b.active) continue;
			for (const boss of this.bosses) {
				if (!boss.active || (b._hitSet && b._hitSet.has(boss))) continue;
				const dx = b.x - boss.x, dy = b.y - boss.y;
				const rSumB = b.radius + boss.radius;
				if (dx * dx + dy * dy < rSumB * rSumB) {
					if (b._hitSet) b._hitSet.add(boss);
					boss.takeDamage(b.damage, b.weaponId || null);
					// Boss 命中：更长停顿
					this.triggerHitPause(0.06);
					b.onHit();
					if (!b.active) break;
				}
			}
		}

		// 敌人与玩家碰撞（使用网格优化）
		const nearbyToPlayer = this._getNearbyEnemies(p.x, p.y, p.radius + 30);
		const pr = p.radius;
		for (const e of nearbyToPlayer) {
			const dx = p.x - e.x, dy = p.y - e.y;
			const rSumP = pr + e.radius;
			if (dx * dx + dy * dy < rSumP * rSumP) {
				if (this.playerInvincible > 0) continue; // Skip immediately if invincible
				// 计算实际伤害
				let actualDamage = e.damage * dt * (this.curseEnemyDamageMult || 1);

				// 狂暴词缀：低血量时伤害+50%
				if (e.berserkerAffix && e.hp / e.maxHp < 0.5) {
					actualDamage *= 1.5;
				}

				if (p.takeDamage(actualDamage, e, true)) { // 持续接触伤害保留 dt 后的小数
					if (this._runSettled) return;
					if (this.eventSystem) this.eventSystem.onPlayerHit();

					// 吸血词缀：敌人攻击时回复HP
					if (e.vampiricAffix) {
						const healAmount = actualDamage * 0.3;
						e.hp = Math.min(e.maxHp, e.hp + healAmount);
						if (this.particles && Math.random() < 0.2) {
							this.particles.emit(e.x, e.y - e.radius, { count: 3, speed: 30, life: 0.3, color: '#cc0044', size: 2 });
						}
					}

					// Frost armor: freeze enemies that damage player
					if (p.frostArmorActive && Math.random() < 0.3) {
						e.frozen = Math.max(e.frozen || 0, 1.5);
						if (this.particles) {
							this.particles.emit(e.x, e.y, { count: 3, speed: 50, life: 0.3, color: '#66ccff', size: 3 });
						}
					}
				}
			}
		}

		// Boss与玩家碰撞
		for (const boss of this.bosses) {
			if (!boss.active) continue;
			const dx = p.x - boss.x, dy = p.y - boss.y;
			const rSum = pr + boss.radius;
			if (dx * dx + dy * dy < rSum * rSum) {
				if (this.playerInvincible > 0) continue; // Skip immediately if invincible
				// Boss接触伤害更高（×1.5）
				const bossDamage = boss.damage * dt * 1.5 * (this.curseEnemyDamageMult || 1);
				if (p.takeDamage(bossDamage, boss, true)) {
					if (this._runSettled) return;
					if (this.eventSystem) this.eventSystem.onPlayerHit();

					// Frost armor: 冰冻Boss（概率更低）
					if (p.frostArmorActive && Math.random() < 0.15) {
						boss.frozen = Math.max(boss.frozen || 0, 1.0);
						if (this.particles) {
							this.particles.emit(boss.x, boss.y, { count: 5, speed: 50, life: 0.3, color: '#66ccff', size: 3 });
						}
					}
				}
			}
		}

		for (const eb of this.enemyBullets) {
			if (!eb.active) continue;
			const dx = p.x - eb.x, dy = p.y - eb.y;
			const rSumEb = pr + eb.radius;
			if (dx * dx + dy * dy < rSumEb * rSumEb) {
				if (this.playerInvincible > 0) { eb.active = false; continue; }
				p.takeDamage(eb.damage);
				if (this._runSettled) return;
				if (this.eventSystem) this.eventSystem.onPlayerHit();
				eb.active = false;
			}
		}
	};
}

module.exports = installCollisionSystem;
