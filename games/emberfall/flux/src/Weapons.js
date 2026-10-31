const SFX = require('./SFX');
const { fastSin, fastCos } = require('./MathLUT');
const { getEvolutionDamageMult, getEvolutionPierce, getEvolutionHoming } = require('./Evolution');
const { now: perfNow } = require('./platform');

// 就地压缩数组，避免.filter() 每帧分配新数组
function _compact(list, pred) {
    let w = 0;
    for (let i = 0; i < list.length; i++) {
        if (pred(list[i])) list[w++] = list[i];
    }
    list.length = w;
}

// 鈹鈹鈹 Weapon Definition (loaded from JSON data file) 鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹
// WeChat game packaging has been flaky with JSON modules; load the data from a JS module instead.
const _weaponData = require('./WeaponData.js');
const WEAPON_DEFS = _weaponData.weapons;
const PASSIVE_DEFS = _weaponData.passives;



// 鈹鈹鈹 Weapon Instance 鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹鈹

class Weapon {
    constructor(game, defId) {
        this.game = game;
        this.id = defId;
        this.def = WEAPON_DEFS[defId];

        // 规避特效检查：无武器ID时返回默认武器
        if (!this.def) {
            console.warn(`Unknown weapon ID: ${defId}, falling back to flux_bolt`);
            this.def = WEAPON_DEFS.flux_bolt;
            this.id = 'flux_bolt';
        }

        this.level = 1;
        this.cooldown = 0;
        this.evolved = false;
        this._evolutionBonuses = null;

        // 影分身专题
        this._clones = [];
        // 火池专用
        this._firePools = [];
        // 冰晶弹丸专用
        this._orbList = [];
        // 酸液池专用
        this._acidPools = [];
        // 引力场专用
        this._gravityZones = [];
        // 纳米虫群专用
        this._nanoSwarm = [];
    }

    // 浼ゅ宠＄畻锛氶噰鐢ㄧ櫨鍒嗘瘮鎴愰暱锛岀被鍚岃椽濠娴佸惍
    // 公式: base * (1 + level * 0.33) * might * evolution
    get damage() {
        const base = this.def.baseDamage || 10;
        // 每级增加33%基础伤害
        const might = Number.isFinite(this.game.player.might) ? this.game.player.might : 1;
        const mult = getEvolutionDamageMult(this);
        return Math.floor(base * (1 + this.level * 0.33) * might * mult);
    }

    get interval() {
        let base = this.def.baseCooldown || 1.0;
        const cdr = Math.min(0.9, this.game.player.cdr || 0); // Cap CDR at 90% for safety
        let cd = base * (1 - cdr);

        // 杩涘寲鍚庡喎鍗寸缉鍑忔瘮鐜囷紙濡0.4=鍐荤粨鏃堕棿60%鍑忓皯锛
        // 杩涘寲鍚庡喎鍗寸缉鍑忔瘮鐜囷紙濡0.4=鍐荤粨鏃堕棿60%鍑忓皯锛
        if (this._evolutionBonuses && this._evolutionBonuses.cooldown) {
            cd *= this._evolutionBonuses.cooldown;
        }

        // 鍐峰嵈琛板噺锛氭椂闂磋“鍑忔﹀櫒鈥斺旈潤姝2绉掑悗鍐插埡
        const _p2 = this.game.player;
        if (_p2.relicFlags && _p2.relicFlags.timeShard && (_p2.stillTime || 0) >= 2) {
            cd /= 3;
        }
        return cd;
    }

