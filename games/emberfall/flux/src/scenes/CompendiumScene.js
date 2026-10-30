// ─── 图鉴场景 (Compendium Scene) ──────────────────────────
const { fastSin, fastCos } = require('../MathLUT');
const UI = require('../UIRenderer');
const Renderer = require('../Renderer');
const { WEAPON_DEFS, PASSIVE_DEFS } = require('../Weapons');
const { EVOLUTION_RECIPES } = require('../Evolution');
const { TYPES: ENEMY_TYPES } = require('../Enemy');

const BOSS_DATA = [
	{
		id: 'boss_0', name: '核心破坏者', color: '#ff0055', hp: 2000, wave: 1,
		desc: '弹幕狂暴型Boss，冲锋与引力漩涡轮番施压，弹幕地狱覆盖范围极广，需要持续走位躲避。',
		skills: ['冲锋', '爆发波', '弹幕地狱', '引力漩涡', '突刺', '冲击波', '月牙斩', '地雷阵']
	},
	{
		id: 'boss_1', name: '虚空巨人', color: '#aa44ff', hp: 3200, wave: 2,
		desc: '召唤型Boss，持续产生仆从骚扰玩家，暗脉冲瞬间清场，死亡标记使目标受到额外伤害。',
		skills: ['召唤仆从', '重击', '螺旋弹幕', '暗脉冲', '死亡标记', '毒球阵', '三重追踪']
	},
	{
		id: 'boss_2', name: '等离子九头蛇', color: '#ff6600', hp: 4200, wave: 3,
		desc: '火焰电场双属性，激光扫射搭配散弹几乎无法躲避，需要保持高机动性。',
		skills: ['火焰柱', '爆发波', '弹幕地狱', '电场', '激光扫射', '散弹', '地雷阵']
	},
	{
		id: 'boss_3', name: '冰霜泰坦', color: '#66ccff', hp: 5500, wave: 4,
		desc: '体型最大的冰系Boss，瞬间冻结可完全锁定玩家行动，暴风雪持续覆盖大范围区域。',
		skills: ['冰波', '碎裂', '暴风雪', '瞬间冻结', '引力漩涡', '冲击波', '三重追踪']
	},
	{
		id: 'boss_4', name: '腐蚀之源', color: '#88ff00', hp: 4800, wave: 5,
		desc: '持续释放毒云污染场地，变异技能随机强化自身属性，腐蚀降低玩家护甲。',
		skills: ['毒雨', '瘟疫云', '变异', '腐蚀', '毒球阵', '地雷阵']
	},
	{
		id: 'boss_5', name: '时空裂隙', color: '#ff00ff', hp: 3500, wave: 6,
		desc: '时间系Boss，克隆军团复制分身迷惑玩家，传送风暴极难预判，虚空裂缝造成持续伤害。',
		skills: ['时间扭曲', '传送风暴', '虚空裂缝', '克隆军团', '螺旋弹幕', '突刺', '死亡标记']
	},
	{
		id: 'boss_6', name: '机械统帅', color: '#ffcc00', hp: 7500, wave: 7,
		desc: '全游戏最强火力型Boss，激光网格+导弹齐射组合几乎无路可逃，护盾墙使其阶段性无敌。',
		skills: ['激光网格', '导弹齐射', '护盾墙', '过载', '弹幕地狱', '暗脉冲', '激光扫射']
	},
	{
		id: 'boss_7', name: '深渊守望者', color: '#4488ff', hp: 6000, wave: 8,
		desc: '全能型终极Boss，综合冰系、冲锋、传送、电场等多种手段，无明显弱点。',
		skills: ['冲锋', '爆发波', '冰波', '传送风暴', '电场', '暗脉冲', '突刺', '月牙斩', '死亡标记']
	},
];

