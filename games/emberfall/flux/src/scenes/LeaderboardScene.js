// ─── 排行榜场景 ──────────────────────────
const UI = require('../UIRenderer');

class LeaderboardScene {
	constructor() {
		this.backBtn = null;
		this.tabBtns = [];
		this.currentTab = 'local'; // 'local' | 'friends' | 'global'
		this.scrollOffset = 0;
		this._localMaxScroll = 0;
		this.lastTouchY = null;
		this.isDragging = false;
		this.touchStartedHere = false;
	}

	enter() {
		this.currentTab = 'local';
		this.scrollOffset = 0;
		this.isDragging = false;
		this.touchStartedHere = false;
		this._friendsRequested = false;
		if (typeof wx !== 'undefined' && wx.getOpenDataContext) {
			wx.getOpenDataContext().postMessage({ type: 'clear' });
		}
	}

	draw(ctx, w, h) {
		UI.drawOverlay(ctx, w, h, 1.0);

		const topOffset = (this.game && this.game.safeAreaTop) || 0;

		// 标题
		UI.drawCenteredText(ctx, '📊 排行榜', w / 2, 40 + topOffset, {
			fontSize: 20, color: '#00ffcc', shadow: '#00ffcc',
		});

		// 三个标签页按钮
		const tabY = 70 + topOffset;
		const tabW = 80;
		const tabH = 32;
		const tabSpacing = 8;
		const totalW = tabW * 3 + tabSpacing * 2;
		const tabStartX = (w - totalW) / 2;

		this.tabBtns = [];

		const tabs = [
			{ id: 'local', label: '个人' },
			{ id: 'friends', label: '好友' },
			{ id: 'global', label: '全服' },
		];

		for (let i = 0; i < tabs.length; i++) {
			const tab = tabs[i];
			const tx = tabStartX + i * (tabW + tabSpacing);
			const isActive = this.currentTab === tab.id;

			ctx.fillStyle = isActive ? 'rgba(0,255,204,0.15)' : 'rgba(255,255,255,0.05)';
			UI.drawRoundRect(ctx, tx, tabY, tabW, tabH, 6);
			ctx.fill();
			ctx.strokeStyle = isActive ? '#00ffcc' : '#444';
			ctx.lineWidth = isActive ? 2 : 1;
			ctx.stroke();

			ctx.fillStyle = isActive ? '#00ffcc' : '#888';
			ctx.font = isActive ? 'bold 13px sans-serif' : '13px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText(tab.label, tx + tabW / 2, tabY + 21);
			ctx.textAlign = 'left';

			this.tabBtns.push({ x: tx, y: tabY, w: tabW, h: tabH, tabId: tab.id });
		}

		// 排行榜内容区域
		const listStartY = 115 + topOffset;
		const listEndY = h - 80;
		const listAreaHeight = listEndY - listStartY;

		// 根据当前标签页绘制不同内容
		if (this.currentTab === 'local') {
			this._drawLocalLeaderboard(ctx, w, h, listStartY, listAreaHeight);
		} else if (this.currentTab === 'friends') {
			this._drawFriendsLeaderboard(ctx, w, h, listStartY, listAreaHeight);
		} else if (this.currentTab === 'global') {
			this._drawGlobalLeaderboard(ctx, w, h, listStartY, listAreaHeight);
		}

		// 返回按钮
		const btnY = h - 55;
		this.backBtn = UI.drawButton(ctx, '◀ 返回', w / 2, btnY, {
			width: 100, height: 38, color: '#888', borderColor: '#666',
		});
	}

	_drawLocalLeaderboard(ctx, w, h, startY, areaHeight) {
		// 读取本地最佳成绩
		const meta = this.game && this.game.meta;
		if (!meta) {
			this._drawPlaceholder(ctx, w, startY, areaHeight, '未找到存档数据');
			return;
		}

		const records = [
			{ label: '最高击杀', value: meta.data.bestKills || 0, icon: '💀' },
			{ label: '最长存活', value: this._formatTime(meta.data.bestTime || 0), icon: '⏱' },
			{ label: '最高等级', value: meta.data.bestLevel || 1, icon: '📊' },
			{ label: '总游戏时长', value: this._formatTime(meta.data.totalPlayTime || 0), icon: '🎮' },
			{ label: '累计击杀', value: meta.data.totalKills || 0, icon: '⚔' },
			{ label: '总芯片数', value: meta.data.chips || 0, icon: '💾' },
			{ label: '完成关卡数', value: meta.data.stagesCompleted || 0, icon: '🏁' },
			{ label: 'Boss Rush 最佳', value: meta.data.bossRushBestWave ? `第${meta.data.bossRushBestWave}波` : '未挑战', icon: '⚡' },
		];
		const cardH = 50;
		const gap = 8;
		const totalContentH = records.length * (cardH + gap) - gap + 20;
		this._localMaxScroll = Math.max(0, totalContentH - areaHeight);
		this.scrollOffset = Math.min(this.scrollOffset, this._localMaxScroll);

		ctx.save();
		ctx.beginPath();
		ctx.rect(0, startY, w, areaHeight);
		ctx.clip();

		const cardW = w * 0.85;
		let cy = startY + 10 - this.scrollOffset;

		for (const rec of records) {
			const x = (w - cardW) / 2;
			const y = cy;

			// 只绘制可见区域
			if (y + cardH > startY && y < startY + areaHeight) {
				UI.drawCard(ctx, x, y, cardW, cardH, {
					borderColor: 'rgba(0,255,204,0.2)',
					bgColor: 'rgba(0,255,204,0.05)',
				});

				ctx.font = '11px sans-serif';
				ctx.fillStyle = '#888';
				ctx.fillText(rec.icon + ' ' + rec.label, x + 12, y + 18);

				ctx.font = 'bold 22px sans-serif';
				ctx.fillStyle = '#00ffcc';
				ctx.fillText(String(rec.value), x + 12, y + 40);
			}

			cy += cardH + gap;
		}

		ctx.restore();
	}

