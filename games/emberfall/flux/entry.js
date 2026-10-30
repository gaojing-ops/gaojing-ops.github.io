// ─── FluxMusou 微信小游戏入口 ──────────────────────────
// 替代 index.html + main.js，使用 Canvas 绘制所有 UI

// performance.now() 兼容性 polyfill（确保全局可用，platform.js 中也有安全封装）
if (typeof performance === 'undefined') {
	const nowOffset = Date.now();
	GameGlobal.performance = {
		now: function () { return Date.now() - nowOffset; }
	};
}

const Game = require('./src/Game');
const SceneManager = require('./src/SceneManager');

const TitleScene = require('./src/scenes/TitleScene');
const CharSelectScene = require('./src/scenes/CharSelectScene');
const BuildSelectScene = require('./src/scenes/BuildSelectScene');
const CurseSelectScene = require('./src/scenes/CurseSelectScene');
const UpgradeScene = require('./src/scenes/UpgradeScene');
const GameOverScene = require('./src/scenes/GameOverScene');
const ShopScene = require('./src/scenes/ShopScene');
const DailyScene = require('./src/scenes/DailyScene');
const AchievementScene = require('./src/scenes/AchievementScene');
const CompendiumScene = require('./src/scenes/CompendiumScene');
const LeaderboardScene = require('./src/scenes/LeaderboardScene');
const { SpeedRunScene, saveRecord, formatTime, KILL_TARGET } = require('./src/scenes/SpeedRunScene');
const { CHARACTERS } = require('./src/Character');
const { CURSE_DEFS, applyCurses } = require('./src/CurseSystem');
const SFX = require('./src/SFX');
const { getDailyConfig } = require('./src/DailyChallenge');

// ─── 初始化 Canvas ───
const canvas = browserCanvas;
const info = wx.getSystemInfoSync();
const dpr = info.pixelRatio || 1;
// 物理像素尺寸
canvas.width = info.screenWidth * dpr;
canvas.height = info.screenHeight * dpr;
const ctx = canvas.getContext('2d');

// ─── 创建游戏实例 ───
const game = new Game(canvas);
// 传递逻辑分辨率给游戏
game.resize(info.screenWidth, info.screenHeight);

// ─── 创建场景管理器 ───
const sm = new SceneManager(game);
game.sceneManager = sm;

// ... (省略中间的回调绑定代码，保持不变，仅为了定位) ...

// ─── 统一主循环 ───
// 只有一个 requestAnimationFrame 循环，根据状态分发

// ─── 场景回调绑定 ───

// === TitleScene ===
const titleScene = new TitleScene();
titleScene.onStart = () => sm.switchTo('charSelect');
titleScene.onShop = () => sm.switchTo('shop');
titleScene.onDaily = () => sm.switchTo('daily');
titleScene.onAchievements = () => sm.switchTo('achievements');
sm.register('title', titleScene);

// === CharSelectScene ===
const charSelectScene = new CharSelectScene();
charSelectScene.onSelect = (charId, build) => {
	// Boss Rush 模式：跳过诅咒选择，直接启动 Boss Rush
	if (charSelectScene.bossRushMode) {
		SFX.initAudio();
		game.startBossRush(charId);
		sm.switchTo('playing');
		return;
	}
	// 速通模式：跳过诅咒选择，直接启动，设置速通标记
	if (charSelectScene.speedRunMode) {
		SFX.initAudio();
		game.startWithCharacter(charId, []);
		game.isSpeedRunMode = true;
		game.speedRunStartTime = game.time;
		game.speedRunCharId = charId;
		game.speedRunKills = 0;
		sm.switchTo('playing');
		return;
	}
	// 如果选择了 Build，直接跳过诅咒选择，进入游戏
	if (build) {
		SFX.initAudio();
		game.startWithCharacter(charId, [], build);
		sm.switchTo('playing');
	} else {
		// 正常流程：诅咒选择
		sm.switchTo('curseSelect', {
			charId,
			metaData: game.meta.data,
		});
	}
};
charSelectScene.onBack = () => sm.switchTo('title');
sm.register('charSelect', charSelectScene);

// === BuildSelectScene ===
const buildSelectScene = new BuildSelectScene();
sm.register('buildSelect', buildSelectScene);

// === CurseSelectScene ===
const curseSelectScene = new CurseSelectScene();
curseSelectScene.onConfirm = (data) => {
	SFX.initAudio();
	game.startWithCharacter(data.charId, data.curses);
	sm.switchTo('playing');
};
curseSelectScene.onBack = () => sm.switchTo('charSelect');
sm.register('curseSelect', curseSelectScene);

