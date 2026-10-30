// ─── 标题场景 ──────────────────────────
const { fastSin, fastCos } = require('../MathLUT');
const { drawRoundRect } = require('../UIRenderer');

class TitleScene {
	constructor() {
		this.buttons = [];
		this.time = 0;
	}

	enter() {
		this.buttons = [];
		this.time = 0;
	}

	draw(ctx, w, h) {
		this.time += 0.016;

		// 渐变背景
		const grad = ctx.createLinearGradient(0, 0, 0, h);
		grad.addColorStop(0, '#0a0a14');
		grad.addColorStop(1, '#0f0f1a');
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, w, h);

		// 安全区域内可用高度：避免刘海/Home 条遮挡
		const safeTop = (this.game && this.game.safeAreaTop) || 0;
		const safeBottom = (this.game && this.game.safeAreaBottom) || 0;
		const safeH = h - safeTop - safeBottom;
		// 辅助函数：将 0~1 比例映射到安全区内的 Y 坐标
		const sy = (ratio) => safeTop + safeH * ratio;

		// 标题光晕效果
		const glowAlpha = 0.3 + fastSin(this.time * 2) * 0.1;
		ctx.fillStyle = `rgba(0, 255, 204, ${glowAlpha})`;
		ctx.font = 'bold 34px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('EMBERFALL', w / 2, sy(0.17));

		// 主标题
		ctx.fillStyle = '#00ffcc';
		ctx.font = 'bold 34px sans-serif';
		ctx.fillText('EMBERFALL', w / 2, sy(0.17));

		// 副标题
		ctx.fillStyle = '#88ffdd';
		ctx.font = '14px sans-serif';
		ctx.fillText('长夜余烬', w / 2, sy(0.23));

		// 版本号与更新时间
		ctx.fillStyle = '#555';
		ctx.font = '10px sans-serif';
		ctx.fillText('二十分钟 · 五章远征', w / 2, sy(0.28));
		ctx.textAlign = 'left';

		// 按钮
		this.buttons = [];

		// 开始游戏按钮
		const btn1Y = sy(0.38);
		ctx.fillStyle = '#1a2a2a';
		drawRoundRect(ctx, w / 2 - 90, btn1Y, 180, 42, 10);
		ctx.fill();
		ctx.strokeStyle = '#00ffcc';
		ctx.lineWidth = 2;
		ctx.stroke();
		ctx.fillStyle = '#00ffcc';
		ctx.font = 'bold 17px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('▶ 开始游戏', w / 2, btn1Y + 27);
		this.buttons.push({ x: w / 2 - 90, y: btn1Y, w: 180, h: 42, action: 'start' });

		// 每日挑战 + 排行榜 + 成就（三列并排）
		const btn2Y = sy(0.50);
		const smallBtnW = 70;
		const smallBtnH = 34;
		const smallBtnSpacing = 6;
		const totalSmallBtnsW = smallBtnW * 3 + smallBtnSpacing * 2;
		const smallBtnsStartX = (w - totalSmallBtnsW) / 2;

		// 每日挑战
		ctx.fillStyle = '#2a2a1a';
		drawRoundRect(ctx, smallBtnsStartX, btn2Y, smallBtnW, smallBtnH, 6);
		ctx.fill();
		ctx.strokeStyle = '#ffcc00';
		ctx.lineWidth = 1.5;
		ctx.stroke();
		ctx.fillStyle = '#ffcc00';
		ctx.font = '13px sans-serif';
		ctx.fillText('📅 每日', smallBtnsStartX + smallBtnW / 2, btn2Y + 22);
		this.buttons.push({ x: smallBtnsStartX, y: btn2Y, w: smallBtnW, h: smallBtnH, action: 'daily' });

		// 排行榜
		const leaderX = smallBtnsStartX + smallBtnW + smallBtnSpacing;
		ctx.fillStyle = '#1a2a2a';
		drawRoundRect(ctx, leaderX, btn2Y, smallBtnW, smallBtnH, 6);
		ctx.fill();
		ctx.strokeStyle = '#00ffcc';
		ctx.lineWidth = 1.5;
		ctx.stroke();
		ctx.fillStyle = '#00ffcc';
		ctx.fillText('📊 排行', leaderX + smallBtnW / 2, btn2Y + 22);
		this.buttons.push({ x: leaderX, y: btn2Y, w: smallBtnW, h: smallBtnH, action: 'leaderboard' });