const ENEMY_DATA = [
	{
		id: 'enemy_bat', type: 'Bat', name: '蝙蝠', color: '#ff88cc', time: '0秒',
		desc: '最基础的近战怪，成群出现但血量极低，速度快。新手阶段主要威胁。'
	},
	{
		id: 'enemy_swarm', type: 'SwarmDrone', name: '蜂群无人机', color: '#ffff44', time: '0秒',
		desc: '3~5只成群涌现，速度极快。单只伤害低但密集时难以全部闪避。'
	},
	{
		id: 'enemy_firefly', type: 'FireFly', name: '萤火虫', color: '#ff6600', time: '30秒',
		desc: '成群出现的爆炸型怪物，接触玩家即爆炸，需与其保持距离击杀。'
	},
	{
		id: 'enemy_skeleton', type: 'Skeleton', name: '骷髅', color: '#cccccc', time: '30秒',
		desc: '中等血量的标准近战怪，速度适中，是前中期稳定的压力来源。'
	},
	{
		id: 'enemy_ghost', type: 'Ghost', name: '幽灵', color: '#aabbff', time: '1分',
		desc: '可穿透一切障碍物直线追击玩家，无法用走位甩掉，需及时消灭。'
	},
	{
		id: 'enemy_dataworm', type: 'DataWorm', name: '数据蠕虫', color: '#00ffcc', time: '1分',
		desc: '坦克型近战怪，血量远高于同期怪物，但速度较慢，不可忽视。'
	},
	{
		id: 'enemy_hornet', type: 'Hornet', name: '大黄蜂', color: '#ff8800', time: '2分',
		desc: '比蜂群无人机更强的集群怪，速度快、伤害略高，成群时压迫感强。'
	},
	{
		id: 'enemy_crawler', type: 'Crawler', name: '爬虫', color: '#88ff44', time: '2分',
		desc: '成群爬行的近战怪，数量多时可填满整个屏幕，需范围武器清理。'
	},
	{
		id: 'enemy_frostwisp', type: 'FrostWisp', name: '冰霜幽灵', color: '#66ccff', time: '3分',
		desc: '接触玩家时施加冻结效果，冻结期间玩家完全无法移动，极度危险。'
	},
	{
		id: 'enemy_slimeglob', type: 'SlimeGlob', name: '黏液球', color: '#88ff00', time: '3分',
		desc: '接触时大幅降低玩家移动速度，多只叠加后几乎寸步难行。'
	},
	{
		id: 'enemy_glitch', type: 'GlitchEntity', name: '故障体', color: '#dd44ff', time: '3分',
		desc: '随机传送的近战怪，会突然出现在玩家身边，行动路线完全无法预判。'
	},
	{
		id: 'enemy_turret', type: 'Turret', name: '炮台', color: '#ffcc00', time: '3分',
		desc: '固定在远处持续射击的远程怪，不主动靠近但火力持续。需主动击杀。'
	},
	{
		id: 'enemy_chaingunner', type: 'ChainGunner', name: '链枪兵', color: '#ffaa44', time: '3分',
		desc: '持续射出高射速子弹流的远程怪，弹幕密度大，与其他怪物组合时极危险。'
	},
	{
		id: 'enemy_warpmite', type: 'WarpMite', name: '闪现螨', color: '#ff00ff', time: '4分',
		desc: '可直接瞬移到玩家身边发动突袭，是最难缠的近战怪之一，需高度警惕。'
	},
	{
		id: 'enemy_spider', type: 'CyberSpider', name: '机械蜘蛛', color: '#ff6688', time: '4分',
		desc: '死亡时分裂释放小蜘蛛群，击杀时需预防后续连锁骚扰，避免正面硬抗。'
	},
	{
		id: 'enemy_laserdrone', type: 'LaserDrone', name: '激光无人机', color: '#ff4444', time: '5分',
		desc: '保持距离持续射出激光，光线持续造成伤害，需快速靠近击杀。'
	},
	{
		id: 'enemy_spiral', type: 'SpiralCaster', name: '螺旋法师', color: '#aa44ff', time: '7分',
		desc: '发射旋转扩散弹幕，中期最难缠的远程怪之一，需大范围走位规避。'
	},
	{
		id: 'enemy_scattergun', type: 'ScatterGun', name: '散弹手', color: '#ff8844', time: '9分',
		desc: '扇形散弹齐射覆盖大角度，近距离内几乎无法完全闪避。'
	},
	{
		id: 'enemy_mortar', type: 'MortarDrone', name: '迫击无人机', color: '#cc8844', time: '9分',
		desc: '抛物线式远程弹幕，弹着点有预警圆圈提示，可预判走位闪避。'
	},
	{
		id: 'enemy_frosttitan', type: 'FrostTitan', name: '冰霜泰坦怪', color: '#66ccff', time: '13分',
		desc: '超大型超高血量敌人，自带冻结光环，出现时须立即集火击杀。'
	},
	{
		id: 'enemy_plague', type: 'PlagueSource', name: '瘟疫之源', color: '#88ff00', time: '13分',
		desc: '持续在周围释放毒云，毒云区域内快速掉血，需保持移动不可停留。'
	},
	{
		id: 'enemy_golem', type: 'IronGolem', name: '铁傀儡', color: '#aaaaaa', time: '13分',
		desc: '极高血量的超慢速坦克，物理防御高，需要持续大量输出才能击倒。'
	},
	{
		id: 'enemy_voidleech', type: 'VoidLeech', name: '虚空水蛭', color: '#aa44ff', time: '15分',
		desc: '每次攻击玩家时回复自身血量，血战之下越打越难，应优先击杀。'
	},
];

