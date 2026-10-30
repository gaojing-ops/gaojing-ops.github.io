// ─── 成就场景 ──────────────────────────
const UI = require('../UIRenderer');
const { ACHIEVEMENT_DEFS } = require('../AchievementSystem');

class AchievementScene {
	constructor() {
		this.backBtn = null;
		this.scrollOffset = 0;
		this.lastTouchY = null;
		this.isDragging = false;
		this.contentHeight = 0; // 内容总高度
	}

	enter() {
		this.scrollOffset = 0;
		this.isDragging = false;
	}

	draw(ctx, w, h) {
		UI.drawOverlay(ctx, w, h, 1.0);

		// 获取安全区域偏移
		const topOffset = (this.game && this.game.safeAreaTop) || 0;

		UI.drawCenteredText(ctx, '🏆 成就', w / 2, 40 + topOffset, {
			fontSize: 20, color: '#aa88ff', shadow: '#aa88ff',
		});

		const achievements = this.game && this.game.achievements;
		if (!achievements) return;

		const allDefs = ACHIEVEMENT_DEFS || [];

		// 统计已解锁数量
		const unlockedCount = allDefs.filter(a => achievements.isUnlocked(a.id)).length;
		UI.drawCenteredText(ctx, `已解锁: ${unlockedCount}/${allDefs.length}`, w / 2, 65 + topOffset, {
			fontSize: 11, color: '#888', fontStyle: 'normal',
		});

		// 滚动区域参数
		const scrollStartY = 90 + topOffset;
		const scrollEndY = h - 80;
		const scrollAreaHeight = scrollEndY - scrollStartY;
		const cardW = w * 0.85;
		const cardH = 40;
		const gap = 4;
		const totalContentHeight = allDefs.length * (cardH + gap) - gap;
		this.contentHeight = totalContentHeight;

		// 计算最大滚动距离
		const maxScroll = Math.max(0, totalContentHeight - scrollAreaHeight);
		this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, maxScroll));

		// 设置裁剪区域
		ctx.save();
		ctx.beginPath();
		ctx.rect(0, scrollStartY, w, scrollAreaHeight);
		ctx.clip();

		let cy = scrollStartY - this.scrollOffset;

		for (const ach of allDefs) {
			const unlocked = achievements.isUnlocked(ach.id);
			const x = (w - cardW) / 2;
			const y = cy;

			// 只绘制可见区域内的卡片（带缓冲）
			if (y + cardH > scrollStartY - cardH && y < scrollEndY + cardH) {
				UI.drawCard(ctx, x, y, cardW, cardH, {
					borderColor: unlocked ? '#ffcc0033' : 'rgba(255,255,255,0.06)',
					bgColor: unlocked ? 'rgba(255,204,0,0.05)' : 'rgba(255,255,255,0.02)',
				});

				ctx.save();
				ctx.font = 'bold 12px sans-serif';
				ctx.fillStyle = unlocked ? '#ffcc00' : '#555';
				ctx.fillText(unlocked ? '✅ ' + ach.name : '🔒 ???', x + 12, y + 18);

				ctx.font = '10px sans-serif';
				ctx.fillStyle = unlocked ? '#999' : '#444';
				ctx.fillText(unlocked ? ach.desc : '未解锁', x + 12, y + 32);
				ctx.restore();
			}

			cy += cardH + gap;
		}

		ctx.restore();

		// 绘制滚动指示器（当内容超出时）
		if (totalContentHeight > scrollAreaHeight) {
			const indicatorHeight = Math.max(30, (scrollAreaHeight / totalContentHeight) * scrollAreaHeight);
			const indicatorY = scrollStartY + (this.scrollOffset / maxScroll) * (scrollAreaHeight - indicatorHeight);

			ctx.fillStyle = 'rgba(255,255,255,0.3)';
			ctx.fillRect(w - 6, indicatorY, 3, indicatorHeight);
		}

		// 返回按钮
		this.backBtn = UI.drawButton(ctx, '返回', w / 2, h - 40, {
			fontSize: 13, color: '#aaa',
			bgColor: 'rgba(255,255,255,0.12)',
			borderColor: 'rgba(255,255,255,0.35)',
		});
	}

	onTouchStart(x, y) {
		this.lastTouchY = y;
		this.isDragging = false;
	}

	onTouchEnd(x, y) {
		if (this.isDragging) {
			this.isDragging = false;
			return;
		}
		this.isDragging = false;
		if (this.backBtn && UI.hitTest(x, y, this.backBtn)) {
			this.manager.switchTo('title');
		}
	}

	onTouchMove(x, y) {
		if (this.lastTouchY !== null) {
			const deltaY = this.lastTouchY - y;
			if (Math.abs(deltaY) > 5) this.isDragging = true;
			if (this.isDragging) {
				this.scrollOffset = Math.max(0, this.scrollOffset + deltaY);
				this.lastTouchY = y;
			}
		}
	}
}

module.exports = AchievementScene;