// === UpgradeScene ===
const upgradeScene = new UpgradeScene();
upgradeScene.onSelect = (option) => {
	try {
		// 宝箱模式使用专用奖励逻辑
		if (upgradeScene.chestMode) {
			game._applyChestReward(option);
		} else {
			game.upgradeSystem.applyOption(option);
		}
	} catch (e) { console.error('Upgrade Apply Error:', e); }
	// 无论是否出错，都必须关闭升级界面，否则游戏卡死
	try {
		game._closeUpgrade();
	} catch (e2) {
		console.error('Close Upgrade Error:', e2);
		// 最后保底：强制恢复游戏
		game.isRunning = true;
		game.lastTime = null;
		if (sm) sm.switchTo('playing');
	}
};
upgradeScene.onReroll = () => {
	const result = game.upgradeSystem.reroll();
	if (result) {
		const us = game.upgradeSystem;
		sm.switchTo('upgrade', {
			options: result.options,
			previews: result.previews,
			rerollCount: us.rerollCount,
			skipCount: us.skipCount,
			banishCount: us.banishCount,
		});
	}
};
upgradeScene.onSkip = () => {
	if (game.upgradeSystem.skip()) {
		game._closeUpgrade();
	}
};
upgradeScene.onBanish = (option) => {
	if (game.upgradeSystem.banish(option.id)) {
		// 遗物：废铁回收 — 放逐时获得10芯片
		if (game.player && game.player.relicFlags && game.player.relicFlags.scrapRecycle) {
			game.meta.addChips(10);
			game.spawnDamageNumber(game.player.x, game.player.y - 40, '+10 芯片', '#aaaaaa');
		}
		// 放逐后重新生成选项
		const { options, previews } = game.upgradeSystem.generateOptions();
		const us = game.upgradeSystem;
		sm.switchTo('upgrade', {
			options,
			previews,
			rerollCount: us.rerollCount,
			skipCount: us.skipCount,
			banishCount: us.banishCount,
		});
	}
};
sm.register('upgrade', upgradeScene);

// === GameOverScene ===
const gameOverScene = new GameOverScene();
gameOverScene.onRestart = () => sm.switchTo('charSelect');
gameOverScene.onShop = () => sm.switchTo('shop');
gameOverScene.onTitle = () => sm.switchTo('title');
sm.register('gameOver', gameOverScene);

// === ShopScene ===
const shopScene = new ShopScene();
shopScene.onBack = () => sm.switchTo('title');
shopScene.meta = game.meta; // 注入 meta 实例
sm.register('shop', shopScene);

// === DailyScene ===
const dailyScene = new DailyScene();
dailyScene.onStart = (config) => {
	SFX.initAudio();
	const cursesToApply = config.curses.map(c => CURSE_DEFS.find(d => d.id === c.id)).filter(Boolean);
	game.startWithCharacter(config.charId, cursesToApply);
	game.isDailyChallenge = true;
	if (config.mapStyle) game.mapManager.setStyle(config.mapStyle);
	sm.switchTo('playing');
};
dailyScene.onBack = () => sm.switchTo('title');
sm.register('daily', dailyScene);

// === AchievementScene ===
const achievementScene = new AchievementScene();
achievementScene.onBack = () => sm.switchTo('title');
achievementScene.achievements = game.achievements; // 注入成就实例
sm.register('achievements', achievementScene);

// === CompendiumScene ===
const compendiumScene = new CompendiumScene();
compendiumScene.onBack = () => sm.switchTo('title');
sm.register('compendium', compendiumScene);

// === LeaderboardScene ===
const leaderboardScene = new LeaderboardScene();
sm.register('leaderboard', leaderboardScene);

// === SpeedRunScene ===
const speedRunScene = new SpeedRunScene();
speedRunScene.onStart = () => sm.switchTo('charSelect', { speedRunMode: true });
speedRunScene.onBack = () => sm.switchTo('title');
sm.register('speedRun', speedRunScene);

// ─── 注册特殊 'playing' 场景标识 ───
// 'playing' 不是真正的场景，只是一个标记，表示游戏主循环接管渲染
sm.register('playing', {
	enter() { },
	exit() { },
	update() { },
	draw() { },
	onTouchStart() { },
	onTouchEnd() { },
});

// ─── 切换到标题场景 ───
sm.switchTo('title');

// 启动
game.lastTime = null; // 初始设为 null，等待第一帧 sync
module.exports = {game,sm,SFX,canvas,ctx,info,dpr,CHARACTERS,CURSE_DEFS};
