const UI = require('../UIRenderer');
const { META_UPGRADES } = require('../MetaSystem');
const { SKINS, getCharacterSkins } = require('../Skins');
const { CHARACTERS } = require('../Character');
const { TalentTree, TALENT_BRANCHES, NODE_MAP } = require('../TalentTree');
const { PET_TYPES } = require('../Pet'); // 引入宠物类型
const { AURA_TYPES } = require('../Auras'); // 引入光环类型
// 节点名称查找（用于显示前置要求）
const NODE_MAP_REF = NODE_MAP;

class ShopScene {
	constructor() {
		this.items = [];
		this.backBtn = null;
		this.tabBtns = [];
		this.currentTab = 'upgrades'; // 'upgrades' | 'skins' | 'talent'
		this.selectedChar = null;
		this.scrollOffset = 0;
		this.touchStartY = 0;
		this.lastTouchY = 0;
		this.isDragging = false;
		this.contentHeight = 0;
		// 天赋树
		this.talentTree = null;
		this.talentBranchIdx = 0; // 当前显示的分支 0/1/2
	}

	enter() {
		this.items = [];
		this.scrollOffset = 0;
		this.currentTab = 'upgrades';
		this.selectedChar = null;
		this.talentTree = null;
	}

	draw(ctx, w, h) {
		UI.drawOverlay(ctx, w, h, 1.0);

		const topOffset = (this.game && this.game.safeAreaTop) || 0;
		const meta = this.game.meta;
		if (!meta) return;

		// 标题
		UI.drawCenteredText(ctx, '💾 芯片商店', w / 2, 35 + topOffset, {
			fontSize: 18, color: '#ffcc00', shadow: '#ffcc00',
		});

		// 余额
		UI.drawCenteredText(ctx, `芯片: ${meta.data.chips}`, w / 2, 58 + topOffset, {
			fontSize: 13, color: '#ffcc00', fontStyle: 'normal',
		});

		// 标签页切换
		const tabY = 80 + topOffset;
		const tabW = 60; // 缩小宽度以容纳4个标签
		const tabH = 28; // 补回误删的 tabH
		const tabGap = 5;
		const totalTabW = tabW * 4 + tabGap * 3;
		const startX = w / 2 - totalTabW / 2;
		this.tabBtns = [];

		// 升级标签
		let currentX = startX;
		const isUpgradeActive = this.currentTab === 'upgrades';
		this._drawTab(ctx, currentX, tabY, tabW, tabH, '升级', isUpgradeActive, '#00ffcc');
		this.tabBtns.push({ x: currentX, y: tabY, w: tabW, h: tabH, tab: 'upgrades' });

		// 外观标签
		currentX += tabW + tabGap;
		const isSkinActive = this.currentTab === 'skins';
		this._drawTab(ctx, currentX, tabY, tabW, tabH, '外观', isSkinActive, '#ff44ff');
		this.tabBtns.push({ x: currentX, y: tabY, w: tabW, h: tabH, tab: 'skins' });

		// 天赋标签
		currentX += tabW + tabGap;
		const isTalentActive = this.currentTab === 'talent';
		this._drawTab(ctx, currentX, tabY, tabW, tabH, '天赋树', isTalentActive, '#ffaa00');
		this.tabBtns.push({ x: currentX, y: tabY, w: tabW, h: tabH, tab: 'talent' });

		// 宠物抽取标签
		currentX += tabW + tabGap;
		const isPetsActive = this.currentTab === 'pets';
		this._drawTab(ctx, currentX, tabY, tabW, tabH, '盲盒', isPetsActive, '#ffcc00');
		this.tabBtns.push({ x: currentX, y: tabY, w: tabW, h: tabH, tab: 'pets' });

		// 内容区域
		const startY = tabY + tabH + 10;
		const bottomY = h - 80;

		if (this.currentTab === 'upgrades') {
			this._drawUpgradesTab(ctx, w, startY, bottomY, meta);
		} else if (this.currentTab === 'talent') {
			if (!this.talentTree) this.talentTree = new TalentTree(meta);
			this._drawTalentTab(ctx, w, startY, bottomY, meta);
		} else if (this.currentTab === 'pets') {
			this._drawPetsTab(ctx, w, startY, bottomY, meta);
		} else {
			this._drawSkinsTab(ctx, w, startY, bottomY, meta);
		}

		// 返回按钮 - 固定在底部
		this.backBtn = UI.drawButton(ctx, '返回', w / 2, h - 40, {
			fontSize: 13, color: '#aaa',
			bgColor: 'rgba(255,255,255,0.12)',
			borderColor: 'rgba(255,255,255,0.35)',
		});
	}

