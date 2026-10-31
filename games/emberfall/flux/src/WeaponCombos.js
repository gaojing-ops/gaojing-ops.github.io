// ─── 武器连携定义（从 Game.js 提取） ──────────────────────────
// 按武器 id 排序拼接为 key，击杀时触发双武器连携效果

const _WEAPON_COMBOS = {
	// 电弧风暴：流光弹 + 链式火花
	'chain_spark+flux_bolt': {
		name: '\u26A1 \u7535\u5F27\u98CE\u66B4', color: '#44ddff',
		fn(g, e) {
			const dmg = g.player.might * 30;
			const range = 120;
			const rSq = range * range;
			let chains = 0;
			for (const en of g.enemies) {
				if (!en.active || en === e) continue;
				const dx = en.x - e.x, dy = en.y - e.y;
				if (dx * dx + dy * dy < rSq && chains < 3) {
					en.takeDamage(dmg);
					chains++;
					if (g.particles) g.particles.emit(en.x, en.y, { count: 5, speed: 100, life: 0.2, color: '#44ddff', size: 3 });
				}
			}
			g.spawnDamageNumber(e.x, e.y - 40, '\u26A1\u7535\u5F27\u98CE\u66B4', '#44ddff', false);
			if (g.particles) g.particles.emit(e.x, e.y, { count: 15, speed: 150, life: 0.3, color: '#44ddff', size: 4 });
		},
	},
	// 热裂：冰晶碎片 + 等离子弧
	'ice_shard+plasma_arc': {
		name: '\u{1F4A5} \u70ED\u88C2', color: '#ffffff',
		fn(g, e) {
			const dmg = g.player.might * 50;
			const range = 80;
			const rSq = range * range;
			for (const en of g.enemies) {
				if (!en.active || en === e) continue;
				const dx = en.x - e.x, dy = en.y - e.y;
				if (dx * dx + dy * dy < rSq) en.takeDamage(dmg * 0.5);
			}
			e.takeDamage(dmg);
			g.spawnDamageNumber(e.x, e.y - 40, '\u70ED\u88C2!', '#ffffff', false);
			if (g.particles) g.particles.emit(e.x, e.y, { count: 20, speed: 180, life: 0.4, color: '#ffffff', size: 5 });
			g.radiationPulse = { x: e.x, y: e.y, r: range, a: 0.5, color: '#ffffff' };
		},
	},
	// 毒焰：毒雾 + 凝固汽油弹
	'napalm+toxin_spray': {
		name: '\u2623 \u6BD2\u7130', color: '#88ff00',
		fn(g, e) {
			const range = 100;
			const rSq = range * range;
			for (const en of g.enemies) {
				if (!en.active) continue;
				const dx = en.x - e.x, dy = en.y - e.y;
				if (dx * dx + dy * dy < rSq) {
					en.poisoned = 5;
					en.poisonStacks = (en.poisonStacks || 0) + 3;
					en.burning = 3;
					en.burnDamage = g.player.might * 8;
				}
			}
			g.spawnDamageNumber(e.x, e.y - 40, '\u6BD2\u7130!', '#88ff00', false);
			if (g.particles) g.particles.emit(e.x, e.y, { count: 20, speed: 80, life: 0.6, color: '#88ff00', size: 5 });
		},
	},
	// 虚空漩涡：辐射力场 + 灵魂虹吸
	'radiation_field+soul_drain': {
		name: '\u{1F300} \u865A\u7A7A\u6F29\u6DA1', color: '#aa44ff',
		fn(g, e) {
			const range = 150;
			const rSq = range * range;
			const pullStrength = 200;
			for (const en of g.enemies) {
				if (!en.active || en === e) continue;
				const dx = e.x - en.x, dy = e.y - en.y;
				const dSq = dx * dx + dy * dy;
				if (dSq < rSq && dSq > 1) {
					const d = Math.sqrt(dSq);
					en.x += (dx / d) * pullStrength * 0.05;
					en.y += (dy / d) * pullStrength * 0.05;
					en.takeDamage(g.player.might * 15);
				}
			}
			g.spawnDamageNumber(e.x, e.y - 40, '\u865A\u7A7A\u6F29\u6DA1!', '#aa44ff', false);
			g.radiationPulse = { x: e.x, y: e.y, r: range, a: 0.5, color: '#aa44ff' };
		},
	},
	// 冰毒：冰晶 + 毒雾
	'ice_shard+toxin_spray': {
		name: '\u{1F9CA} \u51B0\u6BD2', color: '#66ffcc',
		fn(g, e) {
			e.frozen = 2;
			e.poisoned = 4;
			e.poisonStacks = (e.poisonStacks || 0) + 2;
			const range = 80;
			const rSq = range * range;
			for (const en of g.enemies) {
				if (!en.active || en === e) continue;
				const dx = en.x - e.x, dy = en.y - e.y;
				if (dx * dx + dy * dy < rSq) {
					en.poisoned = 3;
					en.poisonStacks = (en.poisonStacks || 0) + 1;
				}
			}
			g.spawnDamageNumber(e.x, e.y - 40, '\u51B0\u6BD2!', '#66ffcc', false);
			if (g.particles) g.particles.emit(e.x, e.y, { count: 15, speed: 100, life: 0.4, color: '#66ffcc', size: 4 });
		},
	},
	// 过载：等离子弧 + 火箭蜂群
	'plasma_arc+rocket_swarm': {
		name: '\u{1F525} \u8FC7\u8F7D', color: '#ff6600',
		fn(g, e) {
			const dmg = g.player.might * 40;
			e.takeDamage(dmg);
			// 连环爆炸
			const range = 60;
			const rSq = range * range;
			for (const en of g.enemies) {
				if (!en.active || en === e) continue;
				const dx = en.x - e.x, dy = en.y - e.y;
				if (dx * dx + dy * dy < rSq) {
					en.takeDamage(dmg * 0.6);
					if (g.particles) g.particles.emit(en.x, en.y, { count: 5, speed: 100, life: 0.2, color: '#ff6600', size: 3 });
				}
			}
			g.spawnDamageNumber(e.x, e.y - 40, '\u8FC7\u8F7D!', '#ff6600', false);
			if (g.particles) g.particles.emit(e.x, e.y, { count: 20, speed: 200, life: 0.3, color: '#ff6600', size: 5 });
			g.shakeAmount = Math.max(g.shakeAmount, 4);
			g.shakeDuration = 0.3;
		},
	},
	// 幻影闪电：影分身 + 链式火花
	'chain_spark+shadow_clone': {
		name: '\u{1F47D} \u5E7B\u5F71\u95EA\u7535', color: '#cc88ff',
		fn(g, e) {
			const range = 150;
			const dmg = g.player.might * 20;
			const rSq = range * range;
			let hits = 0;
			for (const en of g.enemies) {
				if (!en.active) continue;
				const dx = en.x - e.x, dy = en.y - e.y;
				if (dx * dx + dy * dy < rSq && hits < 8) {
					en.takeDamage(dmg);
					hits++;
					if (g.particles) g.particles.emit(en.x, en.y, { count: 3, speed: 80, life: 0.2, color: '#cc88ff', size: 2 });
				}
			}
			g.spawnDamageNumber(e.x, e.y - 40, '\u5E7B\u5F71\u95EA\u7535!', '#cc88ff', false);
		},
	},
	// 绝对领域：冰川新星 + 辐射力场
	'glacial_nova+radiation_field': {
		name: '\u2744 \u7EDD\u5BF9\u9886\u57DF', color: '#88ccff',
		fn(g, e) {
			const range = 180;
			const rSq = range * range;
			for (const en of g.enemies) {
				if (!en.active) continue;
				const dx = en.x - g.player.x, dy = en.y - g.player.y;
				if (dx * dx + dy * dy < rSq) {
					en.frozen = 3;
					en.slowed = 5;
					en.slowAmount = 0.3;
				}
			}
			g.spawnDamageNumber(g.player.x, g.player.y - 50, '\u7EDD\u5BF9\u9886\u57DF!', '#88ccff', false);
			g.radiationPulse = { x: g.player.x, y: g.player.y, r: range, a: 0.6, color: '#88ccff' };
		},
	},
	// 化学反应：凝固汽油弹 + 酸性池
	'acid_pool+napalm': {
		name: '\u{1F9EA} \u5316\u5B66\u53CD\u5E94', color: '#ccff00',
		fn(g, e) {
			const dmg = g.player.might * 60;
			const range = 100;
			const rSq = range * range;
			for (const en of g.enemies) {
				if (!en.active) continue;
				const dx = en.x - e.x, dy = en.y - e.y;
				if (dx * dx + dy * dy < rSq) {
					en.takeDamage(dmg);
				}
			}
			g.spawnDamageNumber(e.x, e.y - 40, '\u5316\u5B66\u53CD\u5E94!', '#ccff00', false);
			if (g.particles) g.particles.emit(e.x, e.y, { count: 25, speed: 160, life: 0.5, color: '#ccff00', size: 6 });
			g.shakeAmount = Math.max(g.shakeAmount, 6);
			g.shakeDuration = 0.4;
		},
	},
	// 灵魂腐蚀：剧毒之刺 + 灵魂虹吸
	'soul_drain+venom_sting': {
		name: '\u2620 \u7075\u9B42\u8150\u8680', color: '#88ff88',
		fn(g, e) {
			const heal = g.player.heal(Math.floor(g.player.maxHp * 0.08));

			e.takeDamage(g.player.might * 25);
			g.spawnDamageNumber(e.x, e.y - 40, '\u7075\u9B42\u8150\u8680!', '#88ff88', false);
			g.spawnDamageNumber(g.player.x, g.player.y - 30, '+' + heal + ' HP', '#44ff88');
		},
	},
};

module.exports = _WEAPON_COMBOS;