	_drawFriendsLeaderboard(ctx, w, h, startY, areaHeight) {
		// 微信好友排行榜（使用开放数据域）
		if (typeof wx !== 'undefined' && wx.getOpenDataContext) {
			const openDataContext = wx.getOpenDataContext();
			
			// 发送消息通知子域绘制
			if (!this._friendsRequested) {
				this._friendsRequested = true;
				this._lastScrollOffset = this.scrollOffset;
				openDataContext.postMessage({
					type: 'showFriends',
					w: w,
					h: h,
					scrollOffset: this.scrollOffset
				});
			} else if (this._lastScrollOffset !== this.scrollOffset) {
				this._lastScrollOffset = this.scrollOffset;
				openDataContext.postMessage({
					type: 'updateScroll',
					scrollOffset: this.scrollOffset
				});
			}

			// 将子域 sharedCanvas 绘制到主域画布上
			const sharedCanvas = openDataContext.canvas;
			if (sharedCanvas) {
				ctx.drawImage(sharedCanvas, 0, 0, w, h);
			}
		} else {
			this._drawPlaceholder(ctx, w, startY, areaHeight, '好友排行榜功能\n仅在微信小游戏环境内可用');
		}
	}

	_drawGlobalLeaderboard(ctx, w, h, startY, areaHeight) {
		// 全服排行榜（需要开放数据域）
		this._drawPlaceholder(ctx, w, startY, areaHeight, '全服排行榜功能\n需要配置微信开放数据域\n\n当前仅本地数据可用');
	}

	_drawPlaceholder(ctx, w, startY, areaHeight, text) {
		ctx.save();
		ctx.textAlign = 'center';
		ctx.fillStyle = '#555';
		ctx.font = '13px sans-serif';
		const lines = text.split('\n');
		let ly = startY + areaHeight / 2 - (lines.length * 10);
		for (const line of lines) {
			ctx.fillText(line, w / 2, ly);
			ly += 20;
		}
		ctx.textAlign = 'left';
		ctx.restore();
	}

	_formatTime(seconds) {
		if (seconds < 60) return Math.floor(seconds) + 's';
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
		return `${m}m${s}s`;
	}

	onTouchStart(x, y) {
		this.lastTouchY = y;
		this.isDragging = false;
		this.touchStartedHere = true;
	}

	onTouchMove(x, y) {
		if (!this.touchStartedHere) return;
		const dy = this.lastTouchY - y;
		if (Math.abs(dy) > 5) this.isDragging = true;
		if (this.isDragging) {
			let nextOffset = Math.max(0, this.scrollOffset + dy);
			if (this.currentTab === 'local') {
				nextOffset = Math.min(nextOffset, this._localMaxScroll || 0);
			} else if (this.currentTab === 'global') {
				nextOffset = 0;
			}
			this.scrollOffset = nextOffset;
			this.lastTouchY = y;
		}
	}

	onTouchEnd(x, y) {
		if (!this.touchStartedHere) return;
		this.touchStartedHere = false;

		if (this.isDragging) {
			this.isDragging = false;
			return;
		}

		// 标签页切换
		for (const tab of this.tabBtns) {
			if (x >= tab.x && x <= tab.x + tab.w && y >= tab.y && y <= tab.y + tab.h) {
				if (this.currentTab !== tab.tabId) {
					// 离开好友标签页时，通知子域清空画布
					if (this.currentTab === 'friends' && typeof wx !== 'undefined' && wx.getOpenDataContext) {
						wx.getOpenDataContext().postMessage({ type: 'clear' });
						this._friendsRequested = false;
					}
				}
				this.currentTab = tab.tabId;
				this.scrollOffset = 0;
				return;
			}
		}

		// 返回按钮
		if (this.backBtn && UI.hitTest(x, y, this.backBtn)) {
			// 退出时清空子域
			if (typeof wx !== 'undefined' && wx.getOpenDataContext) {
				wx.getOpenDataContext().postMessage({ type: 'clear' });
				this._friendsRequested = false;
			}
			this.manager.switchTo('title');
		}
	}
}

module.exports = LeaderboardScene;
