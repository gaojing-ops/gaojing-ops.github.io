const { fastSin, fastCos } = require('./MathLUT');
const { makeSkillEffect } = require('./NightMagic');
const { now: perfNow } = require('./platform');
// ─── 角色专属技能系统 ──────────────────────────
// 每个角色1个主动技能，触摸右侧按钮触发，冷却管理

// ─── 技能定义（通过 Character.js 中 skill 字段扩展）───
const SKILL_DEFS = {
	// 赛博猎手：超速冲刺
	tracer: {
		name: '超速冲刺',
		icon: '⚡',
		cooldown: 12,
		desc: '1.5秒内移速×3，无敌',
		color: '#efb36c',
		use: (game) => {
			const p = game.player;
			const duration = 1.5;
			game.playerInvincible = (game.playerInvincible || 0) + duration;
			const origSpeed = p.bonusSpeed;
			p.bonusSpeed += 2.0; // 移速×3 (基础+200%)
			if (game.particles) {
game.particles.emit(p.x, p.y, { count: 20, speed: 150, life: 0.4, color: '#efb36c', size: 3 });
			}
			game.spawnDamageNumber(p.x, p.y - 40, '超速冲刺!', '#efb36c');
			game.skillSystem.addTimedEffect(() => { game.player.bonusSpeed -= 2.0; }, duration);
		},
	},

	// 重装卫士：铁壁堡垒
	walker: {
		name: '铁壁堡垒',
		icon: '🛡',
		cooldown: 20,
		desc: '5秒内护甲+15，反弹+50%',
		color: '#edac87',
		use: (game) => {
			const p = game.player;
			const duration = 5;
			p.bonusArmor += 15;
			const origThorn = p.thornDamage;
			p.thornDamage = (p.thornDamage || 0) + 0.50;
			game.spawnDamageNumber(p.x, p.y - 40, '铁壁堡垒!', '#edac87');
			if (game.particles) {
game.particles.emit(p.x, p.y, { count: 15, speed: 60, life: 0.5, color: '#edac87', size: 4 });
			}
			game.skillSystem.addTimedEffect(() => { game.player.bonusArmor -= 15; game.player.thornDamage = Math.max(0, game.player.thornDamage - 0.50); }, duration);
		},
	},

	// 精准射手：聚焦射击
	gunner: {
		name: '聚焦射击',
		icon: '🎯',
		cooldown: 15,
		desc: '6秒内伤害×2',
		color: '#add2ae',
		use: (game) => {
			const p = game.player;
			const duration = 6;
			game.skillSystem.refreshPower(1.0, 0.15, duration);
			game.spawnDamageNumber(p.x, p.y - 40, '聚焦射击!', '#add2ae');
			if (game.triggerScreenPulse) game.triggerScreenPulse('#add2ae33', 0.3);
		},
	},

	// 冰霜术士：冰封风暴
	cryomancer: {
		name: '冰封风暴',
		icon: '❄',
		cooldown: 25,
		desc: '冻结屏幕内所有敌人4秒',
		color: '#addce8',
		use: (game) => {
			const p = game.player;
			// Keep a response window even with maximum cooldown and freeze bonuses.
			const cooldown = 25 * (1 - Math.min(0.7, p.bonusCdr || 0));
			const freezeDur = Math.min(8, cooldown * 0.8, 4 * (1 + (p.bonusFreezeDur || 0)));
			const maxR = Math.max(540, Math.hypot(game.width || 800, game.height || 600) * 0.58) * (p.area || 1);
			const maxRSq = maxR * maxR;
			const novaDmg = (p.might || 1) * 35;
			let count = 0;
			for (const e of game.enemies) {
				if (!e.active) continue;
				const dx = e.x - p.x, dy = e.y - p.y;
				if (dx * dx + dy * dy > maxRSq) continue;
				e.frozen = Math.max(e.frozen || 0, freezeDur);
				e.slowed = Math.max(e.slowed || 0, freezeDur + 2);
				e.slowAmount = 0.3;
				if (e.hp > novaDmg) e.takeDamage(novaDmg, 'skill_cryo');
				count++;
			}
			for (const b of (game.bosses || [])) {
				if (!b.active) continue;
				const dx = b.x - p.x, dy = b.y - p.y;
				if (dx * dx + dy * dy <= maxRSq) {
					b.slowed = Math.max(b.slowed || 0, 3);
					b.slowAmount = 0.6;
				}
			}
			game.spawnDamageNumber(p.x, p.y - 40, `冰封风暴! ×${count}`, '#addce8');
			if (game.triggerScreenPulse) game.triggerScreenPulse('#addce822', 0.6);
			if (game.particles) {
				game.particles.emit(p.x, p.y, { count: 30, speed: 200, life: 0.6, color: '#addce8', size: 4 });
			}
		},
	},

	// 瘟疫使者：病毒风暴
	biohazard: {
		name: '病毒风暴',
		icon: '☣',
		cooldown: 20,
		desc: '对附近所有敌人施加强力毒素',
		color: '#c2dc93',
		use: (game) => {
			const p = game.player;
			const radius = Math.min(440 * (p.area || 1), 640);
			const radiusSq = radius * radius;
			let count = 0;
			for (const e of game.enemies) {
				if (!e.active) continue;
				const dx = e.x - p.x, dy = e.y - p.y;
				if (dx * dx + dy * dy < radiusSq) {
					e.poisoned = (e.poisoned || 0) + 8; // 强力毒素
					e.poisonStacks = Math.min(50, (e.poisonStacks || 0) + 10); // 技能给10层
					e.poisonTickTimer = 0; // 立即开始跳毒
					count++;
				}
			}
			for (const b of (game.bosses || [])) {
				if (!b.active) continue;
				const dx = b.x - p.x, dy = b.y - p.y;
				if (dx * dx + dy * dy < radiusSq) {
					b.takeDamage((p.might || 1) * 45, 'skill_bio');
					count++;
				}
			}
			game.spawnDamageNumber(p.x, p.y - 40, `病毒风暴! ×${count}`, '#c2dc93');
			if (game.particles) {
				game.particles.emit(p.x, p.y, { count: 25, speed: 160, life: 0.5, color: '#c2dc93', size: 3 });
			}
		},
	},

	// 狂战士：血怒爆发
	berserker: {
		name: '血怒爆发',
		icon: '🔥',
		cooldown: 18,
		desc: '8秒内移速+30%，伤害+60%',
		color: '#efb36c',
		use: (game) => {
			const p = game.player;
			const duration = 8;
			game.skillSystem.refreshPower(0.60, 0.10, duration, 0.30);
			game.spawnDamageNumber(p.x, p.y - 40, '血怒爆发!', '#efb36c');
			if (game.triggerScreenPulse) game.triggerScreenPulse('#efb36c22', 0.4);
			if (game.particles) {
game.particles.emit(p.x, p.y, { count: 20, speed: 100, life: 0.5, color: '#efb36c', size: 3 });
			}
		},
	},

	// 奥术师：魔力潮汐
	arcane: {
		name: '魔力潮汐',
		icon: '✨',
		cooldown: 22,
		desc: '6秒内冷却-50%',
		color: '#c7b5ef',
		use: (game) => {
			const p = game.player;
			const duration = 6;
			// 所有武器CD清零
			for (const w of p.weapons) {
				if (w.cooldown !== undefined) w.cooldown = 0;
			}
			p.bonusCdr += 0.50;
			game.spawnDamageNumber(p.x, p.y - 40, '魔力潮汐!', '#c7b5ef');
			if (game.triggerScreenPulse) game.triggerScreenPulse('#c7b5ef22', 0.5);
			game.skillSystem.addTimedEffect(() => { game.player.bonusCdr -= 0.50; }, duration);
		},
	},

	// 工程师：紧急部署
	engineer: {
		name: '紧急部署',
		icon: '⚙',
		cooldown: 25,
		desc: '立即部署3座强化炮台',
		color: '#edac87',
		use: (game) => {
			const p = game.player;
			p.turrets = p.turrets || [];
			// 清除旧炮台，部署3座强化炮台
			p.turrets = [];
			for (let i = 0; i < 3; i++) {
				const angle = (i / 3) * Math.PI * 2;
				const dist = 72;
				const turret = {
					x: p.x + fastCos(angle) * dist,
					y: p.y + fastSin(angle) * dist,
					hp: 60, maxHp: 60,
					lifetime: 20, // 强化：20秒
					shootTimer: 0,
					shootInterval: 0.5, // 强化：更快射击
					baseDamage: 15,
					range: Math.round(340 * (p.area || 1)),
					active: true,
					lastTarget: null,
					lastShootTime: 0,
				};
				p.turrets.push(turret);
			}
			game.spawnDamageNumber(p.x, p.y - 40, '紧急部署! ×3炮台', '#edac87');
		},
	},

	// 暗影刺客：影袭
	assassin: {
		name: '影袭',
		icon: '🌑',
		cooldown: 15,
		desc: '瞬移至最近敌人，AOE爆发伤害',
		color: '#c7b5ef',
		use: (game) => {
			const p = game.player;
			const searchR = 400 * (p.area || 1);
			// 找视野内最近敌人或Boss（限制瞬移半径，防止瞬移到视野外导致全屏怪物突兀跳变）
			let closest = null, closestDist = searchR * searchR;
			for (const e of game.enemies) {
				if (!e.active) continue;
				const dx = e.x - p.x, dy = e.y - p.y;
				const d = dx * dx + dy * dy;
				if (d < closestDist) { closestDist = d; closest = e; }
			}
			if (!closest && game.bosses) {
				for (const b of game.bosses) {
					if (!b.active) continue;
					const dx = b.x - p.x, dy = b.y - p.y;
					const d = dx * dx + dy * dy;
					if (d < closestDist) { closestDist = d; closest = b; }
				}
			}
			if (!closest) {
				game.spawnDamageNumber(p.x, p.y - 40, '无目标', '#c7b5ef');
				return;
			}
			// 瞬移（保持安全距离）并赋予短暂无敌帧保护
			const angle = Math.atan2(p.y - closest.y, p.x - closest.x);
			p.x = closest.x + fastCos(angle) * 50;
			p.y = closest.y + fastSin(angle) * 50;
			game.playerInvincible = Math.max(game.playerInvincible || 0, 0.8);
			// AOE爆发（随玩家范围属性扩大）
			const dmg = p.might * 80;
			const burstR = 165 * (p.area || 1);
			const burstRSq = burstR * burstR;
			let hits = 0;
			for (const e of game.enemies) {
				if (!e.active) continue;
				const dx = e.x - p.x, dy = e.y - p.y;
				if (dx * dx + dy * dy < burstRSq) {
					e.takeDamage(dmg);
					hits++;
				}
			}
			for (const b of (game.bosses || [])) {
				if (!b.active) continue;
				const dx = b.x - p.x, dy = b.y - p.y;
				if (dx * dx + dy * dy < burstRSq) {
					b.takeDamage(dmg * 0.6);
					hits++;
				}
			}
			game.spawnDamageNumber(p.x, p.y - 40, `影袭! ×${hits}`, '#c7b5ef');
			if (game.particles) {
				game.particles.emit(p.x, p.y, { count: 25, speed: 180, life: 0.4, color: '#c7b5ef', size: 4 });
			}
		},
	},
};

