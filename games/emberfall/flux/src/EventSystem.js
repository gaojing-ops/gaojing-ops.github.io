// ─── 随机事件系统 ──────────────────────────
// 事件分类：positive（正面）/ challenge（挑战）/ negative（高奖励负面）
const { now: perfNow } = require('./platform');
const { fastSin, fastCos } = require('./MathLUT');
const SFX = require('./SFX');

const EVENT_DEFS = [

	// ══════════════ 正面事件（positive）══════════════

	{
		id: 'gem_rain',
		category: 'positive',
		name: '宝石雨',
		desc: '天降大量经验宝石！',
		action: (game) => {
			for (let i = 0; i < 30; i++) {
				const ox = game.player.x + (Math.random() - 0.5) * 500;
				const oy = game.player.y + (Math.random() - 0.5) * 500;
				game.spawnGem(ox, oy, 8 + Math.floor(Math.random() * 8));
			}
			game.spawnDamageNumber(game.player.x, game.player.y - 40, '宝石雨!', '#00ffcc');
		}
	},
	{
		id: 'heal_shrine',
		category: 'positive',
		name: '修复节点',
		desc: '恢复 50% 生命值',
		action: (game) => {
			if (!game.player.canHeal) {
				game.spawnDamageNumber(game.player.x, game.player.y - 30, '修复失败!', '#ff4444');
				return;
			}
			const heal = game.player.heal(game.player.maxHp * 0.5);
			game.spawnDamageNumber(game.player.x, game.player.y - 30, `+${Math.floor(heal)} HP`, '#44ff88');
		}
	},
	{
		id: 'treasure_zone',
		category: 'positive',
		name: '数据宝库',
		desc: '宝库出现！站在发光区域 3 秒获取大量经验',
		action: (game) => {
			const angle = Math.random() * Math.PI * 2;
			game.activeZone = {
				x: game.player.x + fastCos(angle) * 200,
				y: game.player.y + fastSin(angle) * 200,
				radius: 80,
				timer: 8,
				stayTimer: 0,
				stayRequired: 3,
				color: '#00ccff',
				claimed: false,
			};
			game.spawnDamageNumber(game.activeZone.x, game.activeZone.y, '数据宝库!', '#00ccff');
		}
	},
	{
		id: 'weapon_surge',
		category: 'positive',
		name: '武器超频',
		desc: '全体武器伤害 +30%，持续 20 秒',
		action: (game) => {
			if (game._weaponSurge) { game._weaponSurge.timer += 20; return; }
			game._weaponSurge = { timer: 20, mightBonus: 0.30 };
			game.player.bonusMight = (game.player.bonusMight || 0) + 0.30;
			game.spawnDamageNumber(game.player.x, game.player.y - 40, '武器超频! +30%伤害', '#ffaa00');
		}
	},
	{
		id: 'speed_burst',
		category: 'positive',
		name: '超速模式',
		desc: '移速 +50%，持续 15 秒',
		action: (game) => {
			if (game._speedBurst) { game._speedBurst.timer += 15; return; }
			game._speedBurst = { timer: 15, speedBonus: 0.50 };
			game.player.bonusSpeed = (game.player.bonusSpeed || 0) + 0.50;
			game.spawnDamageNumber(game.player.x, game.player.y - 40, '超速模式! +50%移速', '#44aaff');
		}
	},
	{
		id: 'xp_surge',
		category: 'positive',
		name: '经验加速',
		desc: '15 秒内经验 x4',
		action: (game) => {
			game._xpSurge = { timer: 15, mult: 4 };
			game.spawnDamageNumber(game.player.x, game.player.y - 40, '经验加速! x4 XP', '#00ffcc');
		}
	},
	{
		id: 'magnet_pull',
		category: 'positive',
		name: '磁力风暴',
		desc: '全屏经验宝石瞬间吸向玩家',
		action: (game) => {
			let count = 0;
			for (const g of game.gems) {
				if (g.active) {
					g.magnetized = true;
					count++;
				}
			}
			game.spawnDamageNumber(game.player.x, game.player.y - 40, `磁力风暴! ${count}颗宝石`, '#44ffcc');
		}
	},
	{
		id: 'cooldown_reset',
		category: 'positive',
		name: '冷却重置',
		desc: '所有武器冷却立即归零',
		action: (game) => {
			for (const w of game.player.weapons) {
				if (w.cooldown !== undefined) w.cooldown = 0;
			}
			game.spawnDamageNumber(game.player.x, game.player.y - 40, '冷却重置!', '#aaffff');
		}
	},
	{
		id: 'armor_boost',
		category: 'positive',
		name: '护甲强化',
		desc: '护甲 +15，持续 30 秒',
		action: (game) => {
			if (game._armorBoost) { game._armorBoost.timer += 30; return; }
			game._armorBoost = { timer: 30, armorBonus: 15 };
			game.player.bonusArmor = (game.player.bonusArmor || 0) + 15;
			game.spawnDamageNumber(game.player.x, game.player.y - 40, '护甲强化! +15护甲', '#88ccff');
		}
	},
	{
		id: 'weapon_upgrade_free',
		category: 'positive',
		name: '武器增幅',
		desc: '随机一件武器立刻升级',
		action: (game) => {
			const ws = game.player.weapons;
			if (ws.length === 0) return;
			const w = ws[Math.floor(Math.random() * ws.length)];
			const maxLv = (w.def && w.def.maxLevel) || 8;
			w.level = Math.min((w.level || 1) + 1, maxLv);
			const name = (w.def && w.def.name) || w.id;
			game.spawnDamageNumber(game.player.x, game.player.y - 40, `${name} 升级!`, '#ffdd44');
		}
	},

	// ══════════════ 挑战事件（challenge）══════════════

	{
		id: 'elite_challenge',
		category: 'challenge',
		name: '精英挑战',
		desc: '强化精英怪来袭！击杀后获得大量经验',
		action: (game) => {
			const angle = Math.random() * Math.PI * 2;
			const x = game.player.x + fastCos(angle) * 300;
			const y = game.player.y + fastSin(angle) * 300;
			const types = ['Skeleton', 'Ghost', 'Charger', 'ShieldBearer', 'IronGolem'];
			const type = types[Math.floor(Math.random() * types.length)];
			const enemy = game._createEnemy(x, y, type);
			if (enemy) {
				enemy.hp *= 3; enemy.maxHp *= 3;
				enemy.xpValue *= 5; enemy.radius *= 1.4;
				enemy.isElite = true;
				const affixes = ['swift', 'shielded', 'splitting'];
				enemy.affix = affixes[Math.floor(Math.random() * affixes.length)];
				if (enemy.affix === 'swift') enemy.speed *= 1.8;
				if (enemy.affix === 'shielded') { enemy.shield = enemy.maxHp * 0.5; }
				game.enemies.push(enemy);
				game.spawnDamageNumber(x, y, '精英来袭!', '#ff8800');
			}
		}
	},
	{
		id: 'time_rift',
		category: 'challenge',
		name: '时间裂缝',
		desc: '10 秒内敌人速度 x2，但经验 x3！',
		action: (game) => {
			game.timeRift = { timer: 10, speedMult: 2, xpMult: 3 };
			game.spawnDamageNumber(game.player.x, game.player.y - 40, '时间裂缝!', '#ffcc00');
		}
	},
	{
		id: 'monster_nest',
		category: 'challenge',
		name: '怪物巢穴',
		desc: '30 秒内击杀 20 个怪物，奖励升级机会',
		action: (game) => {
			game._nestChallenge = { killsRequired: 20, kills: 0, timer: 30 };
			game.spawnDamageNumber(game.player.x, game.player.y - 50, '怪物巢穴! 击杀20只', '#ff6644');
			// 提前刷出一批怪
			for (let i = 0; i < 8; i++) {
				const a = (i / 8) * Math.PI * 2;
				const ex = game.player.x + fastCos(a) * 350;
				const ey = game.player.y + fastSin(a) * 350;
				const types = ['Bat', 'Skeleton', 'Crawler', 'CyberSpider', 'SlimeGlob'];
				const e = game._createEnemy(ex, ey, types[Math.floor(Math.random() * types.length)]);
				if (e) game.enemies.push(e);
			}
		}
	},
	{
		id: 'density_surge',
		category: 'challenge',
		name: '虫群涌现',
		desc: '20 秒内敌人数量 x3，但经验 x2',
		action: (game) => {
			game._densitySurge = { timer: 20, spawnMult: 3, xpMult: 2 };
			game.spawnDamageNumber(game.player.x, game.player.y - 40, '虫群涌现! 经验x2', '#88ff44');
		}
	},
	{
		id: 'survival_test',
		category: 'challenge',
		name: '不死试炼',
		desc: '15 秒内不被击中，成功回复全部 HP',
		action: (game) => {
			game._survivalTest = { timer: 15, failed: false, prevHp: game.player.hp };
			game.spawnDamageNumber(game.player.x, game.player.y - 50, '不死试炼开始!', '#aaffff');
		}
	},
	{
		id: 'boss_vanguard',
		category: 'challenge',
		name: 'Boss 先锋',
		desc: '一名 Boss 先锋来袭，击杀后额外奖励芯片',
		action: (game) => {
			const angle = Math.random() * Math.PI * 2;
			const x = game.player.x + fastCos(angle) * 400;
			const y = game.player.y + fastSin(angle) * 400;
			const types = ['Charger', 'IronGolem', 'FrostTitan', 'PlagueSource', 'ShieldBearer'];
			const type = types[Math.floor(Math.random() * types.length)];
			const enemy = game._createEnemy(x, y, type);
			if (enemy) {
				enemy.hp *= 6; enemy.maxHp *= 6;
				enemy.xpValue *= 10; enemy.radius *= 1.8;
				enemy.isElite = true; enemy.isBossVanguard = true;
				enemy.speed *= 0.8;
				game.enemies.push(enemy);
				game.spawnDamageNumber(x, y, 'Boss先锋来袭!', '#ff4488');
			}
		}
	},

	// ══════════════ 负面事件（negative，高奖励）══════════════

	{
		id: 'weapon_seal',
		category: 'negative',
		name: '武器封印',
		desc: '随机封印 1 件武器 25 秒，换取经验 x3',
		action: (game) => {
			const ws = game.player.weapons.filter(w => !w.disabled);
			if (ws.length <= 1) return; // 最少保留 1 件武器
			const w = ws[Math.floor(Math.random() * ws.length)];
			w.disabled = true;
			w._disableTimer = 25;
			// 不覆盖已有的更高倍率 xp_surge
			if (!game._xpSurge || game._xpSurge.mult <= 3) {
				game._xpSurge = { timer: 25, mult: 3 };
			} else {
				game._xpSurge.timer = Math.max(game._xpSurge.timer, 25);
			}
			const name = (w.def && w.def.name) || w.id;
			game.spawnDamageNumber(game.player.x, game.player.y - 50, `${name}被封印! 经验x3`, '#cc44ff');
		}
	},
	{
		id: 'cursed_speed',
		category: 'negative',
		name: '诅咒之风',
		desc: '敌人速度 x2 持续 20 秒，换取全场经验宝石',
		action: (game) => {
			game.timeRift = { timer: 20, speedMult: 2, xpMult: 1 };
			// 同时刷出大量经验宝石作为补偿
			for (let i = 0; i < 20; i++) {
				const ox = game.player.x + (Math.random() - 0.5) * 600;
				const oy = game.player.y + (Math.random() - 0.5) * 600;
				game.spawnGem(ox, oy, 15);
			}
			game.spawnDamageNumber(game.player.x, game.player.y - 40, '诅咒之风! 危险但多经验', '#aa44ff');
		}
	},
	{
		id: 'void_hunt',
		category: 'negative',
		name: '虚空猎杀',
		desc: '一名虚空猎手追杀玩家，击杀获得稀有升级',
		action: (game) => {
			const angle = Math.random() * Math.PI * 2;
			const x = game.player.x + fastCos(angle) * 500;
			const y = game.player.y + fastSin(angle) * 500;
			const hunterTypes = ['Assassin', 'Phantom', 'VoidLeech'];
			const hunter = game._createEnemy(x, y, hunterTypes[Math.floor(Math.random() * hunterTypes.length)]);
			if (hunter) {
				hunter.hp = 200; hunter.maxHp = 200;
				hunter.speed *= 1.5; hunter.radius = 18;
				hunter.xpValue = 0; hunter.isVoidHunter = true;
				hunter.isElite = true;
				game.enemies.push(hunter);
				game.spawnDamageNumber(x, y, '虚空猎手来袭!', '#8800ff');
			} else {
				// 回退：给一次免费升级
				game._pendingUpgrades = (game._pendingUpgrades || 0) + 1;
			}
		}
	},
	{
		id: 'drain_field',
		category: 'negative',
		name: '生命侵蚀',
		desc: '持续掉血 30 秒，但伤害 +50%',
		action: (game) => {
			if (game._drainField) return;
			game._drainField = { timer: 30, mightBonus: 0.50, dps: 1 };
			game.player.bonusMight = (game.player.bonusMight || 0) + 0.50;
			game.spawnDamageNumber(game.player.x, game.player.y - 50, '生命侵蚀! +50%伤害', '#ff4444');
		}
	},
];