class CompendiumScene {
	constructor() {
		this.activeTab = 'weapons';
		this.scrollOffset = 0;
		this.selectedId = null;
		this.buttons = [];
		this.items = [];
		this.touchStartY = 0;
		this.lastTouchY = 0;
		this.isDragging = false;
	}

	enter() {
		this.refreshItems();
		this.scrollOffset = 0;
	}

	refreshItems() {
		this.items = [];
		if (this.activeTab === 'weapons') {
			for (const id of Object.keys(WEAPON_DEFS)) {
				this.items.push({ id, ...WEAPON_DEFS[id], isSuper: false });
			}
		} else if (this.activeTab === 'super') {
			for (const id of Object.keys(EVOLUTION_RECIPES)) {
				const evo = EVOLUTION_RECIPES[id];
				this.items.push({
					id, name: evo.resultName, desc: evo.resultDesc,
					color: evo.resultColor, recipe: evo, isSuper: true, baseId: id
				});
			}
		} else if (this.activeTab === 'passives') {
			for (const id of Object.keys(PASSIVE_DEFS)) {
				this.items.push({ id, ...PASSIVE_DEFS[id], isPassive: true });
			}
		} else if (this.activeTab === 'boss') {
			for (const b of BOSS_DATA) {
				this.items.push({ ...b, isBoss: true });
			}
		} else if (this.activeTab === 'enemy') {
			for (const e of ENEMY_DATA) {
				this.items.push({ ...e, isEnemy: true });
			}
		}
	}

