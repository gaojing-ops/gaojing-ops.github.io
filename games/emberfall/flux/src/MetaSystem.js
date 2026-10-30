// ─── 局外成长系统（微信小游戏版） ──────────────────────────
// localStorage → wx.setStorageSync
// UI 部分已移至 ShopScene.js

const SHOP_KEY = 'flux_musou_meta';

const META_UPGRADES = [
	{ id: 'meta_hp', name: '生命核心', desc: '最大 HP +10', maxLevel: 10, costBase: 50, costScale: 1.5, stat: 'maxHp', perLevel: 10 },
	{ id: 'meta_might', name: '攻击芯片', desc: '伤害 +2%', maxLevel: 10, costBase: 80, costScale: 1.6, stat: 'might', perLevel: 0.02 },
	{ id: 'meta_speed', name: '加速模块', desc: '移速 +3%', maxLevel: 8, costBase: 60, costScale: 1.5, stat: 'speed', perLevel: 0.03 },
	{ id: 'meta_pickup', name: '磁力扩展', desc: '拾取范围 +10%', maxLevel: 5, costBase: 40, costScale: 1.4, stat: 'pickup', perLevel: 0.1 },
	{ id: 'meta_cdr', name: '冷却压缩', desc: '武器冷却 -3%', maxLevel: 5, costBase: 65, costScale: 1.5, stat: 'cdr', perLevel: 0.03 },
	{ id: 'meta_regen', name: '生命回路', desc: '恢复 +0.2 HP/秒', maxLevel: 5, costBase: 45, costScale: 1.5, stat: 'regen', perLevel: 0.2 },
	// ═══ 新升级 ═══
	{ id: 'meta_reroll', name: '🎲 重随骰子', desc: '每局可重随升级 +1', maxLevel: 5, costBase: 100, costScale: 1.6, stat: 'reroll', perLevel: 1 },
	{ id: 'meta_skip', name: '⏭ 跳过芯片', desc: '每局可跳过升级 +1', maxLevel: 5, costBase: 100, costScale: 1.5, stat: 'skip', perLevel: 1 },
	{ id: 'meta_banish', name: '🚫 放逐协议', desc: '每局可放逐升级 +1', maxLevel: 5, costBase: 150, costScale: 1.7, stat: 'banish', perLevel: 1 },
	{ id: 'meta_mastery', name: '💥 暴击强化', desc: '暴击率 +5%', maxLevel: 5, costBase: 120, costScale: 1.8, stat: 'luckyChance', perLevel: 0.05 },
];

class MetaSystem {
	constructor() {
		this.data = this._load();
	}

	_load() {
		const defaults = {
			chips: 0,
			upgrades: {},
			totalRuns: 0,
			bestTime: 0,
			bestKills: 0,
			bestLevel: 0,
			unlockedItems: [],
			unlockedSkins: [],
			unlockedPets: [],
			equippedPets: [], // 携带出战的宠物，最大2只
			unlockedAuras: [], // 已解锁的光环
			selectedAura: null, // 当前佩戴的光环
			selectedSkins: {},
			customBuilds: {},  // Build 预设系统
			talentNodes: {},   // 天赋树已解锁节点
			stagesCompleted: 0,
			bossRushBestWave: 0,
			totalPlayTime: 0,
			totalKills: 0,
		};
		try {
			const raw = wx.getStorageSync(SHOP_KEY);
			if (raw) return { ...defaults, ...JSON.parse(raw) };
		} catch (e) { }
		return defaults;
	}

	unlockItem(id) {
		if (!this.data.unlockedItems) this.data.unlockedItems = [];
		if (!this.data.unlockedItems.includes(id)) {
			this.data.unlockedItems.push(id);
			this._save();
			console.log("Item unlocked:", id);
			return true;
		}
		return false;
	}

	isUnlocked(id) {
		if (!this.data.unlockedItems) return false;
		return this.data.unlockedItems.includes(id);
	}

	// ═══ 宠物/陪伴系统 ═══
	unlockPet(petId) {
		if (!this.data.unlockedPets) this.data.unlockedPets = [];
		if (!this.data.unlockedPets.includes(petId)) {
			this.data.unlockedPets.push(petId);
			this._save();
			console.log("Pet unlocked:", petId);
			return true;
		}
		return false;
	}

	isPetUnlocked(petId) {
		if (!this.data.unlockedPets) return false;
		return this.data.unlockedPets.includes(petId);
	}

	equipPet(petId) {
		if (!this.data.equippedPets) this.data.equippedPets = [];
		if (this.data.equippedPets.includes(petId)) return true; // Already equipped
		if (this.data.equippedPets.length >= 2) return false; // Max 2 equipped
		this.data.equippedPets.push(petId);
		this._save();
		return true;
	}

	unequipPet(petId) {
		if (!this.data.equippedPets) this.data.equippedPets = [];
		const idx = this.data.equippedPets.indexOf(petId);
		if (idx !== -1) {
			this.data.equippedPets.splice(idx, 1);
			this._save();
			return true;
		}
		return false;
	}