// ─── 事件分类权重 ───
const CATEGORY_WEIGHTS = { positive: 0.60, challenge: 0.30, negative: 0.10 };

// Events must not skip the opening's enemy/tutorial progression.
const EVENT_START = {
	monster_nest: 90, survival_test: 90,
	time_rift: 240, density_surge: 240,
	elite_challenge: 360, boss_vanguard: 480,
};

// 预计算分类池，避免每次触发事件时重新过滤
const _EVENT_POOLS = {};
for (const e of EVENT_DEFS) {
	if (!_EVENT_POOLS[e.category]) _EVENT_POOLS[e.category] = [];
	_EVENT_POOLS[e.category].push(e);
}

class EventSystem {
	constructor(game) {
		this.game = game;
		this.eventTimer = 30; // 首次事件 30 秒后
		this.eventInterval = 55; // 之后每 55 秒检查
		this.activeEvent = null;
		this.eventBanner = null; // { text, timer, color }
	}

	update(dt) {
		const game = this.game;
		const player = game.player;

		this.eventTimer -= dt;
		if (this.eventTimer <= 0) {
			if (Math.random() < 0.65) {
				this._triggerRandomEvent();
			}
			this.eventTimer = this.eventInterval;
		}

		// 事件横幅倒计时
		if (this.eventBanner) {
			this.eventBanner.timer -= dt;
			if (this.eventBanner.timer <= 0) this.eventBanner = null;
		}

		// ─── 数据宝库区域 ───
		if (game.activeZone) {
			const zone = game.activeZone;
			zone.timer -= dt;
			if (zone.timer <= 0) { game.activeZone = null; }
			else {
				const d = Math.hypot(player.x - zone.x, player.y - zone.y);
				if (d < zone.radius && !zone.claimed) {
					zone.stayTimer += dt;
					if (zone.stayTimer >= zone.stayRequired) {
						zone.claimed = true;
						for (let i = 0; i < 15; i++) {
							game.spawnGem(zone.x + (Math.random() - 0.5) * 40, zone.y + (Math.random() - 0.5) * 40, 15);
						}
						game.spawnDamageNumber(zone.x, zone.y, '宝库开启!', '#ffcc00');
					}
				}
			}
		}

		// ─── 时间裂缝 ───
		if (game.timeRift) {
			game.timeRift.timer -= dt;
			if (game.timeRift.timer <= 0) game.timeRift = null;
		}

		// ─── 武器超频 ───
		if (game._weaponSurge) {
			game._weaponSurge.timer -= dt;
			if (game._weaponSurge.timer <= 0) {
				player.bonusMight = Math.max(0, (player.bonusMight || 0) - game._weaponSurge.mightBonus);
				game._weaponSurge = null;
			}
		}

		// ─── 超速模式 ───
		if (game._speedBurst) {
			game._speedBurst.timer -= dt;
			if (game._speedBurst.timer <= 0) {
				player.bonusSpeed = Math.max(0, (player.bonusSpeed || 0) - game._speedBurst.speedBonus);
				game._speedBurst = null;
			}
		}

		// ─── 经验加速 ───
		if (game._xpSurge) {
			game._xpSurge.timer -= dt;
			if (game._xpSurge.timer <= 0) game._xpSurge = null;
		}

		// ─── 护甲强化 ───
		if (game._armorBoost) {
			game._armorBoost.timer -= dt;
			if (game._armorBoost.timer <= 0) {
				player.bonusArmor = Math.max(0, (player.bonusArmor || 0) - game._armorBoost.armorBonus);
				game._armorBoost = null;
			}
		}

		// ─── 怪物巢穴挑战 ───
		if (game._nestChallenge) {
			game._nestChallenge.timer -= dt;
			if (game._nestChallenge.timer <= 0) {
				const pct = Math.floor(game._nestChallenge.kills / game._nestChallenge.killsRequired * 100);
				game.spawnDamageNumber(player.x, player.y - 50, `巢穴挑战失败 ${pct}%`, '#ff4444');
				game._nestChallenge = null;
			}
		}

		// ─── 虫群涌现 ───
		if (game._densitySurge) {
			game._densitySurge.timer -= dt;
			if (game._densitySurge.timer <= 0) game._densitySurge = null;
		}

		// ─── 不死试炼 ───
		if (game._survivalTest) {
			game._survivalTest.timer -= dt;
			if (game._survivalTest.failed) {
				game.spawnDamageNumber(player.x, player.y - 40, '试炼失败!', '#ff4444');
				game._survivalTest = null;
			} else if (game._survivalTest.timer <= 0) {
				// 成功 → 全回血
				if (player.canHeal) {
					player.heal(player.maxHp);
					game.spawnDamageNumber(player.x, player.y - 40, '试炼成功! HP全回', '#44ffcc');
				} else {
					game.spawnDamageNumber(player.x, player.y - 40, '试炼成功!', '#44ffcc');
				}
				game._survivalTest = null;
			}
		}

		// ─── 武器封印倒计时 ───
		for (const w of player.weapons) {
			if (w.disabled && w._disableTimer !== undefined) {
				w._disableTimer -= dt;
				if (w._disableTimer <= 0) {
					w.disabled = false;
					w._disableTimer = undefined;
					const name = (w.def && w.def.name) || w.id;
					game.spawnDamageNumber(player.x, player.y - 40, `${name}解封`, '#cc88ff');
				}
			}
		}

		// ─── 生命侵蚀 ───
		if (game._drainField) {
			game._drainField.timer -= dt;
			player.hp -= game._drainField.dps * dt;
			if (player.hp < 1) player.hp = 1;
			if (game._drainField.timer <= 0) {
				player.bonusMight = Math.max(0, (player.bonusMight || 0) - game._drainField.mightBonus);
				game._drainField = null;
				game.spawnDamageNumber(player.x, player.y - 40, '生命侵蚀结束', '#aaaaaa');
			}
		}
	}