// ─── 技能系统核心 ───
class SkillSystem {
	constructor(game) {
		this.game = game;
		this.cooldown = 0;
		this.maxCooldown = 0;
		this.skillDef = null;
		this.btnRect = null; // 屏幕按钮区域
		this._activeEffects = []; // 帧计时器替代setTimeout
	}

	init() {
		const charId = this.game.player && this.game.player.characterId;
		this.skillDef = charId ? (SKILL_DEFS[charId] || null) : null;
		if (this.skillDef) {
			this.maxCooldown = this.skillDef.cooldown;
		}
		this.cooldown = 0;
		this._activeEffects = []; // 清除上局残留效果
		this.visualEffects = [];
	}

	update(dt) {
		if (this.game.isPaused || !this.game.isRunning) return;
		this.visualEffects = (this.visualEffects || []).filter(e => (e.age += dt) < e.life);
		if (!this.skillDef) return;
		if (this.cooldown > 0) {
			this.cooldown = Math.max(0, this.cooldown - dt);
		}
		// 帧计时器：处理技能临时增益
		for (let i = this._activeEffects.length - 1; i >= 0; i--) {
			const eff = this._activeEffects[i];
			eff.timer -= dt;
			if (eff.timer <= 0) {
				eff.restore();
				this._activeEffects.splice(i, 1);
			}
		}
	}

