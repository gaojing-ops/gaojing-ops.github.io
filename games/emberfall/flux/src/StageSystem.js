// ─── 关卡/章节系统 ──────────────────────────
// 将 20 分钟模式划分为 5 个章节，每章结束提供 3 选 1 奖励

const SFX = require('./SFX');
// [BUG-R3-12 FIX] 使用共享工具函数
const { safeRoundRect: _safeRoundRect } = require('./CanvasUtils');

// ─── 章节配置 ───
const STAGE_CONFIGS = [
	{
		id: 1,
		name: '灰烬林地',
		subtitle: '第一章',
		duration: 240, // 4 分钟
		mapStyle: 'CyberGrid',
		color: '#00ffcc',
	},
	{
		id: 2,
		name: '腐根沼泽',
		subtitle: '第二章',
		duration: 240,
		mapStyle: 'ToxicSwamp',
		color: '#88ff44',
	},
	{
		id: 3,
		name: '霜裂遗迹',
		subtitle: '第三章',
		duration: 240,
		mapStyle: 'CryoRealm',
		color: '#44ccff',
	},
	{
		id: 4,
		name: '虚渊墓境',
		subtitle: '第四章',
		duration: 240,
		mapStyle: 'VoidNebula',
		color: '#aa44ff',
	},
	{
		id: 5,
		name: '黎明圣城',
		subtitle: '第五章 · 最终章',
		duration: 240,
		mapStyle: 'Matrix',
		color: '#ffcc00',
	},
];

// ─── 章节间奖励池 ───
const STAGE_REWARDS = [
	{
		id: 'weapon_evolve',
		name: '武器进化',
		desc: '所有武器 +1 级',
		icon: '⚔',
		apply: (game) => {
			for (const w of game.player.weapons) {
				w.level = Math.min((w.level || 1) + 1, 8);
			}
			game.spawnDamageNumber(game.player.x, game.player.y - 50, '武器进化! 全体+1级', '#ffdd44');
		},
	},
	{
		id: 'full_heal',
		name: '应急修复',
		desc: 'HP 全回 + 最大HP +50',
		icon: '❤',
		apply: (game) => {
			game.player.maxHp += 50;
			game.player.hp = game.player.maxHp;
			game.spawnDamageNumber(game.player.x, game.player.y - 50, '应急修复! HP全回', '#44ff88');
		},
	},
	{
		id: 'damage_boost',
		name: '伤害超载',
		desc: '永久伤害 +25%',
		icon: '⚡',
		apply: (game) => {
			game.player.bonusMight = (game.player.bonusMight || 0) + 0.25;
			game.spawnDamageNumber(game.player.x, game.player.y - 50, '伤害超载! +25%', '#ffaa00');
		},
	},
	{
		id: 'cdr_boost',
		name: '冷却压缩',
		desc: '永久冷却 -20%',
		icon: '⏱',
		apply: (game) => {
			game.player.bonusCdr = (game.player.bonusCdr || 0) + 0.20;
			game.spawnDamageNumber(game.player.x, game.player.y - 50, '冷却压缩! -20%CD', '#aaffff');
		},
	},
	{
		id: 'armor_boost',
		name: '装甲强化',
		desc: '永久护甲 +3',
		icon: '🛡',
		apply: (game) => {
			// [BUG-R3-4 FIX] 原+20直接顶满60%减伤上限，改为+3（约24%减伤）
			game.player.bonusArmor = (game.player.bonusArmor || 0) + 3;
			game.spawnDamageNumber(game.player.x, game.player.y - 50, '装甲强化! +3护甲', '#88ccff');
		},
	},
	{
		id: 'speed_boost',
		name: '超速芯片',
		desc: '永久移速 +20%',
		icon: '💨',
		apply: (game) => {
			game.player.bonusSpeed = (game.player.bonusSpeed || 0) + 0.20;
			game.spawnDamageNumber(game.player.x, game.player.y - 50, '超速芯片! +20%移速', '#44aaff');
		},
	},
	{
		id: 'xp_boost',
		name: '经验增幅',
		desc: '30 秒内经验 x2',
		icon: '✨',
		apply: (game) => {
			game._xpSurge = { timer: 30, mult: 2 };
			game.spawnDamageNumber(game.player.x, game.player.y - 50, '经验增幅! x2 XP 30秒', '#ccff44');
		},
	},
	{
		id: 'pickup_boost',
		name: '磁力增强',
		desc: '拾取范围 +50%',
		icon: '🧲',
		apply: (game) => {
			game.player.bonusPickup = (game.player.bonusPickup || 0) + 0.50;
			game.spawnDamageNumber(game.player.x, game.player.y - 50, '磁力增强! +50%拾取', '#ffdd44');
		},
	},
	{
		id: 'area_boost',
		name: '范围扩散',
		desc: '永久攻击范围 +30%',
		icon: '💥',
		apply: (game) => {
			game.player.bonusArea = (game.player.bonusArea || 0) + 0.30;
			game.spawnDamageNumber(game.player.x, game.player.y - 50, '范围扩散! +30%范围', '#ff8844');
		},
	},
	{
		id: 'gem_rain',
		name: '数据暴雨',
		desc: '立即获得大量经验',
		icon: '💎',
		apply: (game) => {
			for (let i = 0; i < 40; i++) {
				const ox = game.player.x + (Math.random() - 0.5) * 400;
				const oy = game.player.y + (Math.random() - 0.5) * 400;
				game.spawnGem(ox, oy, 12 + Math.floor(Math.random() * 10));
			}
			game.spawnDamageNumber(game.player.x, game.player.y - 50, '数据暴雨!', '#00ffcc');
		},
	},
];