	// ─── 外部调用：玩家受伤时通知 ───
	onPlayerHit() {
		if (this.game._survivalTest && !this.game._survivalTest.failed) {
			this.game._survivalTest.failed = true;
		}
	}

	// ─── 外部调用：击杀时通知 ───
	onEnemyKilled(enemy) {
		const game = this.game;

		// 怪物巢穴计数
		if (game._nestChallenge) {
			game._nestChallenge.kills++;
			if (game._nestChallenge.kills >= game._nestChallenge.killsRequired) {
				game._nestChallenge = null;
				// 奖励：触发升级界面
				game._pendingUpgrades = (game._pendingUpgrades || 0) + 1;
				game.spawnDamageNumber(game.player.x, game.player.y - 50, '巢穴挑战完成! +1升级', '#ffdd44');
			}
		}

		// 虚空猎手击杀奖励
		if (enemy.isVoidHunter) {
			game._pendingUpgrades = (game._pendingUpgrades || 0) + 1;
			game.spawnDamageNumber(enemy.x, enemy.y - 30, '虚空猎手倒下! +1升级', '#8800ff');
		}

		// Boss 先锋击杀奖励
		if (enemy.isBossVanguard) {
			const chipReward = 50;
			if (game.meta) {
				game.meta.addChips(chipReward);
			}
			game.spawnDamageNumber(enemy.x, enemy.y - 30, `先锋击杀! +${chipReward}芯片`, '#ff4488');
		}
	}