	draw(ctx, w, h) {
		UI.drawOverlay(ctx, w, h, 0.95);
		this.buttons = [];

		const meta = this.game.meta;
		const topOffset = this.game.safeAreaTop || 0;

		// 标题
		UI.drawCenteredText(ctx, '图鉴 · COMPENDIUM', w / 2, 38 + topOffset, { fontSize: 20, color: '#00ffcc' });

		// ── 标签页（两行）──
		const tabs1 = [
			{ id: 'weapons', name: '基础武器' },
			{ id: 'super', name: '超级进化' },
			{ id: 'passives', name: '辅助芯片' },
		];
		const tabs2 = [
			{ id: 'boss', name: '👑 Boss' },
			{ id: 'enemy', name: '👾 小怪' },
		];

		const row1Y = 65 + topOffset;
		const row2Y = 94 + topOffset;

		tabs1.forEach((tab, i) => {
			const tx = w * (0.2 + i * 0.3);
			const active = this.activeTab === tab.id;
			this.buttons.push({
				...UI.drawButton(ctx, tab.name, tx, row1Y, {
					fontSize: 11,
					bgColor: active ? 'rgba(0,255,204,0.15)' : 'rgba(255,255,255,0.05)',
					borderColor: active ? '#00ffcc' : 'rgba(255,255,255,0.1)',
					color: active ? '#00ffcc' : '#888',
					paddingX: 14,
				}),
				action: 'tab', value: tab.id
			});
		});

		tabs2.forEach((tab, i) => {
			const tx = w * (0.3 + i * 0.4);
			const active = this.activeTab === tab.id;
			const activeColor = tab.id === 'boss' ? '#ffcc00' : '#ff88cc';
			this.buttons.push({
				...UI.drawButton(ctx, tab.name, tx, row2Y, {
					fontSize: 11,
					bgColor: active ? `rgba(255,200,0,0.15)` : 'rgba(255,255,255,0.05)',
					borderColor: active ? activeColor : 'rgba(255,255,255,0.1)',
					color: active ? activeColor : '#888',
					paddingX: 20,
				}),
				action: 'tab', value: tab.id
			});
		});

		// 列表区域
		const listTop = 126 + topOffset;
		const listH = h - listTop - 130;
		const itemH = 60;

		ctx.save();
		ctx.beginPath();
		ctx.rect(0, listTop, w, listH);
		ctx.clip();

		this.items.forEach((item, i) => {
			const iy = listTop + i * (itemH + 10) - this.scrollOffset;
			if (iy < listTop - itemH || iy > listTop + listH) return;

			const alwaysUnlocked = item.isBoss || item.isEnemy;
			const unlocked = alwaysUnlocked || (meta ? meta.isUnlocked(item.id) : false);
			const active = this.selectedId === item.id;

			const card = UI.drawCard(ctx, 20, iy, w - 40, itemH, {
				active,
				glow: unlocked ? item.color : null,
				bgColor: unlocked ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.4)',
				borderColor: unlocked ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'
			});
			this.buttons.push({ ...card, action: 'select', value: item.id });

			// 图标
			ctx.save();
			ctx.translate(55, iy + 30);

			if (unlocked) {
				ctx.shadowBlur = 10;
				ctx.shadowColor = item.color || '#fff';

				if (item.isBoss) {
					// Boss：带颜色的骷髅图标
					ctx.fillStyle = item.color;
					ctx.font = 'bold 20px sans-serif';
					ctx.textAlign = 'center';
					ctx.fillText('☠', 0, 8);
					ctx.textAlign = 'left';
				} else if (item.isEnemy) {
					// 小怪：尝试使用真实贴图
					let drawn = false;
					if (item.type && ENEMY_TYPES[item.type]) {
						try {
							const typeDef = ENEMY_TYPES[item.type];
							const r = typeDef.radius || 12;

							// 1. 优先尝试使用 ImageManager 中的预渲染贴图
							if (this.game && this.game.imageManager) {
								const sprite = this.game.imageManager.getEnemySprite(item.type, r * 2);
								if (sprite) {
									const scale = r / sprite.cachedRadius;
									ctx.save();
									ctx.scale(scale, scale);
									ctx.drawImage(sprite.canvas, -sprite.offset, -sprite.offset);
									ctx.restore();
									drawn = true;
								}
							}

							// 2. 如果贴图不存在，回退到使用对象的 procedural draw 函数
							if (!drawn && typeDef.draw) {
								// 伪造一个可以供 draw 调用的上下文对象
								const fakeEnemy = {
									color: item.color,
									radius: r,
									x: 0,
									y: 0,
									flashTimer: 0,
									game: { time: Date.now() / 1000 }
								};
								typeDef.draw.call(fakeEnemy, ctx, 0, 0, fakeEnemy.radius, 0, fakeEnemy.game.time);
								drawn = true;
							}
						} catch (e) {
							console.warn('Failed to draw enemy sprite in compendium for', item.id, e);
						}
					}

					// 备用绘制方案：如果绘制失败或没有对应的draw函数，退回到彩色六边形
					if (!drawn) {
						ctx.fillStyle = item.color + '44';
						ctx.strokeStyle = item.color;
						ctx.lineWidth = 2;
						ctx.beginPath();
						for (let a = 0; a < 6; a++) {
							const ang = (a / 6) * Math.PI * 2 - Math.PI / 6;
							const r = 12;
							if (a === 0) ctx.moveTo(fastCos(ang) * r, fastSin(ang) * r);
							else ctx.lineTo(fastCos(ang) * r, fastSin(ang) * r);
						}
						ctx.closePath();
						ctx.fill();
						ctx.stroke();
					}
				} else if (item.isSuper || this.activeTab === 'weapons') {
					Renderer.drawBullet(ctx, 0, 0, 10, item.color, item.shape, -Math.PI / 4, 15, false);
				} else if (item.isPassive) {
					ctx.fillStyle = item.color;
					ctx.beginPath();
					ctx.moveTo(0, -12); ctx.lineTo(10, 0); ctx.lineTo(0, 12); ctx.lineTo(-10, 0); ctx.closePath();
					ctx.fill();
					ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
				}
			} else {
				ctx.globalAlpha = 0.3;
				ctx.fillStyle = '#444';
				ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
				ctx.strokeStyle = '#222'; ctx.stroke();
			}
			ctx.restore();

			// 文字信息
			ctx.fillStyle = unlocked ? '#eee' : '#444';
			ctx.font = 'bold 15px sans-serif';

			if (item.isBoss) {
				ctx.fillStyle = unlocked ? item.color : '#444';
				ctx.fillText('W' + item.wave + '. ' + item.name, 85, iy + 22);
				ctx.fillStyle = '#777';
				ctx.font = '10px sans-serif';
				ctx.fillText('基础HP ' + item.hp.toLocaleString() + '  |  技能: ' + item.skills.slice(0, 3).join(' · '), 85, iy + 40);
				ctx.fillStyle = '#555';
				ctx.fillText('每5分钟出现，第 ' + item.wave + ' 波', 85, iy + 52);
			} else if (item.isEnemy) {
				ctx.fillStyle = unlocked ? item.color : '#444';
				ctx.fillText(item.name, 85, iy + 22);
				ctx.fillStyle = '#777';
				ctx.font = '11px sans-serif';
				const shortDesc = item.desc.length > 22 ? item.desc.slice(0, 22) + '…' : item.desc;
				ctx.fillText(shortDesc, 85, iy + 40);
				ctx.fillStyle = '#555';
				ctx.font = '10px sans-serif';
				ctx.fillText('出现时间: ' + item.time + '后', 85, iy + 52);
			} else {
				ctx.fillText(unlocked ? item.name : '???', 85, iy + 25);
				ctx.font = '11px sans-serif';
				ctx.fillStyle = unlocked ? '#888' : '#222';
				ctx.fillText(unlocked ? item.desc : '探索未知以解锁数据...', 85, iy + 45);
				if (unlocked && item.isSuper) {
					ctx.fillStyle = '#ffcc00';
					ctx.fillText('⭐ 超级武器', w - 85, iy + 25);
				}
			}
		});
		ctx.restore();

