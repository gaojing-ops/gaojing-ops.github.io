// ─── 游戏结算场景 ──────────────────────────
const { drawRoundRect } = require('../UIRenderer');

class GameOverScene {
	constructor() {
		this.restartBtn = null;
		this.shopBtn = null;
		this.endlessBtn = null; // 无尽模式按钮
		this.shareBtn = null; // 分享按钮
		this.data = {};
	}

	enter(data) {
		this.data = data || {};
		// 排行榜: 提交最高分到微信开放数据域
		this._submitScore(data);
	}

	_submitScore(d) {
		try {
			const score = (d.kills || 0) * (d.level || 1);
			const time = d.time || '00:00';
			wx.setUserCloudStorage({
				KVDataList: [
					{ key: 'bestScore', value: String(score) },
					{ key: 'bestTime', value: time },
					{ key: 'bestKills', value: String(d.kills || 0) },
				],
			});
		} catch (e) { /* 非微信环境或API不可用 */ }
	}

	draw(ctx, w, h) {
		// 重置按钮状态 (防止上次渲染的按钮残留)
		this.restartBtn = null;
		this.shopBtn = null;
		this.endlessBtn = null;
		this.shareBtn = null;

		// 深色背景
		ctx.fillStyle = '#0a0a14';
		ctx.fillRect(0, 0, w, h);

		const topOffset = (this.game && this.game.safeAreaTop) || 0;
		const d = this.data;
		const isVictory = d.victory || false;
		const canEndless = isVictory && !d.endlessMode; // 只有首次通关才能进入无尽

		// 标题
		const title = d.endlessMode ? '无尽终结' : (isVictory ? '系统通关' : '系统断线');
		const titleColor = d.endlessMode ? '#ff00ff' : (isVictory ? '#00ffcc' : '#ff0055');
		ctx.fillStyle = titleColor;
		ctx.font = 'bold 24px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(title, w / 2, 35 + topOffset);

		// 无尽模式波数显示
		if (d.endlessMode && d.endlessWave) {
			ctx.font = 'bold 13px sans-serif';
			ctx.fillStyle = '#ff00ff';
			ctx.fillText(`波数 ${d.endlessWave}`, w / 2, 55 + topOffset);
		}

		// ─── 详细统计卡片 ───
		const cardX = w * 0.08;
		const cardW = w * 0.84;
		const cardY = 65 + topOffset;
		const cardH = Math.min(h * 0.45, 260); // 限制卡片高度

		ctx.fillStyle = 'rgba(255,255,255,0.03)';
		drawRoundRect(ctx, cardX, cardY, cardW, cardH, 10);
		ctx.fill();
		ctx.strokeStyle = 'rgba(255,255,255,0.1)';
		ctx.lineWidth = 1;
		ctx.stroke();

		// 统计数据 - 左右两列
		const leftStats = [
			{ label: '存活时间', value: d.time || '00:00', icon: '⏱' },
			{ label: '击杀数', value: String(d.kills || 0), icon: '💀' },
			{ label: '等级', value: String(d.level || 1), icon: '📊' },
			{ label: '最高连杀', value: String(d.highestCombo || 0), icon: '🔥' },
			{ label: '每秒伤害', value: String(Math.round((d.totalDamage || 0) / Math.max(1, d.timeSeconds || 1))), icon: '⚡' },
		];

		const rightStats = [
			{ label: '总伤害', value: this._formatNumber(d.totalDamage || 0), icon: '⚔' },
			{ label: '获得经验', value: this._formatNumber(d.totalXp || 0), icon: '✨' },
			{ label: '治疗量', value: this._formatNumber(d.totalHealed || 0), icon: '💚' },
			{ label: '收集宝石', value: String(d.gemsCollected || 0), icon: '💎' },
		];

		// 左列
		let statY = cardY + 25;
		ctx.textAlign = 'left';
		for (const s of leftStats) {
			ctx.font = '12px sans-serif';
			ctx.fillStyle = '#888';
			ctx.fillText(`${s.icon} ${s.label}`, cardX + 15, statY);
			ctx.font = 'bold 18px sans-serif';
			ctx.fillStyle = '#fff';
			ctx.fillText(s.value, cardX + 15, statY + 20);
			statY += 38;
		}

		// 右列
		statY = cardY + 25;
		const rightX = cardX + cardW / 2 + 10;
		for (const s of rightStats) {
			ctx.font = '12px sans-serif';
			ctx.fillStyle = '#888';
			ctx.fillText(`${s.icon} ${s.label}`, rightX, statY);
			ctx.font = 'bold 18px sans-serif';
			ctx.fillStyle = '#fff';
			ctx.fillText(s.value, rightX, statY + 20);
			statY += 38;
		}

		// 武器展示
		if (d.weapons && d.weapons.length > 0) {
			const weaponY = cardY + cardH - 15;
			ctx.font = '11px sans-serif';
			ctx.fillStyle = '#666';
			ctx.fillText('装备:', cardX + 15, weaponY);

			let wx = cardX + 55;
			for (const weapon of d.weapons) {
				ctx.fillStyle = weapon.color || '#fff';
				ctx.fillText(`${weapon.name} Lv.${weapon.level}`, wx, weaponY);
				wx += 80;
				if (wx > cardX + cardW - 50) break;
			}
		}

		// 芯片奖励
		let bonusY = cardY + cardH + 20;
		if (d.chips !== undefined) {
			const curseLabel = d.curseMult > 1 ? ` (诅咒 ×${d.curseMult.toFixed(2)})` : '';
			ctx.font = 'bold 15px sans-serif';
			ctx.fillStyle = '#ffcc00';
			ctx.textAlign = 'center';
			ctx.fillText(`💾 +${d.chips} 芯片` + curseLabel, w / 2, bonusY);
			bonusY += 22;
		}

		// 最佳记录对比
		if (d.isNewKillRecord || d.isNewTimeRecord) {
			ctx.font = 'bold 13px sans-serif';
			ctx.fillStyle = '#ff4455';
			ctx.textAlign = 'center';
			const records = [];
			if (d.isNewKillRecord) records.push(`击杀 ${d.kills} ▲`);
			if (d.isNewTimeRecord) records.push(`时间 ${d.time} ▲`);
			ctx.fillText('🏆 新纪录! ' + records.join('  '), w / 2, bonusY);
			bonusY += 20;
		} else if (d.prevBestKills > 0) {
			// 显示距离纪录差距
			ctx.font = '11px sans-serif';
			ctx.fillStyle = '#666';
			ctx.textAlign = 'center';
			const killDiff = d.prevBestKills - (d.kills || 0);
			ctx.fillText(`距击杀纪录 ${d.prevBestKills} 还差 ${killDiff}`, w / 2, bonusY);
			bonusY += 16;
		}

		// 新成就
		if (d.newAchievements && d.newAchievements.length > 0) {
			ctx.font = 'bold 12px sans-serif';
			ctx.fillStyle = '#ff8800';
			ctx.textAlign = 'center';
			ctx.fillText('🏆 解锁成就: ' + d.newAchievements.map(a => a.name).join(' / '), w / 2, bonusY);
		}

		ctx.textAlign = 'left';

		// 按钮 - 固定在底部
		const btnW = 100;
		const btnH = 38;
		const bottomOffset = 70 + ((this.game && this.game.safeAreaBottom) || 0); // 距底部距离 + 底部安全区

		// 如果可以进入无尽模式，显示三个按钮
		if (canEndless) {
			const btnY = h - bottomOffset;
			const btnSpacing = 8;
			const totalWidth = btnW * 3 + btnSpacing * 2;
			const startX = (w - totalWidth) / 2;

			// 继续挑战按钮（无尽模式）
			ctx.fillStyle = '#2a1a2a';
			drawRoundRect(ctx, startX, btnY, btnW, btnH, 8);
			ctx.fill();
			ctx.strokeStyle = '#ff00ff';
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.fillStyle = '#ff00ff';
			ctx.font = 'bold 13px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText('继续挑战', startX + btnW / 2, btnY + 16);
			ctx.font = '10px sans-serif';
			ctx.fillStyle = '#ff88ff';
			ctx.fillText('(无尽模式)', startX + btnW / 2, btnY + 30);
			this.endlessBtn = { x: startX, y: btnY, w: btnW, h: btnH };

			// 重新开始按钮
			ctx.fillStyle = '#1a2a2a';
			drawRoundRect(ctx, startX + btnW + btnSpacing, btnY, btnW, btnH, 8);
			ctx.fill();
			ctx.strokeStyle = '#00ffcc';
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.fillStyle = '#00ffcc';
			ctx.font = 'bold 13px sans-serif';
			ctx.fillText('重新开始', startX + btnW + btnSpacing + btnW / 2, btnY + 24);
			this.restartBtn = { x: startX + btnW + btnSpacing, y: btnY, w: btnW, h: btnH };

			// 芯片商店按钮
			ctx.fillStyle = '#2a2a1a';
			drawRoundRect(ctx, startX + (btnW + btnSpacing) * 2, btnY, btnW, btnH, 8);
			ctx.fill();
			ctx.strokeStyle = '#ffcc00';
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.fillStyle = '#ffcc00';
			ctx.fillText('芯片商店', startX + (btnW + btnSpacing) * 2 + btnW / 2, btnY + 24);
			this.shopBtn = { x: startX + (btnW + btnSpacing) * 2, y: btnY, w: btnW, h: btnH };
		} else {
			// 普通两个按钮
			const btnY = h - bottomOffset;

			// 重新开始按钮
			ctx.fillStyle = '#1a2a2a';
			drawRoundRect(ctx, w / 2 - btnW - 10, btnY, btnW, btnH, 8);
			ctx.fill();
			ctx.strokeStyle = '#00ffcc';
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.fillStyle = '#00ffcc';
			ctx.font = 'bold 13px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText('重新开始', w / 2 - btnW / 2 - 10, btnY + 24);
			this.restartBtn = { x: w / 2 - btnW - 10, y: btnY, w: btnW, h: btnH };

			// 芯片商店按钮
			ctx.fillStyle = '#2a2a1a';
			drawRoundRect(ctx, w / 2 + 10, btnY, btnW, btnH, 8);
			ctx.fill();
			ctx.strokeStyle = '#ffcc00';
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.fillStyle = '#ffcc00';
			ctx.fillText('芯片商店', w / 2 + btnW / 2 + 10, btnY + 24);
			this.shopBtn = { x: w / 2 + 10, y: btnY, w: btnW, h: btnH };

			// 分享按钮 (底部中央)
			const shareBtnY = btnY + btnH + 12;
			ctx.fillStyle = '#1a1a2a';
			drawRoundRect(ctx, (w - btnW) / 2, shareBtnY, btnW, 30, 6);
			ctx.fill();
			ctx.strokeStyle = '#8888ff';
			ctx.lineWidth = 1;
			ctx.stroke();
			ctx.fillStyle = '#8888ff';
			ctx.font = 'bold 11px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText('📤 分享战绩', w / 2, shareBtnY + 19);
			this.shareBtn = { x: (w - btnW) / 2, y: shareBtnY, w: btnW, h: 30 };
		}
		ctx.textAlign = 'left';
	}

