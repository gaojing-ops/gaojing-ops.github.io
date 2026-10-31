// ─── 宝箱系统 (从 Game.js 提取) ─────────────────────────
// 宝箱触发、加权随机选项、奖励应用

const { vibrate } = require('./platform');
const SFX = require('./SFX');
const { WEAPON_DEFS } = require('./Weapons');

function installChestSystem(Game) {

	/**
	 * 触发宝箱界面（Boss Rush 模式下直接回血 30%）
	 */
	Game.prototype.triggerChest = function () {
		// Boss Rush 模式下不打开宝箱UI（防止 isRunning=false 阻塞 BossRushMode.update）
		if (this.bossRushMode) {
			const p = this.player;
			const heal = p.heal(Math.floor(p.maxHp * 0.3));

			this.spawnDamageNumber(p.x, p.y - 40, '+' + heal + ' HP', '#44ff88');
			return;
		}
		this.isRunning = false;
		vibrate('medium');

		const p = this.player;
		const pool = [];

		// 金币奖励
		const gold = 50 + Math.floor(Math.random() * 200);
		pool.push({
			type: 'chest_gold', id: 'chest_gold',
			name: '\uD83D\uDCB0 \u91D1\u5E01',
			desc: '+' + gold + ' \u82AF\u7247',
			color: '#ffcc00', _value: gold, weight: 10,
		});

		// 治疗
		if (p.canHeal) pool.push({
			type: 'chest_heal', id: 'chest_heal',
			name: '\u2764 \u6CBB\u7597',
			desc: '\u6062\u590D 30% \u6700\u5927\u751F\u547D',
			color: '#44ff88', weight: 8,
		});

		// 免费升级（经验）
		pool.push({
			type: 'chest_levelup', id: 'chest_levelup',
			name: '\u2B06 \u5347\u7EA7',
			desc: '\u7ACB\u5373\u83B7\u5F97\u4E00\u6B21\u5347\u7EA7',
			color: '#00ffcc', weight: 6,
		});

		// 全属性小提升
		pool.push({
			type: 'chest_stat', id: 'chest_stat',
			name: '\u2728 \u5F3A\u5316',
			desc: '\u6240\u6709\u5C5E\u6027 +5%',
			color: '#cc88ff', weight: 5,
		});

		// 随机武器升级（如果有可升级武器）
		const upgradable = p.weapons.filter(w => {
			const def = WEAPON_DEFS[w.id];
			return def && w.level < def.maxLevel;
		});
		if (upgradable.length > 0) {
			const w = upgradable[Math.floor(Math.random() * upgradable.length)];
			const def = WEAPON_DEFS[w.id];
			pool.push({
				type: 'chest_weapon_up', id: 'chest_weapon_up_' + w.id,
				name: '\u2694 ' + def.name + ' \u5347\u7EA7',
				desc: 'LV.' + w.level + ' \u2192 LV.' + (w.level + 1),
				color: def.color, _weaponId: w.id, weight: 12,
			});
		}

		// ═══ 10分钟后宝箱：检测并加入进化选项（参考吸血鬼幸存者） ═══
		if (this.time >= 600) {  // 10分钟 = 600秒
			const { checkEvolutions, isEvolutionUnlocked } = require('./Evolution');
			const evolvable = checkEvolutions(p);

			for (const { weaponId, recipe, isUnion, consumeId } of evolvable) {
				// 只有已解锁的进化才能在宝箱中出现
				if (isEvolutionUnlocked(weaponId, isUnion, p, this)) {
					pool.push({
						type: 'chest_evolution', id: 'evolution_' + (isUnion ? 'union_' : '') + weaponId,
						name: '⚡ ' + recipe.resultName,
						desc: isUnion ? '双拼融合: 摧毁并吸收 ' + (WEAPON_DEFS[consumeId]?.name || consumeId) : '进化 ' + (this.player.weapons.find(w => w.id === weaponId)?.def?.name || weaponId),
						color: recipe.resultColor, _weaponId: weaponId,
						_isUnion: isUnion, _consumeId: consumeId,
						weight: 20,  // 高权重，优先出现
					});
				}
			}
		}

		// 随机选 3 个
		const options = this._weightedPickChest(pool, 3);

		// 自动升级：随机选一个宝箱奖励，不打开UI
		if (this.autoUpgrade && options && options.length > 0) {
			const pick = options[Math.floor(Math.random() * options.length)];
			this._applyChestReward(pick);
			// 显示选择了什么
			this.spawnDamageNumber(this.player.x, this.player.y - 60, '🎁 ' + pick.name, pick.color || '#ffcc00', false);
			this.spawnDamageNumber(this.player.x, this.player.y - 40, pick.desc, '#aaaaaa', false);
			this.isRunning = true;
			return;
		}

		if (this.sceneManager) {
			this.sceneManager.switchTo('upgrade', {
				options: options,
				previews: [],
				chestMode: true,
				game: this, // 传递 game 引用
			});
		}
	};

	/**
	 * 加权随机抽取 n 个宝箱奖励选项（不重复）
	 */
	Game.prototype._weightedPickChest = function (pool, n) {
		const result = [];
		const remaining = pool.slice();
		for (let i = 0; i < n && remaining.length > 0; i++) {
			let totalW = 0;
			for (let j = 0; j < remaining.length; j++) totalW += remaining[j].weight;
			if (totalW <= 0) break;
			let r = Math.random() * totalW;
			for (let j = 0; j < remaining.length; j++) {
				r -= remaining[j].weight;
				if (r <= 0) {
					result.push(remaining.splice(j, 1)[0]);
					break;
				}
			}
		}
		return result;
	};

	/**
	 * 应用玩家选择的宝箱奖励（由 UpgradeScene 回调调用）
	 */
	Game.prototype._applyChestReward = function (option) {
		const p = this.player;
		switch (option.type) {
			case 'chest_gold':
				SFX.sfxGem();
				if (this.meta) this.meta.addChips(option._value);
				this.spawnDamageNumber(p.x, p.y - 40, '+' + option._value + ' GOLD', '#ffcc00');
				break;
			case 'chest_heal': {
				SFX.sfxUpgrade();
				const heal = p.heal(Math.floor(p.maxHp * 0.3));

				this.spawnDamageNumber(p.x, p.y - 40, '+' + heal + ' HP', '#44ff88');
				break;
			}
			case 'chest_levelup':
				SFX.sfxLevelUp();
				p.gainXp(p.maxXp);
				this.spawnDamageNumber(p.x, p.y - 40, 'LEVEL UP!', '#00ffcc');
				break;
			case 'chest_stat':
				SFX.sfxUpgrade();
				p.bonusMight += 0.05;
				p.bonusSpeed += 0.05;
				p.bonusCdr += 0.05;
				p.bonusArea += 0.05;
				this.spawnDamageNumber(p.x, p.y - 40, 'ALL +5%', '#cc88ff');
				break;
			case 'chest_weapon_up': {
				const w = p.weapons.find(w => w.id === option._weaponId);
				if (w && w.level < (w.def ? w.def.maxLevel : 6)) {
					w.level++;
					this.spawnDamageNumber(p.x, p.y - 40, w.id + ' UP!', option.color);
				}
				break;
			}
			case 'chest_evolution': {
				SFX.sfxEvolve();
				const { evolveWeapon, EVOLUTION_RECIPES, UNION_RECIPES } = require('./Evolution');
				const w = p.weapons.find(w => w.id === option._weaponId);
				if (w && (!w.evolved || option._isUnion)) {
					const recipe = option._isUnion ? UNION_RECIPES[option._weaponId] : EVOLUTION_RECIPES[option._weaponId];
					if (recipe && evolveWeapon(w, recipe, option._consumeId)) {
						this.spawnDamageNumber(p.x, p.y - 60, '⚡ ' + recipe.resultName, recipe.resultColor, false);
						this.spawnDamageNumber(p.x, p.y - 40, '进化成功！', '#ffcc00', false);
					}
				}
				break;
			}
		}
		this.triggerScreenPulse('#ffcc00', 0.5);
	};
}

module.exports = installChestSystem;
