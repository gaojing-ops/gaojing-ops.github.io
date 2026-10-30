// ─── 角色选择场景 ──────────────────────────
const { CHARACTERS } = require('../Character');
const Art = require('../Art');
const { drawRoundRect } = require('../UIRenderer');

class CharSelectScene {
	constructor() {
		this.cards = [];
		this.backBtn = null;
		this.onSelect = null;
		this.scrollOffset = 0;
		this.contentHeight = 0;
		// 触摸滑动
		this.touchStartY = 0;
		this.lastTouchY = 0;
		this.isDragging = false;
		this.touchStartedHere = false; // 追踪触摸是否在本场景开始
		// Build 系统
		this.selectedCharId = null;  // 当前选中的角色
		this.selectedBuild = null;   // 从 BuildSelectScene 返回的 Build
		this.startBtn = null;        // 开始按钮
		this.buildBtn = null;        // Build 按钮
		this.bossRushMode = false;   // 是否 Boss Rush 模式
		this.speedRunMode = false;   // 是否速通模式
		// 角色像素头像缓存
		this._portraits = {};
	}

	_loadPortraits() { return Art.preload(); }

	enter(data) {
		if (data && data.onSelect) this.onSelect = data.onSelect;
		this.cards = [];
		this.scrollOffset = 0;
		this.touchStartedHere = false;
		this.selectedCharId = null;
		this.selectedBuild = null;
		this.bossRushMode = !!(data && data.bossRushMode);
		this.speedRunMode = !!(data && data.speedRunMode);
		this._loadPortraits();
	}

