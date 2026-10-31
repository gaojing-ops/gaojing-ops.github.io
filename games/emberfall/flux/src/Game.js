// ─── 主游戏类（微信小游戏版） ──────────────────────────
// 移除所有 DOM 操作，UI 交给 SceneManager + Canvas 场景

const Input = require('./Input');
const Player = require('./Player');
const { Enemy } = require('./Enemy');
const { Weapon } = require('./Weapons');
const Gem = require('./Gem');
const Boss = require('./Boss');
const Pickup = require('./Pickup');
const { EventSystem } = require('./EventSystem');
const ParticleSystem = require('./ParticleSystem');
const MapManager = require('./MapManager');

const { drawDamageNumber } = require('./Renderer');
const SFX = require('./SFX');
const { applyCurses } = require('./CurseSystem');
const { SynergySystem } = require('./SynergySystem');
const { EventEnhancer } = require('./EventEnhancer');
const AchievementSystem = require('./AchievementSystem');
const UpgradeSystem = require('./UpgradeSystem');
const { now: perfNow, vibrate, setKeepScreenOn } = require('./platform');
const MetaSystem = require('./MetaSystem');
const { CHARACTERS } = require('./Character');
const { saveDailyScore } = require('./DailyChallenge');
const UI = require('./UIRenderer');
const _WEAPON_COMBOS = require('./WeaponCombos');
const installHUD = require('./HUD');
const installComboSystem = require('./ComboSystem');
const installSpawnSystem = require('./SpawnSystem');
const installCollisionSystem = require('./CollisionSystem');
const installChestSystem = require('./ChestSystem');
const installKillSystem = require('./KillSystem');
const installRenderSystem = require('./RenderSystem');
const spriteCache = require('./SpriteCache');
const ObjectPool = require('./ObjectPool');
const Bullet = require('./Bullet');
const { BuildPreset } = require('./BuildPreset');
const BossRushMode = require('./BossRushMode');
const { StageSystem } = require('./StageSystem');
const DestinyShrine = require('./DestinyShrine');
const { SkillSystem } = require('./SkillSystem');
const { fastSin, fastCos } = require('./MathLUT');

class Game {
	constructor(canvas) {
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d');
		this.width = canvas.width;
		this.height = canvas.height;

		// 计算安全区域顶部偏移
		const sysInfo = require('./platform').getSystemInfo();
		this.safeAreaTop = 0;
		this.safeAreaBottom = 0;
		if (sysInfo.safeArea) {
			this.safeAreaTop = sysInfo.safeArea.top;
			// 底部安全区域高度 = 屏幕高度 - 安全区域底部坐标
			this.safeAreaBottom = sysInfo.screenHeight - sysInfo.safeArea.bottom;
			// 简单验证: 如果顶部安全距离过大(>50)，可能需要微调，这里直接使用
		}

		// 核心系统
		this.input = new Input(canvas);
		this.player = new Player(this);
		this.upgradeSystem = new UpgradeSystem(this);
		this.meta = new MetaSystem();
		this.mapManager = new MapManager();
		this.mapManager.preloadImages(); // 预加载地图背景贴图
		const { loadCharacterSprites } = require('./Renderer');
		loadCharacterSprites(); // 预加载角色精灵图

		this.eventSystem = new EventSystem(this);
		this.particles = new ParticleSystem();
		this.synergy = new SynergySystem(this);
		this.eventEnhancer = new EventEnhancer(this);
		this.achievements = new AchievementSystem();

		// 精灵缓存初始化
		spriteCache.init();
		this.spriteCache = spriteCache;

		// ═══ 对象池 ═══
		this.bulletPool = new ObjectPool(
			() => new Bullet(this, 0, 0, 0, 0, 0, {}),
			(b) => { b.active = false; b._homingTarget = null; b._homingFrame = 0; if (b._hitSet) b._hitSet.clear(); },
			50 // 预分配50颗子弹
		);
		// 敌人对象池：250预分配，游戏循环内严禁 new Enemy()
		this.enemyPool = new ObjectPool(
			() => new Enemy(this, 0, 0, 'Bat'),
			(e) => { e.active = false; e.knockbackVx = 0; e.knockbackVy = 0; },
			250
		);
		// 传送回收计时器（每0.5秒检查远距离敌人）
		this._recycleTimer = 0;

		// 场景管理器（由外部 game.js 设置）
		this.sceneManager = null;

		// Boss Rush 模式
		this.bossRushMode = null;

		// 章节系统
		this.stageSystem = null;

		// 角色技能系统
		this.skillSystem = new SkillSystem(this);

		// 实体池
		this.bullets = [];
		this.enemies = [];
		this.gems = [];
		this.pickups = [];
		this.destinyShrines = [];
		this.bosses = [];
		this.enemyBullets = [];
		this.damageNumbers = [];
		this.screenPulse = 0;
		this.screenPulseColor = '#fff';

		// 性能优化：全局画质等级
		this.qualityLevel = 1; // 1=高, 0.5=中, 0=低
		this._ftBuf = new Float32Array(60);  // 环形缓冲
		this._ftIdx = 0;
		this._ftSum = 0;
		this._ftCount = 0;
		this.autoQuality = true; // 自动调整画质

		// 空间网格（用于碰撞检测优化）
		this.gridSize = 200;
		this.enemyGrid = new Map();
		this._nearbyResult = []; // 复用数组，减少 GC

		// 连杀渐变缓存
		this._comboGradientCache = null;
		this._comboGradientColor = "";

		// 游戏状态
		this.isRunning = false;
		this.isSpeedRunMode = false;
		this.lastTime = 0;
		this.time = 0;
		this.spawnTimer = 0;
		this.spawnInterval = 1.2;

		// Boss
		this.bossTimer = 90;
		this.bossWave = 0;

		// 地图元素生成
		this.mapElementTimer = 30; // 每30秒生成一个地图元素

		// 震屏
		this.shakeAmount = 0;
		this.shakeDuration = 0;
		this.hitPause = 0; // 命中停顿（帧冻结效果）

		// 相机
		this.camera = { x: 0, y: 0 };

		// 连杀
		this.killCombo = 0;
		this.comboTimer = 0;
		this.highestCombo = 0;
		this.lastComboReward = 0; // 上次触发奖励的连杀数

		// 玩家增益状态
		this.playerInvincible = 0; // 无敌时间

		// 事件系统状态
		this.activeZone = null;
		this.timeRift = null;

		// 诅咒系统状态
		this.activeCurses = [];
		this.curseSpeedMult = 1;
		this.curseFogRadius = 0;
		this.curseNoHeal = false;
		this.curseEnemyHpMult = 1;
		this.curseBossInterval = 0;
		this.curseEliteMult = 1;
		this.curseXpMult = 1;
		this.curseChipMult = 1;

		// 辐射脉冲视觉
		this.radiationPulse = null;
		// 虹吸连线视觉
		this.drainLine = null;

		// 暂停系统
		this.isPaused = false;
		this.pauseBtnRect = { x: 0, y: 0, w: 40, h: 40 };
		// 暂停菜单按钮区域
		this.pauseResumeBtn = null;
		this.pauseQuitBtn = null;
		this.pauseEquipBtn = null;
		this.pauseEquipBackBtn = null;
		this.pauseShowEquip = false; // 是否显示装备面板
		this.equipPanelScroll = 0; // 装备面板滚动位置
		this.pauseStatsBtn = null;
		this.pauseStatsBackBtn = null;
		this.pauseShowStats = false; // 是否显示 DPS 面板
		this.pauseSettingsBtn = null;
		this.pauseShowSettings = false; // 是否显示设置面板
		this.settingsAudioBtn = null;
		this.settingsQualityBtn = null;
		this.settingsBackBtn = null;
		this.pauseAutoPlayBtn = null; // 自动走位按钮
		this.pauseAutoUpgradeBtn = null; // 自动升级按钮

		// 自动玩（AI走位）
		this.autoPlay = false;
		// 自动升级（升级时随机选）
		this.autoUpgrade = false;

		// DPS 统计
		this._weaponDamageStats = {};

		// Boss 伤害来源展示
		this._bossDamageDisplay = null; // { log, bossName, timer }

		// 新手引导
		this._tutorialStep = -1; // -1=关闭, 0/1/2=进行中
		this._tutorialShown = false;

		// 触摸防抖（避免一次点击多次触发）
		this.lastTouchState = false;

		// 加载用户设置（音效/画质）
		this._loadSettings();
	}

	resize(w, h) {
		this.width = w;
		this.height = h;
	}

	// ─── 开始游戏 ───

