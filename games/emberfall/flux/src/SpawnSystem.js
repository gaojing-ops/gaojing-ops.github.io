// ─── 刷怪系统 (从 Game.js 提取) ───────────────────────
// 管理敌人类型随时间解锁、词缀系统、群怪生成

function installSpawnSystem(Game) {

	// [BUG-R3-6 FIX] require 提到模块函数顶部，避免每次 _spawnEnemy 调用都查找
	const { fastSin, fastCos } = require('./MathLUT');

	// [BUG-R3-7 FIX] 复用的临时数组，避免每次 _rollEnemyAffixes 创建 [...allAffixes]
	const _allAffixIds = ['shielded', 'berserker', 'splitting', 'invisible', 'regenerating', 'swift', 'explosive', 'teleporting', 'giant', 'vampiric'];
	const _scratchAffixes = _allAffixIds.slice(); // 一次性分配

	/**
	 * 在玩家周围视口边缘生成敌人（含全图鉴怪池梯度解锁、章节群落加权、精英词缀、群怪追加）
	 */
	Game.prototype._spawnEnemy = function (hpMult = 1, dmgMult = 1, spread = 0) {
		// 全局敌人上限（防止后期帧率崩溃）
		const enemyLimit = 180;
		if (this.enemies.length >= enemyLimit) {
			// 达到场上上限时，优先替换视野外最远的旧普通怪，防止早期低级怪占满名额导致新怪种刷不出
			const px = this.player.x;
			const py = this.player.y;
			const viewHalfW = (this.width || 800) * 0.52;
			const viewHalfH = (this.height || 600) * 0.52;
			let farthestIdx = -1;
			let farthestDistSq = 0;
			for (let i = 0; i < this.enemies.length; i++) {
				const oldE = this.enemies[i];
				if (!oldE.active || oldE.isElite || oldE === this._bountyTarget || oldE.type === 'LootGoblin') continue;
				const odx = oldE.x - px;
				const ody = oldE.y - py;
				if (Math.abs(odx) <= viewHalfW && Math.abs(ody) <= viewHalfH) continue;
				const dSq = odx * odx + ody * ody;
				if (dSq > farthestDistSq) {
					farthestDistSq = dSq;
					farthestIdx = i;
				}
			}
			if (farthestIdx >= 0) {
				const removed = this.enemies[farthestIdx];
				removed.active = false;
				this.enemyPool.release(removed);
				this.enemies.splice(farthestIdx, 1);
			} else {
				return;
			}
		}

		const angle = Math.random() * Math.PI * 2;
		const cosA = fastCos(angle);
		const sinA = fastSin(angle);
		const halfW = (this.width || 800) / 2 + 42;
		const halfH = (this.height || 600) / 2 + 42;
		const edgeDist = Math.min(
			Math.abs(cosA) > 0.001 ? halfW / Math.abs(cosA) : 9999,
			Math.abs(sinA) > 0.001 ? halfH / Math.abs(sinA) : 9999
		);
		const dist = edgeDist + (spread % 90);
		const x = this.player.x + cosA * dist;
		const y = this.player.y + sinA * dist;

		let type = 'Bat';
		const t = this.time;
		const style = this.mapManager ? this.mapManager.style : 'CyberGrid';

		// ─── 核心生成池 (覆盖全 33 种常规/精英机制怪，随时间平滑解锁) ───
		let pool = [];
		if (t > 480) { // 第三章起全图鉴满编；先留出两章构筑时间
			pool = [
				'Bat', 'Skeleton', 'Ghost', 'DataWorm', 'SwarmDrone', 'Hornet', 'FireFly', 'Crawler', 'WarpMite', 'ToxicBlob',
				'FrostWisp', 'SlimeGlob', 'CyberSpider', 'Splitter', 'Bomber', 'Phantom', 'GlitchEntity', 'Assassin',
				'Turret', 'LaserDrone', 'ScatterGun', 'SpiralCaster', 'MortarDrone', 'ChainGunner',
				'ShieldBearer', 'Charger', 'Healer', 'ShieldPriest', 'VoidLeech',
				'FrostTitan', 'PlagueSource', 'IronGolem', 'RoyalSlime'
			];
		} else if (t > 360) { // 第二章后半：重装与密集弹幕
			pool = [
				'Bat', 'Skeleton', 'Ghost', 'DataWorm', 'SwarmDrone', 'Hornet', 'FireFly', 'Crawler', 'WarpMite', 'ToxicBlob',
				'FrostWisp', 'SlimeGlob', 'CyberSpider', 'Splitter', 'Bomber', 'Phantom', 'GlitchEntity', 'Assassin',
				'Turret', 'LaserDrone', 'ScatterGun', 'SpiralCaster', 'MortarDrone', 'ChainGunner',
				'ShieldBearer', 'Charger', 'Healer', 'ShieldPriest', 'VoidLeech', 'IronGolem', 'FrostTitan'
			];
		} else if (t > 240) { // 第二章：冲锋、支援与刺客
			pool = [
				'Bat', 'Skeleton', 'Ghost', 'DataWorm', 'SwarmDrone', 'Hornet', 'Crawler', 'WarpMite', 'ToxicBlob',
				'FrostWisp', 'SlimeGlob', 'CyberSpider', 'Splitter', 'Bomber', 'Phantom', 'GlitchEntity', 'Assassin',
				'Turret', 'LaserDrone', 'ScatterGun', 'SpiralCaster', 'ShieldBearer', 'Charger', 'Healer', 'ShieldPriest', 'VoidLeech'
			];
		} else if (t > 120) { // 第一章后半：首次引入远程与盾卫
			pool = [
				'Bat', 'Skeleton', 'Ghost', 'CyberSpider', 'SwarmDrone', 'Hornet', 'Crawler', 'ToxicBlob',
				'SlimeGlob', 'FrostWisp', 'DataWorm', 'Turret', 'Splitter', 'WarpMite', 'LaserDrone', 'Bomber', 'ShieldBearer', 'Phantom'
			];
		} else if (t > 45) { // 45～120秒：先学习追猎、群怪和地面威胁
			pool = [
				'Bat', 'Skeleton', 'Ghost', 'CyberSpider', 'FireFly', 'SwarmDrone',
				'Crawler', 'ToxicBlob', 'SlimeGlob', 'FrostWisp', 'Splitter', 'DataWorm'
			];
		} else { // 0～45秒：五种林间追猎者，留出首次武器成长窗口
			pool = ['Bat', 'Skeleton', 'Ghost', 'CyberSpider', 'FireFly'];
		}

		// ─── 章节群落专属加权机制（开局 15 秒后生效，凸显各章生态特色）───
		let biomeWeights = [];
		if (t > 15) {
			switch (style) {
				case 'ToxicSwamp': // 第二章 · 腐根沼泽
					biomeWeights = [
						{ type: 'SlimeGlob', weight: 2.5 },
						{ type: 'ToxicBlob', weight: 2.5 },
						{ type: 'Crawler', weight: 2 },
						{ type: 'Bomber', weight: 1.5 },
						{ type: 'Healer', weight: 1.2 }
					];
					break;
				case 'CryoRealm': // 第三章 · 霜裂遗迹
					biomeWeights = [
						{ type: 'FrostWisp', weight: 2.5 },
						{ type: 'Splitter', weight: 2 },
						{ type: 'ShieldPriest', weight: 1.2 },
						{ type: 'ScatterGun', weight: 1.5 }
					];
					break;
				case 'VoidNebula': // 第四章 · 虚渊墓境
					biomeWeights = [
						{ type: 'VoidLeech', weight: 2 },
						{ type: 'WarpMite', weight: 2.5 },
						{ type: 'Phantom', weight: 2.5 },
						{ type: 'Assassin', weight: 1.5 },
						{ type: 'SpiralCaster', weight: 1.5 }
					];
					break;
				case 'Matrix': // 第五章 · 黎明圣城
					biomeWeights = [
						{ type: 'LaserDrone', weight: 2 },
						{ type: 'Turret', weight: 1.5 },
						{ type: 'ChainGunner', weight: 1.5 },
						{ type: 'MortarDrone', weight: 1.5 },
						{ type: 'GlitchEntity', weight: 2 }
					];
					break;
				case 'CyberGrid': // 第一章 · 灰烬林地
				default:
					biomeWeights = [
						{ type: 'Bat', weight: 2 },
						{ type: 'Skeleton', weight: 2 },
						{ type: 'CyberSpider', weight: 2 },
						{ type: 'Ghost', weight: 2 },
						{ type: 'DataWorm', weight: t > 60 ? 1.2 : 0.5 },
						{ type: 'Turret', weight: t > 60 ? 1.0 : 0.45 }
					];
					if (t > 60) {
						biomeWeights.push({ type: 'ShieldBearer', weight: 0.8 }, { type: 'Charger', weight: 0.8 });
					}
					break;
			}
		}

		// 统计场上存活的巨型重装怪数量（限制同屏最多 4 只，避免肉盾铺满全屏）
		let activeHeavyCount = 0;
		for (let i = 0; i < this.enemies.length; i++) {
			const ae = this.enemies[i];
			if (!ae.active) continue;
			if (ae.type === 'RoyalSlime' || ae.type === 'PlagueSource' || ae.type === 'FrostTitan' || ae.type === 'IronGolem') {
				activeHeavyCount++;
			}
		}

		// 构建按定位分层的加权随机池（潮怪高权重保割草爽感，重装怪低权重作精英压迫）
		let weightedPool = [];
		for (const p of pool) {
			let baseW = 1.0;
			if (p === 'RoyalSlime' || p === 'PlagueSource' || p === 'FrostTitan' || p === 'IronGolem') {
				baseW = activeHeavyCount >= 4 ? 0 : 0.18;
			} else if (p === 'Bat' || p === 'FireFly' || p === 'SwarmDrone' || p === 'Crawler' || p === 'ToxicBlob' || p === 'Ghost' || p === 'CyberSpider' || p === 'Skeleton') {
				baseW = t < 60 ? 2.2 : 1.4;
			} else if (p === 'ShieldBearer' || p === 'Charger' || p === 'DataWorm' || p === 'Turret' || p === 'Healer' || p === 'ShieldPriest') {
				baseW = t < 60 ? 0.45 : 0.85;
			}
			if (baseW > 0) weightedPool.push({ type: p, weight: baseW });
		}
		for (const bw of biomeWeights) {
			const existing = weightedPool.find(x => x.type === bw.type);
			if (existing) {
				existing.weight += bw.weight;
			}
		}

		// 执行加权随机选择
		const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
		let r = Math.random() * totalWeight;
		for (const item of weightedPool) {
			r -= item.weight;
			if (r <= 0) {
				type = item.type;
				break;
			}
		}

		const enemy = this.enemyPool.get().reset(this, x, y, type, { hpMult, dmgMult });

		// 巨型重装怪经验补偿（匹配其高额血量，击杀更有正反馈）
		if (type === 'RoyalSlime' || type === 'PlagueSource' || type === 'FrostTitan' || type === 'IronGolem') {
			enemy.xpValue = Math.ceil((enemy.xpValue || 25) * 2.2);
		}

		// 近战/群怪随时间提速（让玩家必须持续走位；远程怪不加速）
		if (t > 60 && enemy.behavior !== 'shooter' && enemy.behavior !== 'spiral_shooter'
			&& enemy.behavior !== 'mortar' && enemy.behavior !== 'burst_shooter') {
			const speedMult = 1 + Math.min(0.8, (t / 60 - 1) * 0.055);
			enemy.speed = (enemy.speed || 80) * speedMult;
		}

		// 后期弱敌人强化：>10分钟，弱敌人有几率变为强化版
		if (t > 600 && (type === 'Bat' || type === 'SwarmDrone' || type === 'Hornet' || type === 'FireFly' || type === 'Crawler')) {
			if (Math.random() < 0.4) {
				enemy.hp *= 3;
				enemy.maxHp = enemy.hp;
				enemy.damage = Math.ceil(enemy.damage * 1.5);
				enemy.xpValue = Math.ceil(enemy.xpValue * 2);
			}
		}

		// 盗宝地精随机生成 (90秒之后开始，低概率)
		if (t > 90 && Math.random() < 0.005) {
			let goblinCount = 0;
			for (const e of this.enemies) {
				if (e.active && e.type === 'LootGoblin') goblinCount++;
			}
			if (goblinCount < 1) {
				const goblin = this.enemyPool.get().reset(this, x, y, 'LootGoblin', { hpMult: hpMult * 1.5 });
				this.enemies.push(goblin);
				this.spawnDamageNumber(x, y, '💰 盗宝地精出现! 💰', '#ffcc00');
				this.triggerScreenPulse('#ffcc0033', 0.5);
			}
		}

		// 快速群怪额外生成（适度控制群怪数量，避免挤占中大型怪名额）
		let extraCount = 0;
		const tMinutes = t / 60;
		if ((type === 'SwarmDrone' || type === 'Hornet' || type === 'FireFly' || type === 'Crawler') && Math.random() < 0.45) {
			extraCount = 1 + Math.floor(tMinutes * 0.15);
		}

		if (this.curseEliteMult > 1 && type !== 'SwarmDrone' && type !== 'Hornet' && type !== 'FireFly') {
			const eliteChance = 0.05 * this.curseEliteMult;
			if (Math.random() < eliteChance) {
				const affixCount = Math.random() < 0.3 ? 2 : 1;
				const affixes = this._rollEnemyAffixes(affixCount);
				enemy.applyEliteAffixes(affixes);
			}
		} else if (type !== 'SwarmDrone' && type !== 'Hornet' && type !== 'FireFly' && type !== 'MiniSpider' && type !== 'ToxicBlob') {
			// First boss at 90s introduces pressure before random affixes ramp in.
			const eliteRamp = Math.max(0, Math.min(1, (t - 90) / 150));
			const baseEliteChance = Math.min(0.20, 0.04 + t / 5000) * eliteRamp;
			if (Math.random() < baseEliteChance) {
				const affixes = this._rollEnemyAffixes(1);
				enemy.applyEliteAffixes(affixes);
			}
		}

		this.enemies.push(enemy);

		// 接近上限时衰减额外群怪数量
		if (extraCount > 0) {
			const pressureFactor = Math.max(0, 1 - (this.enemies.length - 160) / 60);
			extraCount = Math.floor(extraCount * pressureFactor);
		}

		// 额外生成快速群怪（加总数保护）
		if (extraCount > 0 && this.enemies.length < 180) {
			const maxExtra = Math.min(extraCount, 180 - this.enemies.length);
			for (let i = 0; i < maxExtra; i++) {
				const offsetX = (Math.random() - 0.5) * 60;
				const offsetY = (Math.random() - 0.5) * 60;
				const extraEnemy = this.enemyPool.get().reset(this, x + offsetX, y + offsetY, type, { hpMult, dmgMult });
				this.enemies.push(extraEnemy);
			}
		}
	};

	Game.prototype._createEnemy = function (x, y, type) {
		return this.enemyPool.get().reset(this, x, y, type);
	};

	// 随机选择敌人词缀
	Game.prototype._rollEnemyAffixes = function (count) {
		for (let i = 0; i < _allAffixIds.length; i++) _scratchAffixes[i] = _allAffixIds[i];
		const len = _allAffixIds.length;
		const selected = [];
		for (let i = 0; i < count && i < len; i++) {
			const j = i + Math.floor(Math.random() * (len - i));
			const tmp = _scratchAffixes[i];
			_scratchAffixes[i] = _scratchAffixes[j];
			_scratchAffixes[j] = tmp;
			selected.push(_scratchAffixes[i]);
		}
		return selected;
	};

	Game.prototype.spawnEnemyAt = function (x, y, type) {
		const enemy = this.enemyPool.get().reset(this, x, y, type);
		this.enemies.push(enemy);
		return enemy;
	};
}

module.exports = installSpawnSystem;
