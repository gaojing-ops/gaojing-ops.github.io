// ─── 天赋树系统 ──────────────────────────
// 3条分支：力量/技巧/生存，共48个天赋节点，芯片解锁

// ─── 天赋分支定义 ───
const TALENT_BRANCHES = [
	// ══════ 力量分支 ══════
	{
		id: 'power',
		name: '力量路线',
		color: '#ff4455',
		nodes: [
			{ id: 'pow_1', name: '锐利打击', desc: '伤害 +1%', cost: 40, stat: 'bonusMight', value: 0.01, req: null },
			{ id: 'pow_2', name: '能量超载', desc: '伤害 +1%', cost: 60, stat: 'bonusMight', value: 0.01, req: 'pow_1' },
			{ id: 'pow_3', name: '暴力输出', desc: '伤害 +2%', cost: 80, stat: 'bonusMight', value: 0.02, req: 'pow_2' },
			{ id: 'pow_4', name: '攻势强化', desc: '攻击范围 +3%', cost: 80, stat: 'bonusArea', value: 0.03, req: 'pow_2' },
			{ id: 'pow_5', name: '弹幕爆发', desc: '子弹数 +1', cost: 250, stat: 'bonusProjectile', value: 1, req: 'pow_3' },
			{ id: 'pow_6', name: '范围爆炸', desc: '攻击范围 +5%', cost: 100, stat: 'bonusArea', value: 0.05, req: 'pow_4' },
			{ id: 'pow_7', name: '临界打击', desc: '伤害 +2%', cost: 150, stat: 'bonusMight', value: 0.02, req: 'pow_5' },
			{ id: 'pow_8', name: 'AOE 风暴', desc: '攻击范围 +5%', cost: 150, stat: 'bonusArea', value: 0.05, req: 'pow_6' },
			{ id: 'pow_9', name: '超载共鸣', desc: '冷却 -2%', cost: 120, stat: 'bonusCdr', value: 0.02, req: 'pow_3' },
			{ id: 'pow_10', name: '致命节奏', desc: '伤害 +2%', cost: 180, stat: 'bonusMight', value: 0.02, req: 'pow_9' },
			{ id: 'pow_11', name: '弹幕大师', desc: '弹速 +8%', cost: 400, stat: 'bonusProjSpeed', value: 0.08, req: 'pow_10' },
			{ id: 'pow_12', name: '武器精通', desc: '伤害 +3%', cost: 200, stat: 'bonusMight', value: 0.03, req: 'pow_7' },
			{ id: 'pow_13', name: '战场主宰', desc: '伤害 +3%', cost: 250, stat: 'bonusMight', value: 0.03, req: 'pow_12' },
			{ id: 'pow_14', name: '爆炸专家', desc: '攻击范围 +7%', cost: 250, stat: 'bonusArea', value: 0.07, req: 'pow_8' },
			{ id: 'pow_15', name: '强化穿透', desc: '弹速 +6%', cost: 200, stat: 'bonusProjSpeed', value: 0.06, req: 'pow_12' },
			{ id: 'pow_ks', name: '核武征服', desc: '伤害 +3%, 范围 +5%', cost: 500, stat: 'keystone_pow', value: null, req: ['pow_13', 'pow_14'] },
		],
	},

	// ══════ 技巧分支 ══════
	{
		id: 'skill',
		name: '技巧路线',
		color: '#4488ff',
		nodes: [
			{ id: 'ski_1', name: '迅速装填', desc: '冷却 -1%', cost: 40, stat: 'bonusCdr', value: 0.01, req: null },
			{ id: 'ski_2', name: '冷却压缩', desc: '冷却 -2%', cost: 60, stat: 'bonusCdr', value: 0.02, req: 'ski_1' },
			{ id: 'ski_3', name: '移动强化', desc: '移速 +2%', cost: 80, stat: 'bonusSpeed', value: 0.02, req: 'ski_1' },
			{ id: 'ski_4', name: '弹道加速', desc: '弹速 +3%', cost: 80, stat: 'bonusProjSpeed', value: 0.03, req: 'ski_2' },
			{ id: 'ski_5', name: '超速战术', desc: '移速 +3%', cost: 100, stat: 'bonusSpeed', value: 0.03, req: 'ski_3' },
			{ id: 'ski_6', name: '武器超频', desc: '冷却 -2%', cost: 120, stat: 'bonusCdr', value: 0.02, req: 'ski_4' },
			{ id: 'ski_7', name: '风驰电掣', desc: '移速 +3%', cost: 150, stat: 'bonusSpeed', value: 0.03, req: 'ski_5' },
			{ id: 'ski_8', name: '极速射击', desc: '冷却 -3%', cost: 180, stat: 'bonusCdr', value: 0.03, req: 'ski_6' },
			{ id: 'ski_9', name: '精准打击', desc: '暴击率 +3%', cost: 100, stat: 'luckyChance', value: 0.03, req: 'ski_2' },
			{ id: 'ski_10', name: '弹道强化', desc: '弹速 +5%', cost: 150, stat: 'bonusProjSpeed', value: 0.05, req: 'ski_9' },
			{ id: 'ski_11', name: '动能护盾', desc: '护甲 +1', cost: 200, stat: 'bonusArmor', value: 1, req: 'ski_10' },
			{ id: 'ski_12', name: '战术机动', desc: '移速 +2%, 冷却 -2%', cost: 150, stat: 'keystone_mob', value: null, req: ['ski_7', 'ski_8'] },
			{ id: 'ski_13', name: '闪电精准', desc: '弹速 +6%', cost: 200, stat: 'bonusProjSpeed', value: 0.06, req: 'ski_12' },
			{ id: 'ski_14', name: '超频引擎', desc: '冷却 -3%', cost: 250, stat: 'bonusCdr', value: 0.03, req: 'ski_13' },
			{ id: 'ski_15', name: '磁力拓展', desc: '拾取范围 +10%', cost: 200, stat: 'bonusPickup', value: 0.10, req: 'ski_10' },
			{ id: 'ski_ks', name: '时间裁决者', desc: '冷却 -5%, 移速 +5%', cost: 500, stat: 'keystone_ski', value: null, req: ['ski_14', 'ski_15'] },
		],
	},

	// ══════ 生存分支 ══════
	{
		id: 'survival',
		name: '生存路线',
		color: '#44ff88',
		nodes: [
			{ id: 'sur_1', name: '生命强化', desc: '最大HP +5', cost: 40, stat: 'maxHp', value: 5, req: null },
			{ id: 'sur_2', name: '护甲锻造', desc: '护甲 +1', cost: 60, stat: 'bonusArmor', value: 1, req: 'sur_1' },
			{ id: 'sur_3', name: '生命拓展', desc: '最大HP +10', cost: 80, stat: 'maxHp', value: 10, req: 'sur_1' },
			{ id: 'sur_4', name: '钢铁意志', desc: '护甲 +1', cost: 80, stat: 'bonusArmor', value: 1, req: 'sur_2' },
			{ id: 'sur_5', name: '极限生存', desc: '最大HP +10', cost: 100, stat: 'maxHp', value: 10, req: 'sur_3' },
			{ id: 'sur_6', name: '铁壁防御', desc: '护甲 +2', cost: 120, stat: 'bonusArmor', value: 2, req: 'sur_4' },
			{ id: 'sur_7', name: '庇护之光', desc: '最大HP +15', cost: 150, stat: 'maxHp', value: 15, req: 'sur_5' },
			{ id: 'sur_8', name: '不屈盾甲', desc: '护甲 +2', cost: 150, stat: 'bonusArmor', value: 2, req: 'sur_6' },
			{ id: 'sur_9', name: '恢复共鸣', desc: '回血 +0.1/秒', cost: 100, stat: 'bonusRegen', value: 0.1, req: 'sur_2' },
			{ id: 'sur_10', name: '生命涌流', desc: '回血 +0.2/秒', cost: 150, stat: 'bonusRegen', value: 0.2, req: 'sur_9' },
			{ id: 'sur_11', name: '不灭再生', desc: '回血 +0.3/秒', cost: 200, stat: 'bonusRegen', value: 0.3, req: 'sur_10' },
			{ id: 'sur_12', name: '拾取增幅', desc: '拾取范围 +8%', cost: 100, stat: 'bonusPickup', value: 0.08, req: 'sur_3' },
			{ id: 'sur_13', name: '磁力大师', desc: '拾取范围 +10%', cost: 150, stat: 'bonusPickup', value: 0.10, req: 'sur_12' },
			{ id: 'sur_14', name: '极限生命', desc: '最大HP +20', cost: 250, stat: 'maxHp', value: 20, req: ['sur_7', 'sur_8'] },
			{ id: 'sur_15', name: '坚不可摧', desc: '护甲 +3', cost: 300, stat: 'bonusArmor', value: 3, req: 'sur_14' },
			{ id: 'sur_ks', name: '铁壁不朽', desc: 'HP +25, 护甲 +4', cost: 500, stat: 'keystone_sur', value: null, req: ['sur_15', 'sur_11'] },
		],
	},
];