	startWithCharacter(charId, curses, build, isBossRush) {
		// 重置状态
		this.bullets = [];
		this.enemies = [];
		this.gems = [];
		this.pickups = [];
		this.bosses = [];
		this.enemyBullets = [];
		this.damageNumbers = [];
		this.time = 0;
		this.spawnTimer = 0;
		this.spawnInterval = 1.2;
		this.bossTimer = 90;
		this.bossWave = 0;
		this.mapElementTimer = 30;
		this.shakeAmount = 0;
		this.shakeDuration = 0;
		this.killCombo = 0;
		this.comboTimer = 0;
		this.highestCombo = 0;
		if (this._resetComboBuffs) this._resetComboBuffs();
		this.lastComboReward = 0;
		this.playerInvincible = 0;
		this.activeZone = null;
		this.timeRift = null;
		this.radiationPulse = null;
		this.drainLine = null;
		this._weaponDamageStats = {};
		this._bossDamageDisplay = null;
		// 暂停/菜单状态重置
		this.isPaused = false;
		this.pauseShowEquip = false;
		this.equipPanelScroll = 0;
		this.pauseShowStats = false;
		this.pauseShowSettings = false;
		this.hitPause = 0;
		this._bossEntrance = null;
		this._lastStandUsed = false;
		this.autoPlay = false;
		this.autoUpgrade = false;
		this._aiTimer = 0;
		this._aiVector = null;
		this._aiWanderAngle = null;
		// 事件系统临时状态重置
		this._weaponSurge = null;
		this._speedBurst = null;
		this._xpSurge = null;
		this._armorBoost = null;
		this._nestChallenge = null;
		this._densitySurge = null;
		this._survivalTest = null;
		this._drainField = null;

		// Boss Rush 模式重置
		this.bossRushMode = null;

		// 章节系统重置
		this.stageSystem = null;

		// 技能系统重置（在玩家characterId设置后由init()完成）

		// 检查是否需要新手引导（Boss Rush 模式下跳过）
		if (!isBossRush) {
			try {
				const played = wx.getStorageSync('flux_played');
				if (!played) {
					this._tutorialStep = 0;
					this._tutorialShown = true;
				}
			} catch (e) { /* 忽略 */ }
		}
		// 诅咒属性全部重置
		this.curseSpeedMult = 1;
		this.curseFogRadius = 0;
		this.curseNoHeal = false;
		this.curseEnemyHpMult = 1;
		this.curseBossInterval = 0;
		this.curseEliteMult = 1;
		this.curseXpMult = 1;
		this.curseChipMult = 1;
		this.curseDoubleBoss = false;
		this.curseHealthDecay = 0;
		this.curseSpawnRateMult = 1;
		this.curseLimitedTime = 0;
		this.curseNoPickup = false;
		this.curseArmorBreak = false;
		this.curseSingleWeapon = false;
		this.curseEnemyDamageMult = 1;

		// 重置玩家
		this.player = new Player(this);
		this.eventSystem = new EventSystem(this);
		this.synergy = new SynergySystem(this);
		this.eventEnhancer = new EventEnhancer(this);
		// achievements 不重新创建，保持成就数据持久化
		this.upgradeSystem = new UpgradeSystem(this);

		// 每日挑战标记（默认 false，由调用方覆盖）
		this.isDailyChallenge = false;

		// 通关标记
		this.victoryTriggered = false;

		// 无尽模式
		this.endlessMode = false;
		this.endlessWave = 0; // 无尽波数

		// Cryo/Toxic 成就统计
		this.frozenKills = 0;      // 冻结状态下击杀数
		this.poisonKills = 0;      // 中毒状态下击杀数
		this.totalFreezeApplies = 0; // 冻结应用次数
		this.totalPoisonApplies = 0; // 中毒应用次数
		this.defeatedBosses = [];  // 已击败的Boss名称列表

		// 角色属性
		const char = CHARACTERS[charId];
		if (char) {
			this.player.maxHp = char.stats.maxHp;
			this.player.hp = char.stats.maxHp;
			this.player.baseSpeed = char.stats.speed;
			this.player.baseMight = char.stats.might;
			this.player.basePickup = char.stats.pickup;
			char.passiveApply(this.player);
			this.player.weapons.push(new Weapon(this, char.startWeapon));
			this.player.characterId = charId;
			// 设置外观主题
			this.player.setSkinTheme(charId);
		} else {
			this.player.weapons.push(new Weapon(this, 'flux_bolt'));
		}

		// 应用局外成长
		if (this.meta) this.meta.applyToPlayer(this.player);

		// 应用天赋树效果
		if (this.meta) {
			try {
				const { TalentTree } = require('./TalentTree');
				const tt = new TalentTree(this.meta);
				tt.applyToPlayer(this.player);
			} catch (e) {
				console.error('[Game] TalentTree Apply Error:', e);
			}
		}

		// 应用 Build 预设（如果提供）
		if (build) {
			try {
				BuildPreset.applyBuild(build, this.player);
			} catch (e) {
				console.error('[Game] Build Apply Error:', e);
			}
		}

		// 应用诅咒
		this.activeCurses = curses;
		try {
			applyCurses(this, curses);
		} catch (e) { console.error('Curse Apply Error:', e); }

		// Safety Clamps
		this.curseBossInterval = Math.min(this.curseBossInterval, 45); // Limit boss rush to 15s min timer
		this.curseEliteMult = Math.min(this.curseEliteMult, 10); // Limit elite scaling

		// 濒死反击系统
		this._lastStandUsed = false;
		this._lastStandTimer = 0;
		this._lastStandKills = 0;
		this._pendingUpgrades = 0;

		// 宝石连锁收集
		this._gemChainCount = 0;
		this._gemChainTimer = 0;
		this._gemMergeTimer = 0;

		// [BUG-1 FIX] 命运神龛计时器初始化（之前缺失导致 NaN）
		this.destinyShrineTimer = 60 + Math.random() * 60;
		this.destinyShrines = [];

		// [R5-1] critical_mass 递归守卫
		this._critMassActive = false;

		// [BUG-4 FIX] 时间停止计时器初始化
		this._timeStopTimer = 0;

		// [BUG-17 FIX] 迫击炮预警重置（防止上局残留）
		this.mortarWarnings = [];

		// [BUG-18/19 FIX] 暴击连锁 & 无尽计时器重置
		this._critChain = 0;
		this._critChainTimer = 0;
		this._endlessTimer = 0;

		// 精英赏金系统
		this._bountyTimer = 45; // 首次赏金检查
		this._bountyTarget = null;
		this._bountyTimeLeft = 0;

		// 应用 Boss 狂怒诅咒
		if (this.curseBossInterval > 0) {
			this.bossTimer = Math.max(15, this.bossTimer - this.curseBossInterval);
		}

		// Final Safety Check: Sanitize NaN stats
		const statsToSanitize = [
			'bonusMight', 'bonusSpeed', 'bonusCdr', 'bonusArea', 'bonusPickup',
			'bonusProjectile', 'bonusArmor', 'bonusProjSpeed', 'bonusRegen'
		];
		statsToSanitize.forEach(s => {
			if (isNaN(this.player[s])) this.player[s] = 0;
		});

		SFX.initAudio();
		SFX.playBGM('bgm'); // 开始播放背景音乐
		this.isRunning = true;
		this.lastTime = perfNow();
		// 速通模式（由 game.js 在 startWithCharacter 后设置）
		this.isSpeedRunMode = false;
		this.speedRunStartTime = 0;
		this.speedRunCharId = '';
		this.speedRunKills = 0;
		// [R6-2 FIX] 清除跨局幽灵结算计时器
		this._speedRunWinPending = null;

		// 初始化章节系统（Boss Rush 模式下不启用）
		if (!isBossRush) {
			this.stageSystem = new StageSystem(this);
		}

		// 初始化技能系统（在 characterId 设置后）
		if (this.skillSystem) this.skillSystem.init();

		// 绑定技能按钮 touchEnd 回调
		if (this.input && this.skillSystem) {
			this.input._endCallback = (x, y) => {
				if (this.isRunning && !this.isPaused && this.skillSystem) {
					this.skillSystem.onTouchEnd(x, y);
				}
			};
		}

		// 强制清除可能残留的触摸拦截器 (Critical Fix!)
		this.input.clearInterceptor();
	}

	// ─── Boss Rush 模式启动 ───
	startBossRush(charId) {
		// 复用 startWithCharacter 初始化流程（无诅咒、无 Build）
		// 传 isBossRush=true 阻止创建 StageSystem
		this.startWithCharacter(charId, [], null, true);
		// 创建并启动 BossRushMode
		this.bossRushMode = new BossRushMode(this);
		this.bossRushMode.start();
	}

	// ─── 游戏结束 ───

	endGame() {
		// Boss Rush 模式：玩家死亡通知 Boss Rush，不进入普通结算
		if (this.bossRushMode) {
			this.bossRushMode.onPlayerDied();
			return;
		}

		this.isRunning = false;
		SFX.stopBGM();
		SFX.sfxDefeat();
		setKeepScreenOn(false);
		this.autoPlay = false;

		// 记录旧最佳（在 endRun 更新前）
		const prevBestKills = this.meta ? (this.meta.data.bestKills || 0) : 0;
		const prevBestTime = this.meta ? (this.meta.data.bestTime || 0) : 0;

		let earnedChips = 0;
		if (this.meta) {
			// 遗物：贪婪协议 — 芯片掉落×2
			const _greedMult = (this.player.relicFlags && this.player.relicFlags.greedProtocol) ? 2 : 1;
			earnedChips = this.meta.endRun(this.time, this.player.kills, this.player.level, this.curseChipMult * _greedMult);
		}

		const newAchs = this.achievements.getNewAchievements();

		// 每日挑战分数保存
		if (this.isDailyChallenge) {
			saveDailyScore(this.time, this.player.kills, this.player.level);
		}

		// 切换到结算场景
		if (this.sceneManager) {
			this.sceneManager.switchTo('gameOver', {
				victory: false,
				time: this._formatTime(this.time),
				timeSeconds: Math.floor(this.time),
				kills: this.player.kills,
				level: this.player.level,
				chips: earnedChips,
				curseMult: this.curseChipMult,
				newAchievements: newAchs,
				// 新增详细统计
				highestCombo: this.highestCombo || 0,
				totalDamage: this.player.totalDamage || 0,
				totalXp: this.player.totalXp || 0,
				totalHealed: this.player.totalHealed || 0,
				gemsCollected: this.player.totalGemsCollected || 0,
				weapons: this.player.weapons.map(w => ({
					name: (w.def && w.def.name) || w.id,
					level: w.level,
					color: (w.def && w.def.color) || '#fff'
				})),
				// 最佳记录对比
				prevBestKills,
				prevBestTime,
				isNewKillRecord: this.player.kills > prevBestKills,
				isNewTimeRecord: this.time > prevBestTime,
			});
		}
	}

	victoryEnd() {
		this.isRunning = false;
		setKeepScreenOn(false);
		this.autoPlay = false;

		// 记录旧最佳（在 endRun 更新前）
		const prevBestKills = this.meta ? (this.meta.data.bestKills || 0) : 0;
		const prevBestTime = this.meta ? (this.meta.data.bestTime || 0) : 0;

		// 无尽模式有额外的芯片奖励
		const endlessMult = this.endlessMode ? (1 + this.endlessWave * 0.5) : 1;
		const _greedVictory = (this.player.relicFlags && this.player.relicFlags.greedProtocol) ? 2 : 1;
		const victoryMult = this.curseChipMult * 1.5 * endlessMult * _greedVictory;
		let earnedChips = 0;
		if (this.meta) {
			earnedChips = this.meta.endRun(this.time, this.player.kills, this.player.level, victoryMult);
		}

		if (this.isDailyChallenge) {
			saveDailyScore(this.time, this.player.kills, this.player.level);
		}

		if (this.sceneManager) {
			this.sceneManager.switchTo('gameOver', {
				victory: true,
				time: this._formatTime(this.time),
				timeSeconds: Math.floor(this.time),
				kills: this.player.kills,
				level: this.player.level,
				chips: earnedChips,
				curseMult: victoryMult,
				newAchievements: this.achievements.getNewAchievements(),
				endlessMode: this.endlessMode,
				endlessWave: this.endlessWave,
				// 新增详细统计
				highestCombo: this.highestCombo || 0,
				totalDamage: this.player.totalDamage || 0,
				totalXp: this.player.totalXp || 0,
				totalHealed: this.player.totalHealed || 0,
				gemsCollected: this.player.totalGemsCollected || 0,
				weapons: this.player.weapons.map(w => ({
					name: (w.def && w.def.name) || w.id,
					level: w.level,
					color: (w.def && w.def.color) || '#fff'
				})),
				// 最佳记录对比
				prevBestKills,
				prevBestTime,
				isNewKillRecord: this.player.kills > prevBestKills,
				isNewTimeRecord: this.time > prevBestTime,
			});
		}
	}

