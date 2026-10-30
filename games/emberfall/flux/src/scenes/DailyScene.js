// ─── 每日挑战场景 ──────────────────────────
const UI = require('../UIRenderer');
const { getDailyConfig, saveDailyScore, getDailyLeaderboard } = require('../DailyChallenge');
const { CHARACTERS } = require('../Character');
const { CURSE_DEFS } = require('../CurseSystem');

class DailyScene {
	constructor() {
		this.config = null;
		this.leaderboard = [];
		this.startBtn = null;
		this.backBtn = null;
	}

	enter() {
		this.config = getDailyConfig();
		this.leaderboard = getDailyLeaderboard(this.config.seed);
		// 检查当前玩家是否今天已参与（而非仅排行榜有记录）
		this.alreadyPlayed = this.leaderboard.some(e => e.isCurrentPlayer);
	}

	draw(ctx, w, h) {
		UI.drawOverlay(ctx, w, h, 1.0);

		// 获取安全区域偏移
		const topOffset = (this.game && this.game.safeAreaTop) || 0;
		const bottomOffset = 20; // 底部安全距离

		// 安全区域边距（适配刘海屏/圆角）
		const margin = Math.max(30, w * 0.06);
		const contentW = w - margin * 2;

		UI.drawCenteredText(ctx, '📅 每日挑战', w / 2, 35 + topOffset, {
			fontSize: 18, color: '#ffcc00', shadow: '#ffcc00',
		});
		UI.drawCenteredText(ctx, `种子: ${this.config.seed}`, w / 2, 55 + topOffset, {
			fontSize: 10, color: '#666', fontStyle: 'normal',
		});

		let cy = 75 + topOffset;

		// 固定角色
		const char = CHARACTERS[this.config.charId];
		if (char) {
			ctx.save();
			ctx.font = 'bold 13px sans-serif';
			ctx.fillStyle = char.color;
			ctx.textAlign = 'center';
			ctx.fillText(`角色: ${char.name}`, w / 2, cy);
			ctx.textAlign = 'left';
			ctx.restore();
			cy += 20;
		}

		// 固定地图
		UI.drawCenteredText(ctx, `地图: ${this.config.mapStyle}`, w / 2, cy, {
			fontSize: 12, color: '#aaa', fontStyle: 'normal',
		});
		cy += 20;

		// 固定诅咒
		if (this.config.curses && this.config.curses.length > 0) {
			UI.drawCenteredText(ctx, '固定诅咒:', w / 2, cy, {
				fontSize: 12, color: '#ff6666', fontStyle: 'normal',
			});
			cy += 18;
			for (const c of this.config.curses) {
				const def = CURSE_DEFS.find(d => d.id === c.id);
				if (def) {
					UI.drawCenteredText(ctx, `${def.icon} ${def.name}`, w / 2, cy, {
						fontSize: 11, color: 'rgba(255,136,136,0.53)', fontStyle: 'normal',
					});
					cy += 16;
				}
			}
		}

		cy += 10;

		// 排行榜
		UI.drawCenteredText(ctx, '🏅 排行榜', w / 2, cy, {
			fontSize: 14, color: '#ffcc00',
		});
		cy += 20;

		if (this.leaderboard.length === 0) {
			UI.drawCenteredText(ctx, '暂无记录', w / 2, cy, {
				fontSize: 12, color: '#666', fontStyle: 'normal',
			});
			cy += 20;
		} else {
			ctx.save();
			ctx.textAlign = 'center';
			ctx.font = '12px sans-serif';
			this.leaderboard.forEach((entry, i) => {
				const medals = ['🥇', '🥈', '🥉'];
				const medal = i < 3 ? medals[i] : `${i + 1}.`;
				ctx.fillStyle = i < 3 ? '#ffcc00' : '#888';
				ctx.fillText(`${medal} 时间: ${entry.time} | 击杀: ${entry.kills} | LV.${entry.level}`, w / 2, cy);
				cy += 18;
			});
			ctx.textAlign = 'left';
			ctx.restore();
		}

		cy += 10;

		// 按钮 - 固定在底部
		const btnY = h - 80;

		// 今日已完成标记
		if (this.alreadyPlayed) {
			ctx.font = 'bold 11px sans-serif';
			ctx.fillStyle = '#44ff88';
			ctx.textAlign = 'center';
			ctx.fillText('✓ 今日已完成', w / 2, btnY - 16);
			ctx.textAlign = 'left';
		}

		this.startBtn = UI.drawButton(ctx, this.alreadyPlayed ? '再次挑战' : '开始挑战', w / 2, btnY, {
			fontSize: 14, color: '#ffcc00',
			bgColor: 'rgba(255,204,0,0.08)',
			borderColor: '#ffcc0066',
		});

		this.backBtn = UI.drawButton(ctx, '返回', w / 2, btnY + 40, {
			fontSize: 12, color: '#aaa',
			bgColor: 'rgba(255,255,255,0.12)',
			borderColor: 'rgba(255,255,255,0.35)',
		});
	}

	onTouchStart(x, y) {
		if (this.startBtn && UI.hitTest(x, y, this.startBtn)) {
			// 委托给 game.js 的 onStart 回调（含 SFX.initAudio 等）
			if (this.onStart) {
				this.onStart(this.config);
			} else {
				// 兜底：直接启动
				const fullCurses = this.config.curses.map(c => {
					const def = CURSE_DEFS.find(d => d.id === c.id);
					return def || c;
				}).filter(c => c.apply);
				this.game.startWithCharacter(this.config.charId, fullCurses);
				this.game.isDailyChallenge = true;
				this.game.mapManager.setStyle(this.config.mapStyle);
				this.manager.switchTo('playing');
			}
			return;
		}
		if (this.backBtn && UI.hitTest(x, y, this.backBtn)) {
			if (this.onBack) this.onBack();
			else this.manager.switchTo('title');
		}
	}
}

module.exports = DailyScene;
