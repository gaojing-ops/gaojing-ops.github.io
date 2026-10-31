// ─── 成就系统（微信小游戏版） ──────────────────────────
// localStorage → wx.setStorageSync

const ACH_KEY = 'flux_musou_achievements';

const ACHIEVEMENT_DEFS = [
	{ id: 'first_blood', name: '初次击杀', desc: '击杀第一个敌人', type: 'runtime', check: (game) => game.player.kills >= 1 , chips: 5},
	{ id: 'kill_100', name: '百人斩', desc: '单局击杀 100 个敌人', type: 'runtime', check: (game) => game.player.kills >= 100 , chips: 10},
	{ id: 'kill_500', name: '屠杀者', desc: '单局击杀 500 个敌人', type: 'runtime', check: (game) => game.player.kills >= 500 , chips: 20},
	{ id: 'survive_5', name: '生存者', desc: '存活 5 分钟', type: 'runtime', check: (game) => game.time >= 300 , chips: 10},
	{ id: 'survive_10', name: '不朽者', desc: '存活 10 分钟', type: 'runtime', check: (game) => game.time >= 600 , chips: 20},
	{ id: 'combo_20', name: '连杀大师', desc: '达成 20 连杀', type: 'runtime', check: (game) => game.killCombo >= 20 , chips: 10},
	{ id: 'level_10', name: '战力提升', desc: '达到 10 级', type: 'runtime', check: (game) => game.player.level >= 10 , chips: 10},
	{ id: 'boss_slayer', name: 'Boss 猎手', desc: '击杀一个 Boss', type: 'runtime', check: (game) => (game.bossKills || 0) >= 1 , chips: 20},
	{ id: 'collector', name: '收藏家', desc: '同时拥有 4 把武器', type: 'runtime', check: (game) => game.player.weapons.length >= 4 , chips: 10},
	{ id: 'victory', name: '通关者', desc: '存活 20 分钟通关', type: 'runtime', check: (game) => game.victoryTriggered , chips: 50},

	// Cryo 系列成就
	{ id: 'freeze_50', name: '冰冻新手', desc: '单局冻结击杀 50 个敌人', type: 'runtime', check: (game) => game.frozenKills >= 50 , chips: 20},
	{ id: 'freeze_200', name: '霜寒使者', desc: '单局冻结击杀 200 个敌人', type: 'runtime', check: (game) => game.frozenKills >= 200 , chips: 50},
	{ id: 'cryomancer_win', name: '冰霜术士', desc: '使用 Cryomancer 通关', type: 'runtime', check: (game) => game.victoryTriggered && game.player.characterId === 'cryomancer' , chips: 50},
	{ id: 'ice_boss', name: '冰封泰坦', desc: '使用 Cryomancer 击杀 3 个 Boss', type: 'runtime', check: (game) => game.player.characterId === 'cryomancer' && (game.bossKills || 0) >= 3 , chips: 50},
	{ id: 'shatter_master', name: '碎冰大师', desc: '单局应用 100 次冻结效果', type: 'runtime', check: (game) => game.totalFreezeApplies >= 100 , chips: 30},

	// Toxic 系列成就
	{ id: 'poison_50', name: '毒素新手', desc: '单局毒杀 50 个敌人', type: 'runtime', check: (game) => game.poisonKills >= 50 , chips: 20},
	{ id: 'poison_200', name: '瘟疫使者', desc: '单局毒杀 200 个敌人', type: 'runtime', check: (game) => game.poisonKills >= 200 , chips: 50},
	{ id: 'biohazard_win', name: '生化猎手', desc: '使用 Biohazard 通关', type: 'runtime', check: (game) => game.victoryTriggered && game.player.characterId === 'biohazard' , chips: 50},
	{ id: 'toxic_boss', name: '腐蚀之源', desc: '使用 Biohazard 击杀 3 个 Boss', type: 'runtime', check: (game) => game.player.characterId === 'biohazard' && (game.bossKills || 0) >= 3 , chips: 50},
	{ id: 'plague_master', name: '瘟疫大师', desc: '单局应用 100 次中毒效果', type: 'runtime', check: (game) => game.totalPoisonApplies >= 100 , chips: 30},

	// 元素协同成就
	{ id: 'element_master', name: '元素大师', desc: '单局冻结击杀和毒杀各达 100', type: 'runtime', check: (game) => game.frozenKills >= 100 && game.poisonKills >= 100 , chips: 80},
	{ id: 'evolution_3', name: '进化先驱', desc: '单局获得 3 个武器进化', type: 'runtime', check: (game) => game.player.weapons.filter(w => w.evolved).length >= 3 , chips: 50},

	// 无尽模式成就
	{ id: 'endless_enter', name: '无尽挑战', desc: '进入无尽模式', type: 'runtime', check: (game) => game.endlessMode && game.endlessWave >= 1 , chips: 20},
	{ id: 'endless_wave5', name: '无尽勇士', desc: '无尽模式存活 5 波', type: 'runtime', check: (game) => game.endlessMode && game.endlessWave >= 5 , chips: 50},
	{ id: 'endless_wave10', name: '无尽传说', desc: '无尽模式存活 10 波', type: 'runtime', check: (game) => game.endlessMode && game.endlessWave >= 10 , chips: 100},
	{ id: 'endless_kills', name: '无尽收割者', desc: '无尽模式击杀 1000 敌人', type: 'runtime', check: (game) => game.endlessMode && game.player.kills >= 1000 , chips: 80},

	// ═══ 新成就 ═══
	// 角色专属成就
	{ id: 'tracer_win', name: '闪电侠', desc: '使用 Tracer 通关', type: 'runtime', check: (game) => game.victoryTriggered && game.player.characterId === 'tracer' , chips: 50},
	{ id: 'walker_win', name: '钢铁意志', desc: '使用 Walker 通关', type: 'runtime', check: (game) => game.victoryTriggered && game.player.characterId === 'walker' , chips: 50},
	{ id: 'gunner_win', name: '狙击大师', desc: '使用 Gunner 通关', type: 'runtime', check: (game) => game.victoryTriggered && game.player.characterId === 'gunner' , chips: 50},
	{ id: 'berserker_win', name: '狂战传说', desc: '使用 Berserker 通关', type: 'runtime', check: (game) => game.victoryTriggered && game.player.characterId === 'berserker' , chips: 50},
	{ id: 'arcane_win', name: '奥术领主', desc: '使用 Arcane 通关', type: 'runtime', check: (game) => game.victoryTriggered && game.player.characterId === 'arcane' , chips: 50},
	{ id: 'engineer_win', name: '铁甲工匠', desc: '使用 Engineer 通关', type: 'runtime', check: (game) => game.victoryTriggered && game.player.characterId === 'engineer' , chips: 50},
	{ id: 'assassin_win', name: '暗影猎手', desc: '使用 Assassin 通关', type: 'runtime', check: (game) => game.victoryTriggered && game.player.characterId === 'assassin' , chips: 50},

	// 武器大师
	{ id: 'weapon_6', name: '武器收藏家', desc: '同时拥有 6 把武器', type: 'runtime', check: (game) => game.player.weapons.length >= 6 , chips: 30},
	{ id: 'passive_5', name: '道具大师', desc: '同时拥有 5 个被动道具', type: 'runtime', check: (game) => game.player.passives.length >= 5 , chips: 30},
	{ id: 'max_weapon', name: '满级武装', desc: '一把武器达到 8 级', type: 'runtime', check: (game) => game.player.weapons.some(w => w.level >= 8) , chips: 50},

	// Boss猎手
	{ id: 'boss_3', name: '精英猎人', desc: '单局击杀 3 个 Boss', type: 'runtime', check: (game) => (game.bossKills || 0) >= 3 , chips: 50},
	{ id: 'boss_5', name: 'Boss 终结者', desc: '单局击杀 5 个 Boss', type: 'runtime', check: (game) => (game.bossKills || 0) >= 5 , chips: 80},
	{ id: 'time_boss', name: '时空猎手', desc: '击杀时空裂隙 Boss', type: 'runtime', check: (game) => game.defeatedBosses && game.defeatedBosses.includes('时空裂隙') , chips: 80},
	{ id: 'mech_boss', name: '机械克星', desc: '击杀机械统帅 Boss', type: 'runtime', check: (game) => game.defeatedBosses && game.defeatedBosses.includes('机械统帅') , chips: 80},

	// 伤害与治疗
	{ id: 'damage_100k', name: '破坏者', desc: '单局造成 100,000 伤害', type: 'runtime', check: (game) => (game.player.totalDamage || 0) >= 100000 , chips: 20},
	{ id: 'damage_1m', name: '毁灭之王', desc: '单局造成 1,000,000 伤害', type: 'runtime', check: (game) => (game.player.totalDamage || 0) >= 1000000 , chips: 80},
	{ id: 'heal_500', name: '再生者', desc: '单局治疗 500 HP', type: 'runtime', check: (game) => (game.player.totalHealed || 0) >= 500 , chips: 10},
	{ id: 'heal_2000', name: '不朽之躯', desc: '单局治疗 2000 HP', type: 'runtime', check: (game) => (game.player.totalHealed || 0) >= 2000 , chips: 30},

	// 连杀与生存
	{ id: 'combo_50', name: '杀戮机器', desc: '达成 50 连杀', type: 'runtime', check: (game) => game.killCombo >= 50 , chips: 20},
	{ id: 'combo_100', name: '死神降临', desc: '达成 100 连杀', type: 'runtime', check: (game) => game.killCombo >= 100 , chips: 50},
	{ id: 'survive_15', name: '幸存者', desc: '存活 15 分钟', type: 'runtime', check: (game) => game.time >= 900 , chips: 30},
	{ id: 'low_hp_win', name: '绝地求生', desc: 'HP 低于 10 时通关', type: 'runtime', check: (game) => game.victoryTriggered && game.player.hp <= 10 , chips: 100},

	// 全武器进化
	{ id: 'evolution_5', name: '进化大师', desc: '单局获得 5 个武器进化', type: 'runtime', check: (game) => game.player.weapons.filter(w => w.evolved).length >= 5 , chips: 100},
	{ id: 'all_elements', name: '元素掌控', desc: '同时拥有 5 种不同元素武器', type: 'runtime', chips: 80, check: (game) => {
		const elements = new Set(game.player.weapons.map(w => w.def && w.def.element).filter(Boolean));
		return elements.size >= 5;
	}},

	// ═══ 天赋树 / 技能 / 章节 成就 ═══
	{ id: 'talent_10', name: '天赋初觉', desc: '解锁 10 个天赋节点', type: 'runtime', chips: 30, check: (game) => {
		const nodes = game.meta && game.meta.data && game.meta.data.talentNodes;
		return nodes ? Object.keys(nodes).length >= 10 : false;
	}},
	{ id: 'talent_30', name: '天赋精通', desc: '解锁 30 个天赋节点', type: 'runtime', chips: 60, check: (game) => {
		const nodes = game.meta && game.meta.data && game.meta.data.talentNodes;
		return nodes ? Object.keys(nodes).length >= 30 : false;
	}},
	{ id: 'talent_all', name: '天赋觉醒', desc: '解锁全部 48 个天赋节点', type: 'runtime', chips: 100, check: (game) => {
		const nodes = game.meta && game.meta.data && game.meta.data.talentNodes;
		return nodes ? Object.keys(nodes).length >= 48 : false;
	}},
	{ id: 'skill_use_20', name: '技能新手', desc: '使用角色技能 20 次', type: 'runtime', check: (game) => (game.skillUseCount || 0) >= 20 , chips: 15},
	{ id: 'skill_use_100', name: '技能大师', desc: '使用角色技能 100 次', type: 'runtime', check: (game) => (game.skillUseCount || 0) >= 100 , chips: 40},
	{ id: 'boss_rush_clear', name: 'Boss 征服者', desc: '完成 Boss Rush 全部 10 波', type: 'runtime', check: (game) => !!(game.bossRushCompleted) , chips: 150},
	{ id: 'stage_clear', name: '章节通关', desc: '完成全部 5 个章节', type: 'runtime', check: (game) => game.victoryTriggered && game.stageSystem && game.stageSystem.currentStage >= 4 , chips: 100},
	{ id: 'endless_wave15', name: '无尽精英', desc: '无尽模式存活 15 波', type: 'runtime', check: (game) => game.endlessMode && game.endlessWave >= 15 , chips: 150},
	{ id: 'endless_wave20', name: '永恒战神', desc: '无尽模式存活 20 波', type: 'runtime', check: (game) => game.endlessMode && game.endlessWave >= 20 , chips: 200},
];

