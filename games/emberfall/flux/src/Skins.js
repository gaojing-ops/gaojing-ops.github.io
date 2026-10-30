// ─── 角色外观系统 ──────────────────────────────────────
// 每个角色可以有多种外观，用金币解锁

const SKINS = {
	// ═══ 赛博猎手外观 ═══
	tracer: [
		{
			id: 'tracer_default',
			name: '默认',
			desc: '经典赛博风格',
			cost: 0,
			theme: {
				main: '#00ffcc',
				glow: '#00ffcc',
				core: '#00ffcc',
				accent: '#00ddaa',
			}
		},
		{
			id: 'tracer_golden',
			name: '黄金猎手',
			desc: '闪耀的金色能量',
			cost: 800,
			theme: {
				main: '#ffcc00',
				glow: '#ffdd44',
				core: '#ffffff',
				accent: '#ffaa00',
			}
		},
		{
			id: 'tracer_void',
			name: '虚空之影',
			desc: '来自虚空的暗影能量',
			cost: 1200,
			theme: {
				main: '#aa44ff',
				glow: '#cc66ff',
				core: '#ff88ff',
				accent: '#8822cc',
			}
		},
		{
			id: 'tracer_plasma',
			name: '等离子核心',
			desc: '炽热的等离子体',
			cost: 1500,
			theme: {
				main: '#ff6600',
				glow: '#ff8833',
				core: '#ffcc00',
				accent: '#ff4400',
			}
		},
	],

	// ═══ 重装卫士外观 ═══
	walker: [
		{
			id: 'walker_default',
			name: '默认',
			desc: '标准护甲配色',
			cost: 0,
			theme: {
				main: '#aa44ff',
				glow: '#aa44ff',
				core: '#ff88ff',
				accent: '#8822cc',
			}
		},
		{
			id: 'walker_cryo',
			name: '寒冰堡垒',
			desc: '冰霜护甲原型',
			cost: 800,
			theme: {
				main: '#44ccff',
				glow: '#66ddff',
				core: '#ffffff',
				accent: '#2299cc',
			}
		},
		{
			id: 'walker_steel',
			name: '钢铁洪流',
			desc: '重型合金装甲',
			cost: 1200,
			theme: {
				main: '#888899',
				glow: '#aaaacc',
				core: '#ffffff',
				accent: '#666677',
			}
		},
		{
			id: 'walker_blood',
			name: '血月守卫',
			desc: '猩红的诅咒之甲',
			cost: 1500,
			theme: {
				main: '#cc2244',
				glow: '#ff4466',
				core: '#ff6688',
				accent: '#881133',
			}
		},
	],

	// ═══ 精准射手外观 ═══
	gunner: [
		{
			id: 'gunner_default',
			name: '默认',
			desc: '战术橙配色',
			cost: 0,
			theme: {
				main: '#ff6600',
				glow: '#ff8833',
				core: '#ffcc00',
				accent: '#cc4400',
			}
		},
		{
			id: 'gunner_military',
			name: '军事迷彩',
			desc: '战术潜行涂装',
			cost: 800,
			theme: {
				main: '#448844',
				glow: '#66aa66',
				core: '#88cc88',
				accent: '#335533',
			}
		},
		{
			id: 'gunner_cyber',
			name: '赛博枪手',
			desc: '霓虹能量涂装',
			cost: 1200,
			theme: {
				main: '#00ffcc',
				glow: '#44ffdd',
				core: '#ffffff',
				accent: '#00ccaa',
			}
		},
		{
			id: 'gunner_obsidian',
			name: '黑曜石',
			desc: '暗黑能量核心',
			cost: 1500,
			theme: {
				main: '#222233',
				glow: '#444466',
				core: '#8888ff',
				accent: '#111122',
			}
		},
	],

	// ═══ 冰霜术士外观 ═══
	cryomancer: [
		{
			id: 'cryomancer_default',
			name: '默认',
			desc: '冰晶蓝配色',
			cost: 0,
			theme: {
				main: '#44ccff',
				glow: '#66ddff',
				core: '#ffffff',
				accent: '#2299cc',
			}
		},
		{
			id: 'cryomancer_frost',
			name: '极寒之心',
			desc: '永恒冻结的气息',
			cost: 800,
			theme: {
				main: '#88eeff',
				glow: '#aaffff',
				core: '#ffffff',
				accent: '#66ccee',
			}
		},
		{
			id: 'cryomancer_twilight',
			name: '暮光冰霜',
			desc: '黄昏时分的寒意',
			cost: 1200,
			theme: {
				main: '#8866cc',
				glow: '#aa88ee',
				core: '#ccaaff',
				accent: '#6644aa',
			}
		},
		{
			id: 'cryomancer_aurora',
			name: '极光',
			desc: '绚丽的北极光',
			cost: 1500,
			theme: {
				main: '#44ffaa',
				glow: '#88ffcc',
				core: '#ffffff',
				accent: '#22cc88',
			}
		},
	],

	// ═══ 瘟疫使者外观 ═══
	biohazard: [
		{
			id: 'biohazard_default',
			name: '默认',
			desc: '剧毒绿色',
			cost: 0,
			theme: {
				main: '#88ff00',
				glow: '#aaff44',
				core: '#ccff88',
				accent: '#66cc00',
			}
		},
		{
			id: 'biohazard_plague',
			name: '瘟疫之源',
			desc: '古老的瘟疫能量',
			cost: 800,
			theme: {
				main: '#aa8800',
				glow: '#ccaa22',
				core: '#ffdd66',
				accent: '#886600',
			}
		},
		{
			id: 'biohazard_tainted',
			name: '堕落腐化',
			desc: '被污染的暗紫能量',
			cost: 1200,
			theme: {
				main: '#884488',
				glow: '#aa66aa',
				core: '#cc88cc',
				accent: '#662266',
			}
		},
		{
			id: 'biohazard_nuclear',
			name: '核辐射',
			desc: '致命的辐射核心',
			cost: 1500,
			theme: {
				main: '#ccff00',
				glow: '#ddff44',
				core: '#ffffff',
				accent: '#aacc00',
			}
		},
	],

	// ═══ 狂战士外观 ═══
	berserker: [
		{
			id: 'berserker_default',
			name: '默认',
			desc: '血红战意',
			cost: 0,
			theme: {
				main: '#ff2244',
				glow: '#ff4466',
				core: '#ff6688',
				accent: '#cc1133',
			}
		},
		{
			id: 'berserker_flame',
			name: '烈焰狂怒',
			desc: '燃烧的战魂',
			cost: 800,
			theme: {
				main: '#ff4400',
				glow: '#ff6622',
				core: '#ffcc00',
				accent: '#cc3300',
			}
		},
		{
			id: 'berserker_shadow',
			name: '暗影战狂',
			desc: '黑暗中的杀戮者',
			cost: 1200,
			theme: {
				main: '#442244',
				glow: '#663366',
				core: '#aa44aa',
				accent: '#331133',
			}
		},
		{
			id: 'berserker_demon',
			name: '恶魔之血',
			desc: '深渊恶魔的祝福',
			cost: 1500,
			theme: {
				main: '#880044',
				glow: '#aa2266',
				core: '#ff4488',
				accent: '#660033',
			}
		},
	],

	// ═══ 奥术师外观 ═══
	arcane: [
		{
			id: 'arcane_default',
			name: '默认',
			desc: '奥术紫配色',
			cost: 0,
			theme: {
				main: '#cc44ff',
				glow: '#dd66ff',
				core: '#ee88ff',
				accent: '#aa22cc',
			}
		},
		{
			id: 'arcane_cosmic',
			name: '宇宙星芒',
			desc: '星空中的奥术能量',
			cost: 800,
			theme: {
				main: '#4466ff',
				glow: '#6688ff',
				core: '#aaccff',
				accent: '#2244cc',
			}
		},
		{
			id: 'arcane_emerald',
			name: '翡翠法阵',
			desc: '自然的奥术之力',
			cost: 1200,
			theme: {
				main: '#44cc88',
				glow: '#66ddaa',
				core: '#88ffcc',
				accent: '#22aa66',
			}
		},
		{
			id: 'arcane_elder',
			name: '上古符文',
			desc: '远古奥术的传承',
			cost: 1500,
			theme: {
				main: '#ccaa44',
				glow: '#ddcc66',
				core: '#ffee88',
				accent: '#aa8822',
			}
		},
	],

	// ═══ 工程师外观 ═══
	engineer: [
		{
			id: 'engineer_default',
			name: '默认',
			desc: '经典工程黄',
			cost: 0,
			theme: {
				main: '#ffcc00',
				glow: '#ffdd44',
				core: '#ffee88',
				accent: '#ccaa00',
			}
		},
		{
			id: 'engineer_copper',
			name: '铜芯齿轮',
			desc: '复古机械风格',
			cost: 800,
			theme: {
				main: '#cc8844',
				glow: '#ddaa66',
				core: '#ffcc88',
				accent: '#aa6622',
			}
		},
		{
			id: 'engineer_silver',
			name: '银白精密',
			desc: '高科技精密工程',
			cost: 1200,
			theme: {
				main: '#aaaacc',
				glow: '#ccccee',
				core: '#ffffff',
				accent: '#8888aa',
			}
		},
		{
			id: 'engineer_rose',
			name: '蔷薇金',
			desc: '优雅的玫瑰金涂装',
			cost: 1500,
			theme: {
				main: '#ddaa99',
				glow: '#eeccbb',
				core: '#ffeedd',
				accent: '#bb8877',
			}
		},
	],

	// ═══ 暗影刺客外观 ═══
	assassin: [
		{
			id: 'assassin_default',
			name: '默认',
			desc: '暗影紫配色',
			cost: 0,
			theme: {
				main: '#8800ff',
				glow: '#aa22ff',
				core: '#cc44ff',
				accent: '#6600cc',
			}
		},
		{
			id: 'assassin_ghost',
			name: '幽灵刺客',
			desc: '无形的杀意',
			cost: 800,
			theme: {
				main: '#4488aa',
				glow: '#66aacc',
				core: '#88ddee',
				accent: '#226688',
			}
		},
		{
			id: 'assassin_crimson',
			name: '绯红之刃',
			desc: '鲜血染红的匕首',
			cost: 1200,
			theme: {
				main: '#cc2244',
				glow: '#ee4466',
				core: '#ff6688',
				accent: '#aa0022',
			}
		},
		{
			id: 'assassin_midnight',
			name: '午夜行者',
			desc: '最深黑夜的化身',
			cost: 1500,
			theme: {
				main: '#111133',
				glow: '#333366',
				core: '#6666aa',
				accent: '#000022',
			}
		},
	],
};

// 获取角色的所有外观
function getCharacterSkins(charId) {
	return SKINS[charId] || [];
}

// 获取外观信息
function getSkinById(skinId) {
	for (const charId in SKINS) {
		const skin = SKINS[charId].find(s => s.id === skinId);
		if (skin) return { ...skin, charId };
	}
	return null;
}

// 获取外观主题（用于渲染）
function getSkinTheme(charId, skinId) {
	const skins = SKINS[charId];
	if (!skins) return null;

	const skin = skinId ? skins.find(s => s.id === skinId) : skins[0];
	return skin ? skin.theme : null;
}

module.exports = {
	SKINS,
	getCharacterSkins,
	getSkinById,
	getSkinTheme,
};