	// ─── 无尽模式 ───

	enterEndlessMode() {
		// 进入无尽模式
		this.endlessMode = true;
		this.endlessWave = 1;
		this.victoryTriggered = false; // 重置以便继续游戏
		this.isRunning = true;
		this.stageSystem = null; // 章节系统已完成，不再控制地图风格

		// 难度倍率由刷怪循环自动基于 endlessWave 计算

		// 视觉提示
		this.spawnDamageNumber(this.player.x, this.player.y - 60, '无尽模式! 每5波升级+芯片奖励', '#ff00ff');
		this.triggerScreenPulse('#ff00ff', 1.0);
		this.shakeAmount = 8;
		this.shakeDuration = 0.5;

		// 继续场景
		if (this.sceneManager) {
			this.sceneManager.switchTo('playing');
		}
	}

	// ─── 升级弹窗 ───

	showUpgradeScreen() {
		// Boss Rush 模式下禁止普通升级面板（波间有专属奖励）
		if (this.bossRushMode) return;

		// 如果已经在升级界面中（isRunning=false），排队等待
		if (!this.isRunning) {
			this._pendingUpgrades = (this._pendingUpgrades || 0) + 1;
			return;
		}
		this.isRunning = false;
		vibrate('medium');
		const { options, previews } = this.upgradeSystem.generateOptions();

		// 自动升级：智能决策（进化>护命>遗物>协同>升级已有武器>升级已有被动>稀有度>随机）
		if (this.autoUpgrade && options && options.length > 0) {
			let pick = null;
			const hpRatio = this.player.hp / this.player.maxHp;

			// 优先级1：进化选项必选，收益最大
			pick = pick || options.find(o => o.type === 'evolve');
			
			// 优先级2：濒死护命，血量<35% 优先紧急治疗
			if (!pick && hpRatio < 0.35) {
				pick = options.find(o => o.type === 'heal');
			}
			
			// 优先级3：遗物是极其稀有的全局乘区加成，必选
			if (!pick) pick = options.find(o => o.type === 'relic');
			
			// 优先级4：有协同标签的选项（进化就绪/解锁进化），有极高收益
			if (!pick) pick = options.find(o => o.synergy);
			
			// 优先级5：优先升级现有武器（宁可一招鲜吃遍天，避免拿一堆 1 级武器刮痧）
			if (!pick) pick = options.find(o => o.type === 'weapon_up');
			
			// 优先级6：优先升级现有的被动
			if (!pick) pick = options.find(o => o.type === 'passive' && this.player.passives.some(p => p.id === o.id));

			// 优先级7：既然只能选新的了，那就优先拿高稀有度的“好货”
			if (!pick) {
				pick = options.find(o => o.rarity === 'legendary' || o.rarity === 'epic' || o.rarity === 'rare');
			}
			
			// 优先级8：保底随机
			if (!pick) pick = options[Math.floor(Math.random() * options.length)];

			this.upgradeSystem.applyOption(pick);
			// 显示选择了什么
			this.spawnDamageNumber(this.player.x, this.player.y - 60, '⚡ ' + pick.name, pick.color || '#ffcc00', false);
			this.spawnDamageNumber(this.player.x, this.player.y - 40, pick.desc, '#aaaaaa', false);
			this._closeUpgrade();
			return;
		}

		if (this.sceneManager) {
			const us = this.upgradeSystem;
			this.sceneManager.switchTo('upgrade', {
				options,
				previews,
				rerollCount: us.rerollCount,
				skipCount: us.skipCount,
				banishCount: us.banishCount,
				game: this, // 传递 game 引用
			});
		}
	}

	_closeUpgrade() {
		this.isRunning = true;
		this.spawnTimer = Math.max(this.spawnTimer, 0.35); // 升级后平滑衔接刷怪
		this.lastTime = null; // Let mainLoop resync with rAF timestamp
		try {
			this.synergy.check();
		} catch (e) {
			console.error('Synergy Check Error:', e);
		}
		// 检查是否有排队的升级（多次连升或宝箱触发的升级）
		if (this._pendingUpgrades > 0) {
			this._pendingUpgrades--;
			this.showUpgradeScreen();
			return; // 不切回 playing，继续显示下一个升级界面
		}
		if (this.sceneManager) {
			this.sceneManager.switchTo('playing');
		}
	}

	// 注: loop() 方法已由入口 game.js 的 mainLoop 统一管理