// [BUG-R3-12 FIX] _safeRoundRect 已移至 CanvasUtils.js

class StageSystem {
	constructor(game) {
		this.game = game;
		this.currentStage = 0;  // 0-indexed
		this.stageTime = 0;
		this.state = 'playing'; // 'playing' | 'reward'

		// 奖励选项
		this.rewardOptions = [];
		this.rewardBtns = [];

		// 强制地图风格（stage 控制时禁用 time-based 切换）
		this._stageStyleLocked = false;

		// 初始化第一章地图风格
		this.game.mapManager.setStyle(STAGE_CONFIGS[0].mapStyle);
		this._stageStyleLocked = true;
	}

	get totalStages() { return STAGE_CONFIGS.length; }

	update(dt) {
		if (this.state !== 'playing') return;

		this.stageTime += dt;
		const config = STAGE_CONFIGS[this.currentStage];

		if (this.stageTime >= config.duration) {
			this._completeStage();
		}
	}

	_completeStage() {
		if (this.game.meta) {
			this.game.meta.data.stagesCompleted = (this.game.meta.data.stagesCompleted || 0) + 1;
			this.game.meta._save();
		}

		if (this.currentStage >= STAGE_CONFIGS.length - 1) {
			// 最终章完成 → 触发胜利
			this.state = 'playing';
			this.game.victoryEnd();
			return;
		}

		// [BUG-R3-10 FIX] 释放敌人到对象池而非直接丢弃
		for (const e of this.game.enemies) {
			e.active = false;
			this.game.enemyPool.release(e);
		}
		this.game.enemies.length = 0;

		// 清理地图交互物（旧功能已移除）

		this.state = 'reward';
		this.game.isRunning = false;
		this._generateRewards();

		// 自动战斗辅助：如果启用了自动升级且存在倒计时/结算奖励，直接随机拿一个
		if (this.game && this.game.autoUpgrade && this.rewardOptions.length > 0) {
			const pickIdx = Math.floor(Math.random() * this.rewardOptions.length);
			this.applyReward(pickIdx);
			return;
		}

		this._setInterceptor();

		SFX.sfxBossAppear && SFX.sfxBossAppear();
	}

	_generateRewards() {
		const shuffled = STAGE_REWARDS.slice().sort(() => Math.random() - 0.5);
		this.rewardOptions = shuffled.slice(0, 3);
		this.rewardBtns = [];
	}

	applyReward(idx) {
		if (idx < 0 || idx >= this.rewardOptions.length) return;

		const reward = this.rewardOptions[idx];
		try {
			reward.apply(this.game);
		} catch (e) {
			console.warn('[StageSystem] reward apply error:', e);
		}

		// 进入下一章
		this.currentStage++;
		this.stageTime = 0;
		this.state = 'playing';

		// 切换地图风格
		const nextConfig = STAGE_CONFIGS[this.currentStage];
		this.game.mapManager.setStyle(nextConfig.mapStyle);

		// 提示横幅
		this.game.spawnDamageNumber(
			this.game.player.x, this.game.player.y - 80,
			`${nextConfig.subtitle}: ${nextConfig.name}`, nextConfig.color
		);

		// 恢复游戏
		this.game.input && this.game.input.clearInterceptor();
		this.game.isRunning = true;

		const tMinutes = this.game.time / 60;
		const hpMult = Math.pow(25, tMinutes / 20);
		const dmgMult = Math.pow(12, tMinutes / 20);
		for (let i = 0; i < 6; i++) {
			this.game._spawnEnemy(hpMult, dmgMult, i * 40);
		}
	}

