// ─── 升级系统（微信小游戏版） ──────────────────────────
// UI 部分已移至 UpgradeScene.js

const { WEAPON_DEFS, PASSIVE_DEFS, Weapon } = require('./Weapons');
const { checkEvolutions, evolveWeapon, isEvolutionUnlocked, getEvolutionProgress, getConditionTypeName } = require('./Evolution');
const { PET_TYPES, Pet } = require('./Pet');

class UpgradeSystem {
	constructor(game) {
		this.game = game;
		// 局外成长：重随/跳过/放逐 计数
		this._initMetaCounts();
		// 放逐列表（本局内排除的升级ID）
		this.banishList = [];
	}

	_initMetaCounts() {
		const meta = this.game.meta;
		this.rerollCount = meta ? meta.getLevel('meta_reroll') : 0;
		this.skipCount = meta ? meta.getLevel('meta_skip') : 0;
		this.banishCount = meta ? meta.getLevel('meta_banish') : 0;
	}

	// ═══ 重随：消耗 1 次，重新生成选项 ═══
	reroll() {
		if (this.rerollCount <= 0) return null;
		this.rerollCount--;
		return this.generateOptions();
	}

	// ═══ 跳过：消耗 1 次，给予少量经验替代升级 ═══
	skip() {
		if (this.skipCount <= 0) return false;
		this.skipCount--;
		const p = this.game.player;
		const xpReward = Math.floor(p.maxXp * 0.15);
		p.gainXp(xpReward);
		this.game.spawnDamageNumber(p.x, p.y - 50, `+${xpReward} XP (跳过)`, '#88ccff');
		return true;
	}

	// ═══ 放逐：消耗 1 次，将该升级从本局选项池中永久移除 ═══
	banish(optionId) {
		if (this.banishCount <= 0) return false;
		this.banishCount--;
		if (!this.banishList.includes(optionId)) {
			this.banishList.push(optionId);
		}
		return true;
	}