	update(dt) {
		// [R6-2 FIX] 速通模式延迟结算计时器（替代原生 setTimeout）
		if (this._speedRunWinPending) {
			this._speedRunWinPending.timer -= dt;
			if (this._speedRunWinPending.timer <= 0) {
				const pending = this._speedRunWinPending;
				this._speedRunWinPending = null;
				this.isRunning = false;
				SFX.stopBGM();
				let earnedChips = 0;
				if (this.meta) {
					const _greedMult = (this.player.relicFlags && this.player.relicFlags.greedProtocol) ? 2 : 1;
					earnedChips = this.meta.endRun(this.time, this.player.kills, this.player.level, this.curseChipMult * _greedMult);
				}
				const { formatTime } = require('./scenes/SpeedRunScene');
				if (this.sceneManager) this.sceneManager.switchTo('gameOver', {
					victory: true,
					time: '速通 ' + formatTime(pending.elapsedMs),
					timeSeconds: Math.floor(this.time),
					kills: this.player.kills,
					level: this.player.level,
					chips: earnedChips,
					curseMult: this.curseChipMult || 1,
					newAchievements: this.achievements ? this.achievements.getNewAchievements() : [],
					highestCombo: this.highestCombo || 0,
					totalDamage: this.player.totalDamage || 0,
					weapons: this.player.weapons.map(w => ({
						name: (w.def && w.def.name) || w.id,
						level: w.level,
						color: (w.def && w.def.color) || '#fff'
					})),
				});
				return;
			}
		}

		// Safety Valve: 游戏运行中不应有输入拦截器（防止升级界面卡死）
		if (this.isRunning && this.input.hasInterceptor) {
			this.input.clearInterceptor();
		}

		// ─── Boss Rush 模式更新 ───
		if (this.bossRushMode) {
			this.bossRushMode.update(dt);
		}

		// ─── 章节系统更新 ───
		if (this.stageSystem) {
			this.stageSystem.update(dt);
		}

		// ─── 地图交互元素更新 ───


		// ─── 技能系统更新 ───
		if (this.skillSystem) {
			this.skillSystem.update(dt);
		}

		// ─── 时间停止效果（时空术士技能）───
		if (this._timeStopTimer > 0) {
			this._timeStopTimer -= dt;
		}

		// ─── 命中停顿处理 ───
		if (this.hitPause > 0) {
			this.hitPause -= dt;
			return; // 跳过更新，产生冻结效果
		}

		// ─── Boss 入场减速 ───
		if (this._bossEntrance && this._bossEntrance.timer > 0) {
			this._bossEntrance.timer -= dt;
			// 前 0.8 秒：时间减速到 0.3x
			if (this._bossEntrance.timer > 0.7) {
				dt *= 0.3;
			}
		}

		// ─── 性能监控与自动降质 ───
		if (this.autoQuality) {
			// 环形缓冲写入，O(1) 替换旧值
			this._ftSum -= this._ftBuf[this._ftIdx];
			this._ftBuf[this._ftIdx] = dt;
			this._ftSum += dt;
			this._ftIdx = (this._ftIdx + 1) % 60;
			if (this._ftCount < 60) this._ftCount++;
			if (this._ftCount >= 60) {
				const avgDt = this._ftSum / 60;
				// 如果平均帧时间超过33ms (低于30fps)，降低画质
				if (avgDt > 0.033) {
					this.qualityLevel = Math.max(0, this.qualityLevel - 0.1);
				} else if (avgDt < 0.020) {
					// 如果平均帧时间低于20ms (高于50fps)，提高画质
					this.qualityLevel = Math.min(1, this.qualityLevel + 0.05);
				}
			}
		}

		// ─── 暂停 & 输入逻辑 ───
		const input = this.input;

		// 检测新的点击 (Rising Edge)
		if (input.active && !this.lastTouchState) {
			const tx = input.origin.x;
			const ty = input.origin.y;
			if (this._handleTouchInput(tx, ty, input)) return;
		}
		this.lastTouchState = input.active;

		if (this.isPaused) return;

		// 构建空间网格（必须在 player.update 之前，否则武器的火池/酸池无法查询敌人）
		this._buildEnemyGrid();

		// ─── 自动玩：AI 走位 ───
		if (this.autoPlay && this.isRunning) {
			this._updateAutoPlayAI(dt);
			// 自动释放技能（冷却好了就放）
			if (this.skillSystem && this.skillSystem.cooldown <= 0) {
				this.skillSystem.tryUse();
			}
		}

		this.player.update(dt);

		// 诅咒: 生命衰减
		if (this.curseHealthDecay && this.player.hp > 1) {
			this.player.hp = Math.max(1, this.player.hp - this.curseHealthDecay * dt);
		}

		// 相机跟随
		this.camera.x = this.player.x - this.width / 2;
		this.camera.y = this.player.y - this.height / 2;


		// 生成普通敌人（Boss Rush 模式下跳过，只有 Boss）
		if (!this.bossRushMode) {
			this.spawnTimer -= dt;
			if (this.spawnTimer <= 0) {
				// 性能保护：限制最大敌人数量
				if (this.enemies.length >= 250) {
					this.spawnTimer = 0.15;
				} else {

					// ─── Dynamic Difficulty Curve ───
					const tMinutes = this.time / 60;

					// 生成间隔：0分=0.6s → 15分=0.12s（下限），逼迫持续输出
					let nextInterval = Math.max(0.12, 0.6 - tMinutes * 0.032);
					if (this.endlessMode) nextInterval = Math.max(0.08, nextInterval * 0.6);

					// 批量大小：0分=4 → 10分=14 → 15分=20（斜率1.0，减少密度）
					let batchSize = Math.min(20, 4 + Math.floor(tMinutes * 1.0));
					if (this.endlessMode) batchSize = Math.min(28, batchSize + 6);

					// 事件加成（血月等）
					const eventSpawnMult = this.eventEnhancer.getSpawnMultiplier();
					batchSize = Math.floor(batchSize * eventSpawnMult);

					// 虫群涌现事件：临时刷怪倍率
					if (this._densitySurge) {
						batchSize = Math.min(30, Math.floor(batchSize * this._densitySurge.spawnMult));
						nextInterval = Math.max(0.1, nextInterval * 0.6);
					}

					// 属性倍率 — 提升前期与后期压力
					// HP: 20分钟=25倍 (提高后期血量)
					// 伤害: 20分钟=12倍 (小幅增加后期伤害)
					let hpMult, dmgMult;
					if (this.endlessMode) {
						hpMult = 25 * Math.pow(1.35, this.endlessWave);
						dmgMult = 12 * Math.pow(1.2, this.endlessWave);
					} else {
						hpMult = Math.pow(25, tMinutes / 20);
						dmgMult = Math.pow(12, tMinutes / 20);
					}

					for (let i = 0; i < batchSize; i++) {
						const spread = i * 30;
						this._spawnEnemy(hpMult, dmgMult, spread);
					}

					this.spawnTimer = nextInterval / (this.curseSpawnRateMult || 1);
				}
			}
		} // end if (!this.bossRushMode) — 普通敌人生成
		if (this.endlessMode) this._updateEndlessMode(dt);

		// Boss 计时（Boss Rush 模式由 BossRushMode 自行管理，跳过普通 Boss 生成）
		if (!this.bossRushMode) this._updateBossSpawner(dt);

		// 地图元素生成（Boss Rush 模式下跳过，避免宝箱/商人干扰波次流程）
		if (!this.bossRushMode) {
			this.mapElementTimer -= dt;
			if (this.mapElementTimer <= 0) {
				this.mapElementTimer = 30 + Math.random() * 20; // 30-50秒
				this._spawnMapElement();
			}
		}

		// 更新实体
		for (const b of this.bullets) b.update(dt);

		// 敌人更新：远处敌人降频更新（不移除，保持割草体验）
		const playerX = this.player.x;
		const playerY = this.player.y;
		const nearDistSq = 780 * 780; // 覆盖桌面端全屏视口，保证屏内怪物全速行动
		const farDistSq = 1200 * 1200; // 超远距离阈值
		// 时间停止技能：敌人不移动
		const enemyDt = (this._timeStopTimer > 0) ? 0 : dt;

		for (const e of this.enemies) {
			if (!e.active) continue;
			const dx = e.x - playerX;
			const dy = e.y - playerY;
			const distSq = dx * dx + dy * dy;

			if (distSq < nearDistSq) {
				e.update(enemyDt); // 近处正常更新
			} else if (distSq < farDistSq) {
				// 中距敌人：降频更新
				e._simpleUpdate ? e._simpleUpdate(enemyDt) : e.update(enemyDt * 0.5);
			} else {
				// 超远敌人（>800px）：仅做位移追踪，跳过所有AI/行为/粒子
				// 八角形距离近似替代 Math.sqrt（误差 <12%，LOD 模式可接受）
				const absX = dx < 0 ? -dx : dx, absY = dy < 0 ? -dy : dy;
				const approxD = absX > absY ? absX + absY * 0.5 : absY + absX * 0.5;
				if (approxD < 1) continue; // 防止除零：敌人与玩家重合时跳过
				const invD = 1 / approxD;
				// [BUG-6 FIX] dx 指向远离玩家方向，应减去（原来加号导致敌人远离玩家）
				e.x -= dx * invD * e.speed * enemyDt * 0.5;
				e.y -= dy * invD * e.speed * enemyDt * 0.5;
			}
		}

		// ─── 敌人防重叠挤压（防止数十只怪叠在同一个像素点上像只有一只怪）───
		if (enemyDt > 0) {
			const len = this.enemies.length;
			for (let i = 0; i < len; i++) {
				const e1 = this.enemies[i];
				if (!e1.active) continue;
				const r1 = e1.radius || 10;
				for (let j = i + 1; j < len; j++) {
					const e2 = this.enemies[j];
					if (!e2.active) continue;
					const minDist = (r1 + (e2.radius || 10)) * 0.85;
					const sdx = e2.x - e1.x;
					if (sdx > minDist || sdx < -minDist) continue;
					const sdy = e2.y - e1.y;
					if (sdy > minDist || sdy < -minDist) continue;
					const dSq = sdx * sdx + sdy * sdy;
					if (dSq < minDist * minDist) {
						if (dSq > 0.001) {
							const d = Math.sqrt(dSq);
							const overlap = (minDist - d) * 0.35;
							const nx = (sdx / d) * overlap;
							const ny = (sdy / d) * overlap;
							e1.x -= nx;
							e1.y -= ny;
							e2.x += nx;
							e2.y += ny;
						} else {
							const a = ((i * 7 + j * 13) % 16) * (Math.PI / 8);
							e1.x -= fastCos(a) * 2;
							e1.y -= fastSin(a) * 2;
							e2.x += fastCos(a) * 2;
							e2.y += fastSin(a) * 2;
						}
					}
				}
			}
		}

		for (const g of this.gems) g.update(dt);
		for (const p of this.pickups) p.update(dt);
		for (const boss of this.bosses) boss.update(dt);

		// Boss 弹幕
		for (const eb of this.enemyBullets) {
			eb.x += eb.vx * dt;
			eb.y += eb.vy * dt;
			eb.lifetime -= dt;
			if (eb.lifetime <= 0) eb.active = false;
		}

		// 迫击炮预警更新
		if (this.mortarWarnings) {
			for (const mw of this.mortarWarnings) {
				if (!mw.active) continue;
				mw.timer -= dt;
				if (mw.timer <= 0) {
					// 爆炸！检测玩家是否在范围内
					const dx = this.player.x - mw.x;
					const dy = this.player.y - mw.y;
					if (dx * dx + dy * dy < mw.radius * mw.radius) {
						this.player.takeDamage(mw.damage);
					}
					// 爆炸视觉
					if (this.particles) {
						this.particles.emit(mw.x, mw.y, { count: 20, speed: 80, life: 0.4, color: '#ff8844', size: 4 });
					}
					mw.active = false;
				}
			}
			// 就地压缩 mortarWarnings
			let mwW = 0;
			for (let i = 0; i < this.mortarWarnings.length; i++) {
				if (this.mortarWarnings[i].active) this.mortarWarnings[mwW++] = this.mortarWarnings[i];
			}
			this.mortarWarnings.length = mwW;
		}

		// 碰撞检测
		this._checkCollisions(dt);

		// 事件系统更新
		this.eventSystem.update(dt);

		// 粒子系统
		this.particles.update(dt);

		// 清理死亡实体 (GC Optimized)
		this._compactBullets(); // 玩家子弹：归还对象池
		this._compactEnemies(); // 敌人专用：归还对象池
		this._compactList(this.pickups);
		this._compactList(this.bosses);
		this._compactList(this.enemyBullets); // enemyBullets 有自己的逻辑回收或者直接保留

		// ═══ 传送回收：每0.5秒将远距离敌人传送到刷怪环 ═══
		this._recycleTimer += dt;
		if (this._recycleTimer >= 0.5) {
			this._recycleTimer = 0;
			this._recycleDistantEnemies();
		}

		// 性能保护：限制子弹数量上限（直接截断，释放到对象池）
		if (this.bullets.length > 100) {
			// 快速淘汰：标记离玩家最远的子弹失活
			const px = this.player.x, py = this.player.y;
			const excess = this.bullets.length - 100;
			let maxDistSq = 0;
			for (let i = 0; i < this.bullets.length; i++) {
				const b = this.bullets[i];
				b._distSq = (b.x - px) * (b.x - px) + (b.y - py) * (b.y - py);
				if (b._distSq > maxDistSq) maxDistSq = b._distSq;
			}
			const threshold = maxDistSq * 0.5;
			let removed = 0;
			// 第一轮淘汰超远的子弹
			for (let i = this.bullets.length - 1; i >= 0 && removed < excess; i--) {
				if (this.bullets[i]._distSq > threshold && this.bullets[i].active) {
					this.bullets[i].active = false;
					removed++;
				}
			}
			// 如果没淘汰够，强制把最尾部的直接归还对象池
			if (removed < excess) {
				const toRemoveRaw = excess - removed;
				for (let i = 0; i < toRemoveRaw; i++) {
					const b = this.bullets.pop();
					if (b) {
						b.active = false;
						this.bulletPool.release(b);
					}
				}
			}
		}

		// 经验球优化：更积极地合并
		this._gemMergeTimer = (this._gemMergeTimer || 0) + dt;
		if (this._gemMergeTimer > 0.5 && this.gems.length > 50) {
			this._gemMergeTimer = 0;
			this._optimizeGems();
		}
		this._compactList(this.gems);

		// 伤害数字 (Has different property 'a') - 上限30
		if (this.damageNumbers.length > 30) {
			// 超出上限时加速淡出旧数字
			for (let i = 0; i < this.damageNumbers.length - 30; i++) {
				this.damageNumbers[i].a -= 5 * dt;
			}
		}
		let dnIdx = 0;
		for (let i = 0; i < this.damageNumbers.length; i++) {
			const d = this.damageNumbers[i];
			// 使用自定义上浮速度或默认
			d.y -= (d.vy || 40) * dt;
			d.a -= 1.5 * dt;
			// 缩放动画：从初始scale缓慢缩小
			if (d.scale && d.scale > 1) {
				d.scale -= 0.5 * dt;
			}
			// 弹跳动画
			if (d.bouncePhase >= 0 && d.bouncePhase < 1) {
				d.bouncePhase += dt * 3;
			}
			if (d.a > 0) {
				this.damageNumbers[dnIdx++] = d;
			}
		}
		this.damageNumbers.length = dnIdx;

		// 命运神龛
		let dsIdx = 0;
		for (let i = 0; i < this.destinyShrines.length; i++) {
			const s = this.destinyShrines[i];
			if (s.active) {
				s.update(dt);
				if (s.active) this.destinyShrines[dsIdx++] = s;
			}
		}
		this.destinyShrines.length = dsIdx;
		this._updateDestinyShrinesSpawn(dt);

		// 辐射场
		if (this.radiationPulse) {
			this.radiationPulse.a -= 2 * dt;
			if (this.radiationPulse.a <= 0) this.radiationPulse = null;
		}

		// 震屏
		if (this.shakeDuration > 0) {
			this.shakeDuration -= dt;
			if (this.shakeDuration <= 0) this.shakeAmount = 0;
		}

		// 连杀
		if (this.comboTimer > 0) {
			this.comboTimer -= dt;
			if (this.comboTimer <= 0) {
				// 连杀断裂：显示最终连杀数
				if (this.killCombo >= 10) {
					this._comboBreakDisplay = { count: this.killCombo, timer: 1.5 };
				}
				this.killCombo = 0;
				this.lastComboReward = 0;
			}
		}

		// 连杀临时 Buff 衰减
		this._updateComboBuffs(dt);

		// 玩家无敌状态
		if (this.playerInvincible > 0) {
			this.playerInvincible -= dt;
		}

		// 濒死反击计时
		if (this._lastStandTimer > 0) {
			this._lastStandTimer -= dt;
			if (this._lastStandTimer <= 0) {
				// 恢复加成
				this.player.bonusMight -= 0.5;
				// 击杀 10+ 奖励 +20% maxHP
				if (this._lastStandKills >= 10) {
					const bonus = Math.floor(this.player.maxHp * 0.2);
					this.player.maxHp += bonus;
					this.player.hp = Math.min(this.player.maxHp, this.player.hp + bonus);
					this.spawnDamageNumber(this.player.x, this.player.y - 50, '+' + bonus + ' HP!', '#44ff88', false);
				}
			}
		}

		// 暴击连锁计时器递减
		if (this._critChainTimer > 0) {
			this._critChainTimer -= dt;
			if (this._critChainTimer <= 0) this._critChain = 0;
		}

		// 遗物每帧 tick（regenDrone / shieldGen / timeShard）
		this._updateRelicEffects(dt);

		// 障碍物系统 — 回收远距离障碍物


		// 协同系统（暂无每帧更新需求）

		// 宝石连锁收集计时
		if (this._gemChainTimer > 0) {
			this._gemChainTimer -= dt;
			if (this._gemChainTimer <= 0) {
				this._gemChainCount = 0;
			}
		}

		// 精英赏金系统
		this._updateBounty(dt);

		// 成就检测
		this.achievements.check(this, dt);

		// 高潮事件系统
		this.eventEnhancer.update(dt);

		// 通关检测（无尽/章节/Boss Rush 模式不触发）
		const targetTime = this.curseLimitedTime || 1200;
		if (this.time >= targetTime && !this.victoryTriggered && !this.endlessMode && !this.bossRushMode
			&& (this.curseLimitedTime || !this.stageSystem)) {
			this.victoryTriggered = true;
			this.victoryEnd();
		}
	}