	_triggerRandomEvent() {
		// 按权重选分类
		const roll = Math.random();
		let category;
		if (roll < CATEGORY_WEIGHTS.positive) {
			category = 'positive';
		} else if (roll < CATEGORY_WEIGHTS.positive + CATEGORY_WEIGHTS.challenge) {
			category = 'challenge';
		} else {
			category = 'negative';
		}

		const eligible = event => this.game.time >= (EVENT_START[event.id] ?? (event.category === 'negative' ? 480 : 0));
		let pool = (_EVENT_POOLS[category] || []).filter(eligible);
		if (!pool.length) { category = 'positive'; pool = _EVENT_POOLS.positive; }
		if (pool.length === 0) return;

		const event = pool[Math.floor(Math.random() * pool.length)];
		// 播放事件音效（正面/挑战用 sfxEvent，负面用 sfxCurse）
		if (category === 'negative') SFX.sfxCurse();
		else SFX.sfxEvent();
		try {
			event.action(this.game);
		} catch (err) {
			console.warn('[EventSystem] 事件执行失败:', event.id, err);
			return;
		}

		const colors = { positive: '#44ffcc', challenge: '#ffcc00', negative: '#ff4444' };
		this.eventBanner = {
			text: event.name + ' — ' + event.desc,
			timer: 3.5,
			color: colors[category] || '#ffcc00'
		};
	}

