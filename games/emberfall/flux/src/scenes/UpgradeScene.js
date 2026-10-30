// ─── 升级选择场景 ──────────────────────────
const { drawRoundRect } = require('../UIRenderer');
const { fastSin } = require('../MathLUT');
const { now: perfNow } = require('../platform');
const SFX = require('../SFX');

class UpgradeScene {
	constructor() {
		this.options = [];
		this.previews = [];
		this.cards = [];
	}

	enter(data) {
		this.options = data.options || [];
		this.previews = data.previews || [];
		this.cards = [];
		this.actionBtns = [];
		if (data.game) this.game = data.game; // 保存 game 引用以访问 autoUpgrade（reroll 时不传 game）
		// 从 UpgradeSystem 获取计数
		this.rerollCount = data.rerollCount || 0;
		this.skipCount = data.skipCount || 0;
		this.banishCount = data.banishCount || 0;
		this.banishMode = false; // 放逐模式：点击卡片放逐而非选择
		this.chestMode = data.chestMode || false; // 宝箱模式
	}

	draw(ctx, w, h) {
		// 深色半透明遮罩
		ctx.fillStyle = 'rgba(5, 5, 15, 0.9)';
		ctx.fillRect(0, 0, w, h);

		// 标题
		ctx.fillStyle = this.chestMode ? '#ffcc00' : '#00ffcc';
		ctx.font = 'bold 22px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(this.chestMode ? '\uD83C\uDF81 \u5B9D\u7BB1\u5956\u52B1' : '\u9009\u62E9\u5F3A\u5316', w / 2, h * 0.12);
		ctx.textAlign = 'left';

		this.cards = [];
		const cardW = w * 0.88;
		const cardH = 80;
		let startY = h * 0.2;
		const gap = 14;
		const _now = perfNow(); // 每帧只调用一次

		// 绘制可选择的选项
		this.options.forEach((opt, idx) => {
			const x = (w - cardW) / 2;
			const y = startY + idx * (cardH + gap);

			// ═══ 稀有度颜色映射 ═══
			let borderColor = opt.color;
			let borderWidth = 2;
			let glowAlpha = 0;
			if (opt.rarity === 'legendary') {
				// 彩虹边框（RGB 循环）
				const t = _now / 1000;
				const r = Math.floor(127 + 127 * fastSin(t * 2));
				const g = Math.floor(127 + 127 * fastSin(t * 2 + 2.09));
				const b = Math.floor(127 + 127 * fastSin(t * 2 + 4.18));
				borderColor = `rgb(${r},${g},${b})`;
				borderWidth = 3;
				glowAlpha = 0.3 + 0.2 * fastSin(t * 3);
			} else if (opt.rarity === 'epic') {
				borderColor = '#cc44ff';
				borderWidth = 2.5;
				glowAlpha = 0.2 + 0.15 * fastSin(_now / 400);
			} else if (opt.rarity === 'rare') {
				borderColor = '#4488ff';
				borderWidth = 2;
			}

			// 卡片背景 - 深色不透明
			ctx.fillStyle = '#1a1a2e';
			drawRoundRect(ctx, x, y, cardW, cardH, 10);
			ctx.fill();

			// 边框（带稀有度发光）
			if (glowAlpha > 0) {
				ctx.save();
				ctx.shadowColor = borderColor;
				ctx.shadowBlur = 12;
				ctx.globalAlpha = glowAlpha;
				ctx.strokeStyle = borderColor;
				ctx.lineWidth = borderWidth;
				ctx.stroke();
				ctx.restore();
			}
			ctx.strokeStyle = borderColor;
			ctx.lineWidth = borderWidth;
			ctx.stroke();

			// 左侧颜色条
			ctx.fillStyle = opt.color;
			ctx.fillRect(x, y, 5, cardH);

			// 名称 - 白色清晰
			ctx.font = 'bold 16px sans-serif';
			ctx.fillStyle = '#ffffff';
			ctx.fillText(opt.name, x + 18, y + 30);

			// ═══ 稀有度标签（legendary 专属）═══
			if (opt.rarity === 'legendary') {
				ctx.font = 'bold 10px sans-serif';
				ctx.fillStyle = borderColor;
				ctx.textAlign = 'right';
				ctx.fillText('LEGENDARY', x + cardW - 8, y + 18);
				ctx.textAlign = 'left';
			}

			// 描述 - 更亮
			ctx.font = '13px sans-serif';
			ctx.fillStyle = '#cccccc';
			ctx.fillText(opt.desc, x + 18, y + 55);

			// ═══ 协同标签（右下角）═══
			if (opt.synergy) {
				ctx.font = 'bold 11px sans-serif';
				const synergyColor = opt.synergy.includes('进化') ? '#ff8800' : '#00ffcc';
				ctx.fillStyle = synergyColor;
				ctx.textAlign = 'right';
				ctx.fillText(opt.synergy, x + cardW - 8, y + cardH - 8);
				ctx.textAlign = 'left';
			}

			this.cards.push({ x, y, w: cardW, h: cardH, idx, isPreview: false });
		});

		// 绘制预览选项（只读，在下方显示）
		if (this.previews.length > 0) {
			const previewY = startY + this.options.length * (cardH + gap) + 20;

			// 小标题
			ctx.fillStyle = '#666';
			ctx.font = '12px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText('— 进化预览 —', w / 2, previewY);
			ctx.textAlign = 'left';

			this.previews.forEach((opt, idx) => {
				const x = (w - cardW) / 2;
				const y = previewY + 15 + idx * (cardH * 0.6 + gap / 2);
				const previewH = cardH * 0.6;

				// 卡片背景 - 更暗
				ctx.fillStyle = '#0d0d15';
				drawRoundRect(ctx, x, y, cardW, previewH, 8);
				ctx.fill();

				// 边框 - 虚线
				ctx.strokeStyle = '#444';
				ctx.lineWidth = 1;
				ctx.setLineDash([4, 4]);
				ctx.stroke();
				ctx.setLineDash([]);

				// 左侧颜色条
				ctx.fillStyle = opt.color;
				ctx.fillRect(x, y, 3, previewH);

				// 名称
				ctx.font = 'bold 12px sans-serif';
				ctx.fillStyle = '#888';
				ctx.fillText(opt.name, x + 12, y + 18);

				// 描述
				ctx.font = '10px sans-serif';
				ctx.fillStyle = '#555';
				// 多行描述处理
				const lines = opt.desc.split('\n');
				lines.forEach((line, lineIdx) => {
					ctx.fillText(line, x + 12, y + 32 + lineIdx * 12);
				});
			});
		}

		// ═══ 操作按钮区域（宝箱模式不显示）═══
		this.actionBtns = [];
		this.autoUpgradeBtn = null;
		if (!this.chestMode) {
		const btnY = h - 95;
		const btnW = (cardW - 20) / 3;
		const btnH = 40;
		const btnStartX = (w - cardW) / 2;

		const actions = [
			{ id: 'reroll', label: `🎲 重随(${this.rerollCount})`, color: '#ffcc00', enabled: this.rerollCount > 0 },
			{ id: 'skip', label: `⏭ 跳过(${this.skipCount})`, color: '#88ccff', enabled: this.skipCount > 0 },
			{ id: 'banish', label: this.banishMode ? `🚫 取消放逐` : `🚫 放逐(${this.banishCount})`, color: this.banishMode ? '#ff4444' : '#ff8844', enabled: this.banishCount > 0 || this.banishMode },
		];

		actions.forEach((act, i) => {
			const bx = btnStartX + i * (btnW + 10);
			// 按钮背景
			ctx.fillStyle = act.enabled ? '#1a1a2e' : '#0a0a15';
			drawRoundRect(ctx, bx, btnY, btnW, btnH, 8);
			ctx.fill();
			ctx.strokeStyle = act.enabled ? act.color : '#333';
			ctx.lineWidth = 1.5;
			ctx.stroke();

			// 文字
			ctx.font = 'bold 12px sans-serif';
			ctx.fillStyle = act.enabled ? act.color : '#555';
			ctx.textAlign = 'center';
			ctx.fillText(act.label, bx + btnW / 2, btnY + btnH / 2 + 4);
			ctx.textAlign = 'left';

			this.actionBtns.push({ x: bx, y: btnY, w: btnW, h: btnH, id: act.id, enabled: act.enabled });
		});

		// 自动升级开关按钮（居中显示）
		const autoUpgradeBtnW = cardW * 0.55;
		const autoUpgradeBtnH = 35;
		const autoUpgradeBtnX = (w - autoUpgradeBtnW) / 2;
		const autoUpgradeBtnY = h - 48;
		const autoUpgradeOn = this.game && this.game.autoUpgrade;

		ctx.fillStyle = autoUpgradeOn ? 'rgba(255,170,0,0.18)' : 'rgba(120,120,120,0.15)';
		drawRoundRect(ctx, autoUpgradeBtnX, autoUpgradeBtnY, autoUpgradeBtnW, autoUpgradeBtnH, 8);
		ctx.fill();
		ctx.strokeStyle = autoUpgradeOn ? '#ffaa00' : '#888888';
		ctx.lineWidth = 1.5;
		ctx.stroke();

		ctx.font = 'bold 14px sans-serif';
		ctx.fillStyle = autoUpgradeOn ? '#ffaa00' : '#888888';
		ctx.textAlign = 'center';
		ctx.fillText(autoUpgradeOn ? '⚡ 自动升级：开' : '⚡ 自动升级：关', w / 2, autoUpgradeBtnY + autoUpgradeBtnH / 2 + 5);
		ctx.textAlign = 'left';

		this.autoUpgradeBtn = { x: autoUpgradeBtnX, y: autoUpgradeBtnY, w: autoUpgradeBtnW, h: autoUpgradeBtnH };

		// 放逐模式提示
		if (this.banishMode) {
			ctx.fillStyle = '#ff4444';
			ctx.font = 'bold 14px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText('点击卡片放逐该升级', w / 2, h * 0.15);
			ctx.textAlign = 'left';
		}
		} // end if (!this.chestMode)
	}

