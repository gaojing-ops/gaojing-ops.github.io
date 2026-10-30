// ─── 刷怪系统 (从 Game.js 提取) ───────────────────────
// 管理敌人类型随时间解锁、词缀系统、群怪生成

function installSpawnSystem(Game) {

	// [BUG-R3-6 FIX] require 提到模块函数顶部，避免每次 _spawnEnemy 调用都查找
	const { fastSin, fastCos } = require('./MathLUT');

	// [BUG-R3-7 FIX] 复用的临时数组，避免每次 _rollEnemyAffixes 创建 [...allAffixes]
	const _allAffixIds = ['shielded', 'berserker', 'splitting', 'invisible', 'regenerating', 'swift', 'explosive', 'teleporting', 'giant', 'vampiric'];
	const _scratchAffixes = _allAffixIds.slice(); // 一次性分配

	/**
	 * 在玩家周围刷怪环上生成一个敌人（含类型选择、精英词缀、群怪追加）
	 */
	Game.prototype._spawnEnemy = function (hpMult = 1, dmgMult = 1, spread = 0) {
		// 全局敌人上限（防止后期帧率崩溃）
		const enemyLimit = 180;
		if (this.enemies.length >= enemyLimit) return;

		const angle = Math.random() * Math.PI * 2;
		const dist = Math.max(this.width, this.height) / 2 + 80 + spread;
		const x = this.player.x + fastCos(angle) * dist;
		const y = this.player.y + fastSin(angle) * dist;

		let type = 'Bat';
		const t = this.time;
		const style = this.mapManager ? this.mapManager.style : 'CyberGrid';

		// ─── 核心生成池 (随时间推移逐渐解锁更多类型) ───
		let pool = [];
		if (t > 900) { // 15分钟
			pool = ['Bat', 'Skeleton', 'Ghost', 'DataWorm', 'SwarmDrone', 'Hornet', 'FireFly', 'Crawler', 'WarpMite', 'FrostWisp', 'SlimeGlob', 'CyberSpider', 'GlitchEntity', 'Turret', 'LaserDrone', 'ScatterGun', 'SpiralCaster', 'MortarDrone', 'ChainGunner', 'FrostTitan', 'PlagueSource', 'IronGolem', 'VoidLeech'];
		} else if (t > 780) { // 13分钟
			pool = ['Bat', 'Skeleton', 'Ghost', 'DataWorm', 'SwarmDrone', 'Hornet', 'FireFly', 'Crawler', 'WarpMite', 'FrostWisp', 'SlimeGlob', 'CyberSpider', 'GlitchEntity', 'Turret', 'LaserDrone', 'ScatterGun', 'SpiralCaster', 'MortarDrone', 'ChainGunner', 'FrostTitan', 'PlagueSource', 'IronGolem'];
		} else if (t > 660) { // 11分钟
			pool = ['Bat', 'Skeleton', 'Ghost', 'DataWorm', 'SwarmDrone', 'Hornet', 'FireFly', 'Crawler', 'WarpMite', 'FrostWisp', 'SlimeGlob', 'CyberSpider', 'GlitchEntity', 'Turret', 'LaserDrone', 'ScatterGun', 'SpiralCaster', 'MortarDrone', 'ChainGunner', 'FrostTitan', 'VoidLeech'];
		} else if (t > 540) { // 9分钟
			pool = ['Bat', 'Skeleton', 'Ghost', 'DataWorm', 'SwarmDrone', 'Hornet', 'FireFly', 'Crawler', 'WarpMite', 'FrostWisp', 'SlimeGlob', 'CyberSpider', 'GlitchEntity', 'Turret', 'LaserDrone', 'ScatterGun', 'SpiralCaster', 'MortarDrone', 'ChainGunner'];
		} else if (t > 420) { // 7分钟
			pool = ['Bat', 'Skeleton', 'Ghost', 'DataWorm', 'SwarmDrone', 'Hornet', 'FireFly', 'Crawler', 'WarpMite', 'FrostWisp', 'SlimeGlob', 'CyberSpider', 'Turret', 'LaserDrone', 'SpiralCaster', 'ChainGunner'];
		} else if (t > 300) { // 5分钟
			pool = ['Bat', 'Skeleton', 'Ghost', 'DataWorm', 'SwarmDrone', 'Hornet', 'FireFly', 'Crawler', 'WarpMite', 'FrostWisp', 'SlimeGlob', 'CyberSpider', 'Turret', 'ChainGunner'];
		} else if (t > 240) { // 4分钟
			pool = ['Bat', 'Skeleton', 'Ghost', 'DataWorm', 'SwarmDrone', 'Hornet', 'FireFly', 'Crawler', 'WarpMite', 'CyberSpider'];
		} else if (t > 180) { // 3分钟
			pool = ['Bat', 'Skeleton', 'Ghost', 'DataWorm', 'SwarmDrone', 'Hornet', 'FireFly', 'Crawler', 'FrostWisp', 'SlimeGlob', 'Turret', 'ChainGunner'];
		} else if (t > 120) { // 2分钟
			pool = ['Bat', 'Skeleton', 'Ghost', 'SwarmDrone', 'Hornet', 'FireFly', 'Crawler'];
		} else if (t > 60) { // 1分钟
			pool = ['Bat', 'SwarmDrone', 'Skeleton', 'Ghost', 'DataWorm'];
		} else if (t > 30) { // 30秒
			pool = ['Bat', 'SwarmDrone', 'FireFly', 'Skeleton'];
		} else {
			pool = ['Bat'];
		}

		// ─── 群落专属加权机制 ───
		// 根据不同地图风格，强行混入大量专属怪物（只要时间>60s，即第二阶段开始）
		let biomeWeights = [];
		if (t > 60) {
			switch (style) {
				case 'ToxicSwamp': // 腐化沼泽
					biomeWeights = [
						{ type: 'SlimeGlob', weight: 3 },
						{ type: 'PlagueSource', weight: 2 },
						{ type: 'Crawler', weight: 3 }
					];
					break;
				case 'CryoRealm': // 冰封领域
					biomeWeights = [
						{ type: 'FrostWisp', weight: 4 },
						{ type: 'FrostTitan', weight: 2 }
					];
					break;
				case 'VoidNebula': // 虚空裂缝
					biomeWeights = [
						{ type: 'VoidLeech', weight: 3 },
						{ type: 'WarpMite', weight: 3 },
						{ type: 'Ghost', weight: 2 }
					];
					break;
				case 'Matrix': // 核心矩阵
					biomeWeights = [
						{ type: 'LaserDrone', weight: 3 },
						{ type: 'Turret', weight: 2 },
						{ type: 'ChainGunner', weight: 2 },
						{ type: 'GlitchEntity', weight: 2 }
					];
					break;
				case 'CyberGrid': // 数据荒原
				default:
					biomeWeights = [
						{ type: 'DataWorm', weight: 3 },
						{ type: 'SwarmDrone', weight: 3 },
						{ type: 'LaserDrone', weight: 1 }
					];
					break;
			}
		}

		// 构建加权随机池
		let weightedPool = [];
		// 1. 基础池：每个存在于当前时间段 pool 中的怪物，基础权重为 1
		for (const p of pool) {
			weightedPool.push({ type: p, weight: 1 });
		}
		// 2. 注入群落专属权重（叠加）
		for (const bw of biomeWeights) {
			// 如果这个怪物尚未在主池中解锁，我们允许它通过群落特性“提前”少量出现，或者随主池解锁而变多
			const existing = weightedPool.find(x => x.type === bw.type);
			if (existing) {
				existing.weight += bw.weight;
			} else if (t > 120) { // 至少2分钟后才允许越级生成专属怪
				weightedPool.push({ type: bw.type, weight: bw.weight * 0.5 }); // 提早出场时权重减半
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

		// 近战/群怪随时间提速（让玩家必须持续走位；远程怪不加速）
		if (t > 60 && enemy.behavior !== 'shooter' && enemy.behavior !== 'spiral_shooter'
			&& enemy.behavior !== 'mortar' && enemy.behavior !== 'burst_shooter') {
			const speedMult = 1 + Math.min(0.8, (t / 60 - 1) * 0.055);
			// 1分=+0%, 5分=+22%, 10分=+50%, 15分=+77%, 16分+封顶80%
			enemy.speed = (enemy.speed || 80) * speedMult;
		}

		// 后期弱敌人强化：>10分钟，弱敌人有几率变为强化版
		if (t > 600 && (type === 'Bat' || type === 'SwarmDrone' || type === 'Hornet' || type === 'FireFly' || type === 'Crawler')) {
			if (Math.random() < 0.4) { // 40%概率强化
				enemy.hp *= 3;
				enemy.maxHp = enemy.hp;
				enemy.damage = Math.ceil(enemy.damage * 1.5);
				enemy.xpValue = Math.ceil(enemy.xpValue * 2);
			}
		}

		// [NEW] 盗宝地精随机生成 (2分钟之后开始，低概率)
		if (t > 120 && Math.random() < 0.005) {
			// 一次只允许场上存在极少数量的盗宝地精，防止滥发奖励
			let goblinCount = 0;
			for (const e of this.enemies) {
				if (e.active && e.type === 'LootGoblin') goblinCount++;
			}
			if (goblinCount < 1) { // 场上最多同时只存在1只
				const goblin = this.enemyPool.get().reset(this, x, y, 'LootGoblin', { hpMult: hpMult * 1.5 });
				this.enemies.push(goblin);
				this.spawnDamageNumber(x, y, '💰 盗宝地精出现! 💰', '#ffcc00');
				// 给玩家预警
				this.triggerScreenPulse('#ffcc0033', 0.5);
			}
		}

		// 快速群怪额外生成
		let extraCount = 0;
		const tMinutes = t / 60;
		if (type === 'SwarmDrone' || type === 'Hornet' || type === 'FireFly') {
			extraCount = 3 + Math.floor(tMinutes * 0.3); // 更多群怪
		} else if (type === 'Crawler') {
			extraCount = 1 + Math.floor(tMinutes * 0.2); // 爬虫稍少
		} else if (type === 'Turret' || type === 'LaserDrone' || type === 'ScatterGun'
			|| type === 'SpiralCaster' || type === 'MortarDrone' || type === 'ChainGunner') {
			// 远程敌人保持距离（用平方距离避免 sqrt）
			const rdx = enemy.x - this.player.x, rdy = enemy.y - this.player.y;
			const distToPlayerSq = rdx * rdx + rdy * rdy;
			if (distToPlayerSq < (dist * 0.8) * (dist * 0.8)) {
				const pushAngle = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
				enemy.x = this.player.x + fastCos(pushAngle) * (dist + Math.random() * 100);
				enemy.y = this.player.y + fastSin(pushAngle) * (dist + Math.random() * 100);
			}
		}

		if (this.curseEliteMult > 1 && type !== 'SwarmDrone' && type !== 'Hornet' && type !== 'FireFly') {
			const eliteChance = 0.05 * this.curseEliteMult;
			if (Math.random() < eliteChance) {
				// 使用新的词缀系统
				const affixCount = Math.random() < 0.3 ? 2 : 1; // 30%概率双词缀
				const affixes = this._rollEnemyAffixes(affixCount);
				enemy.applyEliteAffixes(affixes);
			}
		} else if (type !== 'SwarmDrone' && type !== 'Hornet' && type !== 'FireFly' && type !== 'MiniSpider' && type !== 'ToxicBlob') {
			// 基础精英率（提升前期压力，从6%起步，随时间增加）
			const baseEliteChance = Math.min(0.20, 0.04 + this.time / 5000);
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
	// [BUG-R3-7 FIX] 使用复用数组 Fisher-Yates 局部 shuffle，零 GC
	Game.prototype._rollEnemyAffixes = function (count) {
		// 恢复 scratch 数组到初始状态
		for (let i = 0; i < _allAffixIds.length; i++) _scratchAffixes[i] = _allAffixIds[i];
		const len = _allAffixIds.length;
		const selected = [];
		for (let i = 0; i < count && i < len; i++) {
			const j = i + Math.floor(Math.random() * (len - i));
			// 交换
			const tmp = _scratchAffixes[i];
			_scratchAffixes[i] = _scratchAffixes[j];
			_scratchAffixes[j] = tmp;
			selected.push(_scratchAffixes[i]);
		}
		return selected;
	};

	Game.prototype.spawnEnemyAt = function (x, y, type) {
		this.enemies.push(this.enemyPool.get().reset(this, x, y, type));
	};
}

module.exports = installSpawnSystem;