	addTimedEffect(restoreFn, duration) {
		this._activeEffects.push({ timer: duration, restore: restoreFn });
	}

	refreshPower(bonus, floor, duration, speed = 0) {
		const p = this.game.player;
		const old = this._activeEffects.findIndex(e => e.key === 'power');
		if (old >= 0) this._activeEffects.splice(old, 1)[0].restore();
		p.bonusMight += bonus; p.bonusSpeed += speed;
		p._skillPower = { bonus, floor };
		this._activeEffects.push({ key: 'power', timer: duration, restore() {
			p.bonusMight -= bonus; p.bonusSpeed -= speed; p._skillPower = null;
		} });
	}

	tryUse() {
		if (!this.skillDef) return false;
		if (this.cooldown > 0) return false;
		if (this.game.isPaused || !this.game.isRunning) return false;
		const origin = { x: this.game.player.x, y: this.game.player.y };
		try {
			this.skillDef.use(this.game);
			const fx = makeSkillEffect(this.game, origin);
			if (fx && ['gunner', 'berserker'].includes(fx.kind)) this.visualEffects = (this.visualEffects || []).filter(e => e.kind !== fx.kind);
			if (fx) this.visualEffects = [...(this.visualEffects || []), fx].slice(-12);
		} catch (e) {
			console.error('[SkillSystem] skill error:', e);
		}
		// 技能冷却受玩家 CDR 影响（上限 70%）
		const p = this.game.player;
		const cdr = p ? Math.min(0.7, (p.bonusCdr || 0)) : 0;
		this.maxCooldown = this.skillDef.cooldown * (1 - cdr);
		this.cooldown = this.maxCooldown;
		this.game.skillUseCount = (this.game.skillUseCount || 0) + 1;
		return true;
	}

