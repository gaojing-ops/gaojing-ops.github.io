// ─── 角色系统 ──────────────────────────────────────
// 每个角色拥有独特的被动特性，影响玩法风格

const SFX = require('./SFX');

const CHARACTERS = {
	tracer: {
		id: 'tracer',
		name: '守灯人',
		desc: '高速机动 · 连击叠加',
		color: '#00ffcc',
		element: 'flux',
		startWeapon: 'flux_bolt',
		stats: { maxHp: 80, speed: 250, might: 1.0, pickup: 80 },
		passive: '移速+25% / 连续移动每秒伤害+5%(最高+50%)',
		passiveApply: (player) => {
			player.bonusSpeed += 0.25;
			player.characterTrait = 'momentum';
		},
		// 特性：动量叠加 - 连续移动时伤害增加
		onUpdate: (player, dt) => {
			const v = player.game.input.getVector();
			if (v.x !== 0 || v.y !== 0) {
				player.momentumStacks = Math.min(10, (player.momentumStacks || 0) + dt * 0.5);
			} else {
				player.momentumStacks = Math.max(0, (player.momentumStacks || 0) - dt * 2);
			}
		},
		getExtraMight: (player) => {
			return (player.momentumStacks || 0) * 0.05;
		},
	},

	walker: {
		id: 'walker',
		name: '铁卫',
		desc: '坚实护甲 · 伤害反弹',
		color: '#aa44ff',
		element: 'void',
		startWeapon: 'radiation_field',
		stats: { maxHp: 150, speed: 160, might: 0.85, pickup: 100 },
		passive: 'HP+50% / 护甲+3 / 受伤反弹25%伤害',
		passiveApply: (player) => {
			player.bonusArmor += 3;
			player.thornDamage = 0.25; // 反弹伤害比例
		},
	},

	gunner: {
		id: 'gunner',
		name: '逐风者',
		desc: '远程打击 · 静止瞄准',
		color: '#ff6600',
		element: 'plasma',
		startWeapon: 'plasma_arc',
		stats: { maxHp: 100, speed: 190, might: 1.2, pickup: 70 },
		passive: '攻击范围+40% / 站定1秒后伤害+35%',
		passiveApply: (player) => {
			player.bonusArea += 0.4;
			player.characterTrait = 'sharpshooter';
		},
		onUpdate: (player, dt) => {
			const v = player.game.input.getVector();
			if (v.x === 0 && v.y === 0) {
				player.stillTime = (player.stillTime || 0) + dt;
			} else {
				player.stillTime = 0;
			}
		},
		getExtraMight: (player) => {
			return (player.stillTime || 0) >= 1 ? 0.35 : 0;
		},
	},

	cryomancer: {
		id: 'cryomancer',
		name: '霜语者',
		desc: '绝对零度 · 冻结引爆',
		color: '#66ccff',
		element: 'cryo',
		startWeapon: 'ice_shard',
		stats: { maxHp: 85, speed: 180, might: 1.0, pickup: 80 },
		passive: '冰冻效果+60% / 冻结敌人死亡时爆炸造成范围伤害',
		passiveApply: (player) => {
			player.bonusFreezeDur += 0.6;
			player.freezeExplosion = true; // 冻结爆炸特性
		},
	},

	biohazard: {
		id: 'biohazard',
		name: '毒枝术士',
		desc: '剧毒扩散 · 病毒收割',
		color: '#88ff00',
		element: 'toxic',
		startWeapon: 'toxin_spray',
		stats: { maxHp: 95, speed: 185, might: 0.9, pickup: 90 },
		passive: '毒素伤害+80% / 击杀中毒敌人回复3HP',
		passiveApply: (player) => {
			player.bonusToxicDmg += 0.8;
			player.poisonLeech = true; // 毒素吸血特性
		},
	},

	// ═══ 新角色 ═══
	berserker: {
		id: 'berserker',
		name: '破晓狂刃',
		desc: '血怒战意 · 越战越勇',
		color: '#ff0044',
		element: 'plasma',
		startWeapon: 'plasma_arc',
		stats: { maxHp: 120, speed: 200, might: 1.3, pickup: 70 },
		passive: 'HP越低伤害越高 / 生命低于30%时攻击速度+50%',
		passiveApply: (player) => {
			player.berserkerMode = true;
			player._berserkerCdrActive = false;
			player._berserkerCdrAmount = 0.20; // [BALANCE] 原CDR+50%轻松突破上限，降为+20%
		},
		onUpdate: (player, dt) => {
			const hpRatio = player.hp / player.maxHp;
			const shouldActivate = hpRatio <= 0.3;
			if (shouldActivate && !player._berserkerCdrActive) {
				player._berserkerCdrActive = true;
				player.bonusCdr += player._berserkerCdrAmount;
			} else if (!shouldActivate && player._berserkerCdrActive) {
				player._berserkerCdrActive = false;
				player.bonusCdr -= player._berserkerCdrAmount;
			}
		},
		getExtraMight: (player) => {
			const hpRatio = player.hp / player.maxHp;
			if (hpRatio <= 0.3) return 0.5; // 血量低于30%时额外伤害
			return (1 - hpRatio) * 0.4; // 血量越低伤害越高
		},
	},

	arcane: {
		id: 'arcane',
		name: '星纱法师',
		desc: '元素调和 · 魔力共鸣',
		color: '#ff44ff',
		element: 'void',
		startWeapon: 'soul_drain',
		stats: { maxHp: 70, speed: 170, might: 1.1, pickup: 85 },
		passive: '所有元素伤害+15% / 协同效果伤害+50%',
		passiveApply: (player) => {
			player.bonusMight += 0.15;
			player.synergyBonus = 0.5; // 协同伤害加成
		},
	},

	engineer: {
		id: 'engineer',
		name: '符文工匠',
		desc: '炮台部署 · 智能支援',
		color: '#ffcc00',
		element: 'flux',
		startWeapon: 'chain_spark',
		stats: { maxHp: 90, speed: 175, might: 0.95, pickup: 100 },
		passive: '投射物+2 / 冷却-15% / 每15秒部署一座炮台',
		passiveApply: (player) => {
			player.bonusProjectile += 2;
			player.bonusCdr += 0.15;
			player.turretTimer = 0;
			player.turrets = [];
		},
		onUpdate: (player, dt) => {
			player.turretTimer = (player.turretTimer || 0) + dt;
			// 每15秒部署一座炮台
			if (player.turretTimer >= 15) {
				player.turretTimer = 0;
				const turret = {
					x: player.x,
					y: player.y,
					hp: 30,
					maxHp: 30,
					lifetime: 10, // 持续10秒
					shootTimer: 0,
					shootInterval: 0.8,
					baseDamage: 8, // 基础倍率，实际伤害 = player.might * baseDamage
					range: 200,
					active: true,
					lastTarget: null, // 用于射击连线特效
					lastShootTime: 0,
				};
				player.turrets = player.turrets || [];
				// 最多3座
				if (player.turrets.length >= 3) {
					player.turrets.shift();
				}
				player.turrets.push(turret);
				player.game.spawnDamageNumber(turret.x, turret.y - 30, '⚙ 炮台部署!', '#ffcc00');
			}
			// 更新现有炮台（使用空间网格优化，避免 O(n) 全量敌人遍历）
			if (player.turrets) {
				const gameTime = player.game.time;
				const g = player.game;
				for (const t of player.turrets) {
					if (!t.active) continue;
					t.lifetime -= dt;
					if (t.lifetime <= 0) { t.active = false; continue; }

					// 炮台可被敌人踩踏损坏（空间网格：只查附近30px内的敌人）
					const trampleRadius = 30;
					const nearbyTrample = g._getNearbyEnemies ? g._getNearbyEnemies(t.x, t.y, trampleRadius) : g.enemies;
					for (const e of nearbyTrample) {
						if (!e.active) continue;
						const edx = e.x - t.x, edy = e.y - t.y;
						if (edx * edx + edy * edy < (e.radius + 12) * (e.radius + 12)) {
							t.hp -= e.damage * dt * 0.5;
							if (t.hp <= 0) { t.active = false; break; }
						}
					}
					if (!t.active) continue;

					t.shootTimer -= dt;
					if (t.shootTimer <= 0) {
						t.shootTimer = t.shootInterval;
						// 找最近敌人（空间网格：只查射程范围内的敌人）
						let best = null, bestDist = t.range * t.range;
						const nearbyShoot = g._getNearbyEnemies ? g._getNearbyEnemies(t.x, t.y, t.range) : g.enemies;
						for (const e of nearbyShoot) {
							if (!e.active) continue;
							const dx = e.x - t.x, dy = e.y - t.y;
							const d2 = dx * dx + dy * dy;
							if (d2 < bestDist) { bestDist = d2; best = e; }
						}
						if (best && best.active) {
							// 动态继承玩家 might
							const actualDamage = player.might * t.baseDamage;
							best.takeDamage(actualDamage);
							t.lastTarget = { x: best.x, y: best.y };
							t.lastShootTime = gameTime;
							// 节流音效：隔一次播放（避免 3~6 炮台同帧连射音效爆炸）
							t._sfxToggle = !t._sfxToggle;
							if (t._sfxToggle) SFX.sfxTurretShoot();
							// 射击视觉效果（降低粒子数量）
							if (player.game.particles && g.qualityLevel > 0) {
								player.game.particles.emit(best.x, best.y, { count: 2, speed: 30, life: 0.15, color: '#ffcc00', size: 2 });
							}
						}
					}
				}
				let w = 0;
				for (let i = 0; i < player.turrets.length; i++) {
					if (player.turrets[i].active) player.turrets[w++] = player.turrets[i];
				}
				player.turrets.length = w;
			}
		},
	},

	assassin: {
		id: 'assassin',
		name: '暮影刺客',
		desc: '瞬步杀机 · 背刺暴击',
		color: '#8800ff',
		element: 'void',
		startWeapon: 'shadow_clone',
		stats: { maxHp: 65, speed: 280, might: 1.15, pickup: 75 },
		passive: '移速+40% / 暴击伤害+100%',
		passiveApply: (player) => {
			player.bonusSpeed += 0.4;
			player.criticalDamage = (player.criticalDamage || 0) + 1.0;
			player.luckyChance = (player.luckyChance || 0) + 0.1; // 10%暴击率
		},
	},
};

