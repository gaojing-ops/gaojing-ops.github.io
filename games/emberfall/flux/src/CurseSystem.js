// ─── 诅咒系统（微信小游戏版） ──────────────────────────
// UI 部分已移至 CurseSelectScene.js，此文件仅保留数据和逻辑

const CURSE_DEFS = [
	{ id: 'curse_enemy_speed', name: '加速协议', desc: '敌人移速 +25%', icon: '⚡', heat: 1, unlocked: true, unlockCheck: () => true, unlockHint: '', apply: (game) => { game.curseSpeedMult = 1.25; } },
	{ id: 'curse_half_hp', name: '半血启动', desc: '初始 HP 减半', icon: '💔', heat: 2, unlocked: true, unlockCheck: () => true, unlockHint: '', apply: (game) => { game.player.hp = Math.floor(game.player.maxHp * 0.5); } },
	{ id: 'curse_fog', name: '战场迷雾', desc: '视野范围大幅缩小', icon: '🌫️', heat: 2, unlocked: true, unlockCheck: () => true, unlockHint: '', apply: (game) => { game.curseFogRadius = 220; } },
	{ id: 'curse_enemy_hp', name: '数据强化', desc: '敌人 HP +50%', icon: '🛡', heat: 1, unlocked: true, unlockCheck: () => true, unlockHint: '', apply: (game) => { game.curseEnemyHpMult = 1.5; } },
	{ id: 'curse_no_heal', name: '断线修复', desc: '无法回血', icon: '🚫', heat: 3, unlocked: false, unlockCheck: (meta) => (meta.totalRuns || 0) >= 3, unlockHint: '完成 3 局解锁', apply: (game) => { game.curseNoHeal = true; } },
	{ id: 'curse_boss_rage', name: 'Boss 狂怒', desc: 'Boss 出现间隔 -30 秒', icon: '💀', heat: 2, unlocked: false, unlockCheck: (meta) => (meta.bestTime || 0) >= 120, unlockHint: '存活 2 分钟解锁', apply: (game) => { game.curseBossInterval = 30; } },
	{ id: 'curse_elite_surge', name: '精英潮涌', desc: '精英怪生成率 x5', icon: '👹', heat: 4, unlocked: false, unlockCheck: (meta) => (meta.bestKills || 0) >= 100, unlockHint: '单局击杀 100 解锁', apply: (game) => { game.curseEliteMult = 5; } },
	{ id: 'curse_debuff_xp', name: '经验衰减', desc: '经验获取 -40%', icon: '📉', heat: 1, unlocked: false, unlockCheck: (meta) => (meta.totalRuns || 0) >= 5, unlockHint: '完成 5 局解锁', apply: (game) => { game.curseXpMult = 0.6; } },

	// ═══ 新诅咒 ═══
	{ id: 'curse_double_boss', name: '双子威胁', desc: '每次出现 2 个 Boss', icon: '👯', heat: 4, unlocked: false, unlockCheck: (meta) => (meta.bestTime || 0) >= 300, unlockHint: '存活 5 分钟解锁', apply: (game) => { game.curseDoubleBoss = true; } },
	{ id: 'curse_enemy_damage', name: '火力全开', desc: '敌人伤害 +50%', icon: '💥', heat: 2, unlocked: false, unlockCheck: (meta) => (meta.totalRuns || 0) >= 4, unlockHint: '完成 4 局解锁', apply: (game) => { game.curseEnemyDamageMult = 1.5; } },
	{ id: 'curse_spawn_rate', name: '虫群来袭', desc: '敌人刷新速度 x2', icon: '🐛', heat: 2, unlocked: false, unlockCheck: (meta) => (meta.bestKills || 0) >= 200, unlockHint: '单局击杀 200 解锁', apply: (game) => { game.curseSpawnRateMult = 2; } },
	{ id: 'curse_no_pickup', name: '道具禁用', desc: '无法拾取地图道具', icon: '🚷', heat: 3, unlocked: false, unlockCheck: (meta) => (meta.bestTime || 0) >= 180, unlockHint: '存活 3 分钟解锁', apply: (game) => { game.curseNoPickup = true; } },
	{ id: 'curse_health_decay', name: '慢性崩解', desc: '每秒损失 1 HP', icon: '☠', heat: 3, unlocked: false, unlockCheck: (meta) => (meta.bestTime || 0) >= 240, unlockHint: '存活 4 分钟解锁', apply: (game) => { game.curseHealthDecay = 1; } },
	{ id: 'curse_armor_break', name: '护甲崩坏', desc: '护甲效果 -50%', icon: '🔧', heat: 1, unlocked: false, unlockCheck: (meta) => (meta.totalRuns || 0) >= 2, unlockHint: '完成 2 局解锁', apply: (game) => { game.curseArmorBreak = true; } },
	{ id: 'curse_might_down', name: '伤害削弱', desc: '伤害 -20%', icon: '🔻', heat: 2, unlocked: false, unlockCheck: (meta) => (meta.bestKills || 0) >= 150, unlockHint: '单局击杀 150 解锁', apply: (game) => { game.player.bonusMight = Math.max(-0.5, game.player.bonusMight - 0.2); } },
	{ id: 'curse_speed_down', name: '重力枷锁', desc: '移速 -20%', icon: '⛓', heat: 1, unlocked: false, unlockCheck: (meta) => (meta.totalRuns || 0) >= 3, unlockHint: '完成 3 局解锁', apply: (game) => { game.player.bonusSpeed = Math.max(-0.5, game.player.bonusSpeed - 0.2); } },

	// ═══ 每日挑战专属修饰语（也可正常解锁） ═══
	{ id: 'curse_single_weapon', name: '单一武装', desc: '无法获得新武器（只能使用初始武器）', icon: '🗡', heat: 5, unlocked: false, unlockCheck: (meta) => (meta.totalRuns || 0) >= 10, unlockHint: '完成 10 局解锁', apply: (game) => { game.curseSingleWeapon = true; } },
	{ id: 'curse_limited_time', name: '限时幸存', desc: '存活时间上限为 5 分钟', icon: '⏳', heat: 3, unlocked: false, unlockCheck: (meta) => (meta.bestTime || 0) >= 600, unlockHint: '存活 10 分钟解锁', apply: (game) => { game.curseLimitedTime = 300; } },
];