	// ─── 无尽模式波次推进（从 update() 提取）───
	_updateEndlessMode(dt) {
		this._endlessTimer = (this._endlessTimer || 0) + dt;
		if (this._endlessTimer < 60) return;
		this._endlessTimer = 0;
		this.endlessWave++;
		if (this.endlessWave % 5 === 0) {
			const milestone = this.endlessWave;
			const chipBonus = milestone * 10;
			if (this.meta) this.meta.addChips(chipBonus);
			this.spawnDamageNumber(this.player.x, this.player.y - 100, `第 ${milestone} 波！+${chipBonus} 💾`, '#ffcc00');
			this.triggerScreenPulse('#ffcc0033', 0.8);
			this.shakeAmount = 6;
			this.shakeDuration = 0.4;
			this.showUpgradeScreen();
		} else {
			this.spawnDamageNumber(this.player.x, this.player.y - 80, `无尽 · 第 ${this.endlessWave} 波`, '#ff00ff');
			this.shakeAmount = 4;
			this.shakeDuration = 0.1;
		}
	}

	// ─── 命运神龛生成逻辑 ───
	_updateDestinyShrinesSpawn(dt) {
		this.destinyShrineTimer -= dt;
		if (this.destinyShrineTimer <= 0) {
			// 每 60~120 秒生成一个神龛
			this.destinyShrineTimer = 60 + Math.random() * 60;
			// 只有场上不超过 1 个神龛时才生成
			if (this.destinyShrines.length < 1) {
				const angle = Math.random() * Math.PI * 2;
				const dist = 500 + Math.random() * 500; // 离玩家有一定距离
				const sx = this.player.x + fastCos(angle) * dist;
				const sy = this.player.y + fastSin(angle) * dist;
				this.destinyShrines.push(new DestinyShrine(this, sx, sy));

				// 给玩家一个文字提示或屏幕边缘指示
				this.spawnDamageNumber(this.player.x, this.player.y - 60, '✨ 命运神龛降临...', '#ffcc00', false);
			}
		}
	}

	// ─── 普通模式 Boss 生成计时（从 update() 提取）───
	_updateBossSpawner(dt) {
		this.bossTimer -= dt;
		if (this.bossTimer > 0) return;
		// 场上Boss数量限制：普通1个，双Boss诅咒允许2个
		const maxBosses = this.curseDoubleBoss ? 2 : 1;
		// [BUG-7 FIX] 避免 filter() 创建临时数组，改用 for 循环计数
		let aliveBosses = 0;
		for (let i = 0; i < this.bosses.length; i++) { if (this.bosses[i].active) aliveBosses++; }
		if (aliveBosses >= maxBosses) {
			this.bossTimer = 20; // 已有Boss存活，延迟20秒再检查
			return;
		}
		this.bossWave++;
		const boss = new Boss(this, this.bossWave);
		const tMins = this.time / 60;
		boss.maxHp = Math.ceil(boss.maxHp * Math.pow(20, tMins / 20));  // 降低Boss血量倍率
		boss.hp = boss.maxHp;
		boss.damage = Math.round(boss.damage * Math.pow(10, tMins / 20));  // 提高Boss伤害
		this.bosses.push(boss);
		// 诅咒：双Boss
		if (this.curseDoubleBoss) {
			const boss2 = new Boss(this, this.bossWave);
			boss2.maxHp = boss.maxHp;
			boss2.hp = boss2.maxHp;
			boss2.damage = boss.damage;
			boss2.x = this.player.x + (Math.random() > 0.5 ? 380 : -380);
			boss2.y = this.player.y + (Math.random() > 0.5 ? 380 : -380);
			this.bosses.push(boss2);
		}
		vibrate('heavy');
		this._bossEntrance = { timer: 1.5, phase: 0, name: boss.name, color: boss.color, slowActive: false };
		this.bossTimer = Math.max(15, 75 - this.curseBossInterval);
		this.shakeAmount = 8;
		this.shakeDuration = 0.5;
		this.spawnDamageNumber(this.player.x, this.player.y - 60, '⚠ BOSS!', '#ff0055');
		SFX.sfxBossAppear();
	}

