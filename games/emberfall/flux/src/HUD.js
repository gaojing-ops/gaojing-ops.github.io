// ─── HUD 绘制系统（从 Game.js 提取） ──────────────────────────
// 挂载到 Game.prototype，保持 this 指向 Game 实例

const UI = require('./UIRenderer');
const { now: perfNow } = require('./platform');
const { fastSin, fastCos } = require('./MathLUT');
const { PASSIVE_DEFS, WEAPON_DEFS } = require('./Weapons');
const { ELEMENTS } = require('./SynergySystem');

// HUD 字体常量（避免每帧字符串解析）
const _FONT_BOLD_10 = 'bold 10px sans-serif';
const _FONT_BOLD_11 = 'bold 11px sans-serif';
const _FONT_10 = '10px sans-serif';
const _FONT_11 = '11px sans-serif';

function installHUD(GameClass) {

	GameClass.prototype._drawHUD = function () {
		const ctx = this.ctx;
		const p = this.player;
		const w = this.width;

		// 顶部安全区域偏移 (适配刘海屏)
		const topOffset = this.safeAreaTop || 0;

		// 左上角 - HP 条
		const hpPct = Math.max(0, p.hp / p.maxHp);
		const hpBarW = w * 0.30;

		// HP条背景
		ctx.fillStyle = 'rgba(80,0,20,0.5)';
		ctx.fillRect(10, 10 + topOffset, hpBarW, 16);

		// HP条填充（根据血量变色）
		let hpColor = '#ff0044';
		if (hpPct > 0.6) hpColor = '#44ff88';
		else if (hpPct > 0.3) hpColor = '#ffcc00';

		ctx.fillStyle = hpColor;
		ctx.fillRect(10, 10 + topOffset, hpBarW * hpPct, 16);

		// HP条边框
		ctx.strokeStyle = 'rgba(255,255,255,0.3)';
		ctx.lineWidth = 1;
		ctx.strokeRect(10, 10 + topOffset, hpBarW, 16);

		// ── bold 10px 批次 ──
		ctx.font = _FONT_BOLD_10;

		// HP文字
		ctx.fillStyle = '#fff';
		const hpCeil = Math.ceil(Math.max(0, p.hp));
		if (this._cachedHpStr === undefined || this._cachedHp !== hpCeil || this._cachedMaxHp !== p.maxHp) {
			this._cachedHp = hpCeil;
			this._cachedMaxHp = p.maxHp;
			this._cachedHpStr = hpCeil + '/' + p.maxHp;
		}
		ctx.fillText(this._cachedHpStr, 14, 22 + topOffset);

		// 护甲显示
		if (p.armor > 0) {
			ctx.fillStyle = '#88aaff';
			ctx.fillText('\u{1F6E1}' + p.armor, 14 + hpBarW, 22 + topOffset);
		}

		// 无尽模式波数显示
		if (this.endlessMode && this.endlessWave > 0) {
			ctx.fillStyle = '#ff00ff';
			ctx.textAlign = 'right';
			if (this._cachedWaveStr === undefined || this._cachedWave !== this.endlessWave) {
				this._cachedWave = this.endlessWave;
				this._cachedWaveStr = '\u6CE2\u6570 ' + this.endlessWave;
			}
			ctx.fillText(this._cachedWaveStr, w - 100, 48 + topOffset);
			ctx.textAlign = 'left';
		}

		// XP 条
		const xpPct = Math.min(1, p.xp / p.maxXp);
		ctx.fillStyle = 'rgba(0,80,60,0.4)';
		ctx.fillRect(10, 30 + topOffset, hpBarW, 10);
		ctx.fillStyle = '#00ffcc';
		ctx.fillRect(10, 30 + topOffset, hpBarW * xpPct, 10);
		ctx.strokeStyle = 'rgba(0,255,204,0.3)';
		ctx.strokeRect(10, 30 + topOffset, hpBarW, 10);

		// ═══ 活跃 buff 倒计时图标栏 ═══
		const buffY = 60 + topOffset;
		let buffX = 10;
		const buffs = [];
		// 收集所有活跃 buff
		if (this._weaponSurge && this._weaponSurge.timer > 0) {
			buffs.push({ icon: '⚡', time: Math.ceil(this._weaponSurge.timer), color: '#ffaa00' });
		}
		if (this._speedBurst && this._speedBurst.timer > 0) {
			buffs.push({ icon: '💨', time: Math.ceil(this._speedBurst.timer), color: '#44aaff' });
		}
		if (this._xpSurge && this._xpSurge.timer > 0) {
			buffs.push({ icon: '⭕', time: Math.ceil(this._xpSurge.timer), color: '#00ffcc' });
		}
		if (this._armorBoost && this._armorBoost.timer > 0) {
			buffs.push({ icon: '🛡', time: Math.ceil(this._armorBoost.timer), color: '#88ccff' });
		}
		if (this._drainField && this._drainField.timer > 0) {
			buffs.push({ icon: '💀', time: Math.ceil(this._drainField.timer), color: '#ff4444' });
		}
		// 活跃事件计时
		if (this.timeRift && this.timeRift.timer > 0) {
			buffs.push({ text: Math.ceil(this.timeRift.timer) + 's', icon: '⏱', color: '#00ffff' });
		}
		if (this._densitySurge && this._densitySurge.timer > 0) {
			buffs.push({ text: Math.ceil(this._densitySurge.timer) + 's', icon: '👾', color: '#ff4488' });
		}
		if (this._nestChallenge && this._nestChallenge.timer > 0) {
			buffs.push({ text: this._nestChallenge.kills + '/' + this._nestChallenge.killsRequired, icon: '🏹', color: '#ffaa00' });
		}
		// 累积状态（过载 / 灵魂收割）
		if (p.overheatMax > 0 && p.overheatBonus > 0.025) {
			buffs.push({ text: Math.round(p.overheatBonus / p.overheatMax * 100) + '%', icon: '🔥', color: '#ff8800' });
		}
		if (p.soulHarvestBonus > 0.02 && p.soulHarvestMax > 0) {
			buffs.push({ text: Math.round(p.soulHarvestBonus / p.soulHarvestMax * 100) + '%', icon: '☽', color: '#cc44ff' });
		}
		// 绘制 buff 图标（最多显示 8 个）
		ctx.font = '9px sans-serif';
		for (let i = 0; i < Math.min(buffs.length, 8); i++) {
			const buff = buffs[i];
			const boxW = 36;
			const boxH = 16;
			// 背景
			ctx.fillStyle = 'rgba(0,0,0,0.5)';
			ctx.fillRect(buffX, buffY, boxW, boxH);
			// 边框
			ctx.strokeStyle = buff.color;
			ctx.lineWidth = 1;
			ctx.strokeRect(buffX, buffY, boxW, boxH);
			// 图标 + 时间/文本
			ctx.fillStyle = buff.color;
			ctx.fillText(buff.icon, buffX + 2, buffY + 11);
			ctx.fillStyle = '#fff';
			ctx.fillText(buff.text !== undefined ? buff.text : (buff.time + 's'), buffX + 14, buffY + 11);
			buffX += boxW + 3;
		}

		// ── bold 11px 批次 ──
		ctx.font = _FONT_BOLD_11;

		// 等级
		ctx.fillStyle = '#00ffcc';
		if (this._cachedLvStr === undefined || this._cachedLv !== p.level) {
			this._cachedLv = p.level;
			this._cachedLvStr = 'LV.' + p.level;
		}
		ctx.fillText(this._cachedLvStr, 10, 52 + topOffset);

		// ── 10px 批次 ──
		ctx.font = _FONT_10;

		// 武器和被动数量
		ctx.fillStyle = '#888';
		if (this._cachedEquipStr === undefined || this._cachedWpnCnt !== p.weapons.length || this._cachedPasCnt !== p.passives.length) {
			this._cachedWpnCnt = p.weapons.length;
			this._cachedPasCnt = p.passives.length;
			this._cachedEquipStr = '\u2694' + p.weapons.length + '/6  \u{1F4E6}' + p.passives.length;
		}
		ctx.fillText(this._cachedEquipStr, 50, 52 + topOffset);

		// ── 11px 批次 ──
		ctx.font = _FONT_11;

		// 右上角 - 击杀 & 时间
		ctx.fillStyle = '#aaa';
		ctx.textAlign = 'right';
		const rightMargin = 100;
		if (this._cachedKillStr === undefined || this._cachedKills !== p.kills) {
			this._cachedKills = p.kills;
			this._cachedKillStr = '\u51FB\u6740: ' + p.kills;
		}
		ctx.fillText(this._cachedKillStr, w - rightMargin, 18 + topOffset);

		const curSec = Math.floor(this.time);
		if (this._cachedTimeSec === undefined || this._cachedTimeSec !== curSec) {
			this._cachedTimeSec = curSec;
			this._cachedTimeStr = this._formatTime(this.time);
		}
		ctx.fillText(this._cachedTimeStr, w - rightMargin, 33 + topOffset);
		ctx.textAlign = 'left';

		// 元素共鸣显示
		if (this.synergy) {
			const res = this.synergy.getActiveResonances();
			const resKeys = Object.keys(res);
			if (resKeys.length > 0) {
				// ELEMENTS 已在模块顶部导入
				let rx = 10;
				const ry = 86 + topOffset;
				ctx.font = '9px sans-serif';
				for (const el of resKeys) {
					const elDef = ELEMENTS[el];
					if (!elDef) continue;
					const tier = res[el];
					ctx.fillStyle = elDef.color;
					ctx.globalAlpha = 0.7 + fastSin(perfNow() / 500) * 0.3;
					ctx.fillText(elDef.name + (tier >= 3 ? '\u2162' : '\u2161'), rx, ry);
					rx += 35;
				}
				ctx.globalAlpha = 1;
			}
		}

		// 自动玩指示器
		if (this.autoPlay) {
			ctx.font = 'bold 11px sans-serif';
			ctx.fillStyle = '#ffaa00';
			ctx.textAlign = 'right';
			ctx.globalAlpha = 0.7 + fastSin(perfNow() / 400) * 0.3;
			ctx.fillText('🤖 AUTO', w - rightMargin, 50 + topOffset);
			ctx.globalAlpha = 1;
			ctx.textAlign = 'left';
		}

		// 低血量警告
		if (hpPct < 0.20 && this.time % 1 < 0.5) {
			// 移除全屏闪红，改为 UI 层提示以保护眼睛
		}

		// 时间裂缝：屏幕边缘青色光晕
		if (this.timeRift && this.timeRift.timer > 0) {
			const edgeW = 25;
			const alpha = 0.12 + 0.08 * fastSin(perfNow() / 250);
			ctx.save();
			ctx.globalAlpha = alpha;
			// 缓存渐变对象，仅在宽度变化时重建
			if (!this._riftGradL || this._riftGradW !== w) {
				this._riftGradW = w;
				this._riftGradL = ctx.createLinearGradient(0, 0, edgeW, 0);
				this._riftGradL.addColorStop(0, '#00ffff'); this._riftGradL.addColorStop(1, 'rgba(0,0,0,0)');
				this._riftGradR = ctx.createLinearGradient(w, 0, w - edgeW, 0);
				this._riftGradR.addColorStop(0, '#00ffff'); this._riftGradR.addColorStop(1, 'rgba(0,0,0,0)');
			}
			ctx.fillStyle = this._riftGradL; ctx.fillRect(0, 0, edgeW, this.height);
			ctx.fillStyle = this._riftGradR; ctx.fillRect(w - edgeW, 0, edgeW, this.height);
			ctx.restore();
		}

		// 连杀计数器（≥3连杀时显示）
		if (this.killCombo >= 3) {
			const comboColors = ['#ffcc00', '#ff8800', '#ff4400', '#ff0044', '#ff00ff'];
			const tier = Math.min(Math.floor(this.killCombo / 10), comboColors.length - 1);
			const comboColor = comboColors[tier];

			// 连杀光晕：已屏蔽，避免全屏光闪烁令人不适

			ctx.textAlign = 'right';
			ctx.font = 'bold 13px sans-serif';
			ctx.fillStyle = comboColor;
			ctx.globalAlpha = 0.7 + 0.3 * fastSin(perfNow() / 200);
			ctx.fillText(this.killCombo + 'x 连杀', w - 10, 50 + topOffset);
			ctx.globalAlpha = 1;
			// 下一奖励阈值提示
			const comboThresholds = [15, 30, 50, 75, 100];
			const nextT = comboThresholds.find(t => t > this.killCombo);
			if (nextT) {
				ctx.fillStyle = '#555';
				ctx.font = '9px sans-serif';
				ctx.fillText('\u2192' + nextT, w - 10, 63 + topOffset);
			}
			ctx.textAlign = 'left';
		}

		// 遗物图标（左下角）
		if (p.relics && p.relics.length > 0) {
			const relicY = (this.height || 600) - 20;
			ctx.font = 'bold 10px sans-serif';
			let rx = 10;
			for (const relic of p.relics) {
				const col = relic.rarity === 'red' ? '#ff4444' : (relic.rarity === 'gold' ? '#ffcc00' : '#aaaaaa');
				ctx.fillStyle = col;
				ctx.fillText('★', rx, relicY);
				rx += 14;
			}
		}
	};

	GameClass.prototype._drawBountyIndicator = function () {
		if (!this._bountyTarget || !this._bountyTarget.active) return;

		const ctx = this.ctx;
		const cam = this.camera;
		const bt = this._bountyTarget;
		const sx = bt.x - cam.x;
		const sy = bt.y - cam.y;
		const time = perfNow() / 1000;

		// 赏金目标头顶金色菱形
		const onScreen = sx > 0 && sx < this.width && sy > 0 && sy < this.height;
		if (onScreen) {
			ctx.save();
			ctx.translate(sx, sy - bt.radius - 15);
			ctx.rotate(Math.PI / 4);
			const pulse = 5 + fastSin(time * 4) * 2;
			ctx.fillStyle = '#ffcc00';
			ctx.globalAlpha = 0.8 + fastSin(time * 3) * 0.2;
			ctx.fillRect(-pulse / 2, -pulse / 2, pulse, pulse);
			ctx.restore();

			// 倒计时文字
			ctx.fillStyle = '#ffcc00';
			ctx.font = 'bold 10px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText(Math.ceil(this._bountyTimeLeft) + 's', sx, sy - bt.radius - 25);
			ctx.textAlign = 'left';
		} else {
			// 屏幕边缘箭头指引
			const cx = this.width / 2;
			const cy = this.height / 2;
			const angle = Math.atan2(sy - cy, sx - cx);
			const margin = 30;
			const edgeX = Math.max(margin, Math.min(this.width - margin, cx + fastCos(angle) * (this.width / 2 - margin)));
			const edgeY = Math.max(margin, Math.min(this.height - margin, cy + fastSin(angle) * (this.height / 2 - margin)));

			ctx.save();
			ctx.translate(edgeX, edgeY);
			ctx.rotate(angle);
			ctx.fillStyle = '#ffcc00';
			ctx.globalAlpha = 0.7 + fastSin(time * 4) * 0.3;
			ctx.beginPath();
			ctx.moveTo(10, 0);
			ctx.lineTo(-6, -6);
			ctx.lineTo(-6, 6);
			ctx.closePath();
			ctx.fill();
			ctx.restore();

			// 距离文字
			ctx.fillStyle = '#ffcc00';
			ctx.font = '9px sans-serif';
			ctx.textAlign = 'center';
			ctx.globalAlpha = 0.8;
			ctx.fillText(Math.ceil(this._bountyTimeLeft) + 's', edgeX, edgeY + 15);
			ctx.globalAlpha = 1;
			ctx.textAlign = 'left';
		}
	};

	GameClass.prototype._drawPauseButton = function () {
		const ctx = this.ctx;
		const w = this.width;
		const top = this.safeAreaTop || 0;

		const size = 44;
		const x = w - 80;
		const y = top + 52;

		this.pauseBtnRect = { x, y, w: size, h: size };

		// 圆形按钮背景
		ctx.fillStyle = 'rgba(0,0,0,0.4)';
		ctx.beginPath();
		ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
		ctx.fill();

		// 边框
		ctx.strokeStyle = 'rgba(255,255,255,0.5)';
		ctx.lineWidth = 1.5;
		ctx.stroke();

		// 暂停图标
		const iconOff = size * 0.28;
		const barW = size * 0.13;
		const barH = size * 0.38;
		const gap = size * 0.09;
		ctx.fillStyle = '#fff';
		ctx.fillRect(x + iconOff, y + size * 0.31, barW, barH);
		ctx.fillRect(x + iconOff + barW + gap, y + size * 0.31, barW, barH);
	};

	GameClass.prototype._drawPauseMenu = function () {
		try {
		const ctx = this.ctx;
		const w = this.width;
		const h = this.height;

		// 如果显示装备面板
		if (this.pauseShowEquip) { this._drawEquipPanel(); return; }
		// 如果显示 DPS 统计面板
		if (this.pauseShowStats) { this._drawDpsPanel(); return; }
		// 如果显示设置面板
		if (this.pauseShowSettings) { this._drawSettingsPanel(); return; }

		// 黑色遮罩
		ctx.fillStyle = 'rgba(0,0,0,0.6)';
		ctx.fillRect(0, 0, w, h);

		// 自适应间距：7个按钮 + 标题，确保在小屏（h≈480）内不溢出
		const gap = Math.min(44, (h * 0.82) / 8);
		const startY = h / 2 - gap * 3;

		// 标题
		ctx.fillStyle = '#fff';
		ctx.font = 'bold 24px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('PAUSED', w / 2, startY - gap * 0.6);

		this.pauseResumeBtn = UI.drawButton(ctx, '> 继续游戏', w / 2, startY, {
			fontSize: 18, color: '#00ffcc', bgColor: 'rgba(0,255,204,0.15)', borderColor: '#00ffcc'
		});
		this.pauseEquipBtn = UI.drawButton(ctx, '[ 图鉴 ]', w / 2, startY + gap, {
			fontSize: 18, color: '#ffcc00', bgColor: 'rgba(255,204,0,0.15)', borderColor: '#ffcc00'
		});
		this.pauseStatsBtn = UI.drawButton(ctx, '[ 伤害统计 ]', w / 2, startY + gap * 2, {
			fontSize: 18, color: '#88aaff', bgColor: 'rgba(136,170,255,0.15)', borderColor: '#88aaff'
		});
		this.pauseSettingsBtn = UI.drawButton(ctx, '[ 设置 ]', w / 2, startY + gap * 3, {
			fontSize: 18, color: '#aaaaaa', bgColor: 'rgba(170,170,170,0.15)', borderColor: '#aaaaaa'
		});

		// 自动走位按钮
		const autoOn = !!this.autoPlay;
		this.pauseAutoPlayBtn = UI.drawButton(ctx,
			autoOn ? '[ 自动走位：开 ]' : '[ 自动走位：关 ]',
			w / 2, startY + gap * 4, {
			fontSize: 17,
			color: autoOn ? '#ffaa00' : '#888888',
			bgColor: autoOn ? 'rgba(255,170,0,0.18)' : 'rgba(120,120,120,0.15)',
			borderColor: autoOn ? '#ffaa00' : '#888888',
		});

		// 自动升级按钮
		const autoUpgradeOn = !!this.autoUpgrade;
		this.pauseAutoUpgradeBtn = UI.drawButton(ctx,
			autoUpgradeOn ? '[ 自动升级：开 ]' : '[ 自动升级：关 ]',
			w / 2, startY + gap * 5, {
			fontSize: 17,
			color: autoUpgradeOn ? '#ffaa00' : '#888888',
			bgColor: autoUpgradeOn ? 'rgba(255,170,0,0.18)' : 'rgba(120,120,120,0.15)',
			borderColor: autoUpgradeOn ? '#ffaa00' : '#888888',
		});

		this.pauseQuitBtn = UI.drawButton(ctx, '[ 放弃挑战 ]', w / 2, startY + gap * 6, {
			fontSize: 18, color: '#ff4444', bgColor: 'rgba(255,68,68,0.15)', borderColor: '#ff4444'
		});

		ctx.textAlign = 'left';
		} catch (e) {
			console.error('[ERROR] _drawPauseMenu:', e);
		}
	};

	GameClass.prototype._drawEquipPanel = function () {
		const ctx = this.ctx;
		const w = this.width;
		const h = this.height;
		const p = this.player;
		const topOffset = this.safeAreaTop || 0;
		const margin = Math.max(20, w * 0.04);
		const cardW = w - margin * 2;
		const startX = margin;

		ctx.fillStyle = 'rgba(0,0,0,0.95)';
		ctx.fillRect(0, 0, w, h);

		ctx.fillStyle = '#ffcc00';
		ctx.font = 'bold 18px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('[ 图鉴 ]', w / 2, 30 + topOffset);

		this.pauseEquipBackBtn = UI.drawButton(ctx, '← 返回', startX + 35, 25 + topOffset, {
			fontSize: 12, color: '#aaa', bgColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.35)'
		});

		// ── 三标签页 ──
		const currentTab = this._equipTab || 'equip';
		const tabLabels = ['装备', 'Boss', '小怪'];
		const tabKeys = ['equip', 'boss', 'enemy'];
		const tabW = Math.floor((w - margin * 2) / 3);
		if (!this._equipTabBtns) this._equipTabBtns = [];
		for (let i = 0; i < 3; i++) {
			const active = currentTab === tabKeys[i];
			this._equipTabBtns[i] = UI.drawButton(ctx, tabLabels[i], startX + tabW * i + tabW / 2, 52 + topOffset, {
				fontSize: 13,
				color: active ? '#ffcc00' : '#888',
				bgColor: active ? 'rgba(255,204,0,0.2)' : 'rgba(255,255,255,0.05)',
				borderColor: active ? '#ffcc00' : 'rgba(255,255,255,0.2)',
			});
		}

		const bottomLimit = h - 25;
		let cy = 72 + topOffset;

		if (currentTab === 'equip') {
			// 装备 Tab
			ctx.fillStyle = '#777';
			ctx.font = '10px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText('LV.' + p.level + '  击杀:' + p.kills + '  HP:' + Math.ceil(p.hp) + '/' + p.maxHp + '  甲:' + p.armor, w / 2, cy);
			ctx.textAlign = 'left';
			cy += 14;

			const cardH = 48;
			const gap = 6;

			ctx.fillStyle = '#00ffcc';
			ctx.font = 'bold 12px sans-serif';
			ctx.fillText('武器 (' + p.weapons.length + '/6)', startX, cy);
			cy += 15;

			for (const weapon of p.weapons) {
				if (cy + cardH > bottomLimit) break;
				const x = startX, y = cy;
				const wColor = (weapon.evolved ? '#ff00ff' : (weapon.def && weapon.def.color)) || '#ffffff';

				ctx.fillStyle = 'rgba(255,255,255,0.05)';
				ctx.fillRect(x, y, cardW, cardH);
				ctx.strokeStyle = wColor;
				ctx.lineWidth = weapon.evolved ? 2 : 1;
				ctx.strokeRect(x, y, cardW, cardH);

				const iconSize = 36;
				const iconX = x + 6;
				const iconY = y + (cardH - iconSize) / 2;
				ctx.fillStyle = wColor + '33';
				ctx.fillRect(iconX, iconY, iconSize, iconSize);
				ctx.fillStyle = wColor;
				ctx.fillRect(iconX, iconY, 4, iconSize);
				const wName = (weapon.def && weapon.def.name) || weapon.id;
				ctx.font = 'bold 14px sans-serif';
				ctx.textAlign = 'center';
				ctx.fillText(wName[0], iconX + iconSize / 2, iconY + iconSize * 0.65);
				ctx.textAlign = 'left';

				const tx = x + iconSize + 14;
				ctx.fillStyle = weapon.evolved ? '#ff00ff' : '#fff';
				ctx.font = 'bold 12px sans-serif';
				ctx.fillText(weapon.evolved ? '★ ' + wName : wName, tx, y + 17);
				ctx.fillStyle = wColor;
				ctx.font = '10px sans-serif';
				ctx.fillText('LV.' + weapon.level + '/' + ((weapon.def && weapon.def.maxLevel) || 8), tx, y + 31);
				ctx.fillStyle = '#ff8844';
				ctx.fillText('伤害: ' + Math.floor(weapon.damage), tx + 55, y + 31);
				const el = weapon.def && weapon.def.element;
				if (el) {
					const elColors = { flux: '#00ffcc', void: '#aa44ff', plasma: '#ff6600', cryo: '#66ccff', toxic: '#88ff00' };
					ctx.fillStyle = elColors[el] || '#aaa';
					ctx.font = '9px sans-serif';
					ctx.fillText('[' + el + ']', tx, y + 44);
				}
				if (weapon.evolved) {
					ctx.fillStyle = '#ff00ff';
					ctx.font = '9px sans-serif';
					ctx.textAlign = 'right';
					ctx.fillText('已进化', x + cardW - 6, y + 17);
					ctx.textAlign = 'left';
				}
				cy += cardH + gap;
			}

			cy += 5;

			if (cy + 20 < bottomLimit && p.passives.length > 0) {
				ctx.fillStyle = '#ffcc00';
				ctx.font = 'bold 12px sans-serif';
				ctx.fillText('被动道具 (' + p.passives.length + ')', startX, cy);
				cy += 15;
				for (const passive of p.passives) {
					if (cy + cardH * 0.7 > bottomLimit) break;
					const x = startX, y = cy;
					const pItemH = cardH * 0.7;
					const pDef = PASSIVE_DEFS[passive.id];
					const pColor = (pDef && pDef.color) || '#ffcc00';

					ctx.fillStyle = 'rgba(255,255,255,0.03)';
					ctx.fillRect(x, y, cardW, pItemH);
					ctx.strokeStyle = pColor;
					ctx.lineWidth = 1;
					ctx.strokeRect(x, y, cardW, pItemH);

					const piSize = pItemH - 8;
					ctx.fillStyle = pColor + '22';
					ctx.fillRect(x + 4, y + 4, piSize, piSize);
					ctx.fillStyle = pColor;
					ctx.fillRect(x + 4, y + 4, 3, piSize);
					const pName = (pDef && pDef.name) || passive.id;
					ctx.font = 'bold 11px sans-serif';
					ctx.textAlign = 'center';
					ctx.fillStyle = pColor;
					ctx.fillText(pName[0], x + 4 + piSize / 2, y + 4 + piSize * 0.65);
					ctx.textAlign = 'left';

					const ptx = x + piSize + 12;
					ctx.fillStyle = '#ddd';
					ctx.font = '11px sans-serif';
					ctx.fillText(pName + '  LV.' + passive.level, ptx, y + 16);
					const passiveDesc = (pDef && pDef.desc) || '';
					if (passiveDesc) {
						ctx.fillStyle = '#888';
						ctx.font = '9px sans-serif';
						ctx.fillText(passiveDesc, ptx, y + 28);
					}
					cy += pItemH + 4;
				}
			}

		} else if (currentTab === 'boss') {
			// Boss 图鉴
			const BOSS_DEFS_INFO = [
				{ name: '核心破坏者', color: '#ff0055', hp: 2000, skills: ['冲锋', '爆发波', '弹幕地狱', '引力漩涡'] },
				{ name: '虚空巨人', color: '#aa44ff', hp: 3200, skills: ['召唤仆从', '重击', '螺旋弹幕', '死亡标记'] },
				{ name: '等离子九头蛇', color: '#ff6600', hp: 4200, skills: ['火焰柱', '爆发波', '电场', '激光扫射'] },
				{ name: '冰霜泰坦', color: '#66ccff', hp: 5500, skills: ['冰波', '碎裂', '暴风雪', '瞬间冻结'] },
				{ name: '腐蚀之源', color: '#88ff00', hp: 4800, skills: ['毒雨', '瘟疫云', '变异', '腐蚀'] },
				{ name: '时空裂隙', color: '#ff00ff', hp: 3500, skills: ['时间扭曲', '传送风暴', '虚空裂缝', '克隆军团'] },
				{ name: '机械统帅', color: '#ffcc00', hp: 7500, skills: ['激光网格', '导弹齐射', '护盾墙', '过载'] },
				{ name: '深渊守望者', color: '#4488ff', hp: 6000, skills: ['冲锋', '爆发波', '冰波', '传送风暴'] },
			];

			ctx.fillStyle = '#666';
			ctx.font = '10px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText('每5分钟出现 · 难度随波数递增', w / 2, cy);
			ctx.textAlign = 'left';
			cy += 14;

			const bCardH = 54;
			const bGap = 5;

			for (let i = 0; i < BOSS_DEFS_INFO.length; i++) {
				if (cy + bCardH > bottomLimit) break;
				const b = BOSS_DEFS_INFO[i];
				const x = startX, y = cy;

				ctx.fillStyle = 'rgba(255,255,255,0.03)';
				ctx.fillRect(x, y, cardW, bCardH);
				ctx.strokeStyle = b.color;
				ctx.lineWidth = 1;
				ctx.strokeRect(x, y, cardW, bCardH);

				const iconSize = 40;
				const iconX = x + 5;
				const iconY = y + (bCardH - iconSize) / 2;
				ctx.fillStyle = b.color + '22';
				ctx.fillRect(iconX, iconY, iconSize, iconSize);
				ctx.fillStyle = b.color;
				ctx.fillRect(iconX, iconY, 4, iconSize);
				ctx.font = 'bold 16px sans-serif';
				ctx.textAlign = 'center';
				ctx.fillText('☠', iconX + iconSize / 2, iconY + iconSize * 0.68);
				ctx.textAlign = 'left';

				const btx = x + iconSize + 13;
				ctx.fillStyle = b.color;
				ctx.font = 'bold 12px sans-serif';
				ctx.fillText('W' + (i + 1) + '. ' + b.name, btx, y + 16);
				ctx.fillStyle = '#999';
				ctx.font = '10px sans-serif';
				ctx.fillText('基础HP: ' + b.hp.toLocaleString(), btx, y + 30);
				ctx.fillStyle = '#666';
				ctx.font = '9px sans-serif';
				ctx.fillText(b.skills.join(' · '), btx, y + 44);

				cy += bCardH + bGap;
			}

		} else {
			// 小怪图鉴
			const ENEMY_INFO = [
				{ name: '蝙蝠', color: '#ff88cc', desc: '快速近战，成群', time: '0秒' },
				{ name: '蜂群无人机', color: '#ffff44', desc: '3-5只成群，极速', time: '0秒' },
				{ name: '萤火虫', color: '#ff6600', desc: '成群，接触爆炸', time: '30秒' },
				{ name: '骷髅', color: '#cccccc', desc: '中血量，稳定追击', time: '30秒' },
				{ name: '幽灵', color: '#aabbff', desc: '穿透地形追击', time: '1分' },
				{ name: '数据蠕虫', color: '#00ffcc', desc: '中速，坦克型', time: '1分' },
				{ name: '大黄蜂', color: '#ff8800', desc: '成群，速度快', time: '2分' },
				{ name: '爬虫', color: '#88ff44', desc: '成群，地面爬行', time: '2分' },
				{ name: '冰霜幽灵', color: '#66ccff', desc: '接触冻结玩家', time: '3分' },
				{ name: '黏液球', color: '#88ff00', desc: '减速玩家移动', time: '3分' },
				{ name: '故障体', color: '#dd44ff', desc: '随机传送', time: '3分' },
				{ name: '炮台', color: '#ffcc00', desc: '固定位置射击', time: '3分' },
				{ name: '链枪兵', color: '#ffaa44', desc: '高射速弹幕', time: '3分' },
				{ name: '闪现螨', color: '#ff00ff', desc: '瞬移靠近玩家', time: '4分' },
				{ name: '机械蜘蛛', color: '#ff6688', desc: '产生小蜘蛛群', time: '4分' },
				{ name: '激光无人机', color: '#ff4444', desc: '激光持续射击', time: '5分' },
				{ name: '螺旋法师', color: '#aa44ff', desc: '螺旋弹幕', time: '7分' },
				{ name: '散弹手', color: '#ff8844', desc: '扇形散弹', time: '9分' },
				{ name: '迫击无人机', color: '#cc8844', desc: '抛物线弹幕', time: '9分' },
				{ name: '冰霜泰坦', color: '#66ccff', desc: '超大型·冻结', time: '13分' },
				{ name: '瘟疫之源', color: '#88ff00', desc: '持续释放毒云', time: '13分' },
				{ name: '铁傀儡', color: '#aaaaaa', desc: '超高血量·极慢', time: '13分' },
				{ name: '虚空水蛭', color: '#aa44ff', desc: '攻击时回复血量', time: '15分' },
			];

			ctx.fillStyle = '#666';
			ctx.font = '10px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText('按出现时间排序 · 精英怪拥有词缀加成', w / 2, cy);
			ctx.textAlign = 'left';
			cy += 14;

			const colW = Math.floor((cardW - 4) / 2);
			const eCardH = 40;
			const eGap = 4;
			let col = 0;

			for (const ei of ENEMY_INFO) {
				if (col === 0 && cy + eCardH > bottomLimit) break;
				const x = startX + col * (colW + 4);
				const y = cy;

				ctx.fillStyle = 'rgba(255,255,255,0.03)';
				ctx.fillRect(x, y, colW, eCardH);
				ctx.strokeStyle = ei.color + '88';
				ctx.lineWidth = 1;
				ctx.strokeRect(x, y, colW, eCardH);

				const sq = eCardH - 10;
				ctx.fillStyle = ei.color + '33';
				ctx.fillRect(x + 4, y + 5, sq, sq);
				ctx.fillStyle = ei.color;
				ctx.fillRect(x + 4, y + 5, 3, sq);

				const etx = x + sq + 10;
				ctx.fillStyle = ei.color;
				ctx.font = 'bold 10px sans-serif';
				ctx.fillText(ei.name, etx, y + 15);
				ctx.fillStyle = '#777';
				ctx.font = '9px sans-serif';
				ctx.fillText(ei.desc, etx, y + 27);
				ctx.fillStyle = '#555';
				ctx.fillText(ei.time + '后', etx, y + 37);

				col++;
				if (col >= 2) {
					col = 0;
					cy += eCardH + eGap;
				}
			}
			if (col > 0) cy += eCardH + eGap;
		}
	};

	// ═══ DPS 统计面板 ═══
	GameClass.prototype._drawDpsPanel = function () {
		const ctx = this.ctx;
		const w = this.width;
		const h = this.height;
		const topOffset = this.safeAreaTop || 0;
		const margin = Math.max(20, w * 0.04);
		const cardW = w - margin * 2;
		const startX = margin;

		ctx.fillStyle = 'rgba(0,0,0,0.95)';
		ctx.fillRect(0, 0, w, h);

		ctx.fillStyle = '#88aaff';
		ctx.font = 'bold 18px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('[ 伤害统计 ]', w / 2, 30 + topOffset);

		this.pauseStatsBackBtn = UI.drawButton(ctx, '← 返回', startX + 35, 25 + topOffset, {
			fontSize: 12, color: '#aaa', bgColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.35)'
		});

		const stats = this._weaponDamageStats || {};
		const entries = [];
		let totalDmg = 0;

		for (const wid of Object.keys(stats)) {
			const dmg = stats[wid];
			if (dmg <= 0) continue;
			totalDmg += dmg;
			const def = WEAPON_DEFS[wid];
			entries.push({ name: (def && def.name) || wid, color: (def && def.color) || '#fff', dmg });
		}
		entries.sort((a, b) => b.dmg - a.dmg);

		ctx.fillStyle = '#aaa';
		ctx.font = '12px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('总伤害: ' + this._formatDmgNumber(totalDmg), w / 2, 55 + topOffset);
		ctx.textAlign = 'left';

		let cy = 75 + topOffset;
		const barH = 32;
		const gap = 6;
		const maxBarW = cardW - 110;

		if (entries.length === 0) {
			ctx.fillStyle = '#666';
			ctx.font = '14px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText('暂无伤害数据', w / 2, h / 2);
			ctx.textAlign = 'left';
			return;
		}

		const maxDmg = entries[0].dmg;

		for (const entry of entries) {
			if (cy + barH > h - 20) break;
			const pct = totalDmg > 0 ? entry.dmg / totalDmg : 0;
			const barPct = maxDmg > 0 ? entry.dmg / maxDmg : 0;

			ctx.fillStyle = 'rgba(255,255,255,0.03)';
			ctx.fillRect(startX, cy, cardW, barH);
			ctx.fillStyle = entry.color;
			ctx.font = 'bold 11px sans-serif';
			ctx.fillText(entry.name, startX + 6, cy + 14);
			ctx.fillStyle = '#aaa';
			ctx.font = '10px sans-serif';
			ctx.fillText(this._formatDmgNumber(entry.dmg) + ' (' + Math.round(pct * 100) + '%)', startX + 6, cy + 27);
			const barX = startX + 105;
			ctx.fillStyle = 'rgba(255,255,255,0.08)';
			ctx.fillRect(barX, cy + 8, maxBarW, 16);
			ctx.fillStyle = entry.color;
			ctx.globalAlpha = 0.6;
			ctx.fillRect(barX, cy + 8, maxBarW * barPct, 16);
			ctx.globalAlpha = 1;
			cy += barH + gap;
		}
	};

	// ═══ Boss 伤害来源面板 ═══
	GameClass.prototype._showBossDamageBreakdown = function (log, bossName) {
		this._bossDamageDisplay = { log, bossName, timer: 5 };
	};

	GameClass.prototype._drawBossDamagePanel = function () {
		const bdd = this._bossDamageDisplay;
		if (!bdd) return;
		bdd.timer -= (this.frameDt || 0.016);
		if (bdd.timer <= 0) { this._bossDamageDisplay = null; return; }

		const ctx = this.ctx;
		const w = this.width;
		const alpha = Math.min(1, bdd.timer * 2);

		const entries = [];
		let totalDmg = 0;
		for (const wid of Object.keys(bdd.log)) {
			const dmg = bdd.log[wid];
			if (dmg <= 0) continue;
			totalDmg += dmg;
			const def = WEAPON_DEFS[wid];
			entries.push({
				name: wid === '_other' ? '其他' : ((def && def.name) || wid),
				color: wid === '_other' ? '#888' : ((def && def.color) || '#fff'),
				dmg,
			});
		}
		entries.sort((a, b) => b.dmg - a.dmg);
		if (entries.length === 0) return;

		const panelW = Math.min(280, w * 0.75);
		const lineH = 22;
		const panelH = 36 + entries.length * lineH + 8;
		const px = (w - panelW) / 2;
		const py = 60 + (this.safeAreaTop || 0);

		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.fillStyle = 'rgba(0,0,0,0.8)';
		UI.drawSafeRoundRect(ctx, px, py, panelW, panelH, 8);
		ctx.fill();
		ctx.strokeStyle = 'rgba(255,204,0,0.5)';
		ctx.lineWidth = 1;
		ctx.stroke();

		ctx.fillStyle = '#ffcc00';
		ctx.font = 'bold 12px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('⚔ ' + bdd.bossName + ' 伤害来源', w / 2, py + 18);
		ctx.textAlign = 'left';

		let cy = py + 32;
		const barMaxW = panelW - 120;
		const maxDmg = entries[0].dmg;

		for (const e of entries) {
			const pct = totalDmg > 0 ? e.dmg / totalDmg : 0;
			const barPct = maxDmg > 0 ? e.dmg / maxDmg : 0;
			ctx.fillStyle = e.color;
			ctx.font = '10px sans-serif';
			ctx.fillText(e.name, px + 8, cy + 12);
			ctx.fillStyle = '#ccc';
			ctx.fillText(Math.round(pct * 100) + '%', px + 70, cy + 12);
			ctx.fillStyle = 'rgba(255,255,255,0.1)';
			ctx.fillRect(px + 100, cy + 3, barMaxW, 10);
			ctx.fillStyle = e.color;
			ctx.globalAlpha = alpha * 0.7;
			ctx.fillRect(px + 100, cy + 3, barMaxW * barPct, 10);
			ctx.globalAlpha = alpha;
			cy += lineH;
		}
		ctx.restore();
	};

	GameClass.prototype._formatDmgNumber = function (n) {
		if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
		if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
		return Math.floor(n).toString();
	};

	GameClass.prototype._drawJoystick = function () {
		const ctx = this.ctx;
		const { origin, current } = this.input;
		ctx.beginPath();
		ctx.arc(origin.x, origin.y, 50, 0, Math.PI * 2);
		ctx.strokeStyle = 'rgba(0,255,204,0.25)';
		ctx.lineWidth = 2;
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(current.x, current.y, 18, 0, Math.PI * 2);
		ctx.fillStyle = 'rgba(0,255,204,0.4)';
		ctx.fill();
	};

	GameClass.prototype._formatTime = function (t) {
		const m = Math.floor(t / 60);
		const s = Math.floor(t % 60);
		return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	};

	// ─── 新手引导 ───

	GameClass.prototype._drawTutorial = function () {
		const ctx = this.ctx;
		const w = this.width, h = this.height;

		const steps = [
			{ title: '🕹 移动', desc: '按住屏幕并拖动\n控制角色移动方向', icon: '👆' },
			{ title: '⚔ 自动攻击', desc: '武器会自动攻击\n靠近敌人即可造成伤害', icon: '💥' },
			{ title: '⬆ 升级', desc: '击杀敌人获得经验\n升级后选择新武器或强化', icon: '🎯' },
		];

		const step = steps[this._tutorialStep];
		if (!step) return;

		// 半透明遮罩
		ctx.fillStyle = 'rgba(0,0,0,0.7)';
		ctx.fillRect(0, 0, w, h);

		// 中央卡片
		const cardW = Math.min(280, w * 0.75);
		const cardH = 160;
		const cx = (w - cardW) / 2;
		const cy = (h - cardH) / 2 - 20;

		ctx.fillStyle = 'rgba(10,10,30,0.95)';
		UI.drawSafeRoundRect(ctx, cx, cy, cardW, cardH, 12);
		ctx.fill();
		ctx.strokeStyle = '#00ffcc';
		ctx.lineWidth = 2;
		ctx.stroke();

		ctx.font = '36px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(step.icon, w / 2, cy + 45);

		ctx.font = 'bold 18px sans-serif';
		ctx.fillStyle = '#00ffcc';
		ctx.fillText(step.title, w / 2, cy + 75);

		ctx.font = '13px sans-serif';
		ctx.fillStyle = '#ccc';
		const lines = step.desc.split('\n');
		lines.forEach((line, i) => {
			ctx.fillText(line, w / 2, cy + 100 + i * 20);
		});

		// 步骤指示器
		const dotY = cy + cardH + 15;
		for (let i = 0; i < steps.length; i++) {
			ctx.beginPath();
			ctx.arc(w / 2 + (i - 1) * 18, dotY, 4, 0, Math.PI * 2);
			ctx.fillStyle = i === this._tutorialStep ? '#00ffcc' : '#444';
			ctx.fill();
		}

		// 提示
		const blink = fastSin(perfNow() / 300) * 0.3 + 0.7;
		ctx.globalAlpha = blink;
		ctx.font = '11px sans-serif';
		ctx.fillStyle = '#888';
		ctx.fillText(this._tutorialStep < steps.length - 1 ? '点击继续' : '点击开始游戏', w / 2, dotY + 30);
		ctx.globalAlpha = 1;
		ctx.textAlign = 'left';
	};

	GameClass.prototype._advanceTutorial = function () {
		this._tutorialStep++;
		if (this._tutorialStep >= 3) {
			this._tutorialStep = -1;
			try { wx.setStorageSync('flux_played', '1'); } catch (e) { /* 忽略 */ }
		}
	};

	// ─── 设置面板 ───
	GameClass.prototype._drawSettingsPanel = function () {
		const SFX = require('./SFX');
		const ctx = this.ctx;
		const w = this.width;
		const h = this.height;

		ctx.fillStyle = 'rgba(0,0,0,0.85)';
		ctx.fillRect(0, 0, w, h);

		ctx.fillStyle = '#aaaaaa';
		ctx.font = 'bold 20px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('[ 设置 ]', w / 2, h / 2 - 90);

		// 音效开关
		const sfxMuted = SFX.isMuted;
		const sfxLabel = sfxMuted ? '[ 音效：关 ]' : '[ 音效：开 ]';
		const sfxColor = sfxMuted ? '#888' : '#00ffcc';
		this.settingsAudioBtn = UI.drawButton(ctx, sfxLabel, w / 2, h / 2 - 20, {
			fontSize: 17, color: sfxColor, bgColor: sfxMuted ? 'rgba(80,80,80,0.2)' : 'rgba(0,255,204,0.15)', borderColor: sfxColor
		});

		// 画质开关
		const isHigh = (this.qualityLevel || 0) >= 0.8;
		const qualLabel = isHigh ? '[ 画质：高 ]' : '[ 画质：低 ]';
		const qualColor = isHigh ? '#ffcc00' : '#888';
		this.settingsQualityBtn = UI.drawButton(ctx, qualLabel, w / 2, h / 2 + 40, {
			fontSize: 17, color: qualColor, bgColor: isHigh ? 'rgba(255,204,0,0.15)' : 'rgba(80,80,80,0.2)', borderColor: qualColor
		});

		// 返回按钮
		this.settingsBackBtn = UI.drawButton(ctx, '◀ 返回', w / 2, h / 2 + 100, {
			fontSize: 16, color: '#aaaaaa', bgColor: 'rgba(170,170,170,0.1)', borderColor: '#aaaaaa'
		});

		ctx.textAlign = 'left';
	};

	// ─── 连杀文字 + 边缘光效 + 断裂提示（从 Game.draw() 提取） ───
	GameClass.prototype._drawComboDisplay = function (ctx, dt) {
		if (this.killCombo >= 5) {
			const combo = this.killCombo;
			let comboColor = '#aaaaaa';
			let comboSize = 18;
			if (combo >= 100) { comboColor = '#ffd700'; comboSize = 28; }
			else if (combo >= 75) { comboColor = '#ff44ff'; comboSize = 26; }
			else if (combo >= 50) { comboColor = '#ff8800'; comboSize = 24; }
			else if (combo >= 30) { comboColor = '#00ccff'; comboSize = 22; }
			else if (combo >= 15) { comboColor = '#88ff44'; comboSize = 20; }
			else { comboColor = '#ffcc00'; }
			ctx.fillStyle = comboColor;
			ctx.font = 'bold ' + comboSize + 'px sans-serif';
			ctx.textAlign = 'center';
			const comboY = this.height * 0.12 + (this.safeAreaTop || 0);
			ctx.fillText(combo + ' \u8FDE\u6740!', this.width / 2, comboY);
			ctx.textAlign = 'left';

			// 边缘渐变光效已按玩家要求永久屏蔽，防止粗边框亮瞎眼
		}

		// 连杀断裂提示
		if (this._comboBreakDisplay && this._comboBreakDisplay.timer > 0) {
			this._comboBreakDisplay.timer -= dt;
			const cbd = this._comboBreakDisplay;
			ctx.globalAlpha = Math.min(1, cbd.timer);
			ctx.fillStyle = '#ff4444';
			ctx.font = 'bold 16px sans-serif';
			ctx.textAlign = 'center';
			const breakY = this.height * 0.16 + (this.safeAreaTop || 0);
			ctx.fillText('\u6700\u7EC8\u8FDE\u6740: ' + cbd.count, this.width / 2, breakY);
			ctx.textAlign = 'left';
			ctx.globalAlpha = 1;
		}
	};

	// ─── Boss 入场演出覆盖层（从 Game.draw() 提取） ───
	GameClass.prototype._drawBossEntrance = function (ctx) {
		if (!this._bossEntrance || this._bossEntrance.timer <= 0) return;
		const be = this._bossEntrance;
		const progress = 1 - (be.timer / 1.5);
		const w = this.width, h = this.height;

		const darkAlpha = progress < 0.2 ? progress * 3 : (progress > 0.8 ? (1 - progress) * 3 : 0.6);
		ctx.fillStyle = 'rgba(0,0,0,' + Math.min(0.6, darkAlpha) + ')';
		ctx.fillRect(0, 0, w, h);

		if (progress > 0.1 && progress < 0.9) {
			ctx.textAlign = 'center';
			if (progress < 0.4) {
				const flash = fastSin(progress * 40) > 0 ? 1 : 0.3;
				ctx.globalAlpha = flash;
				ctx.fillStyle = '#ff4444';
				ctx.font = 'bold 16px sans-serif';
				ctx.fillText('\u26A0 WARNING \u26A0', w / 2, h * 0.38);
			}
			const nameAlpha = Math.min(1, (progress - 0.25) * 4);
			if (nameAlpha > 0) {
				ctx.globalAlpha = nameAlpha;
				ctx.fillStyle = be.color;
				ctx.font = 'bold 28px sans-serif';
				ctx.fillText(be.name, w / 2, h * 0.48);
				ctx.strokeStyle = be.color;
				ctx.lineWidth = 2;
				ctx.globalAlpha = nameAlpha * 0.5;
				const lineW = w * 0.4 * nameAlpha;
				ctx.beginPath();
				ctx.moveTo(w / 2 - lineW / 2, h * 0.52);
				ctx.lineTo(w / 2 + lineW / 2, h * 0.52);
				ctx.stroke();
			}
			ctx.globalAlpha = 1;
			ctx.textAlign = 'left';
		}
	};

	// ─── 濒死红晕（从 Game.draw() 提取） ───
	GameClass.prototype._drawLastStand = function (ctx) {
		if (this._lastStandTimer <= 0) return;
		ctx.save();
		const lsAlpha = Math.min(0.4, this._lastStandTimer * 0.15) * (0.7 + 0.3 * fastSin(perfNow() / 200));
		if (!this._lastStandGradient || this._lsGradW !== this.width || this._lsGradH !== this.height) {
			this._lsGradW = this.width;
			this._lsGradH = this.height;
			const g = ctx.createRadialGradient(
				this.width / 2, this.height / 2, this.width * 0.3,
				this.width / 2, this.height / 2, this.width * 0.7
			);
			g.addColorStop(0, 'rgba(255,0,0,0)');
			g.addColorStop(1, 'rgba(255,0,0,1)');
			this._lastStandGradient = g;
		}
		ctx.globalAlpha = lsAlpha;
		ctx.fillStyle = this._lastStandGradient;
		ctx.fillRect(0, 0, this.width, this.height);
		ctx.restore();
	};

	// ─── Dash 按钮绘制 ───
	GameClass.prototype._drawDashButton = function (ctx) {
		const p = this.player;
		if (!p) return;

		const w = this.width, h = this.height;
		const btnRadius = 35;
		const centerX = w - btnRadius - 20;
		const centerY = h - btnRadius - 30;

		// 记录按钮位置用于输入判定
		this.dashBtnRect = { x: centerX - btnRadius, y: centerY - btnRadius, w: btnRadius * 2, h: btnRadius * 2, cx: centerX, cy: centerY, r: btnRadius };

		ctx.save();

		// 背景圆
		ctx.beginPath();
		ctx.arc(centerX, centerY, btnRadius, 0, Math.PI * 2);
		ctx.fillStyle = 'rgba(0,0,0,0.4)';
		ctx.fill();

		const dashReady = p.dashCooldown <= 0;

		if (dashReady) {
			// 准备就绪：高亮边框和文字
			ctx.strokeStyle = '#00ffcc';
			ctx.lineWidth = 3;
			ctx.stroke();

			ctx.fillStyle = '#00ffcc';
			ctx.font = 'bold 16px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText('DASH', centerX, centerY + 6);
			// 增加呼吸光晕
			ctx.globalAlpha = 0.5 + 0.5 * fastSin(perfNow() / 150);
			ctx.shadowColor = '#00ffcc';
			ctx.shadowBlur = 10;
			ctx.stroke();
		} else {
			// 冷却中：暗色边框，绘制遮罩扇形，显示秒数
			ctx.strokeStyle = '#555';
			ctx.lineWidth = 3;
			ctx.stroke();

			const cdRatio = p.dashCooldown / p.dashMaxCooldown; // assuming 3s max
			ctx.beginPath();
			ctx.moveTo(centerX, centerY);
			ctx.arc(centerX, centerY, btnRadius, -Math.PI / 2, -Math.PI / 2 + (1 - cdRatio) * Math.PI * 2);
			ctx.fillStyle = 'rgba(0, 255, 204, 0.2)';
			ctx.fill();

			ctx.fillStyle = '#aaa';
			ctx.font = 'bold 18px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText(p.dashCooldown.toFixed(1), centerX, centerY + 6);
		}

		ctx.restore();
	};
}

module.exports = installHUD;