    update(dt) {
        this.cooldown -= dt;
        if (this.cooldown <= 0) {
            this.fire();
            this.cooldown = Math.max(0.1, this.interval);
        }

        // 超载衰减：超过1.5秒未攻击时伤害逐渐衰减
        const _p = this.game.player;
        if (_p.overheatMax > 0 && _p.overheatBonus > 0) {
            // 只由第一把武器执行衰减，避免多武器重复衰减
            if (_p.weapons[0] === this && this.game.time - (_p._overheatLastFire || 0) > 1.5) {
                _p.overheatBonus = Math.max(0, _p.overheatBonus - dt * 0.25);
            }
        }

        // 杈愬皠浼ゅ筹細姣忛殧0.3绉抰ick涓娆★紝浣跨敤绌洪棿缃戞牸
        // 杈愬皠棰嗗煙鎸佺画浼ゅ筹紙姣0.3绉抰ick涓娆★紝浣跨敤绌洪棿缃戞牸锛
        // 辐射领域持续伤害（仅限辐射力场武器本身，每0.22秒tick一次，使用空间网格）
        if (this.id === 'radiation_field') {
            this._radTickTimer = (this._radTickTimer || 0) - dt;
            if (this._radTickTimer <= 0) {
                this._radTickTimer = 0.22;
                const p = this.game.player;
                const radius = Math.min((75 + this.level * 8) * p.area * (this.evolved ? 1.35 : 1), 240);
                const radiusSq = radius * radius;
                const dmg = this.damage;
                const nearby = this.game._getNearbyEnemies(p.x, p.y, radius);
                let hitCount = 0;
                for (const e of nearby) {
                    const dx = e.x - p.x;
                    const dy = e.y - p.y;
                    const dSq = dx * dx + dy * dy;
                    if (dSq < radiusSq) {
                        e.takeDamage(dmg, this.id);
                        e.slowed = Math.max(e.slowed || 0, 0.25);
                        e.slowAmount = Math.min(e.slowAmount || 1, 0.75);
                        hitCount++;
                        if (this.evolved && dSq > 4) {
                            const invD = 18 / Math.sqrt(dSq);
                            e.x -= dx * invD;
                            e.y -= dy * invD;
                        }
                    }
                }
                if (this.evolved && hitCount > 0) {
                    p.hp = Math.min(p.maxHp, p.hp + Math.min(3, hitCount * 0.35));
                }
                for (const b of this.game.bosses) {
                    if (!b.active) continue;
                    const dx = b.x - p.x;
                    const dy = b.y - p.y;
                    if (dx * dx + dy * dy < radiusSq) b.takeDamage(dmg * 0.4, this.id);
                }
            }
        }
        // 分身更新（包含环绕斩击与高频投射逻辑）
        for (const c of this._clones) {
            c.timer -= dt;
            c.angle += 2.6 * dt;

            // 分身射击与近身环绕斩击
            const p = this.game.player;
            const cx = p.x + fastCos(c.angle) * c.dist;
            const cy = p.y + fastSin(c.angle) * c.dist;
            const touchR = 36 * (p.area || 1);
            const touchRSq = touchR * touchR;
            c.contactTimer = (c.contactTimer || 0) - dt;
            if (c.contactTimer <= 0) {
                c.contactTimer = 0.3;
                const touchEnemies = this.game._getNearbyEnemies ? this.game._getNearbyEnemies(cx, cy, touchR) : this.game.enemies;
                for (const te of touchEnemies) {
                    if (!te.active) continue;
                    const tdx = te.x - cx, tdy = te.y - cy;
                    if (tdx * tdx + tdy * tdy < touchRSq) {
                        te.takeDamage(c.damage * 0.75, this.id);
                    }
                }
            }
            c.shootTimer -= dt;
            if (c.shootTimer <= 0) {
                c.shootTimer = 0.45;
                // [OPT] 使用空间网格替换 _findNearest 全量遍历
                const cloneRange = 380 * (p.area || 1);
                let nearest = null, minDSq = cloneRange * cloneRange;
                const nearClones = this.game._getNearbyEnemies ? this.game._getNearbyEnemies(cx, cy, cloneRange) : this.game.enemies;
                for (const e of nearClones) {
                    if (!e.active) continue;
                    const edx = e.x - cx, edy = e.y - cy;
                    const dSq = edx * edx + edy * edy;
                    if (dSq < minDSq) { minDSq = dSq; nearest = e; }
                }
                if (nearest) {
                    const a = Math.atan2(nearest.y - cy, nearest.x - cx);
                    this.game.bullets.push(this.game.bulletPool.get().reset(this.game, cx, cy,
                        fastCos(a), fastSin(a), c.damage, {
                        color: this.def.color, speed: 400, radius: 5 * (p.area || 1),
                        pierce: 2 + Math.floor(this.level / 3), homing: 0.6, lifetime: 1.5,
                        element: this.def.element,
                        evolved: this.evolved,
                    }));
                    this.game.bullets[this.game.bullets.length - 1].weaponId = this.id;
                }
            }
        }
        _compact(this._clones, c => c.timer > 0);

        // 鐏姹犳洿鏂帮紙浣跨敤绌洪棿缃戞牸浼樺寲锛:
        for (const fp of this._firePools) {
            fp.timer -= dt;
            fp.tickTimer -= dt;
            if (fp.tickTimer <= 0) {
                fp.tickTimer = 0.3;
                const radiusSq = fp.radius * fp.radius;
                // 浣跨敤绌洪棿缃戞牸鍙煡璇㈤檮杩戞晫浜?
                const nearby = this.game._getNearbyEnemies(fp.x, fp.y, fp.radius);
                for (const e of nearby) {
                    const dx = e.x - fp.x;
                    const dy = e.y - fp.y;
                    if (dx * dx + dy * dy < radiusSq) {
                        e.takeDamage(fp.damage, fp.weaponId || this.id);
                    }
                }
                // 对Boss也能造成伤害
                for (const b of this.game.bosses) {
                    if (!b.active) continue;
                    const dx = b.x - fp.x;
                    const dy = b.y - fp.y;
                    if (dx * dx + dy * dy < radiusSq) {
                        b.takeDamage(fp.damage * 0.3, fp.weaponId || this.id);
                    }
                }
            }
        }
        _compact(this._firePools, fp => fp.timer > 0);

        // 冰晶弹丸更新
        for (const orb of this._orbList) {
            orb.timer -= dt;
            orb.shootTimer -= dt;
            if (orb.shootTimer <= 0) {
                orb.shootTimer = 0.8;
                const shardCount = Math.min(5, 4 + Math.floor(this.level / 2));
                for (let i = 0; i < shardCount; i++) {
                    const a = (i / shardCount) * Math.PI * 2 + (perfNow() / 200);
                    this.game.bullets.push(this.game.bulletPool.get().reset(this.game, orb.x, orb.y,
                        fastCos(a), fastSin(a), orb.damage, {
                        color: this.def.color, speed: 200,
                        radius: 3, pierce: 1, lifetime: 1,
                        element: 'cryo', shape: 'crystal',
                        freezeChance: 0.2, freezeDur: 0.5, slowAmount: 0.7,
                        evolved: this.evolved,
                    }));
                    this.game.bullets[this.game.bullets.length - 1].weaponId = 'frozen_orb';
                }
            }
        }
        _compact(this._orbList, orb => orb.timer > 0);

        // 閰告恫姹犳洿鏂帮紙浣跨敤绌洪棿缃戞牸浼樺寲锛:
        for (const ap of this._acidPools) {
            ap.timer -= dt;
            ap.tickTimer -= dt;
            if (ap.tickTimer <= 0) {
                ap.tickTimer = 0.4;
                const radiusSq = ap.radius * ap.radius;
                // 浣跨敤绌洪棿缃戞牸鍙煡璇㈤檮杩戞晫浜?
                const nearby = this.game._getNearbyEnemies(ap.x, ap.y, ap.radius);
                for (const e of nearby) {
                    const dx = e.x - ap.x;
                    const dy = e.y - ap.y;
                    if (dx * dx + dy * dy < radiusSq) {
                        e.takeDamage(ap.damage, ap.weaponId || this.id);
                        if (ap.isHolyWater) {
                            e.slowed = 0.5; // 搴旂敤鐭殏鐨勯珮棰濆噺閫?瑕嗙洊鏃х姸鎬?
                            e.slowAmount = 0.5;
                        } else {
                            // Apply poison
                            e.poisoned = Math.max(e.poisoned || 0, 2);
                            e.poisonStacks = (e.poisonStacks || 0) + 1;
                        }
                    }
                }
                // 酸液池对Boss也能造成伤害
                for (const b of this.game.bosses) {
                    if (!b.active) continue;
                    const dx = b.x - ap.x;
                    const dy = b.y - ap.y;
                    if (dx * dx + dy * dy < radiusSq) {
                        b.takeDamage(ap.damage * 0.3, ap.weaponId || this.id);
                        if (ap.isHolyWater) {
                            b.slowed = 0.5;
                            b.slowAmount = 0.8; // Boss鍑忛€熸姉鎬?
                        }
                    }
                }
            }
        }
        _compact(this._acidPools, ap => ap.timer > 0);

        // 引力场持续伤害+吸引
        for (const gz of this._gravityZones) {
            gz.timer -= dt;
            gz.tickTimer -= dt;
            if (gz.tickTimer <= 0) {
                gz.tickTimer = 0.3;
                const nearby = this.game._getNearbyEnemies(gz.x, gz.y, gz.radius);
                const radiusSq = gz.radius * gz.radius;
                for (const e of nearby) {
                    if (!e.active) continue;
                    const edx = e.x - gz.x, edy = e.y - gz.y;
                    const dSq = edx * edx + edy * edy;
                    if (dSq < radiusSq) {
                        e.takeDamage(gz.damage, this.id);
                        // 吸引敌人靠近中心
                        if (dSq > 1) {
                            const invD = gz.pullStrength * 0.3 / Math.sqrt(dSq);
                            e.x -= edx * invD;
                            e.y -= edy * invD;
                        }
                    }
                }
            }
            // 到期爆炸
            if (gz.timer <= 0) {
                const nearby = this.game._getNearbyEnemies(gz.x, gz.y, gz.radius * 1.5);
                for (const e of nearby) {
                    if (e.active) e.takeDamage(gz.blastDamage, this.id);
                }
                if (this.game.particles) {
                    this.game.particles.emit(gz.x, gz.y, { count: 8, speed: 80, life: 0.3, color: '#aa44ff', size: 3 });
                }
            }
        }
        _compact(this._gravityZones, gz => gz.timer > 0);

        // 纳米虫群环绕+伤害
        const nanoPlayer = this.game.player;
        for (const bot of this._nanoSwarm) {
            bot.timer -= dt;
            bot.angle += bot.speed * dt;
            bot.x = nanoPlayer.x + fastCos(bot.angle) * bot.dist;
            bot.y = nanoPlayer.y + fastSin(bot.angle) * bot.dist;
            bot.hitTimer -= dt;
            if (bot.hitTimer <= 0) {
                bot.hitTimer = 0.3;
                const nearby = this.game._getNearbyEnemies(bot.x, bot.y, bot.hitRadius);
                for (const e of nearby) {
                    if (e.active) e.takeDamage(bot.damage, this.id);
                }
            }
        }
        _compact(this._nanoSwarm, bot => bot.timer > 0);
    }