	generateOptions() {
		const pool = [];
		const previews = [];
		const p = this.game.player;

		// ═══ 协同检测辅助函数 ═══
		const hasEvoPair = (weaponId) => {
			const def = WEAPON_DEFS[weaponId];
			if (!def || !def.evolveWith) return false;
			return p.hasPassive(def.evolveWith) || p.getPassiveLevel(def.evolveWith) > 0;
		};

		for (const id of Object.keys(WEAPON_DEFS)) {
			// 放逐过滤
			if (this.banishList.includes(id)) continue;
			const def = WEAPON_DEFS[id];
			// 进化武器和融合神兵不能直接在升级中选取，只能通过合成获得
			if (def.evolved || def.isFusion) continue;
			if (p.hasWeapon(id)) {
				const w = p.weapons.find(w => w.id === id);
				// 确保等级不超过最大值
				if (w.level < def.maxLevel) {
					const base = def.baseDamage || 10;
					const dmgNow = Math.floor(base * (1 + (w.level - 1) * 0.33));
					const dmgNext = Math.floor(base * (1 + w.level * 0.33));
					const opt = {
						type: 'weapon_up', id, name: def.name,
						desc: `LV.${w.level}→${w.level + 1}  伤害: ${dmgNow}→${dmgNext}`,
						color: def.color, weight: 10,
						rarity: 'common', // 默认普通
					};
					// ═══ 协同标签：进化就绪 ═══
					if (hasEvoPair(id) && w.level >= def.maxLevel - 1) {
						opt.synergy = '⚡ 进化就绪';
						opt.weight += 20; // 大幅提升权重
					}
					pool.push(opt);
				}
				// 满级武器显示进化提示（如果有进化路线）
				else if (!w.evolved && def.evolveWith) {
					// 检查是否拥有进化所需被动
					if (!p.hasPassive(def.evolveWith)) {
						// 作为预览显示，不参与选择
						previews.push({
							type: 'hint', id: 'hint_' + id, name: def.name + ' [满级]',
							desc: `需要「${(PASSIVE_DEFS[def.evolveWith] && PASSIVE_DEFS[def.evolveWith].name) || def.evolveWith}」进化`,
							color: '#ffcc00',
						});
					}
				}
			} else if (p.weapons.length < 6 && !this.game.curseSingleWeapon) {
				pool.push({
					type: 'weapon_new', id, name: def.name + ' [新]',
					desc: def.desc, color: def.color, weight: 5,
					rarity: Math.random() < 0.05 ? 'rare' : 'common', // 5% 概率稀有
				});
			}
		}

		for (const id of Object.keys(PASSIVE_DEFS)) {
			// 放逐过滤
			if (this.banishList.includes(id)) continue;
			const def = PASSIVE_DEFS[id];
			const lvl = p.getPassiveLevel(id);
			if (lvl < def.maxLevel) {
				// 护甲选项：低血量时权重提高
				let weight = 8;
				let desc = `${def.desc} (LV.${lvl} → ${lvl + 1})`;
				let synergy = null;

				if (id === 'armor') {
					// 低血量时护甲更有价值
					const hpRatio = p.hp / p.maxHp;
					if (hpRatio < 0.3) weight = 20; // 危险时高权重
					else if (hpRatio < 0.5) weight = 15;
					else if (hpRatio < 0.7) weight = 10;
					// 显示当前护甲和预期减伤
					const currentArmor = p.armor;
					const nextArmor = currentArmor + 1;
					desc = `护甲 ${currentArmor} → ${nextArmor} (伤害-${nextArmor})`;
				}

				// ═══ 协同标签：解锁进化 ═══
				const sameElement = p.weapons.some(w => {
					const wDef = WEAPON_DEFS[w.id];
					return wDef && wDef.evolveWith === id;
				});
				if (sameElement) {
					synergy = '🔗 解锁进化';
					weight += 15;
				}

				pool.push({
					type: 'passive', id, name: def.name,
					desc,
					color: '#88ccff', weight,
					synergy,
					rarity: Math.random() < 0.05 ? 'rare' : 'common', // 5% 概率稀有
				});
			}
		}

		const hpRatio = p.hp / p.maxHp;
		pool.push({
			type: 'heal', id: 'heal', name: '紧急修复',
			desc: `恢复 ${Math.floor(p.maxHp * 0.3)} HP`,
			color: '#44ff88', weight: hpRatio < 0.5 ? 15 : 6,
			rarity: 'common',
		});

		const evolutions = checkEvolutions(p);
		for (const evo of evolutions) {
			const unlocked = isEvolutionUnlocked(evo.weaponId, evo.isUnion, p, this.game);
			const progress = getEvolutionProgress(evo.weaponId, evo.isUnion, p, this.game);

			if (unlocked) {
				// 已解锁：正常显示
				pool.push({
					type: 'evolve', id: evo.weaponId,
					name: '⚡ ' + evo.recipe.resultName,
					desc: evo.isUnion ? '双拼融合: 吸收 ' + evo.consumeId : evo.recipe.resultDesc,
					color: evo.recipe.resultColor,
					weight: 100, // 进化选项高权重
					recipe: evo.recipe,
					rarity: 'legendary', // 进化为传说稀有度
					consumeId: evo.consumeId,
				});
			} else {
				// 未解锁：显示灰色预告 + 进度
				const progressText = `${getConditionTypeName(progress.type)}: ${progress.current}/${progress.required}`;
				previews.push({
					type: 'evolution_preview', id: 'preview_' + evo.weaponId,
					name: '🔒 ' + evo.recipe.resultName,
					desc: `${evo.recipe.resultDesc}\n${progressText}`,
					color: '#666666',
					weaponId: evo.weaponId,
				});
			}
		}

		// 遗物选项（稀有，玩家未集满3个时加入候选池）
		if (!p.relics) p.relics = [];
		if (p.relics.length < 3) {
			const { getRandomRelics } = require('./Relic');
			const relicCandidates = getRandomRelics(p, 1);
			if (relicCandidates.length > 0) {
				const r = relicCandidates[0];
				const rarityColor = r.rarity === 'red' ? '#ff4444' : (r.rarity === 'gold' ? '#ffcc00' : '#aaaaaa');
				const rarityGrade = r.rarity === 'gold' ? 'epic' : (r.rarity === 'red' ? 'rare' : 'common');
				pool.push({
					type: 'relic', id: r.id, name: '★ ' + r.name,
					desc: r.desc, color: rarityColor, weight: 6,
					relic: r,
					rarity: rarityGrade,
				});
			}
		}

		// 遗物：量子骰子 — 升级选项变为 5 选 1
		const pickCount = (p.relicFlags && p.relicFlags.quantumDice) ? 5 : 3;
		const selected = this._weightedPick(pool, pickCount);
		// 返回可选择的选项和预览选项
		return { options: selected, previews };
	}