	draw(ctx, w, h) {
		if (!this.eventBanner) return;
		const b = this.eventBanner;
		const alpha = Math.min(1, b.timer);
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.fillStyle = 'rgba(0,0,0,0.7)';
		ctx.fillRect(0, h * 0.4 - 22, w, 44);
		ctx.fillStyle = b.color;
		ctx.font = 'bold 16px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(b.text, w / 2, h * 0.4 + 6);
		ctx.textAlign = 'left';
		ctx.restore();
	}

	drawWorld(ctx) {
		if (!this.game.activeZone) return;
		const zone = this.game.activeZone;
		if (zone.claimed) return;
		const alpha = 0.3 + 0.15 * fastSin(perfNow() / 200);
		ctx.save();

		ctx.globalAlpha = 0.6;
		ctx.strokeStyle = zone.color;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
		ctx.stroke();

		ctx.globalAlpha = alpha;
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.arc(zone.x, zone.y, zone.radius * 0.7, 0, Math.PI * 2);
		ctx.stroke();

		ctx.globalAlpha = alpha * 0.7;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(zone.x, zone.y, zone.radius * 0.4, 0, Math.PI * 2);
		ctx.stroke();

		if (zone.stayTimer > 0) {
			const pct = zone.stayTimer / zone.stayRequired;
			ctx.globalAlpha = 0.8;
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(zone.x - 20, zone.y + zone.radius + 8, 40 * pct, 4);
		}
		ctx.restore();
	}
}

module.exports = { EventSystem, EVENT_DEFS };
module.exports.default = EventSystem;
