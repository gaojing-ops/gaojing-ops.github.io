// ─── 诅咒选择场景（连续滚动） ──────────────────────────
const { CURSE_DEFS, getChipMultiplier } = require('../CurseSystem');
const { drawRoundRect } = require('../UIRenderer');

class CurseSelectScene {
	constructor() {
		this.defs = [];
		this.cards = [];
		this.confirmBtn = null;
		this.backBtn = null;
		this.onConfirm = null;
		this.scrollOffset = 0;
		this.contentHeight = 0;
		// 触摸滑动
		this.touchStartY = 0;
		this.lastTouchY = 0;
		this.isDragging = false;
		this.touchStartedHere = false; // 追踪触摸是否在本场景开始
	}

	enter(data) {
		if (data && data.onConfirm) this.onConfirm = data.onConfirm;
		this.charId = (data && data.charId) || 'tracer';
		const metaData = (data && data.metaData) || {};

		// 加载上次勾选的诅咒 ID
		let lastIds = [];
		try {
			const saved = wx.getStorageSync('flux_last_curses');
			if (saved) lastIds = JSON.parse(saved);
		} catch (e) { }

		try {
			this.defs = CURSE_DEFS.map(c => {
				const unlocked = c.unlockCheck ? c.unlockCheck(metaData) : false;
				return {
					...c,
					unlocked,
					// 已解锁且上次勾选过，则默认勾上
					active: unlocked && lastIds.includes(c.id),
				};
			});
		} catch (e) {
			console.error('CurseSelectScene enter error:', e);
			this.defs = CURSE_DEFS.map(c => ({
				...c,
				unlocked: c.unlocked || false,
				active: false,
			}));
		}
		this.scrollOffset = 0;
		this.touchStartedHere = false;
	}

	_getTotalHeat() {
		return this.defs.filter(c => c.active).reduce((s, c) => s + c.heat, 0);
	}

