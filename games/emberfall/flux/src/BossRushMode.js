// ─── Boss Rush 挑战模式 ──────────────────────────
// 10 波 Boss 连战，波间 30 秒准备 + 3 选 1 增益，完成后结算
const SFX = require('./SFX');
// [BUG-R3-12 FIX] 使用共享工具函数
const { safeRoundRect: _safeRoundRect } = require('./CanvasUtils');

// 增益池定义
const BUFF_DEFS = [
	{ id: 'heal_full',    name: '紧急修复',   desc: 'HP 全回',            icon: '❤',  apply: (p) => { p.heal(p.maxHp); } },
	{ id: 'damage_up',   name: '伤害超载',   desc: '伤害永久 +20%',      icon: '⚡', apply: (p) => { p.bonusMight = (p.bonusMight || 0) + 0.20; } },
	{ id: 'cdr_up',      name: '冷却压缩',   desc: '武器冷却永久 -15%',  icon: '⏱', apply: (p) => { p.bonusCdr = (p.bonusCdr || 0) + 0.15; } },
	{ id: 'hp_up',       name: '生命扩容',   desc: '最大 HP 永久 +30',   icon: '💚', apply: (p) => { p.maxHp += 30; p.heal(30); } },
	{ id: 'armor_up',    name: '护甲锻造',   desc: '护甲永久 +10',       icon: '🛡', apply: (p) => { p.bonusArmor = (p.bonusArmor || 0) + 10; } },
	{ id: 'speed_up',    name: '超速芯片',   desc: '移速永久 +15%',      icon: '💨', apply: (p) => { p.bonusSpeed = (p.bonusSpeed || 0) + 0.15; } },
	{ id: 'pickup_up',   name: '磁力增强',   desc: '拾取范围永久 +30%',  icon: '🧲', apply: (p) => { p.bonusPickup = (p.bonusPickup || 0) + 0.30; } },
	{ id: 'weapon_lvl',  name: '武器进化',   desc: '所有武器 +1 级',     icon: '⚔',  apply: (p, game) => { for (const w of p.weapons) w.level = Math.min((w.level || 1) + 1, 8); } },
	{ id: 'heal_half',   name: '战地急救',   desc: 'HP 回复 50%',        icon: '💊', apply: (p) => { p.heal(p.maxHp * 0.5); } },
];

// 10 波 Boss 序列（wave 索引 0~9 对应 boss wave 参数 1~10）
const WAVE_CONFIGS = [
	{ wave: 1, hpMult: 1.0,  dmgMult: 1.0,  label: '第 1 波' },
	{ wave: 2, hpMult: 1.3,  dmgMult: 1.1,  label: '第 2 波' },
	{ wave: 3, hpMult: 1.7,  dmgMult: 1.2,  label: '第 3 波' },
	{ wave: 4, hpMult: 2.2,  dmgMult: 1.35, label: '第 4 波' },
	{ wave: 5, hpMult: 2.8,  dmgMult: 1.5,  label: '第 5 波' },
	{ wave: 6, hpMult: 3.5,  dmgMult: 1.65, label: '第 6 波' },
	{ wave: 7, hpMult: 4.5,  dmgMult: 1.8,  label: '第 7 波' },
	{ wave: 8, hpMult: 6.0,  dmgMult: 2.0,  label: '第 8 波' },
	{ wave: 9, hpMult: 8.0,  dmgMult: 2.2,  label: '第 9 波' },
	{ wave: 10, hpMult: 12.0, dmgMult: 2.5, label: '最终波' },
];

class BossRushMode {
	constructor(game) {
		this.game = game;
		this.currentWave = 0;   // 0-indexed，当前在哪波（还没开始时为 -1）
		this.state = 'prep';    // 'prep' | 'fighting' | 'reward' | 'complete' | 'failed'
		this.prepTimer = 5;     // 首波准备 5 秒
		this.totalTime = 0;
		this.waveStartTime = 0;
		this.waveTimes = [];    // 每波耗时记录

		// 奖励选项（3选1）
		this.rewardOptions = [];
		this.selectedReward = -1;
		this.rewardBtns = [];   // 命中区域
		this.continueBtnArea = null;

		// 完成后结算
		this.finalChips = 0;
		this.finalRank = '';
	}

	start() {
		this.currentWave = 0;
		this.state = 'prep';
		this.prepTimer = 5;
		this.totalTime = 0;
		this.waveTimes = [];
		this._waveStarted = false;
		this.game.isRunning = true;
		this._showPrepBanner();
	}