	// ─── 自动玩 AI 走位逻辑 ───
	// 优先级：逃离最近的敌人群 > 朝最近的经验球移动
	_updateAutoPlayAI(dt) {
		const p = this.player;
		const input = this.input;

		// 如果用户正在手动操作（触摸），不覆盖输入
		if (input.active) {
			this._aiTimer = 0;
			this._aiVector = null;
			return;
		}

		// 每0.12秒重新计算一次目标向量（比原来0.15更灵敏）
		this._aiTimer = (this._aiTimer || 0) - dt;
		if (this._aiTimer > 0) {
			input.vector = this._aiVector || { x: 0, y: 0 };
			return;
		}
		this._aiTimer = 0.12;

		const hpRatio = p.hp / p.maxHp;
		let forceX = 0, forceY = 0;
		let dangerCount = 0;

		// ═══ 层1: 敌人避让 (动态半径) ═══
		// 血量越低，回避半径越大（低血量时更怂）
		const avoidR = 140 + (1 - hpRatio) * 120; // 180~260
		const avoidRSq = avoidR * avoidR;

		for (const e of this.enemies) {
			if (!e.active) continue;
			const dx = p.x - e.x, dy = p.y - e.y;
			const dSq = dx * dx + dy * dy;
			if (dSq < avoidRSq && dSq > 0) {
				const d = Math.sqrt(dSq);
				// 精英/Boss型敌人排斥力加倍
				const weight = (e.isElite || e.isBoss) ? 8.0 : 5.0;
				const pushForce = Math.pow((avoidR - d) / avoidR, 2) * weight;
				forceX += (dx / d) * pushForce;
				forceY += (dy / d) * pushForce;
				dangerCount++;
			}
		}

		// ═══ 层2: Boss 预警躲避 (telegraph dodging) ═══
		for (const boss of this.bosses) {
			if (!boss.active || !boss.telegraph) continue;
			const tg = boss.telegraph;
			if (!tg.timer || tg.timer <= 0 || tg.type === 'none') continue;

			const tdx = p.x - boss.x, tdy = p.y - boss.y;
			const td = Math.sqrt(tdx * tdx + tdy * tdy);
			if (td <= 0) continue;

			if (tg.type === 'line' || tg.type === 'beam' || tg.type === 'laser') {
				// 射线型预警：计算玩家到射线的垂直距离，往垂直方向逃
				const beamAngle = tg.angle || 0;
				const bcos = fastCos(beamAngle), bsin = fastSin(beamAngle);
				// 玩家相对Boss的位置在射线法线方向的投影
				const cross = tdx * bsin - tdy * bcos; // 正=左侧, 负=右侧
				const dot = tdx * bcos + tdy * bsin;   // 正=前方
				const beamWidth = (tg.width || 60) * 1.5; // 安全边距

				if (Math.abs(cross) < beamWidth && dot > -50) {
					// 在射线范围内！往垂直方向逃（取最近的安全方向）
					const escDir = cross >= 0 ? 1 : -1;
					forceX += bsin * escDir * 15.0;
					forceY += -bcos * escDir * 15.0;
				}
			} else if (tg.type === 'circle' || tg.type === 'aoe' || tg.type === 'fullscreen') {
				// 圆形AOE预警：远离中心
				const aoeR = tg.radius || 200;
				if (td < aoeR * 1.3) {
					const escForce = 12.0 * (1 - td / (aoeR * 1.5));
					forceX += (tdx / td) * escForce;
					forceY += (tdy / td) * escForce;
				}
			} else if (tg.type === 'cone') {
				// 扇形预警：同射线处理
				const cAngle = tg.angle || 0;
				const ccos = fastCos(cAngle), csin = fastSin(cAngle);
				const cross = tdx * csin - tdy * ccos;
				const dot = tdx * ccos + tdy * csin;
				if (dot > -50 && Math.abs(cross) < (tg.width || 100)) {
					const escDir = cross >= 0 ? 1 : -1;
					forceX += csin * escDir * 12.0;
					forceY += -ccos * escDir * 12.0;
				}
			}
		}

		// ═══ 层3: 敌弹躲避 ═══
		const bulletAvoidR = 100;
		const bulletAvoidRSq = bulletAvoidR * bulletAvoidR;
		for (const eb of this.enemyBullets) {
			if (!eb.active) continue;
			const dx = p.x - eb.x, dy = p.y - eb.y;
			const dSq = dx * dx + dy * dy;
			if (dSq < bulletAvoidRSq && dSq > 0) {
				const d = Math.sqrt(dSq);
				// 判断子弹是否朝我飞来（点积检测）
				const bvx = eb.vx || 0, bvy = eb.vy || 0;
				const dot = dx * bvx + dy * bvy;
				if (dot < 0) { // 子弹朝我方向运动
					const pushForce = Math.pow((bulletAvoidR - d) / bulletAvoidR, 2) * 10.0;
					// 往子弹飞行方向的垂直方向闪避
					const cross = dx * bvy - dy * bvx;
					const escDir = cross >= 0 ? 1 : -1;
					const bMag = Math.sqrt(bvx * bvx + bvy * bvy) || 1;
					forceX += (bvy / bMag) * escDir * pushForce;
					forceY += (-bvx / bMag) * escDir * pushForce;
				}
			}
		}

		// ═══ 层4: Boss 追踪 + 环绕走位 ═══
		let nearestBoss = null, nearestBossDSq = Infinity;
		for (const boss of this.bosses) {
			if (!boss.active) continue;
			const dx = boss.x - p.x, dy = boss.y - p.y;
			const dSq = dx * dx + dy * dy;
			if (dSq < nearestBossDSq) {
				nearestBoss = boss;
				nearestBossDSq = dSq;
			}
		}
		if (nearestBoss) {
			const dx = nearestBoss.x - p.x, dy = nearestBoss.y - p.y;
			const d = Math.sqrt(nearestBossDSq);
			const idealDist = 160;

			if (dangerCount > 10) {
				// 被大量小怪包围→优先逃离
				const pushForce = Math.pow((200 - Math.min(d, 200)) / 200, 2) * 10.0;
				forceX -= (dx / d) * pushForce;
				forceY -= (dy / d) * pushForce;
			} else if (d > idealDist + 80) {
				// 太远→靠近
				forceX += (dx / d) * 5.0;
				forceY += (dy / d) * 5.0;
			} else if (d < idealDist - 60) {
				// 太近→后退
				forceX -= (dx / d) * 4.0;
				forceY -= (dy / d) * 4.0;
			} else {
				// 理想距离→环绕走位（绕Boss画圈，持续输出同时不容易被打中）
				if (!this._aiOrbitDir) this._aiOrbitDir = Math.random() > 0.5 ? 1 : -1;
				// 每10秒随机换向
				this._aiOrbitFlip = (this._aiOrbitFlip || 0) + dt;
				if (this._aiOrbitFlip > 10) { this._aiOrbitDir *= -1; this._aiOrbitFlip = 0; }
				// 切线方向（垂直于Boss→Player连线）
				const tangentX = -dy / d * this._aiOrbitDir;
				const tangentY = dx / d * this._aiOrbitDir;
				forceX += tangentX * 4.0;
				forceY += tangentY * 4.0;
			}
		}

		// ═══ 层5: 地图边缘回避 ═══
		if (this.stageSystem) {
			const bounds = this.stageSystem.getBounds ? this.stageSystem.getBounds() : { minX: -2000, maxX: 2000, minY: -2000, maxY: 2000 };
			const edgeBuffer = 200;
			if (p.x < bounds.minX + edgeBuffer) forceX += 5.0 * (1 - (p.x - bounds.minX) / edgeBuffer);
			if (p.x > bounds.maxX - edgeBuffer) forceX -= 5.0 * (1 - (bounds.maxX - p.x) / edgeBuffer);
			if (p.y < bounds.minY + edgeBuffer) forceY += 5.0 * (1 - (p.y - bounds.minY) / edgeBuffer);
			if (p.y > bounds.maxY - edgeBuffer) forceY -= 5.0 * (1 - (bounds.maxY - p.y) / edgeBuffer);
		}

		// ═══ 层6: 拾取物吸引 (血包优先) ═══
		let pickupX = 0, pickupY = 0;
		if (this.pickups && dangerCount < 12) {
			let bestPickScore = -Infinity;
			for (const pk of this.pickups) {
				if (!pk.active) continue;
				const dx = pk.x - p.x, dy = pk.y - p.y;
				const d = Math.sqrt(dx * dx + dy * dy);
				if (d <= 0 || d > 600) continue;

				let score = 100 / d; // 基础：距离越近分越高
				// 血包权重极高（低血量时优先捡）
				if (pk.type === 'heal' || pk.type === 'food' || pk.type === 'heart') {
					score *= (hpRatio < 0.5) ? 20 : 5;
				} else if (pk.type === 'magnet' || pk.type === 'xp_magnet') {
					score *= 8; // 磁铁也很值钱
				} else if (pk.type === 'chest' || pk.type === 'treasure') {
					score *= 10;
				} else {
					score *= 3;
				}
				if (score > bestPickScore) {
					bestPickScore = score;
					pickupX = (dx / d) * 4.0;
					pickupY = (dy / d) * 4.0;
				}
			}
		}

		// ═══ 层7: 经验球吸引 ═══
		let pullX = 0, pullY = 0;
		if (dangerCount < 8) {
			let bestScore = -Infinity, gx = 0, gy = 0;
			// 找最多经验球聚集的方向（群策略）
			let clusterX = 0, clusterY = 0, clusterCount = 0;
			for (const g of this.gems) {
				if (!g.active) continue;
				const dx = g.x - p.x, dy = g.y - p.y;
				const dSq = dx * dx + dy * dy;
				const d = Math.sqrt(dSq);
				if (d > 0 && d < 500) {
					const score = (g.value * 100) / d;
					clusterX += dx / d * g.value;
					clusterY += dy / d * g.value;
					clusterCount++;
					if (score > bestScore) {
						bestScore = score;
						gx = dx; gy = dy;
					}
				}
			}
			if (clusterCount > 5) {
				// 经验球多时，朝群聚方向走（一次捡更多）
				const cm = Math.sqrt(clusterX * clusterX + clusterY * clusterY);
				if (cm > 0) {
					pullX = (clusterX / cm) * 3.0;
					pullY = (clusterY / cm) * 3.0;
				}
			} else if (bestScore > -Infinity) {
				const d = Math.sqrt(gx * gx + gy * gy);
				pullX = (gx / d) * 2.5;
				pullY = (gy / d) * 2.5;
			}
		}

		// ═══ 层8: 游荡 ═══
		let vx = 0, vy = 0;
		const totalForceX = forceX + pullX + pickupX;
		const totalForceY = forceY + pullY + pickupY;

		if (totalForceX === 0 && totalForceY === 0) {
			if (!this._aiWanderAngle) this._aiWanderAngle = Math.random() * Math.PI * 2;
			this._aiWanderAngle += (Math.random() - 0.5) * 1.5;
			vx = fastCos(this._aiWanderAngle) * 0.7;
			vy = fastSin(this._aiWanderAngle) * 0.7;
		} else {
			const finalMag = Math.sqrt(totalForceX * totalForceX + totalForceY * totalForceY);
			if (finalMag > 0) {
				vx = totalForceX / finalMag;
				vy = totalForceY / finalMag;
			}
		}

		// ═══ 向量平滑 (Lerp) ═══
		const oldVec = this._aiVector || { x: vx, y: vy };
		// 危险时响应更快（lerp更大），安全时更平滑
		const lerp = dangerCount > 5 ? 0.45 : 0.25;

		let smoothX = oldVec.x + (vx - oldVec.x) * lerp;
		let smoothY = oldVec.y + (vy - oldVec.y) * lerp;

		const smoothMag = Math.sqrt(smoothX * smoothX + smoothY * smoothY);
		if (smoothMag > 0) {
			smoothX /= smoothMag;
			smoothY /= smoothMag;
		} else {
			smoothX = 0; smoothY = 0;
		}

		this._aiVector = { x: smoothX, y: smoothY };
		input.vector = this._aiVector;
	}

