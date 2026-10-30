// ─── Build 预设系统 ──────────────────────────
// 快速开局系统，保存武器+被动配置

const PRESET_BUILDS = [
	{
		id: 'firepower',
		name: '火力压制',
		desc: '高伤害 AOE 流派，+20% 伤害',
		unlockCondition: { type: 'chips', amount: 0 },  // 默认解锁
		startWeapons: ['plasma_arc', 'napalm', 'rocket_swarm'],
		startPassives: ['overclocker', 'energy_amp'],
		bonusStats: { bonusMight: 0.2 }
	},
	{
		id: 'frostControl',
		name: '冰霜控场',
		desc: '减速冻结流，+20% CDR',
		unlockCondition: { type: 'kills', count: 1000 },
		startWeapons: ['frozen_orb', 'glacial_nova', 'ice_shard'],
		startPassives: ['frost_armor', 'chill_aura'],
		bonusStats: { bonusCdr: 0.2 }
	},
	{
		id: 'poisonDot',
		name: '毒系持续伤害',
		desc: '持续中毒叠层流，+15% 伤害',
		unlockCondition: { type: 'time', seconds: 3600 },
		startWeapons: ['acid_pool', 'toxin_spray', 'venom_sting'],
		startPassives: ['plague_spread', 'toxic_sac'],
		bonusStats: { bonusMight: 0.15 }
	},
	{
		id: 'critAssassin',
		name: '暴击刺客',
		desc: '高爆发单体，+30% 伤害 +10% CDR',
		unlockCondition: { type: 'kills', count: 5000 },
		startWeapons: ['flux_bolt', 'chain_spark', 'soul_drain'],
		startPassives: ['critical_eye', 'shadow_step'],
		bonusStats: { bonusMight: 0.3, bonusCdr: 0.1 }
	},
	{
		id: 'custom1',
		name: '自定义 Build',
		desc: '保存当前配置',
		isCustom: true,
		startWeapons: [],  // 由玩家配置
		startPassives: [],
		bonusStats: {}
	}
];

class BuildPreset {
	/**
	 * 获取已解锁的 Build 列表
	 */
	static getUnlockedBuilds(meta) {
		return PRESET_BUILDS.filter(b => {
			if (b.isCustom) return true;  // 自定义始终可用
			return this._checkUnlock(b.unlockCondition, meta);
		});
	}

	/**
	 * 检查 Build 解锁条件
	 */
	static _checkUnlock(condition, meta) {
		if (!condition) return true;

		switch (condition.type) {
			case 'achievement':
				return meta.data.achievements?.includes(condition.id);
			case 'time':
				const totalTime = meta.data.totalPlayTime || 0;
				return totalTime >= condition.seconds;
			case 'kills':
				const totalKills = meta.data.totalKills || 0;
				return totalKills >= condition.count;
			case 'chips':
				return true;  // 芯片条件直接通过（用于默认解锁）
			default:
				return false;
		}
	}

	/**
	 * 获取解锁进度（0-1）
	 */
	static getUnlockProgress(build, meta) {
		if (build.isCustom) return 1;
		if (this._checkUnlock(build.unlockCondition, meta)) return 1;

		const cond = build.unlockCondition;
		switch (cond.type) {
			case 'time':
				const time = meta.data.totalPlayTime || 0;
				return Math.min(time / cond.seconds, 1);
			case 'kills':
				const kills = meta.data.totalKills || 0;
				return Math.min(kills / cond.count, 1);
			default:
				return 0;
		}
	}

	/**
	 * 应用 Build 到玩家
	 */
	static applyBuild(build, player) {
		const game = player.game;
		const { WEAPON_DEFS, Weapon } = require('./Weapons');
		const { PASSIVE_DEFS } = require('./Weapons');

		// 添加起始武器
		for (const wId of build.startWeapons) {
			if (!WEAPON_DEFS[wId]) {
				console.warn(`[BuildPreset] 武器 ${wId} 不存在，跳过`);
				continue;
			}
			if (player.weapons.length < 6 && !player.weapons.some(w => w.id === wId)) {
				player.weapons.push(new Weapon(game, wId));
			}
		}

		// 添加起始被动
		for (const pId of build.startPassives) {
			if (!PASSIVE_DEFS[pId]) {
				console.warn(`[BuildPreset] 被动 ${pId} 不存在，跳过`);
				continue;
			}
			const existing = player.passives.find(p => p.id === pId);
			if (existing) {
				existing.level = Math.min((existing.level || 1) + 1, PASSIVE_DEFS[pId].maxLevel || 5);
			} else {
				player.passives.push({ id: pId, level: 1 });
			}
		}

		// 应用属性加成
		for (const stat in build.bonusStats) {
			if (player.hasOwnProperty(stat)) {
				player[stat] += build.bonusStats[stat];
			} else {
				console.warn(`[BuildPreset] 玩家没有属性 ${stat}，跳过`);
			}
		}

		console.log(`[BuildPreset] 应用 Build: ${build.name}`);
	}

	/**
	 * 保存自定义 Build
	 */
	static saveCustomBuild(buildSlot, player, meta) {
		const build = PRESET_BUILDS.find(b => b.id === buildSlot);
		if (!build || !build.isCustom) {
			console.warn(`[BuildPreset] Build ${buildSlot} 不是自定义槽位`);
			return false;
		}

		// 至少需要1个武器
		if (player.weapons.length === 0) {
			console.warn(`[BuildPreset] 至少需要1个武器才能保存`);
			return false;
		}

		// 保存配置
		const customData = {
			startWeapons: player.weapons.map(w => w.id),
			startPassives: player.passives.map(p => p.id),
			bonusStats: {}
		};

		// 存储到 MetaSystem
		if (!meta.data.customBuilds) meta.data.customBuilds = {};
		meta.data.customBuilds[buildSlot] = customData;
		meta._save();

		console.log(`[BuildPreset] 保存自定义 Build:`, customData);
		return true;
	}

	/**
	 * 加载自定义 Build 数据
	 */
	static loadCustomBuild(buildId, meta) {
		const build = PRESET_BUILDS.find(b => b.id === buildId);
		if (!build || !build.isCustom) return build;

		// 从 MetaSystem 加载自定义数据
		const customData = meta.data.customBuilds?.[buildId];
		if (customData) {
			return {
				...build,
				startWeapons: customData.startWeapons,
				startPassives: customData.startPassives,
				bonusStats: customData.bonusStats || {}
			};
		}

		return build;
	}

	/**
	 * 获取解锁条件描述文本
	 */
	static getUnlockConditionText(build, meta) {
		if (build.isCustom) return '默认解锁';
		if (this._checkUnlock(build.unlockCondition, meta)) return '✓ 已解锁';

		const cond = build.unlockCondition;
		const progress = this.getUnlockProgress(build, meta);

		switch (cond.type) {
			case 'achievement':
				return `需要成就: ${cond.id}`;
			case 'time': {
				const current = meta.data.totalPlayTime || 0;
				const hours = Math.floor(current / 3600);
				const reqHours = Math.floor(cond.seconds / 3600);
				return `游戏时长 ${hours}/${reqHours} 小时 (${Math.floor(progress * 100)}%)`;
			}
			case 'kills': {
				const current = meta.data.totalKills || 0;
				return `累计击杀 ${current}/${cond.count} (${Math.floor(progress * 100)}%)`;
			}
			default:
				return '未知条件';
		}
	}
}

module.exports = { BuildPreset, PRESET_BUILDS };