	update(dt) {
		if (!this.game.isRunning) return;

		this.totalTime += dt;

		if (this.state === 'prep') {
			this.prepTimer -= dt;
			if (this.prepTimer <= 0) {
				this._startWave();
			}
		} else if (this.state === 'fighting') {
			// 检测 Boss 死亡
			// 注意：_compactList 会在同帧末把已死亡的 boss 从数组移除
			// 所以不能用 bosses.length > 0，改用 _waveStarted 旗标
			if (this._waveStarted && this.game.bosses.every(b => !b.active)) {
				this._waveStarted = false;
				this._completeWave();
			}
		}
		// 'reward' 和 'complete' 状态由 UI 交互推进
	}

	_showPrepBanner() {
		const cfg = WAVE_CONFIGS[this.currentWave];
		this.game.spawnDamageNumber(
			this.game.player.x, this.game.player.y - 60,
			`${cfg.label} 即将开始…`, '#ffcc00'
		);
	}

	_startWave() {
		const cfg = WAVE_CONFIGS[this.currentWave];
		const Boss = require('./Boss');

		// [BUG-R3-10 FIX] 释放敌人到对象池而非直接丢弃
		for (const e of this.game.enemies) {
			e.active = false;
			this.game.enemyPool.release(e);
		}
		this.game.enemies.length = 0;

		// 生成 Boss
		const boss = new Boss(this.game, cfg.wave);
		boss.maxHp = Math.floor(boss.maxHp * cfg.hpMult);
		boss.hp = boss.maxHp;
		// 伤害随波数缩放
		boss.damage = Math.round(boss.damage * cfg.dmgMult);
		this.game.bosses = [boss];
		this._waveStarted = true; // 旗标：波次已启动，等待 bosses 清空

		// Boss 入场演出
		this.game._bossEntrance = {
			timer: 1.5,
			phase: 0,
			name: boss.name,
			color: boss.color,
			slowActive: false,
		};

		this.state = 'fighting';
		this.waveStartTime = this.totalTime;

		this.game.shakeAmount = 8;
		this.game.shakeDuration = 0.5;
		SFX.sfxBossAppear && SFX.sfxBossAppear();

		this.game.spawnDamageNumber(
			this.game.player.x, this.game.player.y - 60,
			`${cfg.label}: ${boss.name}`, boss.color || '#ff0055'
		);
	}

	_completeWave() {
		const waveTime = this.totalTime - this.waveStartTime;
		this.waveTimes.push(waveTime);
		this.game.bosses = [];
		this._recordBestWave(this.currentWave + 1);

		if (this.currentWave >= WAVE_CONFIGS.length - 1) {
			// 全部完成
			this._complete();
		} else {
			// 进入奖励选择阶段
			this.state = 'reward';
			this.game.isRunning = false;  // 暂停游戏
			this._generateRewards();
			this.selectedReward = -1;
			this._setOverlayInterceptor();
		}
	}

	_generateRewards() {
		// 从奖励池随机选 3 个不重复
		const shuffled = BUFF_DEFS.slice().sort(() => Math.random() - 0.5);
		this.rewardOptions = shuffled.slice(0, 3);
	}

	selectReward(idx) {
		if (idx < 0 || idx >= this.rewardOptions.length) return;
		this.selectedReward = idx;
		const buff = this.rewardOptions[idx];
		try {
			buff.apply(this.game.player, this.game);
		} catch (e) {
			console.warn('[BossRush] buff apply error:', e);
		}

		// 进入下一波
		this.currentWave++;
		this.state = 'prep';
		this.prepTimer = 8;
		this.game.input && this.game.input.clearInterceptor();
		this.game.isRunning = true;
		this._showPrepBanner();
	}

	_complete() {
		this.state = 'complete';
		this.game.isRunning = false;
		this.game.bossRushCompleted = true;
		this._setOverlayInterceptor();

		// 计算芯片奖励
		const base = 300;
		const bonus = Math.max(0, 600 - Math.floor(this.totalTime));  // 快速通关奖励
		this.finalChips = base + bonus;
		this.finalRank = this._getRank(this.totalTime);

		// [R5-2 FIX] endRun(chipMultiplier=0) 只记录统计，不重复发 chips
		// Boss Rush 使用自己的 finalChips 计算公式
		if (this.game.meta) {
			const p = this.game.player;
			this.game.meta.endRun(this.totalTime, p.kills, p.level, 0);
			this.game.meta.addChips(this.finalChips);
		}
	}

	_getRank(time) {
		if (time < 180) return 'S';
		if (time < 270) return 'A';
		if (time < 360) return 'B';
		return 'C';
	}

	_recordBestWave(waveCount) {
		if (!this.game.meta || !waveCount) return;
		if (waveCount > (this.game.meta.data.bossRushBestWave || 0)) {
			this.game.meta.data.bossRushBestWave = waveCount;
			this.game.meta._save();
		}
	}