    fire() {
        const p = this.game.player;
        const enemies = this.game.enemies;
        SFX.sfxWeaponShoot(this.id);

        // 瓒呰浇琚瑙﹀彂锛氭瘡娉㈡℃敾鍑诲炲姞浼ゅ冲彔鍔狅紙涓婇檺浜庣瓑绾у喅瀹氾級
        if (p.overheatMax > 0 && p.overheatBonus < p.overheatMax) {
            p.overheatBonus = Math.min(p.overheatMax, p.overheatBonus + 0.025);
        }
        p._overheatLastFire = this.game.time;

        // 终极武器发射特效
        if (this.evolved && this.game.particles) {
            this.game.particles.emit(p.x, p.y, {
                count: 10, speed: 200, life: 0.4, color: this.def.color, size: 3
            });
        }

        // 璁板綍鍙戝皠鍓嶅瓙寮规暟閲忥紝鐢ㄤ簬鏍囪 weaponId
        const bulletsBefore = this.game.bullets.length;

        switch (this.def.id) {
            case 'flux_bolt':
                this._fireFluxBolt(p, enemies);
                if (this.evolved) {
                    this.game.shakeAmount = Math.max(this.game.shakeAmount, 1.5);
                    this.game.shakeDuration = 0.15;
                }
                break;
            case 'chain_spark':
                this._fireChainSpark(p, enemies);
                if (this.evolved) {
                    this.game.shakeAmount = Math.max(this.game.shakeAmount, 1.2);
                    this.game.shakeDuration = 0.12;
                }
                break;
            case 'pulse_ring': this._firePulseRing(p); break;
            case 'radiation_field': this._fireRadiationField(p); break;
            case 'soul_drain': this._fireSoulDrain(p, enemies); break;
            case 'shadow_clone': this._fireShadowClone(p); break;
            case 'plasma_arc':
                this._firePlasmaArc(p, enemies);
                break;
            case 'napalm':
                this._fireNapalm(p, enemies);
                this.game.shakeAmount = Math.max(this.game.shakeAmount, this.evolved ? 4 : 2);
                this.game.shakeDuration = this.evolved ? 0.3 : 0.2;
                break;
            case 'rocket_swarm':
                this._fireRocketSwarm(p, enemies);
                this.game.shakeAmount = Math.max(this.game.shakeAmount, this.evolved ? 3 : 1.5);
                this.game.shakeDuration = this.evolved ? 0.25 : 0.15;
                break;
            // Cryo weapons
            case 'ice_shard':
                this._fireIceShard(p, enemies);
                break;
            case 'glacial_nova':
                this._fireGlacialNova(p);
                break;
            case 'frozen_orb':
                this._fireFrozenOrb(p);
                break;
            // Toxic weapons
            case 'toxin_spray':
                this._fireToxinSpray(p, enemies);
                break;
            case 'acid_pool':
                this._fireAcidPool(p, enemies);
                break;
            case 'venom_sting':
                this._fireVenomSting(p, enemies);
                break;
            case 'boomerang':
                this._fireBoomerang(p, enemies);
                break;
            case 'chain_drill':
                this._fireChainDrill(p, enemies);
                break;
            case 'holy_water':
                this._fireHolyWater(p, enemies);
                break;
            case 'phase_blade':
                this._firePhaseBlade(p, enemies);
                this.game.shakeAmount = Math.max(this.game.shakeAmount, this.evolved ? 3 : 1.5);
                this.game.shakeDuration = 0.12;
                break;
            case 'gravity_cannon':
                this._fireGravityCannon(p, enemies);
                break;
            case 'nano_swarm':
                this._fireNanoSwarm(p);
                break;
            // Fusions
            case 'fusion_orbital_cannon':
                this._fireFusionOrbitalCannon(p, enemies);
                break;
            case 'fusion_absolute_zero':
                this._fireFusionAbsoluteZero(p, enemies);
                break;
            case 'fusion_singularity':
                this._fireFusionSingularity(p, enemies);
                break;
            case 'fusion_meat_grinder':
                this._fireFusionMeatGrinder(p, enemies);
                break;
            case 'fusion_cryo_toxic':
                this._fireFusionCryoToxic(p, enemies);
                break;
            case 'fusion_doom_storm':
                this._fireFusionDoomStorm(p, enemies);
                break;
            default: this._fireFluxBolt(p, enemies); break;
        }

        // 閺嶅洩顔囬幍鈧閺堝嬫煀閸掓稑缂撻惃鍕鐡欏鍦娈 weaponId
        for (let i = bulletsBefore; i < this.game.bullets.length; i++) {
            this.game.bullets[i].weaponId = this.id;
        }

        // 鍐峰嵈琛板噺锛氬洖澹拌姱鐗団斺20% 姒傜巼鍙屽嚮锛堥槻姝㈤掑綊锛
        if (!this._isEcho && p.relicFlags && p.relicFlags.echoChip && Math.random() < 0.2) {
            this._isEcho = true;
            this.fire();
            this._isEcho = false;
        }
    }