// 角色特性处理器
class CharacterTraitHandler {
	constructor(player) {
		this.player = player;
	}

	// 每帧更新
	update(dt) {
		const charId = this.player.characterId;
		const char = CHARACTERS[charId];
		if (!char || !char.onUpdate) return;
		char.onUpdate(this.player, dt);
	}

	// 获取额外伤害倍率
	getExtraMight() {
		const charId = this.player.characterId;
		const char = CHARACTERS[charId];
		if (!char || !char.getExtraMight) return 0;
		return char.getExtraMight(this.player);
	}

	// 冻结爆炸效果
	onFrozenEnemyKilled(enemy) {
		if (!this.player.freezeExplosion) return;

		const radius = 80;
		const damage = enemy.maxHp * 0.5;
		const radiusSq = radius * radius;

		for (const e of this.player.game.enemies) {
			if (e === enemy || !e.active) continue;
			const dx = e.x - enemy.x;
			const dy = e.y - enemy.y;
			if (dx * dx + dy * dy < radiusSq) {
				e.takeDamage(damage);
			}
		}

		// 视觉效果
		if (this.player.game.particles) {
			this.player.game.particles.emit(enemy.x, enemy.y, {
				count: 25, speed: 150, life: 0.4, color: '#66ccff', size: 5
			});
		}
		this.player.game.radiationPulse = {
			x: enemy.x, y: enemy.y, r: radius, a: 0.8, color: '#66ccff'
		};
	}

	// 毒素吸血效果
	onPoisonedEnemyKilled(enemy) {
		if (!this.player.poisonLeech) return;

		const healAmount = 3;
		this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
		this.player.totalHealed += healAmount;

		// 视觉效果
		this.player.game.spawnDamageNumber(
			enemy.x, enemy.y - 30, `+${healAmount}`, '#88ff00'
		);
	}
}

module.exports = { CHARACTERS, CharacterTraitHandler };