		// 详情面板（底部）
		if (this.selectedId) {
			const detail = this.items.find(it => it.id === this.selectedId);
			const alwaysUnlocked = detail && (detail.isBoss || detail.isEnemy);
			const unlocked = alwaysUnlocked || (meta ? meta.isUnlocked(this.selectedId) : false);
			if (detail && unlocked) {
				const dy = h - 128;
				ctx.fillStyle = 'rgba(0,0,0,0.7)';
				ctx.fillRect(0, dy, w, 128);
				ctx.strokeStyle = (detail.color || '#00ffcc') + '44';
				ctx.lineWidth = 1;
				ctx.beginPath(); ctx.moveTo(0, dy); ctx.lineTo(w, dy); ctx.stroke();

				ctx.fillStyle = detail.color || '#fff';
				ctx.font = 'bold 15px sans-serif';

				if (detail.isBoss) {
					ctx.fillText('W' + detail.wave + '. ' + detail.name, 16, dy + 22);
					ctx.fillStyle = '#999';
					ctx.font = '10px sans-serif';
					ctx.fillText('基础HP: ' + detail.hp.toLocaleString() + '    每波+' + (detail.hp * 0.25 | 0).toLocaleString(), 16, dy + 38);
					// 技能标签
					ctx.font = '9px sans-serif';
					let sx = 16;
					for (const sk of detail.skills) {
						const tw = ctx.measureText(sk).width + 10;
						if (sx + tw > w - 16) break;
						ctx.fillStyle = detail.color + '33';
						ctx.fillRect(sx, dy + 46, tw, 14);
						ctx.strokeStyle = detail.color + '88';
						ctx.lineWidth = 1;
						ctx.strokeRect(sx, dy + 46, tw, 14);
						ctx.fillStyle = detail.color;
						ctx.fillText(sk, sx + 5, dy + 57);
						sx += tw + 4;
					}
					// 描述
					ctx.fillStyle = '#888';
					ctx.font = '10px sans-serif';
					UI.drawWrappedText(ctx, detail.desc, 16, dy + 78, w - 32, 15, { color: '#888', fontSize: 10 });

				} else if (detail.isEnemy) {
					ctx.fillText(detail.name, 16, dy + 22);
					ctx.fillStyle = '#888';
					ctx.font = '10px sans-serif';
					ctx.fillText('出现时间: ' + detail.time + '后', 16, dy + 38);
					ctx.fillStyle = '#888';
					UI.drawWrappedText(ctx, detail.desc, 16, dy + 56, w - 32, 15, { color: '#aaa', fontSize: 11 });

				} else {
					ctx.fillText(detail.name, 16, dy + 22);
					ctx.fillStyle = '#aaa';
					ctx.font = '13px sans-serif';
					UI.drawWrappedText(ctx, detail.desc, 16, dy + 46, w - 32, 17, { color: '#ccc', fontSize: 13 });

					let statX = 16;
					const statsY = dy + 112;
					if (detail.element) {
						const colors = { flux: '#00ffcc', void: '#aa44ff', plasma: '#ff6600', spark: '#ffee00', cryo: '#66ccff', toxic: '#88ff00' };
						const eColor = colors[detail.element] || '#fff';
						ctx.fillStyle = eColor; ctx.strokeStyle = eColor;
						ctx.font = 'bold 9px sans-serif';
						const txt = detail.element.toUpperCase();
						const tw = ctx.measureText(txt).width + 8;
						UI.drawRoundRect(ctx, statX, statsY - 10, tw, 14, 2);
						ctx.stroke();
						ctx.fillText(txt, statX + 4, statsY);
						statX += tw + 8;
					}
					if (detail.isSuper) {
						ctx.fillStyle = '#ffcc00'; ctx.strokeStyle = '#ffcc00';
						ctx.font = 'bold 9px sans-serif';
						const tagW = ctx.measureText('SUPER').width + 8;
						UI.drawRoundRect(ctx, statX, statsY - 10, tagW, 14, 2);
						ctx.stroke();
						ctx.fillText('SUPER', statX + 4, statsY);
					}
					if (detail.isSuper && detail.recipe) {
						const baseWeapon = (WEAPON_DEFS[detail.baseId] && WEAPON_DEFS[detail.baseId].name) || '未知武器';
						const passive = (PASSIVE_DEFS[detail.recipe.requirePassive] && PASSIVE_DEFS[detail.recipe.requirePassive].name) || '未知零件';
						ctx.fillStyle = '#ffcc00'; ctx.textAlign = 'right';
						ctx.font = 'italic 11px sans-serif';
						ctx.fillText(`公式: ${baseWeapon} + ${passive}`, w - 16, dy + 22);
						ctx.textAlign = 'left';
					}
					if (!detail.isPassive && !detail.isSuper && detail.baseDamage) {
						const dmg = detail.baseDamage;
						const cd = detail.baseCooldown || 1;
						ctx.fillStyle = '#666'; ctx.font = '10px sans-serif';
						ctx.fillText(`DMG ${dmg}  |  CD ${cd}s  |  DPS ${(dmg / cd).toFixed(1)}`, statX + 8, statsY);
					}
				}
			}
		}

		// 返回按钮
		const backBtn = UI.drawButton(ctx, '返回标题', w / 2, h - 22, {
			fontSize: 14, color: '#ff4444', borderColor: '#ff444444', bgColor: 'rgba(255,68,68,0.05)'
		});
		this.buttons.push({ ...backBtn, action: 'back' });
	}

	onTouchStart(x, y) {
		this.touchStartY = y;
		this.lastTouchY = y;
		this.isDragging = false;
	}

	onTouchMove(x, y) {
		const deltaY = this.lastTouchY - y;
		if (Math.abs(deltaY) > 5) this.isDragging = true;
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

		for (const btn of this.buttons) {
			if (UI.hitTest(x, y, btn)) {
				if (btn.action === 'tab') {
					this.activeTab = btn.value;
					this.scrollOffset = 0;
					this.selectedId = null;
					this.refreshItems();
				} else if (btn.action === 'select') {
					this.selectedId = btn.value;
				} else if (btn.action === 'back') {
					this.manager.switchTo('title');
				}
				return;
			}
		}
	}
}

module.exports = CompendiumScene;