	applyOption(option) {
		const p = this.game.player;
		switch (option.type) {
			case 'weapon_new': {
				const w = new Weapon(this.game, option.id);
				p.weapons.push(w);
				if (this.game.meta) this.game.meta.unlockItem(option.id);
				break;
			}
			case 'weapon_up': {
				const w = p.weapons.find(w => w.id === option.id);
				if (w) {
					w.level++;
					// 满级庆典
					const def = WEAPON_DEFS[option.id];
					if (def && w.level >= def.maxLevel) {
						this._celebrateMaxLevel(w, def);
					}
				}
				break;
			}
			case 'passive': {
				const existing = p.passives.find(i => i.id === option.id);
				const def = PASSIVE_DEFS[option.id];
				if (existing) {
					existing.level++;
				} else {
					p.passives.push({ id: option.id, level: 1 });
					if (this.game.meta) this.game.meta.unlockItem(option.id);
				}
				const lvl = p.getPassiveLevel(option.id);
				// Handle special passives vs stat passives
				if (def.special) {
					// Special passives like frost_armor, chill_aura, plague_spread
					if (def.special === 'frostArmorActive') {
						p.frostArmorActive = true;
					} else if (def.special === 'chillAuraRadius') {
						p.chillAuraRadius = def.perLevel * lvl;
					} else if (def.special === 'plagueSpread') {
						p.plagueSpread = true;
					}
					// ═══ 新被动道具特殊效果 ═══
					else if (def.special === 'voidLeech') {
						p.voidLeech = def.perLevel * lvl;
					} else if (def.special === 'soulHarvest') {
						p.soulHarvestBonus = 0; // 初始化，击杀时累积
						p.soulHarvestMax = 0.1 * lvl; // 每级上限+10%，5级上限50%
						p.soulHarvestPerKill = def.perLevel * lvl; // 等级越高每次击杀收割越多
					} else if (def.special === 'explosiveRounds') {
						p.explosiveRounds = def.perLevel * lvl;
					} else if (def.special === 'overheat') {
						p.overheatBonus = 0;
						p.overheatMax = def.perLevel * lvl * 5;
					} else if (def.special === 'secondWind') {
						p.secondWind = true;
					}
				} else if (def.stat) {
					// Standard stat passives - 累加本次升级的增量
					p[def.stat] += def.perLevel;
				}
				// 遗物：镜像芯片 — 15%概率复制此被动（仅首次获取时）
				if (p.relicFlags && p.relicFlags.mirrorChip && !existing && Math.random() < 0.15) {
					if (def.stat) p[def.stat] += def.perLevel;
					this.game.spawnDamageNumber(p.x, p.y - 50, '镜像复制!', '#ff44ff');
				}
				break;
			}
			case 'heal': {
				if (this.game.curseNoHeal) break;
				const healAmount = p.maxHp * 0.3;
				p.hp = Math.min(p.maxHp, p.hp + healAmount);
				p.totalHealed += healAmount; // 统计追踪
				break;
			}
			case 'relic': {
				const { grantRelic } = require('./Relic');
				if (option.relic) {
					const granted = grantRelic(p, option.relic);
					if (granted && this.game.triggerScreenPulse) {
						this.game.triggerScreenPulse((option.relic.color || '#ffcc00') + '55', 0.7);
					}
				}
				break;
			}
			case 'evolution_preview':
			case 'hint': {
				// 提示类型，不执行任何操作
				break;
			}
			case 'evolve': {
				const w = p.weapons.find(w => w.id === option.id);
				if (w && option.recipe) evolveWeapon(w, option.recipe, option.consumeId);
				break;
			}
		}
	}

	_celebrateMaxLevel(weapon, def) {
		const g = this.game;
		const p = g.player;
		const color = def.color || '#ffcc00';

		// 屏幕脉冲（武器颜色）
		g.triggerScreenPulse(color, 0.8);
		g.shakeAmount = 5;
		g.shakeDuration = 0.3;

		// 粒子爆发
		if (g.particles) {
			g.particles.emit(p.x, p.y, { count: 20, speed: 150, life: 0.5, color: color, size: 4 });
			g.particles.emit(p.x, p.y, { count: 10, speed: 80, life: 0.8, color: '#ffcc00', size: 3 });
		}

		// 文字提示
		g.spawnDamageNumber(p.x, p.y - 60, '\u2726 MAX LEVEL \u2726', '#ffcc00', false);
		g.spawnDamageNumber(p.x, p.y - 40, def.name, color, false);

		// 进化就绪提示
		if (def.evolveWith && p.hasPassive(def.evolveWith)) {
			g.spawnDamageNumber(p.x, p.y - 20, '\u8FDB\u5316\u5C31\u7EEA\uFF01', '#ff8800', false);
		}

		// 触觉反馈
		try {
			const { vibrate } = require('./platform');
			vibrate('medium');
		} catch (e) { /* ignore */ }
	}

	// [BUG-R3-8 FIX] 避免 [...pool] 每次分配新数组
	_weightedPick(pool, n) {
		const result = [];
		// 使用标记位替代 splice，避免数组复制
		const used = new Uint8Array(pool.length); // 栈上小数组，GC 成本极低

		for (let i = 0; i < n; i++) {
			let totalW = 0;
			for (let j = 0; j < pool.length; j++) {
				if (!used[j]) totalW += pool[j].weight;
			}
			if (totalW <= 0) break;

			let r = Math.random() * totalW;
			for (let j = 0; j < pool.length; j++) {
				if (used[j]) continue;
				r -= pool[j].weight;
				if (r <= 0) {
					result.push(pool[j]);
					used[j] = 1;
					break;
				}
			}
		}
		return result;
	}
}

module.exports = UpgradeSystem;