	// ─── 触摸输入处理（从 update() 提取）───
	// 返回 true 表示输入已消耗，update() 应立即 return
	_handleTouchInput(tx, ty, input) {
		// 新手引导拦截
		if (this._tutorialStep >= 0) {
			this._advanceTutorial();
			this.lastTouchState = true;
			input.active = false;
			return true;
		}

		if (this.isPaused) {
			// 如果显示装备面板，点击任意处关闭
			if (this.pauseShowEquip) {
				if (this.pauseEquipBackBtn && UI.hitTest(tx, ty, this.pauseEquipBackBtn)) {
					this.pauseShowEquip = false;
					SFX.sfxButton();
				} else if (this._equipTabBtns) {
					const tabKeys = ['equip', 'boss', 'enemy'];
					for (let i = 0; i < 3; i++) {
						if (this._equipTabBtns[i] && UI.hitTest(tx, ty, this._equipTabBtns[i])) {
							this._equipTab = tabKeys[i];
							SFX.sfxButton();
							break;
						}
					}
				}
				this.lastTouchState = true;
				input.active = false;
				return true;
			}
			// 如果显示 DPS 统计面板
			if (this.pauseShowStats) {
				if (this.pauseStatsBackBtn && UI.hitTest(tx, ty, this.pauseStatsBackBtn)) {
					this.pauseShowStats = false;
					SFX.sfxButton();
				}
				this.lastTouchState = true;
				input.active = false;
				return true;
			}
			// 如果显示设置面板
			if (this.pauseShowSettings) {
				if (this.settingsAudioBtn && UI.hitTest(tx, ty, this.settingsAudioBtn)) {
					SFX.toggleMute();
					this._saveSettings();
					SFX.sfxButton();
				} else if (this.settingsQualityBtn && UI.hitTest(tx, ty, this.settingsQualityBtn)) {
					this.qualityLevel = (this.qualityLevel || 0) >= 0.8 ? 0 : 1;
					this._saveSettings();
					SFX.sfxButton();
				} else if (this.settingsBackBtn && UI.hitTest(tx, ty, this.settingsBackBtn)) {
					this.pauseShowSettings = false;
					SFX.sfxButton();
				}
				this.lastTouchState = true;
				input.active = false;
				return true;
			}
			// Resume Button
			if (this.pauseResumeBtn && UI.hitTest(tx, ty, this.pauseResumeBtn)) {
				this.isPaused = false;
				SFX.resumeBGM();
				SFX.sfxButton();
				this.lastTouchState = true;
				input.active = false;
				return true;
			}
			// Equip Button
			if (this.pauseEquipBtn && UI.hitTest(tx, ty, this.pauseEquipBtn)) {
				this.pauseShowEquip = true;
				this.equipPanelScroll = 0;
				this._equipTab = 'equip';
				SFX.sfxButton();
				this.lastTouchState = true;
				input.active = false;
				return true;
			}
			// Stats Button
			if (this.pauseStatsBtn && UI.hitTest(tx, ty, this.pauseStatsBtn)) {
				this.pauseShowStats = true;
				SFX.sfxButton();
				this.lastTouchState = true;
				input.active = false;
				return true;
			}
			// Settings Button
			if (this.pauseSettingsBtn && UI.hitTest(tx, ty, this.pauseSettingsBtn)) {
				this.pauseShowSettings = true;
				SFX.sfxButton();
				this.lastTouchState = true;
				input.active = false;
				return true;
			}
			// Auto Play Button
			if (this.pauseAutoPlayBtn && UI.hitTest(tx, ty, this.pauseAutoPlayBtn)) {
				this.autoPlay = !this.autoPlay;
				// 开启时保持屏幕常亮，关闭时恢复
				setKeepScreenOn(this.autoPlay);
				// 关闭时清理AI状态
				if (!this.autoPlay) {
					this._aiTimer = 0;
					this._aiVector = null;
					this.input.vector = { x: 0, y: 0 };
				}
				SFX.sfxButton();
				this.lastTouchState = true;
				input.active = false;
				return true;
			}
			// Auto Upgrade Button
			if (this.pauseAutoUpgradeBtn && UI.hitTest(tx, ty, this.pauseAutoUpgradeBtn)) {
				this.autoUpgrade = !this.autoUpgrade;
				SFX.sfxButton();
				this.lastTouchState = true;
				input.active = false;
				return true;
			}
			// Quit Button
			if (this.pauseQuitBtn && UI.hitTest(tx, ty, this.pauseQuitBtn)) {
				SFX.sfxButton();
				this.endGame();
				this.lastTouchState = true;
				input.active = false;
				return true;
			}
		} else {
			// 自动走位时保持屏幕常亮
			if (this.autoPlay) {
				setKeepScreenOn(true);
			}
			// 游戏内：检测暂停按钮点击
			const btn = this.pauseBtnRect;
			if (tx >= btn.x - 10 && tx <= btn.x + btn.w + 10 &&
				ty >= btn.y - 10 && ty <= btn.y + btn.h + 10) {
				this.isPaused = true;
				SFX.pauseBGM();
				SFX.sfxButton();
				this.lastTouchState = true;
				input.active = false;
				return true;
			}
			// 游戏内：检测 Dash 按钮点击
			if (this.dashBtnRect && this.player) {
				const dbr = this.dashBtnRect;
				// 放宽一点点击范围
				const ddx = tx - dbr.cx;
				const ddy = ty - dbr.cy;
				if (ddx * ddx + ddy * ddy <= (dbr.r + 20) * (dbr.r + 20)) {
					if (this.player.dashCooldown <= 0) {
						// 触发玩家冲刺
						// 获取摇杆的输入方向，如果没有，默认朝脸朝向的面或者上方
						let dashAngle = -Math.PI / 2;
						if (this.input && this.input.vector && (this.input.vector.x !== 0 || this.input.vector.y !== 0)) {
							dashAngle = Math.atan2(this.input.vector.y, this.input.vector.x);
						} else if (this._aiVector && (this._aiVector.x !== 0 || this._aiVector.y !== 0)) {
							dashAngle = Math.atan2(this._aiVector.y, this._aiVector.x);
						}

						this.player.dash(dashAngle);
						SFX.sfxLevelUp(); // 临时借用音效，如果有冲刺音效更好
					}
					// 消耗掉点击，防止走到走位系统里（不过走位是 onTouchMove，这里是 start/end 也可以消耗）
					this.lastTouchState = true;
					input.active = false;
					return true;
				}
			}
		}
		return false;
	}

	// ─── 遗物每帧 tick（从 update() 提取）───
	_updateRelicEffects(dt) {
		const flags = this.player.relicFlags;
		if (!flags) return;

		// 修复无人机 — 每秒回复 1 HP
		if (flags.regenDrone && !flags.overloadCore) {
			this._regenDroneTimer = (this._regenDroneTimer || 0) + dt;
			if (this._regenDroneTimer >= 1) {
				this._regenDroneTimer -= 1;
				this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
			}
		}

		// 护盾发生器 — 每30秒获得临时护甲
		if (flags.shieldGen) {
			this.player.shieldGenTimer = (this.player.shieldGenTimer || 30) - dt;
			if (this.player.shieldGenTimer <= 0) {
				this.player.shieldGenTimer = 30;
				this.player.bonusArmor += 10;
				this.player.shieldArmorExpiry = 5; // 5秒后移除（游戏循环计时）
				this.spawnDamageNumber(this.player.x, this.player.y - 40, '护盾充能!', '#44aaff');
			}
			// 游戏循环计时器：5秒后移除临时护甲（避免setTimeout在重开时仍触发）
			if (this.player.shieldArmorExpiry > 0) {
				this.player.shieldArmorExpiry -= dt;
				if (this.player.shieldArmorExpiry <= 0) {
					this.player.shieldArmorExpiry = 0;
					this.player.bonusArmor = Math.max(0, this.player.bonusArmor - 10);
				}
			}
		}

		// 时间碎片 — 追踪静止时间
		if (flags.timeShard) {
			const inp = this.input;
			const moving = inp && (Math.abs(inp.vector.x) > 0.1 || Math.abs(inp.vector.y) > 0.1);
			this.player.stillTime = moving ? 0 : (this.player.stillTime || 0) + dt;
		}

		// 弹幕矩阵 — 每20秒发射8方向弹幕
		if (flags.bulletMatrix) {
			this.player.bulletMatrixTimer = (this.player.bulletMatrixTimer || 20) - dt;
			if (this.player.bulletMatrixTimer <= 0) {
				this.player.bulletMatrixTimer = 20;
				const Bullet = require('./Bullet');
				const p = this.player;
				const dmg = Math.floor(p.might * 30);
				for (let i = 0; i < 8; i++) {
					const a = (i / 8) * Math.PI * 2;
					const b = this.bulletPool.get().reset(this, p.x, p.y,
						fastCos(a), fastSin(a), dmg, {
						color: '#ffcc00', speed: 400, radius: 5,
						pierce: 2, lifetime: 2.0, element: 'plasma',
					});
					b.weaponId = 'bullet_matrix';
					this.bullets.push(b);
				}
				this.spawnDamageNumber(p.x, p.y - 40, '弹幕矩阵!', '#ffcc00');
				if (this.particles) this.particles.emit(p.x, p.y, { count: 16, speed: 150, life: 0.4, color: '#ffcc00', size: 3 });
			}
		}

		// [BUG-5 FIX] 共鸣核心：移除此处的 bonusMight 修改
		// 效果已在 Player.might getter 中处理，此处重复会导致双重叠加
		// 原代码在此处 +0.2，getter 中又 +0.2 → 总共 +0.4（设计意图为 +0.2）
	}

	// ─── 设置保存/加载 ───
	_saveSettings() {
		try {
			wx.setStorageSync('flux_settings', JSON.stringify({
				muted: SFX.isMuted,
				quality: this.qualityLevel,
			}));
		} catch (e) { }
	}

	_loadSettings() {
		try {
			const raw = wx.getStorageSync('flux_settings');
			if (raw) {
				const s = JSON.parse(raw);
				if (s.muted !== undefined) SFX.setMuted(s.muted);
				if (s.quality !== undefined) this.qualityLevel = s.quality;
			}
		} catch (e) { }
	}

	// ─── GC Optimization ───
	_compactList(list) {
		let activeCount = 0;
		for (let i = 0; i < list.length; i++) {
			if (list[i].active) {
				list[activeCount++] = list[i];
			}
		}
		list.length = activeCount;
	}

	/**
	 * 玩家子弹专用压缩：失活子弹归还对象池
	 */
	_compactBullets() {
		let activeCount = 0;
		for (let i = 0; i < this.bullets.length; i++) {
			if (this.bullets[i].active) {
				this.bullets[activeCount++] = this.bullets[i];
			} else {
				this.bulletPool.release(this.bullets[i]);
			}
		}
		this.bullets.length = activeCount;
	}

	/**
	 * 敌人专用压缩：失活敌人归还对象池而非丢弃
	 * 严禁在游戏循环内 new Enemy()，所有回收走这里
	 */
	_compactEnemies() {
		let activeCount = 0;
		for (let i = 0; i < this.enemies.length; i++) {
			if (this.enemies[i].active) {
				this.enemies[activeCount++] = this.enemies[i];
			} else {
				this.enemyPool.release(this.enemies[i]);
			}
		}
		this.enemies.length = activeCount;
	}

	/**
	 * 传送回收（Treadmill Effect）
	 * 距玩家 > 1.5×视口 的敌人传送到刷怪环前方
	 * 维持 ≤250 活跃敌人的恒定密度
	 */
	_recycleDistantEnemies() {
		const p = this.player;
		const maxDist = Math.max(this.width, this.height) * 1.5;
		const maxDistSq = maxDist * maxDist;
		const halfW = (this.width || 800) / 2 + 42;
		const halfH = (this.height || 600) / 2 + 42;

		// 玩家移动方向（用于将敌人传送到前方）
		const vec = this.input.vector;
		const moveAngle = Math.atan2(
			vec.y || 0,
			vec.x || 0
		);
		const hasDirection = (vec.x || 0) !== 0 || (vec.y || 0) !== 0;

		let recycledRegular = 0;
		for (let i = 0; i < this.enemies.length; i++) {
			const e = this.enemies[i];
			if (!e.active) continue;
			// [BUG-R3-2 FIX] 赏金目标不传送回收，防止幽灵引用
			if (e === this._bountyTarget) continue;
			const dx = e.x - p.x;
			const dy = e.y - p.y;
			if (dx * dx + dy * dy > maxDistSq) {
				// 普通小怪直接回收到对象池并按当前时间/章节重刷，避免早期低级怪一直被满血复刻
				if (!e.isElite && e.type !== 'LootGoblin') {
					e.active = false;
					recycledRegular++;
					continue;
				}
				// 精英怪保留但传送到当前视口边缘前方
				const angle = hasDirection
					? moveAngle + (Math.random() - 0.5) * Math.PI
					: Math.random() * Math.PI * 2;
				const cosA = fastCos(angle);
				const sinA = fastSin(angle);
				const edgeDist = Math.min(
					Math.abs(cosA) > 0.001 ? halfW / Math.abs(cosA) : 9999,
					Math.abs(sinA) > 0.001 ? halfH / Math.abs(sinA) : 9999
				);
				e.x = p.x + cosA * (edgeDist + 24);
				e.y = p.y + sinA * (edgeDist + 24);
				e.frozen = 0;
				e.poisoned = 0;
				e.poisonStacks = 0;
				e.knockbackVx = 0;
				e.knockbackVy = 0;
			}
		}
		if (recycledRegular > 0) {
			this._compactEnemies();
			const tMinutes = this.time / 60;
			const hpMult = this.endlessMode ? 25 * Math.pow(1.35, this.endlessWave) : Math.pow(25, tMinutes / 20);
			const dmgMult = this.endlessMode ? 12 * Math.pow(1.2, this.endlessWave) : Math.pow(12, tMinutes / 20);
			const respawnCount = Math.min(recycledRegular, 12);
			for (let i = 0; i < respawnCount; i++) {
				this._spawnEnemy(hpMult, dmgMult, i * 24);
			}
		}
	}