	_formatNumber(num) {
		if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
		if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
		return String(Math.floor(num));
	}

	onTouchStart(x, y) {
		// 无尽模式按钮
		if (this.endlessBtn && x >= this.endlessBtn.x && x <= this.endlessBtn.x + this.endlessBtn.w && y >= this.endlessBtn.y && y <= this.endlessBtn.y + this.endlessBtn.h) {
			// 通知游戏进入无尽模式
			if (this.manager.game) {
				this.manager.game.enterEndlessMode();
			}
			return;
		}
		if (this.restartBtn && x >= this.restartBtn.x && x <= this.restartBtn.x + this.restartBtn.w && y >= this.restartBtn.y && y <= this.restartBtn.y + this.restartBtn.h) {
			this.manager.switchTo('charSelect');
			return;
		}
		if (this.shopBtn && x >= this.shopBtn.x && x <= this.shopBtn.x + this.shopBtn.w && y >= this.shopBtn.y && y <= this.shopBtn.y + this.shopBtn.h) {
			this.manager.switchTo('shop');
			return;
		}
		// 分享按钮
		if (this.shareBtn && x >= this.shareBtn.x && x <= this.shareBtn.x + this.shareBtn.w && y >= this.shareBtn.y && y <= this.shareBtn.y + this.shareBtn.h) {
			this._shareResult();
			return;
		}
	}

	_shareResult() {
		const d = this.data;
		const kills = d.kills || 0;
		const level = d.level || 1;
		const time = d.time || '00:00';
		const combo = d.highestCombo || 0;
		// 根据战绩动态生成有竞争力的分享文案
		let title;
		if (d.victory) {
			title = `🏆 我通关了FluxMusou！Lv.${level} | ${kills}杀 | ${time} 你能超过我吗？`;
		} else if (kills > 300) {
			title = `💀 一局砍了${kills}个怪！Lv.${level} | 最高${combo}连杀，来挑战！`;
		} else if (combo > 20) {
			title = `🔥 ${combo}连杀！FluxMusou真的太爽了，Lv.${level} | ${kills}杀`;
		} else {
			title = `⚡ FluxMusou Lv.${level} | ${kills}杀 | ${time}，你能撑多久？`;
		}
		try {
			wx.shareAppMessage({
				title: title,
				imageUrl: 'https://mmgame.qpic.cn/image/64fb467098ce0e35ae8c8396b3a95c67222b5ab846787b8d8de3417c548ac073/0',
			});
		} catch (e) {
			console.warn('Share failed:', e);
		}
	}
}

module.exports = GameOverScene;