		// 成就按钮
		const achX = leaderX + smallBtnW + smallBtnSpacing;
		ctx.fillStyle = '#1a1a2a';
		drawRoundRect(ctx, achX, btn2Y, smallBtnW, smallBtnH, 6);
		ctx.fill();
		ctx.strokeStyle = '#aa44ff';
		ctx.lineWidth = 1.5;
		ctx.stroke();
		ctx.fillStyle = '#aa44ff';
		ctx.fillText('🏆 成就', achX + smallBtnW / 2, btn2Y + 22);
		this.buttons.push({ x: achX, y: btn2Y, w: smallBtnW, h: smallBtnH, action: 'achievement' });

		// 图鉴
		const btn3Y = sy(0.60);
		ctx.fillStyle = '#1a2a2a';
		drawRoundRect(ctx, w / 2 - 80, btn3Y, 160, 36, 8);
		ctx.fill();
		ctx.strokeStyle = '#00ffcc';
		ctx.lineWidth = 1.5;
		ctx.stroke();
		ctx.fillStyle = '#00ffcc';
		ctx.font = '14px sans-serif';
		ctx.fillText('📖 图鉴', w / 2, btn3Y + 23);
		this.buttons.push({ x: w / 2 - 80, y: btn3Y, w: 160, h: 36, action: 'compendium' });

		// 芯片商店
		const btn4Y = sy(0.70);
		ctx.fillStyle = '#2a2a1a';
		drawRoundRect(ctx, w / 2 - 80, btn4Y, 160, 36, 8);
		ctx.fill();
		ctx.strokeStyle = '#ffcc00';
		ctx.lineWidth = 1.5;
		ctx.stroke();
		ctx.fillStyle = '#ffcc00';
		ctx.fillText('🛒 芯片商店', w / 2, btn4Y + 23);
		this.buttons.push({ x: w / 2 - 80, y: btn4Y, w: 160, h: 36, action: 'shop' });

		// Boss Rush 按钮
		const btn5Y = sy(0.79);
		ctx.fillStyle = '#2a0a0a';
		drawRoundRect(ctx, w / 2 - 80, btn5Y, 160, 36, 8);
		ctx.fill();
		ctx.strokeStyle = '#ff4455';
		ctx.lineWidth = 1.5;
		ctx.stroke();
		ctx.fillStyle = '#ff4455';
		ctx.fillText('⚡ Boss Rush', w / 2, btn5Y + 23);
		this.buttons.push({ x: w / 2 - 80, y: btn5Y, w: 160, h: 36, action: 'bossRush' });

		// 速通模式按钮
		const btn6Y = sy(0.89);
		ctx.fillStyle = '#1a1a0a';
		drawRoundRect(ctx, w / 2 - 80, btn6Y, 160, 36, 8);
		ctx.fill();
		ctx.strokeStyle = '#ff9900';
		ctx.lineWidth = 1.5;
		ctx.stroke();
		ctx.fillStyle = '#ff9900';
		ctx.fillText('⏱ 速通模式', w / 2, btn6Y + 23);
		this.buttons.push({ x: w / 2 - 80, y: btn6Y, w: 160, h: 36, action: 'speedRun' });

		ctx.textAlign = 'left';

		// 底部提示（在底部安全区上方）
		ctx.fillStyle = '#666';
		ctx.font = '11px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('WASD / 触摸拖动移动 · 空格闪避 · E 技能', w / 2, h - safeBottom - 10);
		ctx.textAlign = 'left';
	}

	onTouchStart(x, y) {
		for (const btn of this.buttons) {
			if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
				switch (btn.action) {
					case 'start':
						this.manager.switchTo('charSelect');
						break;
					case 'daily':
						this.manager.switchTo('daily');
						break;
					case 'leaderboard':
						this.manager.switchTo('leaderboard');
						break;
					case 'achievement':
						this.manager.switchTo('achievements');
						break;
					case 'compendium':
						this.manager.switchTo('compendium');
						break;
					case 'shop':
						this.manager.switchTo('shop');
						break;
					case 'bossRush':
						this.manager.switchTo('charSelect', { bossRushMode: true });
						break;
					case 'speedRun':
						this.manager.switchTo('speedRun');
						break;
				}
				return;
			}
		}
	}
}

module.exports = TitleScene;