	draw(ctx, w, h) {
		// 深色背景
		ctx.fillStyle = '#0a0a12';
		ctx.fillRect(0, 0, w, h);

		const topOffset = (this.game && this.game.safeAreaTop) || 0;

		// 标题
		ctx.fillStyle = '#00ffcc';
		ctx.font = 'bold 20px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('选择角色', w / 2, 35 + topOffset);
		ctx.textAlign = 'left';

		// 计算滚动区域
		const startY = 55 + topOffset;
		const bottomY = h - 60;
		const scrollAreaHeight = bottomY - startY;
		const cardW = w * 0.88;
		const cardH = 110;
		const gap = 8;

		const charList = Object.entries(CHARACTERS);
		this.contentHeight = charList.length * (cardH + gap) - gap;
		const maxScroll = Math.max(0, this.contentHeight - scrollAreaHeight);
		this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, maxScroll));

		// 设置裁剪区域
		ctx.save();
		ctx.beginPath();
		ctx.rect(0, startY, w, scrollAreaHeight);
		ctx.clip();

		this.cards = [];
		let cy = startY - this.scrollOffset;

		charList.forEach(([id, char]) => {
			const x = (w - cardW) / 2;
			const y = cy;

			// 只绘制可见区域内的卡片（带缓冲）
			if (y + cardH > startY - cardH && y < bottomY + cardH) {
				const isSelected = this.selectedCharId === id;

				// 卡片背景
				ctx.fillStyle = isSelected ? '#1a1a44' : '#16162a';
				drawRoundRect(ctx, x, y, cardW, cardH, 10);
				ctx.fill();

				// 卡片边框
				ctx.strokeStyle = isSelected ? '#ffdd44' : char.color;
				ctx.lineWidth = isSelected ? 3 : 2;
				ctx.stroke();

				// 左侧颜色条
				ctx.fillStyle = char.color;
				ctx.fillRect(x, y, 5, cardH);

				// 像素头像
				const portrait = this._portraits[id];
				const portSize = 68;
				const portX = x + 8;
				const portY = y + (cardH - portSize) / 2;
				if (Art.drawPortrait(ctx,id,portX,portY,portSize)) {
					// Same atlas used for the live player.
				} else if (portrait && portrait.width) {
					ctx.drawImage(portrait, portX, portY, portSize, portSize);
				} else {
					// 占位色块（图片未加载时）
					ctx.fillStyle = char.color + '33';
					ctx.fillRect(portX, portY, portSize, portSize);
					ctx.fillStyle = char.color;
					ctx.font = 'bold 22px sans-serif';
					ctx.textAlign = 'center';
					ctx.fillText(char.name[0], portX + portSize / 2, portY + portSize / 2 + 8);
					ctx.textAlign = 'left';
				}

				// 文字区域（头像右侧）
				const tx = x + portSize + 14;
				const maxTextW = cardW - (tx - x) - 10;

				// 角色名
				ctx.font = 'bold 16px sans-serif';
				ctx.fillStyle = '#ffffff';
				ctx.fillText(char.name, tx, y + 22, maxTextW);

				// 描述
				ctx.font = '12px sans-serif';
				ctx.fillStyle = '#cccccc';
				ctx.fillText(char.desc, tx, y + 38, maxTextW);

				// 天赋
				ctx.fillStyle = char.color;
				ctx.font = '11px sans-serif';
				const passives = char.passive.split(' / ');
				let currentY = y + 54;
				ctx.fillText('天赋: ' + passives[0], tx, currentY, maxTextW);
				for (let i = 1; i < passives.length; i++) {
					currentY += 13;
					ctx.fillText('      ' + passives[i], tx, currentY, maxTextW);
				}

				// 属性
				ctx.fillStyle = '#aaaaaa';
				ctx.font = '10px sans-serif';
				currentY += 16;
				ctx.fillText(
					`HP:${char.stats.maxHp}  速:${char.stats.speed}  攻:${(char.stats.might * 100).toFixed(0)}%`,
					tx, currentY, maxTextW
				);
				currentY += 14;
				ctx.fillText(
					`元素: ${char.element || '-'}  武器: ${char.startWeapon || '-'}`,
					tx, currentY, maxTextW
				);

				this.cards.push({ x, y, w: cardW, h: cardH, id });
			}

			cy += cardH + gap;
		});

		ctx.restore();

		// 绘制滚动指示器
		if (this.contentHeight > scrollAreaHeight) {
			const indicatorHeight = Math.max(30, (scrollAreaHeight / this.contentHeight) * scrollAreaHeight);
			const indicatorY = startY + (this.scrollOffset / maxScroll) * (scrollAreaHeight - indicatorHeight);

			ctx.fillStyle = 'rgba(0,255,204,0.4)';
			ctx.fillRect(w - 5, indicatorY, 3, indicatorHeight);
		}

		// 底部按钮区域
		const btnY = h - 45;
		const btnH = 34;

		if (!this.selectedCharId) {
			// 未选择角色：只显示返回按钮
			ctx.fillStyle = '#2a2a3a';
			drawRoundRect(ctx, w / 2 - 45, btnY, 90, btnH, 8);
			ctx.fill();
			ctx.strokeStyle = '#666';
			ctx.lineWidth = 1;
			ctx.stroke();
			ctx.fillStyle = '#cccccc';
			ctx.font = '14px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText('返回', w / 2, btnY + 22);
			ctx.textAlign = 'left';

			this.backBtn = { x: w / 2 - 45, y: btnY, w: 90, h: btnH };
			this.startBtn = null;
			this.buildBtn = null;
		} else {
			// 已选择角色：显示"直接开始"和"使用 Build"按钮
			const gap = 15;
			const btnW = 120;
			const allowBuild = !this.bossRushMode && !this.speedRunMode;
			const totalW = allowBuild ? (btnW * 2 + gap) : btnW;
			const startX = (w - totalW) / 2;

			// 直接开始 / 进入Boss Rush 按钮
			ctx.fillStyle = this.bossRushMode ? '#ff4455' : '#44ff88';
			drawRoundRect(ctx, startX, btnY, btnW, btnH, 8);
			ctx.fill();
			ctx.fillStyle = '#ffffff';
			ctx.font = 'bold 14px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText(this.bossRushMode ? '进入挑战' : (this.speedRunMode ? '开始速通' : '直接开始'), startX + btnW / 2, btnY + 22);

			this.startBtn = { x: startX, y: btnY, w: btnW, h: btnH };

			if (allowBuild) {
				// 使用 Build 按钮（普通模式才显示）
				ctx.fillStyle = '#4488ff';
				drawRoundRect(ctx, startX + btnW + gap, btnY, btnW, btnH, 8);
				ctx.fill();
				ctx.fillStyle = '#ffffff';
				ctx.fillText('使用 Build', startX + btnW + gap + btnW / 2, btnY + 22);

				this.buildBtn = { x: startX + btnW + gap, y: btnY, w: btnW, h: btnH };
			} else {
				this.buildBtn = null;
			}

			// 返回按钮（右上角小按钮）
			ctx.fillStyle = '#2a2a3a';
			drawRoundRect(ctx, w - 70, 10, 60, 30, 6);
			ctx.fill();
			ctx.strokeStyle = '#666';
			ctx.lineWidth = 1;
			ctx.stroke();
			ctx.fillStyle = '#cccccc';
			ctx.font = '12px sans-serif';
			ctx.fillText('返回', w - 40, 28);
			ctx.textAlign = 'left';

			this.backBtn = { x: w - 70, y: 10, w: 60, h: 30 };
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

		// 检查返回按钮
		if (this.backBtn && x >= this.backBtn.x && x <= this.backBtn.x + this.backBtn.w &&
			y >= this.backBtn.y && y <= this.backBtn.y + this.backBtn.h) {
			this.selectedCharId = null;  // 清除选择
			this.selectedBuild = null;
			this.manager.switchTo('title');
			return;
		}

		// 检查"直接开始"按钮
		if (this.startBtn && x >= this.startBtn.x && x <= this.startBtn.x + this.startBtn.w &&
			y >= this.startBtn.y && y <= this.startBtn.y + this.startBtn.h) {
			if (this.onSelect && this.selectedCharId) {
				this.onSelect(this.selectedCharId, null);  // 不使用 Build
			}
			return;
		}

		// 检查"使用 Build"按钮
		if (this.buildBtn && x >= this.buildBtn.x && x <= this.buildBtn.x + this.buildBtn.w &&
			y >= this.buildBtn.y && y <= this.buildBtn.y + this.buildBtn.h) {
			if (this.selectedCharId) {
				const charId = this.selectedCharId;
				this.manager.switchTo('buildSelect', {
					onSelectBuild: (build) => {
						if (this.onSelect) {
							this.onSelect(charId, build);
						}
					}
				});
			}
			return;
		}

		// 点击卡片
		for (const card of this.cards) {
			if (x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h) {
				this.selectedCharId = card.id;  // 选中角色
				return;
			}
		}
	}
}

module.exports = CharSelectScene;