class AchievementSystem {
	constructor() {
		this.unlocked = this._load();
		this.toastQueue = [];
		this.currentToast = null;
		this._newAchievements = [];
	}

	_load() {
		try {
			const raw = wx.getStorageSync(ACH_KEY);
			if (raw) return new Set(JSON.parse(raw));
		} catch (e) { }
		return new Set();
	}

	_save() {
		try {
			wx.setStorageSync(ACH_KEY, JSON.stringify([...this.unlocked]));
		} catch (e) { }
	}

	isUnlocked(id) {
		return this.unlocked.has(id);
	}

	check(game, dt = 0.016) {
		// 节流：runtime 成就每 30 帧检查一次
		this._checkFrame = (this._checkFrame || 0) + 1;
		if (this._checkFrame >= 30) {
			this._checkFrame = 0;
			for (const ach of ACHIEVEMENT_DEFS) {
				if (this.isUnlocked(ach.id)) continue;
				if (ach.type !== 'runtime') continue;
				if (ach.check(game)) {
					this._unlock(ach, game);
				}
			}
		}
		// toast 更新仍每帧执行
		this._updateToast(dt);
	}

	_unlock(ach, game) {
		this.unlocked.add(ach.id);
		this._save();
		this._newAchievements.push(ach);
		// 芯片奖励
		const reward = ach.chips || 0;
		if (reward > 0 && game && game.meta) {
			game.meta.addChips(reward);
		}
		this.toastQueue.push({
			text: `🏆 ${ach.name}`,
			sub: ach.desc + (reward > 0 ? ` (+${reward} 芯片)` : ''),
			timer: 3.5,
		});
	}