    _findNearest(p, enemies, maxRange) {
        let nearest = null, minDSq = Infinity;
        const maxRangeSq = maxRange * maxRange;
        for (const e of enemies) {
            if (!e.active) continue;
            const dx = e.x - p.x;
            const dy = e.y - p.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < minDSq && dSq <= maxRangeSq) { minDSq = dSq; nearest = e; }
        }
        for (const b of this.game.bosses) {
            if (!b.active) continue;
            const dx = b.x - p.x;
            const dy = b.y - p.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < minDSq && dSq <= maxRangeSq) { minDSq = dSq; nearest = b; }
        }
        return { nearest, dist: nearest ? Math.sqrt(minDSq) : 0 };
    }

    _findWeakest(p, enemies, maxRange) {
        let weakest = null, minHp = Infinity;
        const maxRangeSq = maxRange * maxRange;
        for (const e of enemies) {
            if (!e.active) continue;
            const dx = e.x - p.x;
            const dy = e.y - p.y;
            if (dx * dx + dy * dy <= maxRangeSq && e.hp < minHp) {
                minHp = e.hp;
                weakest = e;
            }
        }
        return weakest;
    }

    _getAimAngle(p, enemies, range) {
        const { nearest } = this._findNearest(p, enemies, range);
        if (nearest) return Math.atan2(nearest.y - p.y, nearest.x - p.x);
        const v = this.game.input.getVector();
        return (v.x !== 0 || v.y !== 0) ? Math.atan2(v.y, v.x) : 0;
    }

    // 鈼忊棌 鑳介噺鍖呯粍鍚堟晥鏋
    _fireFusionOrbitalCannon(p, enemies) {
        // 閸︺劌婧娑撳﹥娓舵潻鎴犳畱閺佸奔姹夋担宥囩枂閿涘本鍨ㄩ悳鈺侇啀闂堛垹澧犳稉鈧濞堜絻绐涚粋浼欑礉閽鎴掔瑓鏉炪劑浜鹃悙?
        let targetX = p.x, targetY = p.y;
        const { nearest } = this._findNearest(p, enemies, 1000);
        if (nearest) {
            targetX = nearest.x; targetY = nearest.y;
        } else {
            const angle = this._getAimAngle(p, enemies, 1000);
            targetX += fastCos(angle) * 300;
            targetY += fastSin(angle) * 300;
        }

        const dmg = this.damage;
        const radius = 160 * (p.area || 1);
        const radiusSq = radius * radius;

        // 造成范围伤害
        const nearbyOC = this.game._getNearbyEnemies(targetX, targetY, radius);
        for (const en of nearbyOC) {
            if (!en.active) continue;
            const dx = en.x - targetX, dy = en.y - targetY;
            if (dx * dx + dy * dy < radiusSq) {
                en.takeDamage(dmg);
                en.burning = 5;
                en.burnDamage = dmg * 0.1;
                if (this.game.particles) this.game.particles.emit(en.x, en.y, { count: 3, speed: 200, life: 0.3, color: '#ffcc00', size: 4 });
            }
        }

        // 固定伤害
        for (const boss of this.game.bosses) {
            if (!boss.active) continue;
            const dx = boss.x - targetX, dy = boss.y - targetY;
            if (dx * dx + dy * dy < radiusSq * 2.25) { // Boss hit box can be larger
                boss.takeDamage(dmg);
                boss.burning = 5;
                boss.burnDamage = dmg * 0.1;
            }
        }

        this.game.spawnDamageNumber(targetX, targetY - 100, '鈽勶笍 澶╃綒杞ㄩ亾鐐?', '#ffdd00', true);

        // 剧烈屏幕物理特效
        this.game.shakeAmount = 25;
        this.game.shakeDuration = 0.8;
        if (this.game.triggerScreenPulse) this.game.triggerScreenPulse('#ffaa00bb', 0.6);

        // 瀹搞劌鐎峰┑鈧閸忓屽掗弫鍫㈡殌閸?bullet pool 娴ｆ粈璐熺憴鍡氼潕閸忓啰绀
        this.game.bullets.push(this.game.bulletPool.get().reset(this.game, targetX, targetY,
            0, 0, 0, {
            color: '#ffcc00', speed: 0,
            radius: radius, pierce: 9999, homing: 0,
            lifetime: 1.0, element: 'plasma', shape: 'orbital_beam',
            evolved: true,
        }));
    }

    _fireFusionAbsoluteZero(p, enemies) {
        const dmg = this.damage;
        const radius = 280 * (p.area || 1);
        const radiusSq = radius * radius;

        const nearbyAZ = this.game._getNearbyEnemies(p.x, p.y, radius);
        for (const en of nearbyAZ) {
            if (!en.active) continue;
            const dx = en.x - p.x, dy = en.y - p.y;
            if (dx * dx + dy * dy < radiusSq) {
                en.takeDamage(dmg);
                en.frozen = 6; // 瓒呴暱纭帶
                en.poisoned = 6;
                en.poisonStacks = (en.poisonStacks || 0) + 10;
            }
        }
        for (const boss of this.game.bosses) {
            if (!boss.active) continue;
            const dx = boss.x - p.x, dy = boss.y - p.y;
            if (dx * dx + dy * dy < radiusSq) {
                boss.takeDamage(dmg * 0.5); // Boss也受高伤
                boss.slowed = 6;
                boss.slowAmount = 0.7; // Boss涔熶細琚弗閲嶅噺閫?
                boss.poisoned = 6;
                boss.poisonStacks = (boss.poisonStacks || 0) + 5;
            }
        }

        this.game.spawnDamageNumber(p.x, p.y - 100, '鉂勶笍 缁濆闆跺害娉ユ布!', '#66ffff', true);
        if (this.game.triggerScreenPulse) this.game.triggerScreenPulse('#66ffff77', 0.8);
        this.game.shakeAmount = 10;
        this.game.shakeDuration = 0.5;

        if (this.game.particles) {
            for (let i = 0; i < 30; i++) {
                const a = Math.random() * Math.PI * 2;
                const dist = Math.random() * radius;
                this.game.particles.emit(p.x + fastCos(a) * dist, p.y + fastSin(a) * dist, { count: 3, speed: 50, life: 1.5, color: '#66ffff', size: 5 });
            }
        }

        // 瑙嗚棰嗗煙娈嬬暀
        this.game.bullets.push(this.game.bulletPool.get().reset(this.game, p.x, p.y,
            0, 0, 0, {
            color: '#66ffcc', speed: 0,
            radius: radius, pierce: 9999, homing: 0,
            lifetime: 3.0, element: 'cryo', shape: 'zero_domain',
            evolved: true,
        }));
    }

    _fireFusionSingularity(p, enemies) {
        // 閸欐垵鐨犳稉鈧娑擃亞绱﹂幈銏⑿╅崝銊ф畱姒涙垶绀
        const angle = this._getAimAngle(p, enemies, 1200);
        const dmg = this.damage;

        this.game.bullets.push(this.game.bulletPool.get().reset(this.game, p.x, p.y,
            fastCos(angle), fastSin(angle), dmg, {
            color: '#aa44ff', speed: 120 * p.projSpeed,
            radius: 65 * (p.area || 1), pierce: 9999, homing: 0.15,
            lifetime: 6.0, element: 'void', shape: 'singularity',
            evolved: true,
        }));

        this.game.spawnDamageNumber(p.x, p.y - 80, '馃寑 铏氱┖濂囩偣鏋?', '#aa44ff', true);
        if (this.game.triggerScreenPulse) this.game.triggerScreenPulse('#330066aa', 0.4);
        this.game.shakeAmount = 8;
        this.game.shakeDuration = 0.4;
    }

    // 鈹鈹鈹 缁炶倝鏃嬮庯紙閾鹃敮+鐩镐綅鍒冭瀺鍚堬級鈹鈹鈹
    _fireFusionMeatGrinder(p, enemies) {
        const dmg = this.damage;
        const radius = 145 * (p.area || 1);
        const radiusSq = radius * radius;
        const nearby = this.game._getNearbyEnemies(p.x, p.y, radius);
        for (const e of nearby) {
            if (!e.active) continue;
            const dx = e.x - p.x, dy = e.y - p.y;
            if (dx * dx + dy * dy < radiusSq) {
                e.takeDamage(dmg, this.id);
                e.applyKnockback((e.x - p.x) * 2, (e.y - p.y) * 2);
            }
        }
        for (const b of this.game.bosses) {
            if (!b.active) continue;
            const dx = b.x - p.x, dy = b.y - p.y;
            if (dx * dx + dy * dy < radiusSq * 1.5) {
                b.takeDamage(dmg * 0.8, this.id);
            }
        }
        if (this.game.particles && Math.random() < 0.3) {
            this.game.particles.emit(p.x, p.y, { count: 2, speed: 60, life: 0.15, color: '#ff2288', size: 3 });
        }
    }

    // 鈹鈹鈹 鍐版瘨棰嗗煙锛堝啺鏅+姣掗浘铻嶅悎锛夆攢鈹鈹
    _fireFusionCryoToxic(p, enemies) {
        const dmg = this.damage;
        const radius = 220 * (p.area || 1);
        const radiusSq = radius * radius;
        const nearby = this.game._getNearbyEnemies(p.x, p.y, radius);
        for (const e of nearby) {
            if (!e.active) continue;
            const dx = e.x - p.x, dy = e.y - p.y;
            if (dx * dx + dy * dy < radiusSq) {
                e.takeDamage(dmg, this.id);
                e.frozen = 3;
                e.poisoned = 5;
                e.poisonStacks = (e.poisonStacks || 0) + 8;
            }
        }
        for (const b of this.game.bosses) {
            if (!b.active) continue;
            const dx = b.x - p.x, dy = b.y - p.y;
            if (dx * dx + dy * dy < radiusSq) {
                b.takeDamage(dmg * 0.5, this.id);
                b.slowed = 4;
                b.slowAmount = 0.6;
            }
        }
        if (this.game.triggerScreenPulse) this.game.triggerScreenPulse('#44ffaa44', 0.3);
        if (this.game.particles) {
            for (let i = 0; i < 8; i++) {
                const a = Math.random() * Math.PI * 2;
                const dist = Math.random() * radius;
                this.game.particles.emit(p.x + fastCos(a) * dist, p.y + fastSin(a) * dist,
                    { count: 2, speed: 30, life: 1.0, color: i % 2 === 0 ? '#66ffff' : '#88ff00', size: 4 });
            }
        }
    }

    // 鈹鈹鈹 鏈鏃ラ庢毚锛堝洖鏃嬮晼+鐏绠铚傜兢铻嶅悎锛夆攢鈹鈹
    _fireFusionDoomStorm(p, enemies) {
        const dmg = this.damage;
        const count = 8;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            this.game.bullets.push(this.game.bulletPool.get().reset(this.game, p.x, p.y,
                fastCos(angle), fastSin(angle), dmg, {
                color: '#ff8800', speed: 250 * p.projSpeed,
                radius: 18 * (p.area || 1), pierce: 5, homing: 0.3,
                lifetime: 3.0, element: 'plasma', shape: 'boomerang',
                evolved: true, returning: true,
            }));
        }
        this.game.spawnDamageNumber(p.x, p.y - 80, '末日风暴!', '#ff8800', true);
        if (this.game.triggerScreenPulse) this.game.triggerScreenPulse('#ff880066', 0.4);
        this.game.shakeAmount = 6;
        this.game.shakeDuration = 0.3;
    }

    // 鈼忊棌 婵鍏
    _fireFluxBolt(p, enemies) {
        const baseAngle = this._getAimAngle(p, enemies, 800);
        const count = 2 + Math.floor(this.level / 2) + p.bonusProjectile + (this.evolved ? 3 : 0);
        const pierce = this.evolved ? 10 : (1 + Math.floor(this.level / 2));
        const areaMult = Math.min(1.6, p.area || 1);
        for (let i = 0; i < count; i++) {
            const a = baseAngle + (i - (count - 1) / 2) * 0.14;
            this.game.bullets.push(this.game.bulletPool.get().reset(this.game, p.x, p.y,
                fastCos(a), fastSin(a), this.damage * 1.15, {
                color: this.def.color, speed: 440 * p.projSpeed,
                radius: (5 + this.level * 0.5) * areaMult, pierce, homing: 0.6,
                lifetime: 1.5,
                element: this.def.element, shape: this.def.shape,
                evolved: this.evolved,
            }));
        }
        if (this.game.particles && this.game.qualityLevel > 0) {
            this.game.particles.emit(p.x, p.y, { count: 2, speed: 100, life: 0.2, color: this.def.color, size: 2 });
        }
    }

    // 鈼忊棌 鏍哥儹寮
    _fireChainSpark(p, enemies) {
        const baseAngle = this._getAimAngle(p, enemies, 800);
        const count = 2 + Math.floor(this.level / 2) + p.bonusProjectile;
        const areaMult = Math.min(1.6, p.area || 1);
        for (let i = 0; i < count; i++) {
            const a = baseAngle + (i - (count - 1) / 2) * 0.2;
            this.game.bullets.push(this.game.bulletPool.get().reset(this.game, p.x, p.y,
                fastCos(a), fastSin(a), this.damage, {
                color: this.def.color, speed: 420 * p.projSpeed,
                radius: (6 + this.level * 0.4) * areaMult, pierce: 2 + this.level,
                homing: 0.75, lifetime: 2, element: this.def.element,
                shape: this.def.shape,
                evolved: this.evolved,
            }));
        }
        if (this.game.particles && this.game.qualityLevel > 0) {
            this.game.particles.emit(p.x, p.y, { count: 5, speed: 150, life: 0.2, color: '#fff', size: 2 });
        }
    }

    // ●● 波动
    _firePulseRing(p) {
        const areaMult = Math.min(1.8, p.area || 1);
        const count = Math.min(16, 8 + this.level * 2);
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2;
            this.game.bullets.push(this.game.bulletPool.get().reset(this.game, p.x, p.y,
                fastCos(a), fastSin(a), this.damage * 0.75, {
                color: this.def.color, speed: 320, radius: (5 + this.level * 0.6) * areaMult,
                pierce: 3, lifetime: (0.65 + this.level * 0.06) * areaMult, homing: 0,
                element: this.def.element, shape: 'circle',
                evolved: this.evolved,
            }));
        }
    }

    _fireRadiationField(p) {
        const radius = Math.min((75 + this.level * 8) * p.area * (this.evolved ? 1.35 : 1), 240);
        this.game.radiationPulse = {
            x: p.x, y: p.y, r: radius, a: 0.6, color: this.def.color,
        };
    }

    _fireSoulDrain(p, enemies) {
        const maxRange = (280 + this.level * 24) * (p.area || 1);
        const maxRangeSq = maxRange * maxRange;
        const splashR = 56 * (p.area || 1);
        const splashRSq = splashR * splashR;
        const targetCount = (this.evolved ? 5 : 2 + Math.floor(this.level / 2)) + p.bonusProjectile;
        const candidates = [];
        for (const e of enemies) {
            if (!e.active) continue;
            const dx = e.x - p.x;
            const dy = e.y - p.y;
            const dSq = dx * dx + dy * dy;
            if (dSq <= maxRangeSq) candidates.push({ e, dSq });
        }
        for (const b of this.game.bosses) {
            if (!b.active) continue;
            const dx = b.x - p.x;
            const dy = b.y - p.y;
            const dSq = dx * dx + dy * dy;
            if (dSq <= maxRangeSq) candidates.push({ e: b, dSq });
        }
        if (candidates.length === 0) return;
        candidates.sort((a, b) => (a.e.hp - b.e.hp) || (a.dSq - b.dSq));
        const dmg = this.damage;
        const count = Math.min(targetCount, candidates.length);
        let totalHeal = 0;
        for (let i = 0; i < count; i++) {
            const target = candidates[i].e;
            target.takeDamage(dmg, this.id);
            totalHeal += Math.min(dmg * (this.evolved ? 0.14 : 0.1), 2.5 + this.level * 0.4);
            // 灵魂溅射：对目标周围紧邻怪群造成50%溅射伤害（受p.area加成）
            const splash = this.game._getNearbyEnemies ? this.game._getNearbyEnemies(target.x, target.y, splashR) : [];
            for (const se of splash) {
                if (!se.active || se === target) continue;
                const sdx = se.x - target.x, sdy = se.y - target.y;
                if (sdx * sdx + sdy * sdy < splashRSq) {
                    se.takeDamage(dmg * 0.5, this.id);
                }
            }
        }
        p.hp = Math.min(p.maxHp, p.hp + Math.min(6 + this.level, totalHeal));
        const primary = candidates[0].e;
        this.game.drainLine = { x1: p.x, y1: p.y, x2: primary.x, y2: primary.y, a: 0.5, color: this.def.color };
    }

    _fireShadowClone(p) {
        const count = (this.evolved ? 3 : 2) + Math.floor(this.level / 2);
        while (this._clones.length + count > 6 && this._clones.length > 0) {
            this._clones.shift();
        }
        for (let i = 0; i < count; i++) {
            this._clones.push({
                angle: (i / count) * Math.PI * 2,
                dist: (62 + this.level * 6) * Math.min(1.5, p.area || 1),
                timer: 5 + this.level,
                damage: this.damage * 0.85,
                shootTimer: 0.25 + (i * 0.08),
                contactTimer: 0.1,
            });
        }
    }

    // 鈼忊棌 璺濈荤矑瀛
    _firePlasmaArc(p, enemies) {
        const baseAngle = this._getAimAngle(p, enemies, 600);
        const count = 2 + Math.floor(this.level / 2) + p.bonusProjectile;
        const areaMult = Math.min(1.6, p.area || 1);
        for (let i = 0; i < count; i++) {
            const a = baseAngle + (i - (count - 1) / 2) * 0.28;
            this.game.bullets.push(this.game.bulletPool.get().reset(this.game, p.x, p.y,
                fastCos(a), fastSin(a), this.damage, {
                color: this.def.color, speed: 340 * p.projSpeed,
                radius: (13 + this.level * 1.5) * areaMult, pierce: 4 + this.level,
                lifetime: 2, homing: 0.45, element: this.def.element,
                shape: this.def.shape,
                evolved: this.evolved,
            }));
        }
        if (this.game.particles) {
            this.game.particles.emit(p.x, p.y, { count: 5, speed: 120, life: 0.3, color: this.def.color, size: 3 });
        }
        this.game.shakeAmount = Math.max(this.game.shakeAmount, 3);
        this.game.shakeDuration = 0.2;
    }

    // 鈼忊棌 鍐板浐瀹氭姢鐢
    _fireNapalm(p, enemies) {
        const { nearest } = this._findNearest(p, enemies, 500);
        let tx, ty;
        if (nearest) {
            tx = nearest.x; ty = nearest.y;
        } else {
            const v = this.game.input.getVector();
            const dist = 120;
            if (v.x !== 0 || v.y !== 0) {
                tx = p.x + v.x * dist; ty = p.y + v.y * dist;
            } else {
                // 无输入时用玩家面朝方向
                const fa = p.facingAngle || 0;
                tx = p.x + Math.cos(fa) * dist;
                ty = p.y + Math.sin(fa) * dist;
            }
        }
        // 火球 - 增强伤害和持续时间?
        this._firePools.push({
            x: tx, y: ty,
            radius: Math.min((46 + this.level * 6) * p.area * (this.evolved ? 1.6 : 1), 175),
            damage: this.damage * 0.5, // 提高伤害比例
            timer: 4 + this.level * 0.8, // 更长持续时间
            tickTimer: 0.1, // 立即造成第一段伤害
            color: this.def.color,
        });
        // 瑙嗚鍙嶉
        if (this.game.particles) {
            this.game.particles.emit(tx, ty, { count: 15, speed: 100, life: 0.5, color: '#ff4400', size: 4 });
        }
    }

    // 鈼忊棌 鐏鐞冭拷韪
    _fireRocketSwarm(p, enemies) {
        const count = 2 + Math.floor(this.level / 2) + p.bonusProjectile;
        const areaMult = Math.min(1.6, p.area || 1);
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            this.game.bullets.push(this.game.bulletPool.get().reset(this.game, p.x, p.y,
                fastCos(a), fastSin(a), this.damage, {
                color: this.def.color, speed: 220 * p.projSpeed,
                radius: (6 + this.level * 0.4) * areaMult, pierce: 0,
                homing: 0.9, lifetime: 2.2, element: this.def.element,
                shape: this.def.shape,
                evolved: this.evolved,
            }));
        }
    }

    // 鈺愨晲鈺 Cryo Weapons 鈺愨晲鈺

    // 鈼忊棌 鍐版櫠纰庣墖 锛燂紵锛
    _fireIceShard(p, enemies) {
        const baseAngle = this._getAimAngle(p, enemies, 600);
        const count = 3 + Math.floor(this.level / 2) + p.bonusProjectile;
        const freezeDur = 0.5 + p.bonusFreezeDur;
        const areaMult = Math.min(1.6, p.area || 1);

        for (let i = 0; i < count; i++) {
            const a = baseAngle + (i - (count - 1) / 2) * 0.2;
            const b = this.game.bulletPool.get().reset(this.game, p.x, p.y,
                fastCos(a), fastSin(a), this.damage, {
                color: this.def.color, speed: 460 * p.projSpeed,
                radius: (7 + this.level * 0.5) * areaMult, pierce: 2 + Math.floor(this.level / 2),
                lifetime: 2, homing: 0.55, element: this.def.element,
                shape: this.def.shape,
                freezeChance: 0.45, freezeDur: freezeDur, slowAmount: 0.6,
                evolved: this.evolved,
            });
            this.game.bullets.push(b);
        }
        if (this.game.particles) {
            this.game.particles.emit(p.x, p.y, { count: 5, speed: 80, life: 0.3, color: this.def.color, size: 3 });
        }
    }

    // 鈼忊棌 鍐扮悆鏂版槦 锛燂紵锛
    _fireGlacialNova(p) {
        const radius = Math.min((85 + this.level * 10) * p.area * (this.evolved ? 1.35 : 1), 230);
        const radiusSq = radius * radius;
        const freezeDur = 1.0 + p.bonusFreezeDur * 2;

        // Freeze enemies in range (使用空间网格优化)
        const nearbyNova = this.game._getNearbyEnemies(p.x, p.y, radius);
        for (const e of nearbyNova) {
            if (!e.active) continue;
            const dx = e.x - p.x;
            const dy = e.y - p.y;
            if (dx * dx + dy * dy < radiusSq) {
                e.takeDamage(this.damage, this.id);
                e.frozen = freezeDur;
            }
        }
        for (const b of this.game.bosses) {
            if (!b.active) continue;
            const dx = b.x - p.x;
            const dy = b.y - p.y;
            if (dx * dx + dy * dy < radiusSq) {
                b.takeDamage(this.damage * 0.5, this.id);
            }
        }

        // Visual
        if (this.game.particles) {
            this.game.particles.emit(p.x, p.y, { count: 30, speed: 200, life: 0.5, color: this.def.color, size: 4 });
        }
        this.game.radiationPulse = { x: p.x, y: p.y, r: radius, a: 0.8, color: this.def.color };
    }

    // ●● 冰晶弹丸 
    _fireFrozenOrb(p) {
        const { nearest } = this._findNearest(p, this.game.enemies, 400);
        let targetX = p.x, targetY = p.y;
        if (nearest) {
            targetX = nearest.x;
            targetY = nearest.y;
        }

        // Create orb that fires ice shards
        const orb = {
            x: targetX, y: targetY,
            timer: 3 + this.level * 0.3,
            shootTimer: 0,
            damage: this.damage,
            radius: (18 + this.level * 2.5) * Math.min(1.6, p.area || 1),
        };
        this._orbList = this._orbList || [];
        this._orbList.push(orb);
    }

    // 鈺愨晲鈺 Toxic Weapons 鈺愨晲鈺

    // ●● 毒雾弥漫
    _fireToxinSpray(p, enemies) {
        const baseAngle = this._getAimAngle(p, enemies, 420);
        const count = 4 + Math.floor(this.level / 2) + p.bonusProjectile;
        const toxicMult = 1 + p.bonusToxicDmg;
        const areaMult = Math.min(1.6, p.area || 1);

        for (let i = 0; i < count; i++) {
            const a = baseAngle + (i - (count - 1) / 2) * 0.28;
            const b = this.game.bulletPool.get().reset(this.game, p.x, p.y,
                fastCos(a), fastSin(a), this.damage * toxicMult, {
                color: this.def.color, speed: 290 * p.projSpeed,
                radius: (10 + this.level * 0.8) * areaMult, pierce: 2 + this.level,
                lifetime: 0.9 * Math.min(1.4, p.area || 1), homing: 0.2, element: this.def.element,
                shape: this.def.shape,
                poisonChance: 1.0, poisonDmg: 2 + this.level, poisonStacks: 1,
                evolved: this.evolved,
            });
            this.game.bullets.push(b);
        }
        if (this.game.particles) {
            this.game.particles.emit(p.x, p.y, { count: 8, speed: 60, life: 0.4, color: this.def.color, size: 4 });
        }
    }

    // 鈼忊棌 閰告恫姹 
    _fireAcidPool(p, enemies) {
        const { nearest } = this._findNearest(p, enemies, 400);
        let tx = p.x, ty = p.y;
        if (nearest) { tx = nearest.x; ty = nearest.y; }

        const toxicMult = 1 + p.bonusToxicDmg;
        this._acidPools = this._acidPools || [];
        this._acidPools.push({
            x: tx, y: ty,
            radius: Math.min((46 + this.level * 6) * p.area * (this.evolved ? 1.5 : 1), 165),
            damage: this.damage * 0.4 * toxicMult,
            timer: 4 + this.level * 0.5,
            tickTimer: 0,
            color: this.def.color,
        });
    }

    // ●● 反弹
    _fireBoomerang(p, enemies) {
        const baseAngle = this._getAimAngle(p, enemies, 500);
        // 每级增加数量
        const count = 1 + Math.floor(this.level / 2) + p.bonusProjectile;
        const areaMult = Math.min(1.6, p.area || 1);

        for (let i = 0; i < count; i++) {
            const a = baseAngle + (i - (count - 1) / 2) * 0.4;
            const b = this.game.bulletPool.get().reset(this.game, p.x, p.y,
                fastCos(a), fastSin(a), this.damage, {
                color: this.def.color,
                speed: 400 * p.projSpeed,  // 出手速度
                radius: (13 + this.level * 1.5) * areaMult,
                pierce: 9999,
                lifetime: 2.5, // 存活时间
                element: this.def.element,
                shape: this.def.shape,
                evolved: this.evolved,
            });
            // 閺嶅洩顔囨稉鍝勬礀閺冨鏅奸敍灞界敨閺堝屽掑▓濠呯箲閸ョ偤鈧鏄忕帆
            b.isBoomerang = true;
            b.returnTimer = 0.8 + p.projSpeed * 0.2; // 椋炶澶氫箙鍚庡紑濮嬭繑鍥?
            b.initialTimer = 0;
            this.game.bullets.push(b);
        }
    }

    // 閳光偓閳光偓 闁鹃箖鏁 (閸ュ搫鐣鹃崷銊у负鐎硅泛澧犻弬鍦娈戞傛﹢顣舵潻鎴炲灛) 閳光偓閳光偓
    _fireChainDrill(p, enemies) {
        // 閻㈠彉绨閺勵垶鐝妫版垶瀵旂紒顓燁劅閸ｎ煉绱濋幋鎴滄粦閸欘亣绀嬬拹锝呮躬閸撳秵鏌熼悽鐔稿灇濞屸剝婀佺粔濠氣偓鐔烘畱hitbox閿涘苯鐡ㄥú缁樻傞梻瀛樼閻?
        // 鐎瑰啩绱扮捄鐔兼㈤惈鈧閻溾晛顔嶈ぐ鎾冲犻惃鍕娼伴張婵囨煙閸?
        // [BUG FIX] 娑撳秷鍏橀惄瀛樺复娣囶喗鏁 input.getVector() 閻ㄥ嫯绻戦崶鐐差嚠鐠炩槄绱濋崥锕鍨娴兼碍钖勯弻鎾跺负鐎瑰墎些閸?
        const inputV = this.game.input.getVector();
        let vx = inputV.x, vy = inputV.y;
        if (vx === 0 && vy === 0) {
            // 濞屸剝婀佹潏鎾冲弳閺冨墎鏁ら悳鈺侇啀闂堛垺婀炵憴鎺戝
            vx = Math.cos(p.facingAngle || 0);
            vy = Math.sin(p.facingAngle || 0);
        } else {
            // 褰掍竴鍖?
            const len = Math.sqrt(vx * vx + vy * vy);
            vx /= len; vy /= len;
        }

        const dist = (42 + this.level * 4) * (p.area || 1); // 链锯伸出的长度（随范围加成扩大）
        const cx = p.x + vx * dist;
        const cy = p.y + vy * dist;

        const b = this.game.bulletPool.get().reset(this.game, cx, cy,
            0, 0, this.damage, { // vx=0, vy=0
            color: this.def.color,
            speed: 0,
            radius: (34 + this.level * 5) * (p.area || 1),
            pierce: 9999,
            lifetime: 0.15,
            element: this.def.element,
            shape: this.def.shape,
            evolved: this.evolved,
        });

        // 我们需要子弹每一个弹幕都能跟随玩家更新位置，这需要在 bullet 里加这个逻辑
        b.isAttachedToPlayer = true;
        b.attachOffsetX = vx * dist;
        b.attachOffsetY = vy * dist;

        this.game.bullets.push(b);

        // 閻㈢敻鏁閸ｎ亪鐓舵稉宥夆偓鍌氭値濮ｅ繋绔撮崣鎴﹀厴閹绢叏绱濇径顏勬儢娴滃棎鈧?
    }

    // ●● 冰冻地带
    _fireVenomSting(p, enemies) {
        const baseAngle = this._getAimAngle(p, enemies, 500);
        const count = 2 + Math.floor(this.level / 3) + p.bonusProjectile;
        const toxicMult = 1 + p.bonusToxicDmg;
        const stacks = 1 + Math.floor(this.level / 2);
        const areaMult = Math.min(1.6, p.area || 1);

        for (let i = 0; i < count; i++) {
            const a = baseAngle + (i - (count - 1) / 2) * 0.15;
            const b = this.game.bulletPool.get().reset(this.game, p.x, p.y,
                fastCos(a), fastSin(a), this.damage * toxicMult, {
                color: this.def.color, speed: 500 * p.projSpeed,
                radius: (5.5 + this.level * 0.4) * areaMult, pierce: 1 + Math.floor(this.level / 3),
                lifetime: 1.5, homing: 0.45, element: this.def.element,
                shape: this.def.shape,
                poisonChance: 1.0, poisonDmg: 3 + this.level * 2, poisonStacks: stacks,
                evolved: this.evolved,
            });
            this.game.bullets.push(b);
        }
    }

    // 鈼忊棌 鍦ｆ按姹
    _fireHolyWater(p, enemies) {
        // 鐎规矮缍呴敍姘顩ч弸婊堟鏉╂垶婀侀幀顏庣礉閹垫柨鐣犳径缈犵瑐閿涙稑顩ч弸婊勭梾閺堝涚礉闂呭繑婧閹垫梻甯虹瑰爼妾鏉?
        const { nearest } = this._findNearest(p, enemies, 400);
        let rx, ry;
        if (nearest && Math.random() < 0.7) {
            rx = nearest.x + (Math.random() - 0.5) * 50;
            ry = nearest.y + (Math.random() - 0.5) * 50;
        } else {
            const angle = Math.random() * Math.PI * 2;
            const targetDist = 150 + Math.random() * 200;
            rx = p.x + fastCos(angle) * targetDist;
            ry = p.y + fastSin(angle) * targetDist;
        }

        // 鎴戜滑閲嶇敤 Toxic 鐨刜acidPools 杩涜岃拷鍑讳激瀹筹紙瀹為檯涓婂氨鏄涓涓鍧戯級
        this._acidPools = this._acidPools || [];
        this._acidPools.push({
            x: rx, y: ry,
            radius: Math.min((52 + this.level * 7) * p.area * (this.evolved ? 1.5 : 1), 180),
            damage: this.damage,
            timer: 3.5 + this.level * 0.5, // 存在时间
            tickTimer: 0,
            color: this.def.color, // 蓝色或白色圈
            isHolyWater: true,
        });

        if (this.game.particles) {
            this.game.particles.emit(rx, ry, { count: 12, speed: 120, life: 0.5, color: '#aaddff', size: 3 });
        }
    }

    // ●● 相位刃
    _firePhaseBlade(p, enemies) {
        const aimAngle = this._getAimAngle(p, enemies, 340);
        const arcHalf = Math.PI * 0.3; // ±54° = 108° 宽幅顺劈
        const range = Math.min((105 + this.level * 12) * p.area * (this.evolved ? 1.3 : 1), 280);
        const rangeSq = range * range;
        const dmg = this.damage;
        let hits = 0;
        const nearbyBlade = this.game._getNearbyEnemies(p.x, p.y, range);
        for (const e of nearbyBlade) {
            if (!e.active) continue;
            const dx = e.x - p.x, dy = e.y - p.y;
            if (dx * dx + dy * dy > rangeSq) continue;
            let diff = Math.atan2(dy, dx) - aimAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            if (Math.abs(diff) <= arcHalf) { e.takeDamage(dmg, 'phase_blade'); hits++; }
        }
        for (const b of this.game.bosses) {
            if (!b.active) continue;
            const dx = b.x - p.x, dy = b.y - p.y;
            if (dx * dx + dy * dy > rangeSq) continue;
            let diff = Math.atan2(dy, dx) - aimAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            if (Math.abs(diff) <= arcHalf) { b.takeDamage(dmg * (this.evolved ? 0.5 : 0.25), 'phase_blade'); hits++; }
        }
        if (this.game.particles) {
            this.game.particles.emit(
                p.x + fastCos(aimAngle) * range * 0.5,
                p.y + fastSin(aimAngle) * range * 0.5,
                { count: 10 + hits * 2, speed: 130, life: 0.3, color: '#aa44ff', size: 4 }
            );
        }
    }

    // ●● 引力炮
    _fireGravityCannon(p, enemies) {
        const { nearest } = this._findNearest(p, enemies, 500);
        let tx, ty;
        if (nearest) { tx = nearest.x; ty = nearest.y; }
        else {
            const a = this._getAimAngle(p, enemies, 500);
            tx = p.x + fastCos(a) * 300;
            ty = p.y + fastSin(a) * 300;
        }
        this._gravityZones.push({
            x: tx, y: ty,
            radius: Math.min((52 + this.level * 7) * p.area * (this.evolved ? 1.4 : 1), 175),
            pullStrength: 85 + this.level * 12,
            damage: this.damage * 0.2,
            blastDamage: this.damage * (this.evolved ? 2.5 : 1.5),
            timer: 2.0 + this.level * 0.1,
            tickTimer: 0,
        });
        if (this.game.particles) {
            this.game.particles.emit(tx, ty, { count: 15, speed: 100, life: 0.5, color: '#ff9900', size: 4 });
        }
    }

    // ●● 纳米虫群
    _fireNanoSwarm(p) {
        const botCount = 2 + Math.floor(this.level / 2);
        const areaMult = Math.min(1.6, p.area || 1);
        const dist = (68 + this.level * 6) * areaMult;
        const hitR = Math.round((22 + this.level * 2) * areaMult);
        if (this._nanoSwarm.length >= botCount) {
            // 刷新计时器与动态范围
            for (const bot of this._nanoSwarm) {
                bot.timer = 1.0;
                bot.dist = dist;
                bot.hitRadius = hitR;
            }
            return;
        }
        const toxicMult = 1 + (p.bonusToxicDmg || 0);
        this._nanoSwarm = [];
        for (let i = 0; i < botCount; i++) {
            this._nanoSwarm.push({
                angle: (i / botCount) * Math.PI * 2,
                dist,
                speed: 3.0,
                x: p.x, y: p.y,
                damage: this.damage * toxicMult,
                hitRadius: hitR,
                hitTimer: 0,
                timer: 1.0,
            });
        }
    }

        // 鍒嗚韩鍜岀伀鐞冪殑浼ゅ虫瘮锛堝湪 Game.js 涓璋冪敤绛夌骇鍐冲畾锛
    drawEffects(ctx) {
        const p = this.game.player;
        if (!p) return;

        // 影分身绘制
                // 褰卞垎韬?
        for (const c of this._clones) {
            const cx = p.x + fastCos(c.angle) * c.dist;
            const cy = p.y + fastSin(c.angle) * c.dist;

            // [NEW] Pulsing Energy Aura
            const pTime = perfNow() / 150;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.globalAlpha = 0.5 + fastSin(pTime) * 0.2;

            ctx.lineWidth = 2.5;
            ctx.strokeStyle = this.def.color;
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.stroke();

            // Inner Glow Core
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Particle drift
            if (this.game.particles && Math.random() < 0.1) {
                this.game.particles.emit(cx, cy, { count: 1, speed: 30, life: 0.6, size: 2, color: this.def.color });
            }
        }

        // [NEW] Resonance Lines (Connect clones)
        if (this._clones.length > 1) {
            ctx.save();
            ctx.strokeStyle = this.def.color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.2 + fastSin(perfNow() / 200) * 0.1;
            ctx.beginPath();
            for (let i = 0; i < this._clones.length; i++) {
                const c1 = this._clones[i];
                const c2 = this._clones[(i + 1) % this._clones.length];
                const cx1 = p.x + fastCos(c1.angle) * c1.dist;
                const cy1 = p.y + fastSin(c1.angle) * c1.dist;
                const cx2 = p.x + fastCos(c2.angle) * c2.dist;
                const cy2 = p.y + fastSin(c2.angle) * c2.dist;
                ctx.moveTo(cx1, cy1);
                ctx.lineTo(cx2, cy2);
            }
            ctx.stroke();
            ctx.restore();
        }

        // 鍐版櫠寮逛父锛堢┖涓鐗规晥锛:
        for (const orb of this._orbList) {
            const time = perfNow() / 100;
            const isEvolved = this.evolved;
            const scale = isEvolved ? 1.3 : 1;

            ctx.save();
            ctx.translate(orb.x, orb.y);

            // 澶栧眰鍏夌幆锛堣繘鍖栧悗澧炲姞锛?
            if (isEvolved) {
                ctx.globalAlpha = 0.2;
                ctx.fillStyle = '#88ddff';
                ctx.beginPath();
                ctx.arc(0, 0, orb.radius * 2 * scale, 0, Math.PI * 2);
                ctx.fill();
            }

            // Ice orb body
            ctx.globalAlpha = isEvolved ? 0.4 : 0.3;
            ctx.fillStyle = 'rgba(102, 204, 255, 1)';
            ctx.strokeStyle = '#66ccff';
            ctx.lineWidth = isEvolved ? 3 : 2;
            ctx.beginPath();
            ctx.arc(0, 0, orb.radius * scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.globalAlpha = 1;

            // Ice spikes锛堣繘鍖栧悗鏇村锛?
            const spikeCount = isEvolved ? 8 : 6;
            for (let i = 0; i < spikeCount; i++) {
                const a = (i / spikeCount) * Math.PI * 2 + time * 0.5;
                ctx.strokeStyle = isEvolved ? '#aaeeff' : '#66ccff';
                ctx.lineWidth = isEvolved ? 2.5 : 2;
                ctx.beginPath();
                ctx.moveTo(fastCos(a) * orb.radius * 0.7 * scale, fastSin(a) * orb.radius * 0.7 * scale);
                ctx.lineTo(fastCos(a) * orb.radius * 1.5 * scale, fastSin(a) * orb.radius * 1.5 * scale);
                ctx.stroke();
            }

            // Core
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, orb.radius * 0.4 * scale, 0, Math.PI * 2);
            ctx.fill();

            // Ice particles
            if (this.game.particles && Math.random() < (isEvolved ? 0.2 : 0.1)) {
                this.game.particles.emit(orb.x + (Math.random() - 0.5) * orb.radius * 2 * scale,
                    orb.y + (Math.random() - 0.5) * orb.radius * 2 * scale,
                    { count: 1, speed: 30, life: 0.4, color: '#88ddff', size: 2 });
            }

            ctx.restore();
        }
    }

    // 鈼忊棌 鍦伴潰鏁堟灉缁樺埗锛堢伀姹犮佸啺姹犵瓑锛岀粯鍒跺湪鍗曚綅涓嬫柟锛
    drawGroundEffects(ctx) {
        const time = perfNow();

        // 鐏姹 - 绠鍖栫増锛堝崟娆″～鍏咃級
        for (const fp of this._firePools) {
            ctx.save();
            const alpha = this.evolved ? 0.25 : 0.2;
            // 填充
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ff4400';
            ctx.beginPath();
            ctx.arc(fp.x, fp.y, fp.radius, 0, Math.PI * 2);
            ctx.fill();
            // 轮廓
            ctx.globalAlpha = this.evolved ? 0.6 : 0.5;
            ctx.strokeStyle = fp.color;
            ctx.lineWidth = this.evolved ? 3 : 2;
            ctx.stroke();
            ctx.restore();
        }

        // 閰告恫姹/鍦ｆ按姹- 绠鍖栫増锛堝崟娆″～鍏咃級
        for (const ap of this._acidPools) {
            ctx.save();
            const alpha = this.evolved ? 0.25 : 0.2;

            // 填充
            ctx.globalAlpha = alpha;
            ctx.fillStyle = ap.isHolyWater ? '#aaddff' : '#88ff00';
            ctx.beginPath();
            ctx.arc(ap.x, ap.y, ap.radius, 0, Math.PI * 2);
            ctx.fill();

            // 边缘
            ctx.globalAlpha = this.evolved ? 0.6 : 0.5;
            ctx.strokeStyle = ap.color;
            ctx.lineWidth = this.evolved ? 3 : 2;
            ctx.stroke();

            ctx.restore();
        }
    }
}

module.exports = { PASSIVE_DEFS, Weapon, WEAPON_DEFS };