	// ─── 绘制 Boss Rush 专属 UI（叠加在游戏画面上）───
	draw(ctx, w, h) {
		if (this.state === 'prep') {
			this._drawPrepOverlay(ctx, w, h);
		} else if (this.state === 'fighting') {
			this._drawFightingHUD(ctx, w, h);
		} else if (this.state === 'reward') {
			this._drawRewardPanel(ctx, w, h);
		} else if (this.state === 'complete') {
			this._drawCompletePanel(ctx, w, h);
		} else if (this.state === 'failed') {
			this._drawFailedPanel(ctx, w, h);
		}
	}

	_drawPrepOverlay(ctx, w, h) {
		const cfg = WAVE_CONFIGS[this.currentWave];
		const timerInt = Math.ceil(this.prepTimer);

		ctx.save();
		ctx.globalAlpha = 0.6;
		ctx.fillStyle = '#000';
		ctx.fillRect(0, h * 0.3, w, h * 0.25);
		ctx.globalAlpha = 1;

		ctx.textAlign = 'center';
		ctx.fillStyle = '#ffcc00';
		ctx.font = 'bold 22px sans-serif';
		ctx.fillText(`Boss Rush — ${cfg.label}`, w / 2, h * 0.38);

		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 48px sans-serif';
		ctx.fillText(timerInt, w / 2, h * 0.50);

		ctx.fillStyle = '#aaa';
		ctx.font = '14px sans-serif';
		ctx.fillText(`波次 ${this.currentWave + 1} / ${WAVE_CONFIGS.length}`, w / 2, h * 0.52);
		ctx.textAlign = 'left';
		ctx.restore();
	}

	_drawFightingHUD(ctx, w, h) {
		const topOffset = (this.game && this.game.safeAreaTop) || 0;
		const cfg = WAVE_CONFIGS[this.currentWave];

		ctx.save();
		ctx.fillStyle = '#ffcc00';
		ctx.font = 'bold 13px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(`⚡ BOSS RUSH  波 ${this.currentWave + 1}/${WAVE_CONFIGS.length}`, w / 2, 20 + topOffset);
		ctx.textAlign = 'left';
		ctx.restore();
	}

	_drawRewardPanel(ctx, w, h) {
		// 半透明背景
		ctx.save();
		ctx.fillStyle = 'rgba(0,0,0,0.85)';
		ctx.fillRect(0, 0, w, h);

		const nextWave = this.currentWave + 1;
		const cfg = WAVE_CONFIGS[nextWave < WAVE_CONFIGS.length ? nextWave : nextWave - 1];

		ctx.textAlign = 'center';
		ctx.fillStyle = '#44ff88';
		ctx.font = 'bold 22px sans-serif';
		ctx.fillText(`第 ${this.currentWave + 1} 波完成！`, w / 2, 70);

		ctx.fillStyle = '#ffcc00';
		ctx.font = '15px sans-serif';
		ctx.fillText(`下一波：${cfg.label}  选择一个增益`, w / 2, 100);

		// 3 个增益卡片
		const cw = Math.min(200, (w - 60) / 3);
		const ch = 150;
		const cy = h / 2 - ch / 2;
		const totalW = cw * 3 + 20;
		const startX = (w - totalW) / 2;
		this.rewardBtns = [];

		for (let i = 0; i < 3; i++) {
			const buff = this.rewardOptions[i];
			if (!buff) continue;
			const bx = startX + i * (cw + 10);

			const isHovered = this.selectedReward === i;
			ctx.fillStyle = isHovered ? '#1a3a1a' : '#12121a';
			_safeRoundRect(ctx, bx, cy, cw, ch, 10);
			ctx.fill();

			ctx.strokeStyle = isHovered ? '#44ff88' : '#4466cc';
			ctx.lineWidth = isHovered ? 3 : 1.5;
			ctx.stroke();

			ctx.font = '28px sans-serif';
			ctx.fillStyle = '#fff';
			ctx.fillText(buff.icon, bx + cw / 2, cy + 45);

			ctx.font = 'bold 14px sans-serif';
			ctx.fillStyle = '#ffffff';
			ctx.fillText(buff.name, bx + cw / 2, cy + 75);

			ctx.font = '12px sans-serif';
			ctx.fillStyle = '#aaccaa';
			ctx.fillText(buff.desc, bx + cw / 2, cy + 98);

			this.rewardBtns.push({ x: bx, y: cy, w: cw, h: ch, idx: i });
		}

		ctx.textAlign = 'left';
		ctx.restore();
	}