// ─── 快速查找表 ───
const NODE_MAP = {};
for (const branch of TALENT_BRANCHES) {
	for (const node of branch.nodes) {
		node.branch = branch.id;
		NODE_MAP[node.id] = node;
	}
}

class TalentTree {
	constructor(meta) {
		this.meta = meta;
		// 已解锁节点 { nodeId: true }
		this.allocated = (meta.data.talentNodes) ? Object.assign({}, meta.data.talentNodes) : {};
	}

	// ─── 查询 ───
	isAllocated(nodeId) {
		return !!this.allocated[nodeId];
	}

	canAllocate(nodeId) {
		const node = NODE_MAP[nodeId];
		if (!node) return false;
		if (this.allocated[nodeId]) return false;

		// 成本检查
		if ((this.meta.data.chips || 0) < node.cost) return false;

		// 前置节点检查
		if (!node.req) return true; // 根节点

		const reqs = Array.isArray(node.req) ? node.req : [node.req];
		// 多前置：必须全部满足
		return reqs.every(r => this.allocated[r]);
	}

	// ─── 分配节点 ───
	allocate(nodeId) {
		if (!this.canAllocate(nodeId)) return false;

		const node = NODE_MAP[nodeId];
		this.meta.data.chips = (this.meta.data.chips || 0) - node.cost;
		this.allocated[nodeId] = true;
		this.meta.data.talentNodes = this.allocated;
		this.meta._save();
		return true;
	}