	isPetEquipped(petId) {
		if (!this.data.equippedPets) return false;
		return this.data.equippedPets.includes(petId);
	}

	// ═══ 外观系统 ═══

	unlockSkin(skinId) {
		if (!this.data.unlockedSkins) this.data.unlockedSkins = [];
		if (!this.data.unlockedSkins.includes(skinId)) {
			this.data.unlockedSkins.push(skinId);
			this._save();
			console.log("Skin unlocked:", skinId);
			return true;
		}
		return false;
	}

	isSkinUnlocked(skinId) {
		if (!this.data.unlockedSkins) return false;
		return this.data.unlockedSkins.includes(skinId);
	}

	selectSkin(charId, skinId) {
		if (!this.data.selectedSkins) this.data.selectedSkins = {};
		this.data.selectedSkins[charId] = skinId;
		this._save();
	}

	getSelectedSkin(charId) {
		if (!this.data.selectedSkins) return null;
		return this.data.selectedSkins[charId] || null;
	}

	purchaseSkin(skinId, cost) {
		if (this.data.chips < cost) return false;
		if (this.isSkinUnlocked(skinId)) return false;
		this.data.chips -= cost;
		this.unlockSkin(skinId);
		return true;
	}

	// ═══ 光环系统 (Auras) ═══

	unlockAura(auraId) {
		if (!this.data.unlockedAuras) this.data.unlockedAuras = [];
		if (!this.data.unlockedAuras.includes(auraId)) {
			this.data.unlockedAuras.push(auraId);
			this._save();
			return true;
		}
		return false;
	}

	isAuraUnlocked(auraId) {
		if (!this.data.unlockedAuras) return false;
		return this.data.unlockedAuras.includes(auraId);
	}

	selectAura(auraId) {
		this.data.selectedAura = auraId;
		this._save();
	}

	purchaseAura(auraId, cost) {
		if (this.data.chips < cost) return false;
		if (this.isAuraUnlocked(auraId)) return false;
		this.data.chips -= cost;
		this.unlockAura(auraId);
		return true;
	}

	_save() {
		try {
			wx.setStorageSync(SHOP_KEY, JSON.stringify(this.data));
		} catch (e) { }
	}

	endRun(time, kills, level, chipMultiplier = 1) {
		const base = Math.floor(kills * 1.0 + time * 0.25 + level * 4);
		const earned = Math.floor(base * chipMultiplier);
		this.addChips(earned);
		this.data.totalRuns++;
		if (time > this.data.bestTime) this.data.bestTime = time;
		if (kills > this.data.bestKills) {
			this.data.bestKills = kills;
			// 通知开放数据域刷新云端成绩
			if (typeof wx !== 'undefined' && wx.getOpenDataContext) {
				const openDataContext = wx.getOpenDataContext();
				openDataContext.postMessage({
					type: 'updateScore',
					bestKills: this.data.bestKills
				});
			}
		}
		if (level > (this.data.bestLevel || 0)) this.data.bestLevel = level;
		// 累计统计（Build 解锁条件所需）
		this.data.totalPlayTime = (this.data.totalPlayTime || 0) + time;
		this.data.totalKills = (this.data.totalKills || 0) + kills;
		this._save();
		return earned;
	}


	addChips(amount) {
		this.data.chips = (this.data.chips || 0) + amount;
		this._save();
	}

	getLevel(upgradeId) {
		return this.data.upgrades[upgradeId] || 0;
	}

	getCost(upgrade) {
		const lvl = this.getLevel(upgrade.id);
		return Math.floor(upgrade.costBase * Math.pow(upgrade.costScale, lvl));
	}

	purchase(upgrade) {
		const cost = this.getCost(upgrade);
		if (this.data.chips < cost) return false;
		const lvl = this.getLevel(upgrade.id);
		if (lvl >= upgrade.maxLevel) return false;
		this.data.chips -= cost;
		this.data.upgrades[upgrade.id] = lvl + 1;
		this._save();
		return true;
	}

	applyToPlayer(player) {
		for (const u of META_UPGRADES) {
			const lvl = this.getLevel(u.id);
			if (lvl <= 0) continue;
			const value = u.perLevel * lvl;
			switch (u.stat) {
				case 'maxHp': player.baseMaxHp += value; player.maxHp += value; player.hp += value; break;
				case 'might': player.bonusMight += value; break;
				case 'speed': player.bonusSpeed += value; break;
				case 'pickup': player.bonusPickup += value; break;
				case 'cdr': player.bonusCdr += value; break;
				case 'regen': player.bonusRegen += value; break;
				case 'luckyChance': player.luckyChance = (player.luckyChance || 0) + value; break;
			}
		}
	}

	_formatTime(t) {
		const m = Math.floor(t / 60);
		const s = Math.floor(t % 60);
		return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	}
}

module.exports = MetaSystem;
module.exports.META_UPGRADES = META_UPGRADES;