	// 敌人子弹对象池：复用已失活的子弹对象，减少 GC
	spawnEnemyBullet(x, y, vx, vy, radius, damage, lifetime, color) {
		// 尝试复用已失活的子弹
		for (let i = 0; i < this.enemyBullets.length; i++) {
			const eb = this.enemyBullets[i];
			if (!eb.active) {
				eb.x = x; eb.y = y;
				eb.vx = vx; eb.vy = vy;
				eb.radius = radius; eb.damage = damage;
				eb.lifetime = lifetime; eb.active = true;
				eb.color = color;
				return eb;
			}
		}
		// 没有可复用的，创建新对象
		const eb = { x, y, vx, vy, radius, damage, lifetime, active: true, color };
		this.enemyBullets.push(eb);
		return eb;
	}

	// ─── 经验球优化（合并小经验球减少实体数）───
	_optimizeGems() {
		if (this.gems.length < 50) return;

		// 复用实例级 Map，避免每次分配
		if (!this._gemGrid) this._gemGrid = new Map();
		const grid = this._gemGrid;
		grid.clear();

		const gridSize = 60;
		for (const gem of this.gems) {
			if (!gem.active) continue;
			const key = Math.floor(gem.x / gridSize) + ',' + Math.floor(gem.y / gridSize);
			if (!grid.has(key)) {
				// 第一个进入此格子的gem为代表
				grid.set(key, { x: gem.x * gem.value, y: gem.y * gem.value, value: gem.value, repr: gem });
			} else {
				const cell = grid.get(key);
				cell.x += gem.x * gem.value;
				cell.y += gem.y * gem.value;
				cell.value += gem.value;
				gem.active = false; // 非代表gem标记为移除
			}
		}

		// 就地更新代表gem，不创建新对象
		for (const cell of grid.values()) {
			const g = cell.repr;
			const v = cell.value;
			g.x = cell.x / cell.value;
			g.y = cell.y / cell.value;
			g.value = v;
			g.radius = 4 + Math.min(v, 20) * 0.15;
			g.collecting = false;
		}
		// 后续 _compactList 负责清理 inactive 的 gem
	}

	// ─── 敌人生成 (见 SpawnSystem.js) ───
	// _spawnEnemy / _createEnemy / _rollEnemyAffixes / spawnEnemyAt
	// 由 installSpawnSystem(Game) 挂载到 prototype

	spawnGem(x, y, value) {
		this.gems.push(new Gem(this, x, y, value));
	}

	// [NEW] Spawn Pickup helper
	spawnPickup(x, y, type) {
		this.pickups.push(new Pickup(this, x, y, type));
	}

	// ─── 宝箱/赏金系统 (见 ChestSystem.js) ───
	// triggerChest / _weightedPickChest / _applyChestReward / _updateBounty / _onBountyKilled
	// 由 installChestSystem(Game) 挂载到 prototype

	// ─── 武器连携系统 ───

	_checkWeaponCombo(enemy, latestWeaponId) {
		if (!enemy._hitLogW || enemy._hitLogW.length < 2) return;
		// 检查 0.5 秒内有没有不同的武器命中（从并行数组读取）
		const logW = enemy._hitLogW;
		for (let i = logW.length - 2; i >= 0; i--) {
			if (logW[i] === latestWeaponId) continue;
			const pair = [logW[i], latestWeaponId].sort().join('+');
			// 防止同一对在同一敌人上短时间内重复触发
			if (enemy._lastCombo === pair && this.time - (enemy._lastComboTime || 0) < 2) continue;
			const combo = _WEAPON_COMBOS[pair];
			if (combo) {
				if (!enemy.active) return; // 敌人已被击杀
				enemy._lastCombo = pair;
				enemy._lastComboTime = this.time;
				combo.fn(this, enemy);
				return;
			}
		}
	}

	// ─── 空间网格优化 ───

	_buildEnemyGrid() {
		// 动态重建频率优化：根据敌人数量跳帧
		const count = this.enemies.length;
		let skipFrames = 0;
		if (count > 300) skipFrames = 2; // 每3帧重建一次 (跑1休2)
		else if (count > 100) skipFrames = 1; // 每2帧重建一次 (跑1休1)

		this._gridFrame = (this._gridFrame || 0) + 1;
		if (this._gridFrame <= skipFrames) return;
		this._gridFrame = 0;

		// 回收上轮cell数组到池，避免每帧创建新数组
		if (!this._cellPool) this._cellPool = [];
		for (const cell of this.enemyGrid.values()) {
			cell.length = 0;
			this._cellPool.push(cell);
		}
		this.enemyGrid.clear();
		const size = this.gridSize;
		for (const e of this.enemies) {
			if (!e.active) continue;
			const gx = Math.floor(e.x / size);
			const gy = Math.floor(e.y / size);
			const key = gx + ',' + gy;
			let cell = this.enemyGrid.get(key);
			if (!cell) {
				cell = this._cellPool.pop() || [];
				this.enemyGrid.set(key, cell);
			}
			cell.push(e);
		}
	}

	_getNearbyEnemies(x, y, radius, outArray = null) {
		const result = outArray || this._nearbyResult;
		result.length = 0; // 复用数组，清零但不释放内存
		const size = this.gridSize;
		const minGx = Math.floor((x - radius) / size);
		const maxGx = Math.floor((x + radius) / size);
		const minGy = Math.floor((y - radius) / size);
		const maxGy = Math.floor((y + radius) / size);

		for (let gx = minGx; gx <= maxGx; gx++) {
			for (let gy = minGy; gy <= maxGy; gy++) {
				const key = gx + ',' + gy;
				const cell = this.enemyGrid.get(key);
				if (cell) {
					for (const e of cell) {
						if (e.active) result.push(e);
					}
				}
			}
		}
		return result;
	}

	// ─── 碰撞检测 (见 CollisionSystem.js) ───
	// _checkCollisions 由 installCollisionSystem(Game) 挂载到 prototype

	// ─── 击杀处理 (见 KillSystem.js) ───
	// onEnemyKilled / _updateBounty / _onBountyKilled 由 installKillSystem(Game) 挂载到 prototype

	// ═══ 连杀狂潮系统 (see ComboSystem.js) ═══

	_spawnMapElement() {
		const p = this.player;
		const angle = Math.random() * Math.PI * 2;
		const dist = 150 + Math.random() * 150; // 150-300距离

		const x = p.x + fastCos(angle) * dist;
		const y = p.y + fastSin(angle) * dist;

		// 随机选择元素类型
		const roll = Math.random();
		let type;
		if (roll < 0.25) type = 'weapon_altar';
		else if (roll < 0.45) type = 'grass';
		else if (roll < 0.6) type = 'teleporter';
		else if (roll < 0.75) type = 'merchant';
		else type = 'chest';

		this.spawnPickup(x, y, type);

		// 可见的提示
		if (type === 'weapon_altar' || type === 'merchant') {
			this.spawnDamageNumber(x, y, '✨ 发现!', '#ffcc00');
		}
	}

	spawnDamageNumber(x, y, text, color, isCrit = false) {
		// 性能保护：限制伤害数字数量
		if (this.damageNumbers.length >= 30) return;

		// 暴击增强视觉
		let scale = 1;
		let glow = false;
		let vy = -50;
		let bounce = false;
		if (isCrit) {
			scale = 2.0;
			glow = true;
			vy = -120; // 更夸张的向上初速度
			bounce = true;
			color = '#ffd700'; // 金色
			// 连续暴击追踪
			this._critChain = (this._critChain || 0) + 1;
			this._critChainTimer = 1.5;
			if (this._critChain >= 3) {
				this.spawnDamageNumber(x, y - 30, '\u66B4\u51FB\u8FDE\u9501!', '#ff4444', false);
				this.shakeAmount = 3;
				this.shakeDuration = 0.1;
				this._critChain = 0;
			}
			// 超高伤害暴击
			const dmgVal = parseInt(text);
			if (dmgVal > 100) {
				scale = 2.5;
				vy = -150;
				this.triggerScreenPulse('#ffaa00', 0.05); // Changed to soft amber and shorter duration
			}
		}

		this.damageNumbers.push({
			x, y,
			text: String(text),
			a: 1,
			color,
			vy,
			scale,
			glow,
			bounce,
			bouncePhase: bounce ? 0 : -1,
		});
	}

	triggerScreenPulse(color = '#fff', duration = 0.5) {
		this.screenPulse = duration;
		this.screenPulseColor = color;
	}

	// 命中停顿效果（短暂冻结画面增强打击感）
	triggerHitPause(duration = 0.06) {
		const now = perfNow();
		if (now - (this._lastHitPauseTime || 0) < 100) return; // 100ms 冷却，防止高频命中导致游戏像卡死一样掉帧

		if (this.hitPause < duration) {
			this.hitPause = duration;
			this._lastHitPauseTime = now;
		}
	}

	_cycleMap() {
		const maps = ['CyberGrid', 'VoidNebula', 'Matrix'];
		const idx = (maps.indexOf(this.mapManager.style) + 1) % maps.length;
		this.mapManager.setStyle(maps[idx]);
	}

	// ─── 绘制 ───
	// Game.prototype.draw 与其他视觉相关的辅助方法现在托管于 RenderSystem.js 

	// ─── Canvas HUD (see HUD.js) ───
}

// 挂载各个游戏核心系统到 Game.prototype
installHUD(Game);
installComboSystem(Game);
installSpawnSystem(Game);
installCollisionSystem(Game);
installKillSystem(Game);
installChestSystem(Game);
installRenderSystem(Game);

module.exports = Game;