	_setInterceptor() {
		if (!this.game.input) return;
		this.game.input.setInterceptor((type, x, y) => {
			if (type === 'end') this._onTouchEnd(x, y);
		});
	}

	_onTouchEnd(x, y) {
		if (this.state !== 'reward') return;
		for (const btn of this.rewardBtns) {
			if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
				this.applyReward(btn.idx);
				return;
			}
		}
	}

	// ─── 绘制 ───
	draw(ctx, w, h) {
		if (this.state === 'reward') {
			this._drawRewardPanel(ctx, w, h);
		} else {
			this._drawStageHUD(ctx, w, h);
		}
	}

	_drawStageHUD(ctx, w, h) {
		const topOffset = (this.game && this.game.safeAreaTop) || 0;
		const cfg = STAGE_CONFIGS[this.currentStage];
		const timeLeft = Math.max(0, cfg.duration - this.stageTime);
		const m = Math.floor(timeLeft / 60);
		const s = Math.floor(timeLeft % 60);
		const timeStr = `${m}:${s.toString().padStart(2, '0')}`;

		ctx.save();
		ctx.textAlign = 'right';
		ctx.font = 'bold 11px sans-serif';
		ctx.fillStyle = cfg.color;
		ctx.fillText(`第${cfg.id}章 ${timeStr}`, w - 10, 18 + topOffset);
		ctx.textAlign = 'left';
		ctx.restore();
	}

	_drawRewardPanel(ctx, w, h) {
		const cfg = STAGE_CONFIGS[this.currentStage];
		const nextCfg = STAGE_CONFIGS[this.currentStage + 1];

		// 半透明背景
		ctx.save();
		ctx.fillStyle = 'rgba(0,0,0,0.88)';
		ctx.fillRect(0, 0, w, h);

		// 章节完成标题
		ctx.textAlign = 'center';
		ctx.fillStyle = cfg.color;
		ctx.font = 'bold 24px sans-serif';
		ctx.fillText(`${cfg.subtitle} 「${cfg.name}」 完成！`, w / 2, 65);

		// 下一章提示
		if (nextCfg) {
			ctx.fillStyle = nextCfg.color;
			ctx.font = '15px sans-serif';
			ctx.fillText(`下一章：${nextCfg.name}　选择一个增益`, w / 2, 96);
		}

		// 3 个奖励卡片
		const cw = Math.min(190, (w - 60) / 3);
		const ch = 155;
		const cy = h / 2 - ch / 2;
		const totalW = cw * 3 + 20;
		const startX = (w - totalW) / 2;
		this.rewardBtns = [];

		for (let i = 0; i < 3; i++) {
			const reward = this.rewardOptions[i];
			if (!reward) continue;
			const bx = startX + i * (cw + 10);

			// 卡片背景
			ctx.fillStyle = '#0d1a2a';
			_safeRoundRect(ctx, bx, cy, cw, ch, 10);
			ctx.fill();
			ctx.strokeStyle = '#3366aa';
			ctx.lineWidth = 1.5;
			ctx.stroke();

			// 图标
			ctx.font = '30px sans-serif';
			ctx.fillStyle = '#fff';
			ctx.fillText(reward.icon, bx + cw / 2, cy + 48);

			// 名称
			ctx.font = 'bold 14px sans-serif';
			ctx.fillStyle = '#ffffff';
			ctx.fillText(reward.name, bx + cw / 2, cy + 80);

			// 描述
			ctx.font = '12px sans-serif';
			ctx.fillStyle = '#aacccc';
			ctx.fillText(reward.desc, bx + cw / 2, cy + 102);

			// 点击提示
			ctx.font = '11px sans-serif';
			ctx.fillStyle = '#4488cc';
			ctx.fillText('点击选择', bx + cw / 2, cy + 128);

			this.rewardBtns.push({ x: bx, y: cy, w: cw, h: ch, idx: i });
		}

		ctx.textAlign = 'left';
		ctx.restore();
	}
}

module.exports = { StageSystem, STAGE_CONFIGS };
