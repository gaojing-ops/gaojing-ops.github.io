const { BuildPreset, PRESET_BUILDS } = require('../BuildPreset');
const { drawRoundRect } = require('../UIRenderer');

// 武器/被动 ID → 中文名 查找
let _weaponNames = null;
let _passiveNames = null;
function _getWeaponName(id) {
	if (!_weaponNames) {
		try {
			const { WEAPON_DEFS } = require('../Weapons');
			_weaponNames = {};
			for (const k in WEAPON_DEFS) _weaponNames[k] = WEAPON_DEFS[k].name;
		} catch (e) { _weaponNames = {}; }
	}
	return _weaponNames[id] || id;
}
function _getPassiveName(id) {
	if (!_passiveNames) {
		try {
			const { PASSIVE_DEFS } = require('../Weapons');
			_passiveNames = {};
			for (const k in PASSIVE_DEFS) _passiveNames[k] = PASSIVE_DEFS[k].name;
		} catch (e) { _passiveNames = {}; }
	}
	return _passiveNames[id] || id;
}

class BuildSelectScene {
	constructor() {
		this.selectedBuildId = null;
		this.scrollOffset = 0;
		this.cardHeight = 150;
		this.cardSpacing = 10;
		this.onSelectBuild = null;
		// 触摸状态（纵向滑动）
		this.touchStartY = 0;
		this.lastTouchY = 0;
		this.touchStartOffset = 0;
		this.isDragging = false;
		this.touchStartedHere = false;
		this._cards = [];
	}

	enter(data) {
		this.onSelectBuild = (data && data.onSelectBuild) || null;
		this.selectedBuildId = null;
		this.scrollOffset = 0;
		this.isDragging = false;
		this.touchStartedHere = false;
		this._cards = [];
		this._lockedTimer = 0;
		// 预缓存构建数据，避免每帧重复加载
		this._buildCache = {};
		const meta = this.game && this.game.meta;
		if (meta) {
			for (const build of PRESET_BUILDS) {
				this._buildCache[build.id] = {
					loaded: BuildPreset.loadCustomBuild(build.id, meta),
					unlocked: build.isCustom || BuildPreset._checkUnlock(build.unlockCondition, meta),
					progress: BuildPreset.getUnlockProgress(build, meta),
				};
			}
		}
	}

	exit() {
		this.onSelectBuild = null;
	}

	update(dt) { }

	onTouchStart(x, y) {
		this.touchStartY = y;
		this.lastTouchY = y;
		this.touchStartOffset = this.scrollOffset;
		this.isDragging = false;
		this.touchStartedHere = true;
	}

	onTouchMove(x, y) {
		if (!this.touchStartedHere) return;
		const dy = this.lastTouchY - y;
		if (Math.abs(dy) > 5) this.isDragging = true;
		if (this.isDragging) {
			this.scrollOffset = Math.max(0, this.scrollOffset + dy);
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

		const h = this.game.height;
		const btnY = h - 55;
		const btnH = 34;

		// 返回按钮
		const backX = 30, backW = 80;
		if (x >= backX && x <= backX + backW && y >= btnY && y <= btnY + btnH) {
			this.manager.switchTo('charSelect');
			return;
		}

		// 点击卡片
		for (const card of this._cards) {
			if (x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h) {
				this._handleCardTap(card.build);
				return;
			}
		}
	}

	_handleCardTap(build) {
		const meta = this.game.meta;
		const unlocked = build.isCustom || BuildPreset._checkUnlock(build.unlockCondition, meta);

		if (!unlocked) {
			this._lockedMsg = BuildPreset.getUnlockConditionText(build, meta);
			this._lockedTimer = 2.0;
			return;
		}

		this.selectedBuildId = build.id;
		const loadedBuild = BuildPreset.loadCustomBuild(build.id, meta);

		if (this.onSelectBuild) {
			this.onSelectBuild(loadedBuild);
		}
	}

	draw(ctx, w, h) {
		if (this._lockedTimer > 0) this._lockedTimer -= 0.016;

		ctx.fillStyle = '#0a0a16';
		ctx.fillRect(0, 0, w, h);

		const topOffset = (this.game && this.game.safeAreaTop) || 0;

		// 标题
		ctx.fillStyle = '#00ffcc';
		ctx.font = 'bold 20px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('选择配置方案', w / 2, 38 + topOffset);
		ctx.fillStyle = '#888';
		ctx.font = '11px sans-serif';
		ctx.fillText('点击已解锁的配置直接开始游戏', w / 2, 56 + topOffset);
		ctx.textAlign = 'left';

		// 卡片列表（纵向滚动）
		this._drawCards(ctx, w, h);

		// 未解锁提示
		if (this._lockedTimer > 0) {
			ctx.globalAlpha = Math.min(1, this._lockedTimer);
			ctx.fillStyle = '#ff6666';
			ctx.font = 'bold 14px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText(this._lockedMsg || '未解锁', w / 2, h / 2);
			ctx.globalAlpha = 1;
			ctx.textAlign = 'left';
		}

		// 底部按钮
		this._drawBottomButtons(ctx, w, h);
	}

	_drawCards(ctx, w, h) {
		const meta = this.game.meta;
		const topOffset = (this.game && this.game.safeAreaTop) || 0;
		const margin = 20;
		const cardW = w - margin * 2;
		const startY = 68 + topOffset;
		const btnAreaH = 60;
		const scrollAreaH = h - startY - btnAreaH;

		const totalContentH = PRESET_BUILDS.length * (this.cardHeight + this.cardSpacing) - this.cardSpacing;
		const maxScroll = Math.max(0, totalContentH - scrollAreaH);
		this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, maxScroll));