	// ─── 绘制技能按钮（屏幕坐标）───
	draw(ctx, w, h) {
		if (!this.skillDef) return;

		// 右下角，与摇杆对称（摇杆在左）
		const btnR = 34;
		const btnX = w - 60;
		const btnY = h - 90;
		this.btnRect = { x: btnX - btnR, y: btnY - btnR, w: btnR * 2, h: btnR * 2 };

		const ready = this.cooldown <= 0;
		const color = this.skillDef.color;

		ctx.save();

		// 背景圆
		ctx.beginPath();
		ctx.arc(btnX, btnY, btnR, 0, Math.PI * 2);
		ctx.fillStyle = ready ? color + '33' : 'rgba(0,0,0,0.5)';
		ctx.fill();

		// 边框
		ctx.strokeStyle = ready ? color : '#444';
		ctx.lineWidth = 2.5;
		ctx.stroke();

		// 冷却遮罩（扇形）
		if (!ready && this.maxCooldown > 0) {
			const progress = this.cooldown / this.maxCooldown;
			ctx.beginPath();
			ctx.moveTo(btnX, btnY);
			ctx.arc(btnX, btnY, btnR - 1, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2, false);
			ctx.closePath();
			ctx.fillStyle = 'rgba(0,0,0,0.6)';
			ctx.fill();
		}

		// 图标
		ctx.font = `${Math.floor(btnR * 0.8)}px sans-serif`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = ready ? '#fff' : '#666';
		ctx.globalAlpha = ready ? 1 : 0.6;
		ctx.fillText(this.skillDef.icon, btnX, btnY + 1);

		// 冷却剩余时间
		if (!ready) {
			ctx.font = 'bold 11px sans-serif';
			ctx.fillStyle = '#fff';
			ctx.globalAlpha = 0.9;
			ctx.fillText(Math.ceil(this.cooldown) + 's', btnX, btnY + btnR + 12);
		} else {
			// "准备" 提示脉冲
			ctx.font = '9px sans-serif';
			ctx.fillStyle = color;
			ctx.globalAlpha = 0.5 + 0.5 * fastSin(perfNow() / 300);
			ctx.fillText('准备', btnX, btnY + btnR + 12);
		}

		ctx.globalAlpha = 1;
		ctx.textBaseline = 'alphabetic';
		ctx.restore();
	}

	onTouchEnd(x, y) {
		if (!this.btnRect) return false;
		const b = this.btnRect;
		// 圆形点击检测
		const cx = b.x + b.w / 2;
		const cy = b.y + b.h / 2;
		const r = b.w / 2;
		const dx = x - cx, dy = y - cy;
		if (dx * dx + dy * dy < r * r) {
			this.tryUse();
			return true;
		}
		return false;
	}
}

module.exports = { SkillSystem, SKILL_DEFS };