	onTouchStart(x, y) {
		// 检查自动升级按钮
		if (this.autoUpgradeBtn) {
			const btn = this.autoUpgradeBtn;
			if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
				if (this.game) {
					this.game.autoUpgrade = !this.game.autoUpgrade;
					const SFX = require('../SFX');
					SFX.sfxButton();
				}
				return;
			}
		}

		// 检查操作按钮
		for (const btn of this.actionBtns) {
			if (!btn.enabled) continue;
			if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
				if (btn.id === 'reroll' && this.onReroll) {
					this.onReroll();
				} else if (btn.id === 'skip' && this.onSkip) {
					this.onSkip();
				} else if (btn.id === 'banish') {
					this.banishMode = !this.banishMode;
				}
				return;
			}
		}

		// 检查卡片
		for (const card of this.cards) {
			if (x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h) {
				const opt = this.options[card.idx];
				if (this.banishMode) {
					// 放逐模式：放逐此选项
					if (this.onBanish) this.onBanish(opt);
					this.banishMode = false;
				} else {
					// 正常模式：选择此选项
					// 粒子特效 + 音效
					if (this.game && this.game.particles && this.game.player) {
						const p = this.game.player;
						this.game.particles.emit(p.x, p.y, {
							count: 18, speed: 220, life: 0.5,
							color: opt.color || '#ffcc00', size: 4
						});
						this.game.triggerScreenPulse((opt.color || '#ffcc00') + '33', 0.3);
					}
					SFX.sfxUpgrade();
					if (this.onSelect) this.onSelect(opt);
				}
				return;
			}
		}
	}
}

module.exports = UpgradeScene;