	// ─── 重置（退还芯片按比例，防止囤芯片刷天赋）───
	reset() {
		const refundCost = 100;
		if ((this.meta.data.chips || 0) < refundCost) return false;

		// 退还 50% 已消耗芯片
		let refund = 0;
		for (const nodeId in this.allocated) {
			const node = NODE_MAP[nodeId];
			if (node) refund += Math.floor(node.cost * 0.5);
		}

		this.meta.data.chips = (this.meta.data.chips || 0) - refundCost + refund;
		this.allocated = {};
		this.meta.data.talentNodes = {};
		this.meta._save();
		return true;
	}

	// ─── 已消耗芯片总量 ───
	getTotalSpent() {
		let total = 0;
		for (const nodeId in this.allocated) {
			const node = NODE_MAP[nodeId];
			if (node) total += node.cost;
		}
		return total;
	}

	// ─── 已分配节点数 ───
	getAllocatedCount() {
		return Object.keys(this.allocated).length;
	}

	// ─── 应用到玩家 ───
	applyToPlayer(player) {
		for (const nodeId in this.allocated) {
			const node = NODE_MAP[nodeId];
			if (!node) continue;
			this._applyNode(node, player);
		}
	}

	_applyNode(node, player) {
		switch (node.stat) {
			case 'bonusMight': player.bonusMight += node.value; break;
			case 'bonusSpeed': player.bonusSpeed += node.value; break;
			case 'bonusCdr': player.bonusCdr += node.value; break;
			case 'bonusArea': player.bonusArea += node.value; break;
			case 'bonusProjSpeed': player.bonusProjSpeed += node.value; break;
			case 'bonusRegen': player.bonusRegen += node.value; break;
			case 'bonusProjectile': player.bonusProjectile = (player.bonusProjectile || 0) + node.value; break;
			case 'bonusPickup': player.bonusPickup += node.value; break;
			case 'luckyChance': player.luckyChance = (player.luckyChance || 0) + node.value; break;
			case 'bonusArmor': player.bonusArmor += node.value; break;
			case 'maxHp':
				player.baseMaxHp += node.value;
				player.maxHp += node.value;
				player.hp += node.value;
				break;
			// 终极天赋（组合效果）
			case 'keystone_pow':
				player.bonusMight += 0.03;
				player.bonusArea += 0.05;
				break;
			case 'keystone_ski':
				player.bonusCdr += 0.05;
				player.bonusSpeed += 0.05;
				break;
			case 'keystone_mob':
				player.bonusSpeed += 0.02;
				player.bonusCdr += 0.02;
				break;
			case 'keystone_sur':
				player.baseMaxHp += 25;
				player.maxHp += 25;
				player.hp += 25;
				player.bonusArmor += 4;
				break;
		}
	}
}

module.exports = { TalentTree, TALENT_BRANCHES, NODE_MAP };