	draw(ctx, w, h) {
		// 深色背景
		ctx.fillStyle = '#0a0a12';
		ctx.fillRect(0, 0, w, h);

		const topOffset = (this.game && this.game.safeAreaTop) || 0;
		const margin = Math.max(15, w * 0.04);

		// 标题
		ctx.fillStyle = '#ff4444';
		ctx.font = 'bold 18px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('诅咒契约', w / 2, 28 + topOffset);
		ctx.fillStyle = '#aaaaaa';
		ctx.font = '10px sans-serif';
		ctx.fillText('主动叠加诅咒，换取更多芯片奖励', w / 2, 44 + topOffset);
		ctx.textAlign = 'left';

		const totalHeat = this._getTotalHeat();
		const chipMult = getChipMultiplier(totalHeat);

		// 热度和芯片倍率
		ctx.fillStyle = '#ffcc00';
		ctx.font = 'bold 11px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(`热度: ${totalHeat}`, w / 2 - 50, 62 + topOffset);
		ctx.fillText(`芯片: ×${chipMult.toFixed(2)}`, w / 2 + 50, 62 + topOffset);
		ctx.textAlign = 'left';

		// 计算滚动区域
		const startY = 78 + topOffset;
		const btnAreaHeight = 85; // 底部按钮区域高度（包含已选提示）
		const scrollAreaHeight = h - startY - btnAreaHeight;

		const cardW = w - margin * 2;
		const cardH = 42;
		const gap = 5;

		this.contentHeight = this.defs.length * (cardH + gap) - gap;
		const maxScroll = Math.max(0, this.contentHeight - scrollAreaHeight);
		this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, maxScroll));

		// 设置裁剪区域
		ctx.save();
		ctx.beginPath();
		ctx.rect(0, startY, w, scrollAreaHeight);
		ctx.clip();

		this.cards = [];
		let cy = startY - this.scrollOffset;

		this.defs.forEach((curse, idx) => {
			const x = margin;
			const y = cy;

			// 只绘制可见区域内的卡片
			if (y + cardH > startY && y < startY + scrollAreaHeight) {
				const canUse = curse.unlocked;
				const isActive = curse.active;

				ctx.save();
				if (!canUse) ctx.globalAlpha = 0.5;

				// 卡片背景
				ctx.fillStyle = isActive ? '#2a1a1a' : '#1a1a28';
				drawRoundRect(ctx, x, y, cardW, cardH, 6);
				ctx.fill();

				// 边框
				ctx.strokeStyle = isActive ? '#ff4444' : '#333344';
				ctx.lineWidth = isActive ? 2 : 1;
				ctx.stroke();

				// 图标
				ctx.font = '14px sans-serif';
				ctx.fillText(curse.icon, x + 8, y + 26);

				// 名称
				ctx.font = 'bold 11px sans-serif';
				ctx.fillStyle = isActive ? '#ff6666' : canUse ? '#ffffff' : '#666666';
				ctx.fillText(curse.name, x + 30, y + 16);

				// 热度（火焰图标）
				ctx.font = '9px sans-serif';
				ctx.fillStyle = '#ff8844';
				ctx.fillText('🔥'.repeat(Math.min(curse.heat, 5)), x + 30 + ctx.measureText(curse.name).width + 4, y + 16);

				// 描述
				ctx.font = '10px sans-serif';
				ctx.fillStyle = canUse ? '#aaaaaa' : '#555555';
				const desc = canUse ? curse.desc : '🔒 ' + curse.unlockHint;
				ctx.fillText(desc, x + 30, y + 32);

				// 勾选状态
				ctx.font = '14px sans-serif';
				ctx.textAlign = 'right';
				ctx.fillStyle = isActive ? '#ff4444' : '#444466';
				ctx.fillText(isActive ? '☑' : '☐', x + cardW - 8, y + 28);
				ctx.textAlign = 'left';

				ctx.restore();

				if (canUse) {
					this.cards.push({ x, y, w: cardW, h: cardH, idx });
				}
			}

			cy += cardH + gap;
		});

		ctx.restore();

		// 绘制滚动指示器
		if (this.contentHeight > scrollAreaHeight) {
			const indicatorHeight = Math.max(30, (scrollAreaHeight / this.contentHeight) * scrollAreaHeight);
			const indicatorY = startY + (this.scrollOffset / maxScroll) * (scrollAreaHeight - indicatorHeight);

			ctx.fillStyle = 'rgba(255,68,68,0.4)';
			ctx.fillRect(w - 5, indicatorY, 3, indicatorHeight);
		}

		// 底部按钮区域 - 固定在底部
		const btnY = h - 55;
		const btnW = 80;
		const btnH = 32;

		// 返回按钮
		ctx.fillStyle = '#1a1a2a';
		drawRoundRect(ctx, w / 2 - btnW - 8, btnY, btnW, btnH, 8);
		ctx.fill();
		ctx.strokeStyle = '#666';
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.fillStyle = '#cccccc';
		ctx.font = '13px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('返回', w / 2 - btnW / 2 - 8, btnY + 22);
		ctx.textAlign = 'left';
		this.backBtn = { x: w / 2 - btnW - 8, y: btnY, w: btnW, h: btnH };

		// 确认按钮
		ctx.fillStyle = '#2a1a1a';
		drawRoundRect(ctx, w / 2 + 8, btnY, btnW, btnH, 8);
		ctx.fill();
		ctx.strokeStyle = '#ff4444';
		ctx.lineWidth = 2;
		ctx.stroke();
		ctx.fillStyle = '#ff6666';
		ctx.textAlign = 'center';
		ctx.fillText('确认出击', w / 2 + 8 + btnW / 2, btnY + 22);
		ctx.textAlign = 'left';
		this.confirmBtn = { x: w / 2 + 8, y: btnY, w: btnW, h: btnH };

		// 已选诅咒数量提示
		const activeCount = this.defs.filter(c => c.active).length;
		if (activeCount > 0) {
			ctx.fillStyle = '#ff8866';
			ctx.font = '11px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText(`已选 ${activeCount} 个诅咒`, w / 2, h - 18);
			ctx.textAlign = 'left';
		}
	}

	onTouchStart(x, y) {
		this.touchStartY = y;
		this.lastTouchY = y;
		this.isDragging = false;
		this.touchStartedHere = true; // 标记触摸在本场景开始
	}

	onTouchMove(x, y) {
		const deltaY = this.lastTouchY - y;
		if (Math.abs(deltaY) > 5) {
			this.isDragging = true;
		}
		if (this.isDragging) {
			this.scrollOffset = Math.max(0, this.scrollOffset + deltaY);
			this.lastTouchY = y;
		}
	}

	onTouchEnd(x, y) {
		// 如果触摸不是在本场景开始的，忽略
		if (!this.touchStartedHere) {
			return;
		}
		this.touchStartedHere = false;

		// 如果是拖拽，不处理点击
		if (this.isDragging) {
			this.isDragging = false;
			return;
		}

		// 点击诅咒卡片切换
		for (const card of this.cards) {
			if (x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h) {
				this.defs[card.idx].active = !this.defs[card.idx].active;
				return;
			}
		}

		// 确认
		if (this.confirmBtn && x >= this.confirmBtn.x && x <= this.confirmBtn.x + this.confirmBtn.w &&
			y >= this.confirmBtn.y && y <= this.confirmBtn.y + this.confirmBtn.h) {
			const activeCurses = this.defs.filter(c => c.active);
			// 保存本次勾选，下次自动恢复
			try {
				wx.setStorageSync('flux_last_curses', JSON.stringify(activeCurses.map(c => c.id)));
			} catch (e) { }
			if (this.onConfirm) this.onConfirm({ charId: this.charId, curses: activeCurses });
			return;
		}

		// 返回
		if (this.backBtn && x >= this.backBtn.x && x <= this.backBtn.x + this.backBtn.w &&
			y >= this.backBtn.y && y <= this.backBtn.y + this.backBtn.h) {
			if (this.onBack) {
				this.onBack();
			} else if (this.manager) {
				this.manager.switchTo('charSelect');
			}
		}
	}
}

module.exports = CurseSelectScene;