	_drawCompletePanel(ctx, w, h) {
		ctx.save();
		ctx.fillStyle = 'rgba(0,0,0,0.9)';
		ctx.fillRect(0, 0, w, h);

		ctx.textAlign = 'center';

		ctx.fillStyle = '#ffcc00';
		ctx.font = 'bold 28px sans-serif';
		ctx.fillText('Boss Rush 完成！', w / 2, h * 0.22);

		// 排名
		const rankColors = { S: '#ffdd44', A: '#44ffcc', B: '#aaaaff', C: '#aaaaaa' };
		ctx.fillStyle = rankColors[this.finalRank] || '#fff';
		ctx.font = 'bold 64px sans-serif';
		ctx.fillText(this.finalRank, w / 2, h * 0.42);

		ctx.fillStyle = '#888';
		ctx.font = '13px sans-serif';
		ctx.fillText(`总用时: ${_fmtTime(this.totalTime)}`, w / 2, h * 0.50);

		ctx.fillStyle = '#ffcc00';
		ctx.font = 'bold 18px sans-serif';
		ctx.fillText(`+${this.finalChips} 芯片`, w / 2, h * 0.58);

		// 每波用时
		ctx.fillStyle = '#888';
		ctx.font = '11px sans-serif';
		const waveStr = this.waveTimes.map((t, i) => `W${i + 1}:${_fmtTime(t)}`).join('  ');
		ctx.fillText(waveStr, w / 2, h * 0.64);

		// 返回按钮
		const btnW = 160, btnH = 44, btnX = w / 2 - btnW / 2, btnY = h * 0.74;
		ctx.fillStyle = '#1a2a1a';
		_safeRoundRect(ctx, btnX, btnY, btnW, btnH, 10);
		ctx.fill();
		ctx.strokeStyle = '#44ff88';
		ctx.lineWidth = 2;
		ctx.stroke();
		ctx.fillStyle = '#44ff88';
		ctx.font = 'bold 16px sans-serif';
		ctx.fillText('返回主菜单', w / 2, btnY + 28);

		this.continueBtnArea = { x: btnX, y: btnY, w: btnW, h: btnH };
		ctx.textAlign = 'left';
		ctx.restore();
	}

	_drawFailedPanel(ctx, w, h) {
		ctx.save();
		ctx.fillStyle = 'rgba(0,0,0,0.85)';
		ctx.fillRect(0, 0, w, h);

		ctx.textAlign = 'center';
		ctx.fillStyle = '#ff4444';
		ctx.font = 'bold 26px sans-serif';
		ctx.fillText('Boss Rush 失败', w / 2, h * 0.30);

		ctx.fillStyle = '#888';
		ctx.font = '14px sans-serif';
		ctx.fillText(`通过波次: ${this.currentWave} / ${WAVE_CONFIGS.length}`, w / 2, h * 0.42);
		ctx.fillText(`用时: ${_fmtTime(this.totalTime)}`, w / 2, h * 0.50);

		const btnW = 160, btnH = 44, btnX = w / 2 - btnW / 2, btnY = h * 0.62;
		ctx.fillStyle = '#2a1a1a';
		_safeRoundRect(ctx, btnX, btnY, btnW, btnH, 10);
		ctx.fill();
		ctx.strokeStyle = '#ff4444';
		ctx.lineWidth = 2;
		ctx.stroke();
		ctx.fillStyle = '#ff4444';
		ctx.font = 'bold 16px sans-serif';
		ctx.fillText('返回主菜单', w / 2, btnY + 28);

		this.continueBtnArea = { x: btnX, y: btnY, w: btnW, h: btnH };
		ctx.textAlign = 'left';
		ctx.restore();
	}

	// ─── 设置叠加层输入拦截器 ───
	_setOverlayInterceptor() {
		if (!this.game.input) return;
		this.game.input.setInterceptor((type, x, y) => {
			if (type === 'end') this.onTouchEnd(x, y);
		});
	}

	// ─── 触摸输入处理（由 Game.js 转发）───
	onTouchEnd(x, y) {
		if (this.state === 'reward') {
			for (const btn of this.rewardBtns) {
				if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
					this.selectReward(btn.idx);
					return;
				}
			}
		} else if (this.state === 'complete' || this.state === 'failed') {
			const btn = this.continueBtnArea;
			if (btn && x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
				this.game.input && this.game.input.clearInterceptor();
				this.game.bossRushMode = null;
				this.game.isRunning = false;
				this.game.sceneManager.switchTo('title');
			}
		}
	}

	// ─── 玩家死亡时调用 ───
	onPlayerDied() {
		this.state = 'failed';
		this.game.isRunning = false;
		this._recordBestWave(this.currentWave);
		// [R5-2 FIX] 失败只记录统计，不发 chips（chipMultiplier=0）
		if (this.game.meta) {
			const p = this.game.player;
			this.game.meta.endRun(this.totalTime, p.kills, p.level, 0);
		}
		this._setOverlayInterceptor();
	}
}

// ─── 工具函数 ───
function _fmtTime(t) {
	const m = Math.floor(t / 60);
	const s = Math.floor(t % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
}

// [BUG-R3-12 FIX] _safeRoundRect 已移至 CanvasUtils.js

module.exports = BossRushMode;