function getChipMultiplier(totalHeat) {
	return 1 + totalHeat * 0.15;
}

function applyCurses(game, curses) {
	if (!curses || curses.length === 0) return;
	const totalHeat = curses.reduce((s, c) => s + c.heat, 0);
	game.curseChipMult = getChipMultiplier(totalHeat);
	for (const curse of curses) {
		curse.apply(game);
	}

	// ═══ 热度阈值奖励 ═══
	if (totalHeat >= 5) {
		// 5热度: 幸运 +10%
		game.player.luckyChance = (game.player.luckyChance || 0) + 0.10;
		game.spawnDamageNumber(game.player.x, game.player.y - 60, '🔥 热度5: 幸运+10%', '#ffcc00');
	}
	if (totalHeat >= 10) {
		// 10热度: 开局 +1 重随
		if (game.upgradeSystem) {
			game.upgradeSystem.rerollCount += 1;
		}
		game.spawnDamageNumber(game.player.x, game.player.y - 80, '🔥 热度10: 重随+1', '#ff8844');
	}
	if (totalHeat >= 15) {
		// 15热度: 开局获得随机进化核心被动
		const evolutionPassives = ['overclocker', 'nano_repair', 'energy_amp', 'spinach', 'bracer', 'duplicator'];
		const randomPassive = evolutionPassives[Math.floor(Math.random() * evolutionPassives.length)];
		const existing = game.player.passives.find(p => p.id === randomPassive);
		if (existing) {
			if (existing.level < 5) existing.level++; // 尊重 maxLevel 上限
		} else {
			game.player.passives.push({ id: randomPassive, level: 1 });
		}
		game.spawnDamageNumber(game.player.x, game.player.y - 100, '🔥 热度15: 随机被动!', '#ff4444');
	}
}

module.exports = { CURSE_DEFS, getChipMultiplier, applyCurses };