		ctx.save();
		ctx.beginPath();
		ctx.rect(0, startY, w, scrollAreaH);
		ctx.clip();

		this._cards = [];
		let oy = startY - this.scrollOffset;

		for (let i = 0; i < PRESET_BUILDS.length; i++) {
			const build = PRESET_BUILDS[i];
			const cache = (this._buildCache && this._buildCache[build.id]) || {};
			const loaded = cache.loaded || BuildPreset.loadCustomBuild(build.id, meta);
			const unlocked = cache.unlocked !== undefined ? cache.unlocked : (build.isCustom || BuildPreset._checkUnlock(build.unlockCondition, meta));
			const isSelected = this.selectedBuildId === build.id;
			const progress = cache.progress !== undefined ? cache.progress : BuildPreset.getUnlockProgress(build, meta);

			if (oy + this.cardHeight > startY && oy < startY + scrollAreaH) {
				this._drawCard(ctx, loaded, margin, oy, cardW, unlocked, progress, isSelected);
				this._cards.push({ x: margin, y: oy, w: cardW, h: this.cardHeight, build });
			}
			oy += this.cardHeight + this.cardSpacing;
		}

		ctx.restore();

		// 纵向滚动条
		if (totalContentH > scrollAreaH) {
			const barH = Math.max(30, (scrollAreaH / totalContentH) * scrollAreaH);
			const barY = startY + (this.scrollOffset / maxScroll) * (scrollAreaH - barH);
			ctx.fillStyle = 'rgba(0,255,204,0.3)';
			ctx.fillRect(w - 4, barY, 3, barH);
		}
	}

	_drawCard(ctx, build, x, y, cw, unlocked, progress, isSelected) {
		const ch = this.cardHeight;

		ctx.fillStyle = unlocked ? '#12122a' : '#1a1a1a';
		drawRoundRect(ctx, x, y, cw, ch, 10);
		ctx.fill();

		ctx.strokeStyle = isSelected ? '#ffdd44' : (unlocked ? '#4466cc' : '#444');
		ctx.lineWidth = isSelected ? 3 : 1.5;
		ctx.stroke();

		// 顶部彩条
		if (unlocked) {
			const colors = { firepower: '#ff6644', frostControl: '#44aaff', poisonDot: '#88ff44', critAssassin: '#cc44ff', custom1: '#44ffcc' };
			ctx.fillStyle = colors[build.id] || '#4466cc';
			ctx.fillRect(x, y, cw, 4);
		}

		if (unlocked) {
			// Build 名称
			ctx.fillStyle = '#ffffff';
			ctx.font = 'bold 15px sans-serif';
			ctx.textAlign = 'left';
			ctx.fillText(build.name, x + 12, y + 22);

			// 描述
			ctx.fillStyle = '#aaa';
			ctx.font = '11px sans-serif';
			ctx.fillText(build.desc, x + 12, y + 38);

			// 武器列表（逐行）
			ctx.fillStyle = '#666';
			ctx.font = '10px sans-serif';
			ctx.fillText('武器:', x + 12, y + 58);
			const weaponNames = (build.startWeapons || []).map(_getWeaponName).join('  ');
			ctx.fillStyle = '#ccddff';
			ctx.font = '11px sans-serif';
			ctx.fillText(weaponNames || '—', x + 12, y + 72);

			// 被动列表
			ctx.fillStyle = '#666';
			ctx.font = '10px sans-serif';
			ctx.fillText('被动:', x + 12, y + 90);
			const passiveNames = (build.startPassives || []).map(_getPassiveName).join('  ');
			ctx.fillStyle = '#ccffdd';
			ctx.font = '11px sans-serif';
			ctx.fillText(passiveNames || '—', x + 12, y + 104);

			// 解锁标记（右下角）
			ctx.fillStyle = '#44ff88';
			ctx.font = 'bold 11px sans-serif';
			ctx.textAlign = 'right';
			ctx.fillText(build.isCustom ? '✓ 自定义' : '✓ 已解锁', x + cw - 12, y + ch - 10);
		} else {
			ctx.fillStyle = '#ff6666';
			ctx.font = '12px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText('🔒 ' + BuildPreset.getUnlockConditionText(build, this.game.meta), x + cw / 2, y + ch / 2 - 8);

			// Build 名
			ctx.fillStyle = '#666';
			ctx.font = 'bold 14px sans-serif';
			ctx.fillText(build.name, x + cw / 2, y + 20);

			if (progress > 0) {
				const bx = x + 20, bw = cw - 40, bh = 6, by = y + ch - 18;
				ctx.fillStyle = '#333';
				ctx.fillRect(bx, by, bw, bh);
				ctx.fillStyle = '#4488ff';
				ctx.fillRect(bx, by, bw * progress, bh);
			}
		}

		ctx.textAlign = 'left';
	}

	_drawBottomButtons(ctx, w, h) {
		const btnY = h - 52;
		const btnH = 34;

		ctx.fillStyle = '#2a2a3a';
		drawRoundRect(ctx, 30, btnY, 80, btnH, 8);
		ctx.fill();
		ctx.strokeStyle = '#666';
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.fillStyle = '#ccc';
		ctx.font = '14px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('返回', 70, btnY + 23);
		ctx.textAlign = 'left';
	}
}

module.exports = BuildSelectScene;