	_drawTab(ctx, x, y, w, h, text, active, color) {
		ctx.save();
		if (active) {
			ctx.fillStyle = color;
			ctx.shadowBlur = 10;
			ctx.shadowColor = color;
		} else {
			ctx.fillStyle = 'rgba(255,255,255,0.1)';
		}
		UI.drawRoundRect(ctx, x, y, w, h, 6);
		ctx.fill();

		if (active) {
			ctx.strokeStyle = color;
			ctx.lineWidth = 2;
			ctx.stroke();
		}

		ctx.fillStyle = active ? '#fff' : '#666';
		ctx.font = '12px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(text, x + w / 2, y + h / 2 + 4);
		ctx.restore();
	}

	_drawUpgradesTab(ctx, w, startY, bottomY, meta) {
		this.items = [];
		const cardW = w * 0.88;
		const cardH = 55;
		const gap = 6;

		this.contentHeight = META_UPGRADES.length * (cardH + gap) - gap;
		const scrollAreaHeight = bottomY - startY;
		const maxScroll = Math.max(0, this.contentHeight - scrollAreaHeight);
		this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, maxScroll));

		ctx.save();
		ctx.beginPath();
		ctx.rect(0, startY, w, scrollAreaHeight);
		ctx.clip();

		let cy = startY - this.scrollOffset;

		META_UPGRADES.forEach((u) => {
			const lvl = meta.getLevel(u.id);
			const cost = meta.getCost(u);
			const maxed = lvl >= u.maxLevel;
			const canBuy = !maxed && meta.data.chips >= cost;

			const x = (w - cardW) / 2;
			const y = cy;

			if (y + cardH > startY && y < bottomY) {
				UI.drawCard(ctx, x, y, cardW, cardH, {
					borderColor: canBuy ? '#ffcc0033' : 'rgba(255,255,255,0.06)',
					bgColor: 'rgba(255,255,255,0.03)',
				});

				ctx.save();
				ctx.font = 'bold 12px sans-serif';
				ctx.fillStyle = '#ddd';
				ctx.fillText(u.name, x + 12, y + 20);

				ctx.font = '10px sans-serif';
				ctx.fillStyle = '#888';
				ctx.fillText(u.desc, x + 12, y + 35);

				ctx.font = '10px sans-serif';
				ctx.fillStyle = '#555';
				ctx.fillText(`LV.${lvl}/${u.maxLevel}`, x + 12, y + 48);

				ctx.textAlign = 'right';
				ctx.font = 'bold 11px sans-serif';
				if (maxed) {
					ctx.fillStyle = '#555';
					ctx.fillText('已满级', x + cardW - 12, y + 32);
				} else {
					ctx.fillStyle = canBuy ? '#ffcc00' : '#664400';
					ctx.fillText(`${cost} 💾`, x + cardW - 12, y + 32);
				}
				ctx.textAlign = 'left';
				ctx.restore();

				if (canBuy) {
					this.items.push({ x, y, w: cardW, h: cardH, type: 'upgrade', upgradeId: u.id, upgrade: u });
				}
			}

			cy += cardH + gap;
		});

		ctx.restore();
		this._drawScrollIndicator(ctx, w, startY, scrollAreaHeight, maxScroll);
	}

	_drawSkinsTab(ctx, w, startY, bottomY, meta) {
		this.items = [];
		const charList = Object.entries(CHARACTERS);

		// 如果没有选择角色，显示角色列表
		if (!this.selectedChar) {
			this._drawCharacterList(ctx, w, startY, bottomY, meta, charList);
		} else if (this.selectedChar === 'auras') {
			this._drawAuraList(ctx, w, startY, bottomY, meta);
		} else {
			this._drawSkinList(ctx, w, startY, bottomY, meta);
		}
	}

	_drawCharacterList(ctx, w, startY, bottomY, meta, charList) {
		const cardW = w * 0.88;
		const cardH = 50;
		const gap = 6;

		// 计算包含“全局光环入口”卡片的总高度，需额外加一个卡片和间距
		this.contentHeight = (charList.length + 1) * (cardH + gap) + 20;
		const scrollAreaHeight = bottomY - startY;
		const maxScroll = Math.max(0, this.contentHeight - scrollAreaHeight);
		this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, maxScroll));

		ctx.save();
		ctx.beginPath();
		ctx.rect(0, startY, w, scrollAreaHeight);
		ctx.clip();

		let cy = startY - this.scrollOffset;

		// 添加全局光环入口（炫酷置顶版）
		const aurasY = cy;
		if (aurasY + cardH > startY && aurasY < bottomY) {
			const time = this.game ? this.game.time : 0;
			const pulse = 0.6 + 0.4 * Math.sin(time * 3); // 0.2 to 1.0 呼吸

			// 动态霓虹渐变背景
			const grad = ctx.createLinearGradient((w - cardW) / 2, aurasY, (w + cardW) / 2, aurasY + cardH);
			grad.addColorStop(0, `rgba(255, 204, 0, ${0.1 * pulse})`);
			grad.addColorStop(0.5, `rgba(255, 100, 0, ${0.25 * pulse})`);
			grad.addColorStop(1, `rgba(255, 50, 150, ${0.1 * pulse})`);

			UI.drawCard(ctx, (w - cardW) / 2, aurasY, cardW, cardH, {
				borderColor: `rgba(255, 204, 0, ${0.4 + 0.6 * pulse})`,
				bgColor: grad,
			});

			ctx.save();
			ctx.shadowBlur = 10 * pulse;
			ctx.shadowColor = '#ffcc00';
			ctx.font = 'bold 15px sans-serif';
			ctx.fillStyle = '#ffcc00';
			ctx.fillText('✨ 奢华光环与残影特效 ✨', (w - cardW) / 2 + 14, aurasY + 30);

			ctx.textAlign = 'right';
			ctx.fillText('▶', (w - cardW) / 2 + cardW - 12, aurasY + 30);
			ctx.restore();

			ctx.textAlign = 'left';
			this.items.push({ x: (w - cardW) / 2, y: aurasY, w: cardW, h: cardH, type: 'charSelect', charId: 'auras' });
		}
		cy += cardH + gap;

		charList.forEach(([id, char]) => {
			const skins = getCharacterSkins(id);
			const unlockedCount = skins.filter(s => s.cost === 0 || meta.isSkinUnlocked(s.id)).length;
			const totalSkins = skins.length;

			const x = (w - cardW) / 2;
			const y = cy;

			if (y + cardH > startY && y < bottomY) {
				UI.drawCard(ctx, x, y, cardW, cardH, {
					borderColor: char.color + '44',
					bgColor: 'rgba(255,255,255,0.03)',
				});

				// 左侧颜色条
				ctx.fillStyle = char.color;
				ctx.fillRect(x, y, 4, cardH);

				// 角色名
				ctx.font = 'bold 13px sans-serif';
				ctx.fillStyle = '#fff';
				ctx.fillText(char.name, x + 14, y + 22);

				// 外观进度
				ctx.font = '10px sans-serif';
				ctx.fillStyle = '#888';
				ctx.fillText(`外观: ${unlockedCount}/${totalSkins}`, x + 14, y + 38);

				// 箭头
				ctx.textAlign = 'right';
				ctx.fillStyle = '#555';
				ctx.fillText('▶', x + cardW - 12, y + 30);
				ctx.textAlign = 'left';

				this.items.push({ x, y, w: cardW, h: cardH, type: 'charSelect', charId: id });
			}

			cy += cardH + gap;
		});

		ctx.restore();
		this._drawScrollIndicator(ctx, w, startY, scrollAreaHeight, maxScroll);
	}

	_drawAuraList(ctx, w, startY, bottomY, meta) {
		// 返回按钮
		const backBtnX = 10;
		const backBtnY = startY;
		ctx.fillStyle = 'rgba(255,255,255,0.1)';
		UI.drawRoundRect(ctx, backBtnX, backBtnY, 50, 24, 4);
		ctx.fill();
		ctx.fillStyle = '#aaa';
		ctx.font = '11px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('◀ 返回', backBtnX + 25, backBtnY + 16);
		ctx.textAlign = 'left';
		this.items.push({ x: backBtnX, y: backBtnY, w: 50, h: 24, type: 'backToCharList' });

		// 标题
		ctx.font = 'bold 12px sans-serif';
		ctx.fillStyle = '#ffcc00';
		ctx.fillText('光环与残影 (Auras)', 70, backBtnY + 16);

		const listStartY = startY + 32;
		const auras = Object.values(AURA_TYPES);
		const cardW = w * 0.88;
		const cardH = 65;
		const gap = 6;

		this.contentHeight = auras.length * (cardH + gap) - gap;
		const scrollAreaHeight = bottomY - listStartY;
		const maxScroll = Math.max(0, this.contentHeight - scrollAreaHeight);
		this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, maxScroll));

		ctx.save();
		ctx.beginPath();
		ctx.rect(0, listStartY, w, scrollAreaHeight);
		ctx.clip();

		let cy = listStartY - this.scrollOffset;
		const selectedAuraId = meta.data.selectedAura;

		auras.forEach((aura) => {
			const x = (w - cardW) / 2;
			const y = cy;
			const isUnlocked = meta.isAuraUnlocked(aura.id);
			const canBuy = !isUnlocked && meta.data.chips >= aura.cost;
			const isSelected = isUnlocked && selectedAuraId === aura.id;

			if (y + cardH > listStartY && y < bottomY) {
				// 卡片背景
				UI.drawCard(ctx, x, y, cardW, cardH, {
					borderColor: isSelected ? aura.color : (canBuy ? aura.color + '66' : 'rgba(255,255,255,0.06)'),
					bgColor: isSelected ? aura.color + '22' : 'rgba(255,255,255,0.03)',
				});

				// 光环颜色预览
				ctx.fillStyle = aura.color;
				ctx.beginPath();
				ctx.arc(x + 25, y + cardH / 2, 12, 0, Math.PI * 2);
				ctx.fill();
				// 模拟发光：叠一个更大的半透明圈
				ctx.globalAlpha = 0.3;
				ctx.beginPath();
				ctx.arc(x + 25, y + cardH / 2, 16, 0, Math.PI * 2);
				ctx.fill();
				ctx.globalAlpha = 1;

				// 名称
				ctx.font = 'bold 13px sans-serif';
				ctx.fillStyle = isUnlocked ? '#fff' : '#888';
				ctx.fillText(aura.name, x + 48, y + 24);

				// 描述
				ctx.font = '10px sans-serif';
				ctx.fillStyle = '#aaa';
				ctx.fillText(aura.desc, x + 48, y + 42);

				// 状态/价格
				ctx.textAlign = 'right';
				ctx.font = 'bold 11px sans-serif';
				if (isUnlocked) {
					if (isSelected) {
						ctx.fillStyle = aura.color;
						ctx.fillText('✓ 穿戴中', x + cardW - 12, y + 34);
						// 添加卸下按钮
						const btnW = 50, btnH = 20;
						const btnX = x + cardW - btnW - 10;
						const btnY = y + cardH - btnH - 6;
						UI.drawCard(ctx, btnX, btnY, btnW, btnH, { borderColor: '#ff4444', bgColor: 'rgba(255,68,68,0.2)' });
						ctx.fillStyle = '#ff8888';
						ctx.fillText('卸载', btnX + btnW / 2 + 10, btnY + btnH / 2 + 3);
						this.items.push({ x: btnX, y: btnY, w: btnW, h: btnH, type: 'unequipAura' });
					} else {
						ctx.fillStyle = '#44aa44';
						this.items.push({ x, y, w: cardW, h: cardH, type: 'selectAura', auraId: aura.id });
						ctx.fillText('点击穿戴', x + cardW - 12, y + 34);
					}
				} else {
					ctx.fillStyle = canBuy ? aura.color : '#554433';
					ctx.fillText(`${aura.cost} 💾`, x + cardW - 12, y + 34);
					if (canBuy) {
						this.items.push({ x, y, w: cardW, h: cardH, type: 'buyAura', auraId: aura.id, cost: aura.cost });
					}
				}
				ctx.textAlign = 'left';
			}

			cy += cardH + gap;
		});

		ctx.restore();
		this._drawScrollIndicator(ctx, w, listStartY, scrollAreaHeight, maxScroll);
	}

	_drawSkinList(ctx, w, startY, bottomY, meta) {
		const char = CHARACTERS[this.selectedChar];
		if (!char) return;

		// 返回按钮
		const backBtnX = 10;
		const backBtnY = startY;
		ctx.fillStyle = 'rgba(255,255,255,0.1)';
		UI.drawRoundRect(ctx, backBtnX, backBtnY, 50, 24, 4);
		ctx.fill();
		ctx.fillStyle = '#aaa';
		ctx.font = '11px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('◀ 返回', backBtnX + 25, backBtnY + 16);
		ctx.textAlign = 'left';
		this.items.push({ x: backBtnX, y: backBtnY, w: 50, h: 24, type: 'backToCharList' });

		// 角色名
		ctx.font = 'bold 12px sans-serif';
		ctx.fillStyle = char.color;
		ctx.fillText(char.name + ' - 外观', 70, backBtnY + 16);

		const listStartY = startY + 32;
		const skins = getCharacterSkins(this.selectedChar);
		const cardW = w * 0.88;
		const cardH = 60;
		const gap = 6;

		this.contentHeight = skins.length * (cardH + gap) - gap;
		const scrollAreaHeight = bottomY - listStartY;
		const maxScroll = Math.max(0, this.contentHeight - scrollAreaHeight);
		this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, maxScroll));

		ctx.save();
		ctx.beginPath();
		ctx.rect(0, listStartY, w, scrollAreaHeight);
		ctx.clip();

		let cy = listStartY - this.scrollOffset;
		const selectedSkinId = meta.getSelectedSkin(this.selectedChar);

		skins.forEach((skin) => {
			const x = (w - cardW) / 2;
			const y = cy;
			const isUnlocked = skin.cost === 0 || meta.isSkinUnlocked(skin.id);
			const canBuy = !isUnlocked && meta.data.chips >= skin.cost;
			const isSelected = isUnlocked && (selectedSkinId === skin.id || (!selectedSkinId && skin.cost === 0));

			if (y + cardH > listStartY && y < bottomY) {
				// 卡片背景
				UI.drawCard(ctx, x, y, cardW, cardH, {
					borderColor: isSelected ? skin.theme.main : (canBuy ? skin.theme.main + '66' : 'rgba(255,255,255,0.06)'),
					bgColor: isSelected ? skin.theme.main + '22' : 'rgba(255,255,255,0.03)',
				});

				// 外观颜色预览
				ctx.fillStyle = skin.theme.main;
				ctx.beginPath();
				ctx.arc(x + 25, y + cardH / 2, 12, 0, Math.PI * 2);
				ctx.fill();
				// 模拟发光
				ctx.globalAlpha = 0.3;
				ctx.fillStyle = skin.theme.glow;
				ctx.beginPath();
				ctx.arc(x + 25, y + cardH / 2, 16, 0, Math.PI * 2);
				ctx.fill();
				ctx.globalAlpha = 1;
				ctx.strokeStyle = skin.theme.core;
				ctx.lineWidth = 2;
				ctx.stroke();

				// 名称
				ctx.font = 'bold 12px sans-serif';
				ctx.fillStyle = isUnlocked ? '#fff' : '#888';
				ctx.fillText(skin.name, x + 45, y + 22);

				// 描述
				ctx.font = '10px sans-serif';
				ctx.fillStyle = '#666';
				ctx.fillText(skin.desc, x + 45, y + 38);

				// 状态/价格
				ctx.textAlign = 'right';
				ctx.font = 'bold 11px sans-serif';
				if (isUnlocked) {
					if (isSelected) {
						ctx.fillStyle = skin.theme.main;
						ctx.fillText('✓ 使用中', x + cardW - 12, y + 30);
					} else {
						ctx.fillStyle = '#44aa44';
						this.items.push({ x, y, w: cardW, h: cardH, type: 'selectSkin', skinId: skin.id, charId: this.selectedChar });
						ctx.fillText('点击装备', x + cardW - 12, y + 30);
					}
				} else {
					ctx.fillStyle = canBuy ? skin.theme.main : '#554433';
					ctx.fillText(`${skin.cost} 💾`, x + cardW - 12, y + 30);
					if (canBuy) {
						this.items.push({ x, y, w: cardW, h: cardH, type: 'buySkin', skinId: skin.id, cost: skin.cost, charId: this.selectedChar });
					}
				}
				ctx.textAlign = 'left';
			}

			cy += cardH + gap;
		});

		ctx.restore();
		this._drawScrollIndicator(ctx, w, listStartY, scrollAreaHeight, maxScroll);
	}

	_drawTalentTab(ctx, w, startY, bottomY, meta) {
		const tt = this.talentTree;
		const branch = TALENT_BRANCHES[this.talentBranchIdx];

		// ─── 分支选择器 ───
		const branchBtnW = 70;
		const branchBtnH = 22;
		const branchY = startY + 4;
		this.branchBtns = [];
		for (let i = 0; i < TALENT_BRANCHES.length; i++) {
			const b = TALENT_BRANCHES[i];
			const bx = w / 2 - (TALENT_BRANCHES.length * (branchBtnW + 4)) / 2 + i * (branchBtnW + 4);
			const active = i === this.talentBranchIdx;
			ctx.save();
			ctx.fillStyle = active ? b.color : 'rgba(255,255,255,0.08)';
			UI.drawRoundRect(ctx, bx, branchY, branchBtnW, branchBtnH, 5);
			ctx.fill();
			ctx.font = (active ? 'bold ' : '') + '11px sans-serif';
			ctx.fillStyle = active ? '#000' : '#888';
			ctx.textAlign = 'center';
			ctx.fillText(b.name, bx + branchBtnW / 2, branchY + branchBtnH / 2 + 4);
			ctx.restore();
			this.branchBtns.push({ x: bx, y: branchY, w: branchBtnW, h: branchBtnH, idx: i });
		}

		// ─── 统计信息 ───
		const statsY = branchY + branchBtnH + 8;
		const spent = tt.getTotalSpent();
		const count = tt.getAllocatedCount();
		ctx.save();
		ctx.font = '10px sans-serif';
		ctx.fillStyle = '#888';
		ctx.textAlign = 'center';
		ctx.fillText(`已解锁 ${count}/48 · 已消耗 ${spent} 💾 · 余额 ${meta.data.chips} 💾`, w / 2, statsY);
		ctx.restore();

		// ─── 重置按钮 ───
		const resetW = 90; const resetH = 22;
		const resetX = w - resetW - 8; const resetY = statsY - 11;
		ctx.save();
		ctx.fillStyle = 'rgba(200,50,50,0.25)';
		UI.drawRoundRect(ctx, resetX, resetY, resetW, resetH, 5);
		ctx.fill();
		ctx.strokeStyle = '#ff4444';
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.font = '10px sans-serif';
		ctx.fillStyle = '#ff8888';
		ctx.textAlign = 'center';
		ctx.fillText('重置 (-100💾)', resetX + resetW / 2, resetY + resetH / 2 + 4);
		ctx.restore();
		this.resetBtn = { x: resetX, y: resetY, w: resetW, h: resetH };

		// ─── 节点列表 ───
		const listStartY = statsY + 14;
		const cardW = w * 0.9;
		const cardH = 54;
		const gap = 5;
		const nodes = branch.nodes;

		this.contentHeight = nodes.length * (cardH + gap);
		const scrollAreaHeight = bottomY - listStartY;
		const maxScroll = Math.max(0, this.contentHeight - scrollAreaHeight);
		this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, maxScroll));

		ctx.save();
		ctx.beginPath();
		ctx.rect(0, listStartY, w, scrollAreaHeight);
		ctx.clip();

		this.items = [];
		let cy = listStartY - this.scrollOffset;

		for (const node of nodes) {
			if (cy + cardH < listStartY || cy > bottomY) { cy += cardH + gap; continue; }

			const allocated = tt.isAllocated(node.id);
			const canAlloc = tt.canAllocate(node.id);
			const reqs = node.req ? (Array.isArray(node.req) ? node.req : [node.req]) : [];
			const prereqMet = reqs.length === 0 || reqs.some(r => tt.isAllocated(r));

			// 卡片背景
			let borderColor = 'rgba(255,255,255,0.06)';
			let bgColor = 'rgba(0,0,0,0.3)';
			if (allocated) {
				borderColor = branch.color + 'aa';
				bgColor = branch.color + '22';
			} else if (canAlloc) {
				borderColor = branch.color + '66';
				bgColor = 'rgba(255,255,255,0.06)';
			}

			const cx = (w - cardW) / 2;
			UI.drawCard(ctx, cx, cy, cardW, cardH, { borderColor, bgColor });

			ctx.save();
			ctx.textAlign = 'left';

			// 状态指示点
			ctx.beginPath();
			ctx.arc(cx + 14, cy + cardH / 2, 5, 0, Math.PI * 2);
			ctx.fillStyle = allocated ? branch.color : (canAlloc ? branch.color + '66' : '#333');
			ctx.fill();

			// 节点名称
			ctx.font = 'bold 12px sans-serif';
			ctx.fillStyle = allocated ? branch.color : (prereqMet ? '#ddd' : '#555');
			ctx.fillText(node.name, cx + 26, cy + 18);

			// 描述
			ctx.font = '10px sans-serif';
			ctx.fillStyle = allocated ? '#aaa' : (prereqMet ? '#888' : '#444');
			ctx.fillText(node.desc, cx + 26, cy + 33);

			// 前置要求
			if (!prereqMet && reqs.length > 0) {
				ctx.fillStyle = '#554422';
				ctx.fillText('需要: ' + reqs.map(r => NODE_MAP_REF[r] ? NODE_MAP_REF[r].name : r).join(' 或 '), cx + 26, cy + 46);
			}

			// 右侧：费用 / 已解锁
			ctx.textAlign = 'right';
			if (allocated) {
				ctx.font = 'bold 11px sans-serif';
				ctx.fillStyle = branch.color;
				ctx.fillText('✓ 已解锁', cx + cardW - 10, cy + cardH / 2 + 4);
			} else {
				ctx.font = 'bold 11px sans-serif';
				ctx.fillStyle = canAlloc ? '#ffcc00' : '#554422';
				ctx.fillText(`${node.cost} 💾`, cx + cardW - 10, cy + cardH / 2 + 4);
			}

			ctx.restore();

			if (canAlloc) {
				this.items.push({ x: cx, y: cy, w: cardW, h: cardH, type: 'talent', nodeId: node.id });
			}
			cy += cardH + gap;
		}

		ctx.restore();
		this._drawScrollIndicator(ctx, w, listStartY, scrollAreaHeight, maxScroll);
	}

	_drawScrollIndicator(ctx, w, startY, areaHeight, maxScroll) {
		if (maxScroll > 0) {
			const indicatorHeight = Math.max(30, (areaHeight / this.contentHeight) * areaHeight);
			const indicatorY = startY + (this.scrollOffset / maxScroll) * (areaHeight - indicatorHeight);

			ctx.fillStyle = 'rgba(255,255,255,0.3)';
			ctx.fillRect(w - 4, indicatorY, 2, indicatorHeight);
		}
	}

	onTouchStart(x, y) {
		this.touchStartY = y;
		this.lastTouchY = y;
		this.isDragging = false;
	}

	_handleClick(x, y) {
		const meta = this.game.meta;

		for (const item of this.items) {
			if (UI.hitTest(x, y, item)) {
				switch (item.type) {
					case 'upgrade':
						this.game.meta.purchase(item.upgrade);
						break;
					case 'talent':
						if (this.talentTree) this.talentTree.allocate(item.nodeId);
						break;
					case 'charSelect':
						this.selectedChar = item.charId;
						this.scrollOffset = 0;
						break;
					case 'backToCharList':
						this.selectedChar = null;
						this.scrollOffset = 0;
						break;
					case 'buySkin':
						if (meta.purchaseSkin(item.skinId, item.cost)) {
							// 购买成功后自动装备
							meta.selectSkin(item.charId, item.skinId);
						}
						break;
					case 'selectSkin':
						meta.selectSkin(item.charId, item.skinId);
						break;
					case 'buyAura':
						if (meta.purchaseAura(item.auraId, item.cost)) {
							meta.selectAura(item.auraId);
						}
						break;
					case 'selectAura':
						meta.selectAura(item.auraId);
						break;
					case 'unequipAura':
						meta.selectAura(null);
						break;
					case 'drawPet':
						this._handleDrawPet(meta);
						break;
					case 'equipPet':
						{
							const success = meta.equipPet(item.petId);
							if (!success) {
								if (this.game.spawnDamageNumber) {
									this.game.spawnDamageNumber(x, y - 20, '最多只能携带2只僚机出战！', '#ff4444');
								}
							}
						}
						break;
					case 'unequipPet':
						meta.unequipPet(item.petId);
						break;
				}
				return;
			}
		}

		// 返回按钮
		if (this.backBtn && UI.hitTest(x, y, this.backBtn)) {
			this.manager.switchTo('title');
		}
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
		if (this.isDragging) {
			this.isDragging = false;
			return;
		}
		this.isDragging = false;

		// 标签页切换
		for (const btn of this.tabBtns) {
			if (UI.hitTest(x, y, btn)) {
				if (btn.tab !== this.currentTab) {
					this.currentTab = btn.tab;
					this.selectedChar = null;
					this.scrollOffset = 0;
				}
				return;
			}
		}

		// 天赋分支选择器
		if (this.currentTab === 'talent' && this.branchBtns) {
			for (const btn of this.branchBtns) {
				if (UI.hitTest(x, y, btn)) {
					this.talentBranchIdx = btn.idx;
					this.scrollOffset = 0;
					return;
				}
			}
			// 重置按钮
			if (this.resetBtn && UI.hitTest(x, y, this.resetBtn)) {
				if (this.talentTree && this.talentTree.reset()) {
					// 重置成功
				}
				return;
			}
		}

		// 处理点击
		this._handleClick(x, y);
	}
	_handleDrawPet(meta) {
		const cost = 1000;
		if (meta.data.chips < cost) return;

		// 寻找未解锁的僚机
		const lockedPets = Object.keys(PET_TYPES).filter(id => !meta.isPetUnlocked(id));
		if (lockedPets.length === 0) return; // 已经全部解锁

		// 扣费
		meta.data.chips -= cost;

		// 随机抽取一个
		const drawnPetId = lockedPets[Math.floor(Math.random() * lockedPets.length)];
		meta.unlockPet(drawnPetId);

		// 记录最近抽中的结果，用于展示特效
		this.lastDrawnPet = PET_TYPES[drawnPetId];
		this.drawEffectTimer = 1.5; // 特效持续 1.5 秒
	}

	_drawPetsTab(ctx, w, startY, bottomY, meta) {
		this.items = [];
		const cardW = w * 0.88;
		const pad = (w - cardW) / 2;
		let cy = startY;

		// 盲盒抽取横幅区
		const bannerH = 80;
		UI.drawCard(ctx, pad, cy, cardW, bannerH, {
			borderColor: '#ffcc00aa', bgColor: 'rgba(255,204,0,0.1)'
		});

		ctx.save();
		ctx.textAlign = 'center';
		ctx.font = 'bold 15px sans-serif';
		ctx.fillStyle = '#ffcc00';
		ctx.fillText('🤖 僚机盲盒抽取', w / 2, cy + 25);

		ctx.font = '11px sans-serif';
		ctx.fillStyle = '#ddd';
		ctx.fillText('抽取随机未解锁陪伴僚机，助力战斗！', w / 2, cy + 45);

		// 判断是否全部解锁
		const totalPets = Object.keys(PET_TYPES).length;
		const unlockedPets = Object.keys(PET_TYPES).filter(id => meta.isPetUnlocked(id)).length;
		const allUnlocked = unlockedPets >= totalPets;

		if (allUnlocked) {
			ctx.font = 'bold 13px sans-serif';
			ctx.fillStyle = '#44ff88';
			ctx.fillText('已集齐所有僚机！', w / 2, cy + 68);
		} else {
			const cost = 1000;
			const canAfford = meta.data.chips >= cost;

			// 抽奖按钮
			const btnW = 100;
			const btnH = 26;
			const btnX = w / 2 - btnW / 2;
			const btnY = cy + 50;

			UI.drawCard(ctx, btnX, btnY, btnW, btnH, {
				borderColor: canAfford ? '#00ffcc' : '#555',
				bgColor: canAfford ? 'rgba(0,255,204,0.2)' : 'rgba(85,85,85,0.2)'
			});

			ctx.font = 'bold 12px sans-serif';
			ctx.fillStyle = canAfford ? '#fff' : '#888';
			ctx.fillText(`抽取 (1000 💾)`, w / 2, btnY + btnH / 2 + 4);

			if (canAfford) {
				this.items.push({ x: btnX, y: btnY, w: btnW, h: btnH, type: 'drawPet' });
			}
		}
		ctx.restore();

		cy += bannerH + 15;

		// 如果正在播放抽奖特效
		if (this.drawEffectTimer > 0) {
			this.drawEffectTimer -= 1 / 60; // 近似减去帧时间，实际应传入 dt

			ctx.save();
			ctx.textAlign = 'center';
			const pulse = 0.5 + 0.5 * Math.sin(this.drawEffectTimer * 15);
			ctx.globalAlpha = Math.min(1, this.drawEffectTimer);
			ctx.fillStyle = '#fff';
			ctx.shadowBlur = 10;
			ctx.shadowColor = this.lastDrawnPet?.color || '#fff';
			ctx.font = 'bold 20px sans-serif';
			ctx.fillText(`恭喜获得: ${this.lastDrawnPet?.name}`, w / 2, cy + 30);
			ctx.restore();
		}

		cy += 50;
		ctx.save();
		ctx.font = 'bold 13px sans-serif';
		ctx.fillStyle = '#aaa';
		ctx.fillText(`僚机图鉴 (${unlockedPets}/${totalPets})`, pad, cy);
		ctx.restore();
		cy += 10;

		// 列表展示宠物
		const listH = 50;
		const gap = 8;

		this.contentHeight = bannerH + 60 + Object.keys(PET_TYPES).length * (listH + gap);
		const scrollAreaHeight = bottomY - startY;
		const maxScroll = Math.max(0, this.contentHeight - scrollAreaHeight);
		this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, maxScroll));

		ctx.save();
		ctx.beginPath();
		ctx.rect(0, cy, w, bottomY - cy);
		ctx.clip();

		let listCy = cy - this.scrollOffset; // Note: simplified scroll applying, only applied to list

		Object.entries(PET_TYPES).forEach(([id, def]) => {
			const isUnlocked = meta.isPetUnlocked(id);

			if (listCy + listH > cy && listCy < bottomY) {
				UI.drawCard(ctx, pad, listCy, cardW, listH, {
					borderColor: isUnlocked ? def.color + 'aa' : '#333',
					bgColor: isUnlocked ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.5)'
				});

				ctx.save();
				ctx.textAlign = 'left';
				ctx.font = 'bold 13px sans-serif';
				ctx.fillStyle = isUnlocked ? def.color : '#666';
				ctx.fillText(isUnlocked ? `🤖 ${def.name}` : '???', pad + 15, listCy + 20);

				ctx.font = '10px sans-serif';
				ctx.fillStyle = isUnlocked ? '#ccc' : '#444';
				ctx.fillText(isUnlocked ? def.desc : '获取盲盒以解锁此僚机', pad + 15, listCy + 38);

				ctx.textAlign = 'right';
				if (isUnlocked) {
					const isEquipped = meta.isPetEquipped(id);
					const btnW = 60, btnH = 22;
					const btnX = pad + cardW - btnW - 10;
					const btnY = listCy + 14;

					UI.drawCard(ctx, btnX, btnY, btnW, btnH, {
						borderColor: isEquipped ? '#ff4444' : '#44ff88',
						bgColor: isEquipped ? 'rgba(255,68,68,0.2)' : 'rgba(68,255,136,0.2)'
					});

					ctx.font = '11px sans-serif';
					ctx.fillStyle = isEquipped ? '#ff8888' : '#88ffaa';
					ctx.fillText(isEquipped ? '休息' : '出战', btnX + btnW / 2 + 12, btnY + btnH / 2 + 3);

					this.items.push({
						x: btnX, y: btnY, w: btnW, h: btnH,
						type: isEquipped ? 'unequipPet' : 'equipPet',
						petId: id
					});
				} else {
					ctx.font = '11px sans-serif';
					ctx.fillStyle = '#666';
					ctx.fillText('未解锁', pad + cardW - 15, listCy + 30);
				}
				ctx.restore();
			}
			listCy += listH + gap;
		});

		ctx.restore();
	}
}

module.exports = ShopScene;