	_updateToast(dt = 0.016) {
		if (this.currentToast) {
			this.currentToast.timer -= dt;
			if (this.currentToast.timer <= 0) this.currentToast = null;
		}
		if (!this.currentToast && this.toastQueue.length > 0) {
			this.currentToast = this.toastQueue.shift();
		}
	}

	getNewAchievements() {
		const result = [...this._newAchievements];
		this._newAchievements = [];
		return result;
	}

	draw(ctx, w, h) {
		if (!this.currentToast) return;
		const t = this.currentToast;
		const alpha = Math.min(1, t.timer);
		const toastH = 44;
		const toastY = h - toastH - 15; // 底部位置

		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.fillStyle = 'rgba(0,0,0,0.8)';
		ctx.fillRect(w / 2 - 100, toastY, 200, toastH);
		ctx.strokeStyle = '#ffcc0066';
		ctx.lineWidth = 1;
		ctx.strokeRect(w / 2 - 100, toastY, 200, toastH);
		ctx.fillStyle = '#ffcc00';
		ctx.font = 'bold 13px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(t.text, w / 2, toastY + 18);
		ctx.fillStyle = '#aaa';
		ctx.font = '10px sans-serif';
		ctx.fillText(t.sub, w / 2, toastY + 34);
		ctx.textAlign = 'left';
		ctx.restore();
	}
}

module.exports = AchievementSystem;
module.exports.ACHIEVEMENT_DEFS = ACHIEVEMENT_DEFS;
