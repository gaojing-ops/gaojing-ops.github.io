// ─── 武器协同系统 ──────────────────────────────────
// 元素相互作用产生额外效果

/**
 * 协同效果定义
 *
 * 冰火协同 (Evaporation): 冻结敌人被火系攻击 → 范围爆炸
 * 电冰协同 (Shatter): 冻结敌人被电系攻击 → 闪电链弹射
 * 毒火协同 (ToxicBurn): 中毒敌人被火系攻击 → 剧毒燃烧
 */

class SynergySystem {
    constructor(game) {
        this.game = game;
        this._activeSetBonuses = null; // 当前激活的套装加成
        this._notifiedSets = new Set(); // 已通知的套装加成，防止重复刷屏
    }

    /**
     * 检查并应用元素套装加成
     * 在武器变更时调用（升级选择后）
     */
    check() {
        this.applySetBonuses();
    }

    /**
     * 元素共鸣套装加成
     * 每种元素有独特的 2 件套和 3 件套效果
     */
    applySetBonuses() {
        const p = this.game.player;
        if (!p || !p.weapons) return;

        // 移除旧加成
        if (this._activeSetBonuses) {
            p.bonusMight -= this._activeSetBonuses.might || 0;
            p.bonusCdr -= this._activeSetBonuses.cdr || 0;
            p.bonusArea -= this._activeSetBonuses.area || 0;
            p.bonusFreezeDur -= this._activeSetBonuses.freezeDur || 0;
            p.bonusToxicDmg -= this._activeSetBonuses.toxicDmg || 0;
            p.voidLeech -= this._activeSetBonuses.voidLeech || 0;
            this._activeSetBonuses = null;
        }
        this._activeResonances = {};

        // 统计每种元素的武器数量
        const elementCounts = {};
        for (const w of p.weapons) {
            if (w.def && w.def.element) {
                const el = w.def.element;
                elementCounts[el] = (elementCounts[el] || 0) + 1;
            }
        }

        // 计算元素共鸣加成
        let mightBonus = 0;
        let cdrBonus = 0;
        let areaBonus = 0;
        let freezeDurBonus = 0;
        let toxicDmgBonus = 0;
        let voidLeechBonus = 0;

        for (const el in elementCounts) {
            const count = elementCounts[el];
            if (count < 2) continue;

            const elDef = ELEMENTS[el];
            const elName = elDef ? elDef.name : el;
            const elColor = elDef ? elDef.color : '#fff';

            if (count >= 3) {
                const setKey3 = el + '_3';
                this._activeResonances[el] = 3;
                switch (el) {
                    case 'flux':
                        cdrBonus += 0.25;
                        if (!this._notifiedSets.has(setKey3)) { this._notifiedSets.add(setKey3); this.game.spawnDamageNumber(p.x, p.y - 60, elName + ' 3\u4EF6\u5957: CDR-25%', elColor); }
                        break;
                    case 'cryo':
                        freezeDurBonus += 0.3;
                        if (!this._notifiedSets.has(setKey3)) { this._notifiedSets.add(setKey3); this.game.spawnDamageNumber(p.x, p.y - 60, elName + ' 3\u4EF6\u5957: \u51B0\u51BB+30%', elColor); }
                        break;
                    case 'toxic':
                        toxicDmgBonus += 0.25;
                        p.plagueSpread = true;
                        if (!this._notifiedSets.has(setKey3)) { this._notifiedSets.add(setKey3); this.game.spawnDamageNumber(p.x, p.y - 60, elName + ' 3\u4EF6\u5957: \u6BD2\u7206\u4F20\u64AD', elColor); }
                        break;
                    case 'plasma':
                        areaBonus += 0.2;
                        if (!this._notifiedSets.has(setKey3)) { this._notifiedSets.add(setKey3); this.game.spawnDamageNumber(p.x, p.y - 60, elName + ' 3\u4EF6\u5957: \u8303\u56F4+20%', elColor); }
                        break;
                    case 'void':
                        voidLeechBonus += 2;
                        if (!this._notifiedSets.has(setKey3)) { this._notifiedSets.add(setKey3); this.game.spawnDamageNumber(p.x, p.y - 60, elName + ' 3\u4EF6\u5957: \u51FB\u6740\u56DE\u8840', elColor); }
                        break;
                }
            } else if (count >= 2) {
                const setKey2 = el + '_2';
                this._activeResonances[el] = 2;
                switch (el) {
                    case 'flux':
                        cdrBonus += 0.15;
                        if (!this._notifiedSets.has(setKey2)) { this._notifiedSets.add(setKey2); this.game.spawnDamageNumber(p.x, p.y - 60, elName + ' 2\u4EF6\u5957: CDR-15%', elColor); }
                        break;
                    case 'cryo':
                        freezeDurBonus += 0.15;
                        if (!this._notifiedSets.has(setKey2)) { this._notifiedSets.add(setKey2); this.game.spawnDamageNumber(p.x, p.y - 60, elName + ' 2\u4EF6\u5957: \u51B0\u51BB+15%', elColor); }
                        break;
                    case 'toxic':
                        toxicDmgBonus += 0.15;
                        if (!this._notifiedSets.has(setKey2)) { this._notifiedSets.add(setKey2); this.game.spawnDamageNumber(p.x, p.y - 60, elName + ' 2\u4EF6\u5957: \u6BD2\u4F24+15%', elColor); }
                        break;
                    case 'plasma':
                        areaBonus += 0.12;
                        if (!this._notifiedSets.has(setKey2)) { this._notifiedSets.add(setKey2); this.game.spawnDamageNumber(p.x, p.y - 60, elName + ' 2\u4EF6\u5957: \u8303\u56F4+12%', elColor); }
                        break;
                    case 'void':
                        mightBonus += 0.1;
                        if (!this._notifiedSets.has(setKey2)) { this._notifiedSets.add(setKey2); this.game.spawnDamageNumber(p.x, p.y - 60, elName + ' 2\u4EF6\u5957: \u4F24\u5BB3+10%', elColor); }
                        break;
                }
            }
        }

        // 应用新加成
        if (mightBonus > 0 || cdrBonus > 0 || areaBonus > 0 || freezeDurBonus > 0 || toxicDmgBonus > 0 || voidLeechBonus > 0) {
            this._activeSetBonuses = {
                might: mightBonus, cdr: cdrBonus, area: areaBonus,
                freezeDur: freezeDurBonus, toxicDmg: toxicDmgBonus,
                voidLeech: voidLeechBonus,
            };
            p.bonusMight += mightBonus;
            p.bonusCdr += cdrBonus;
            p.bonusArea += areaBonus;
            p.bonusFreezeDur += freezeDurBonus;
            p.bonusToxicDmg += toxicDmgBonus;
            p.voidLeech += voidLeechBonus;
        }
    }

    /**
     * 获取当前激活的共鸣状态（用于 HUD 显示）
     */
    getActiveResonances() {
        return this._activeResonances || {};
    }

    /**
     * 处理元素协同
     * @param {Enemy} enemy 被攻击的敌人
     * @param {Object} bullet 子弹信息（包含element）
     * @param {number} baseDamage 基础伤害
     * @returns {number} 协同额外伤害
     */
    processSynergy(enemy, bullet, baseDamage) {
        if (!bullet || !bullet.element) return 0;

        const element = bullet.element;
        let extraDamage = 0;

        // ─── 冰火协同: 蒸发爆炸 ───
        if (element === 'plasma' && enemy.frozen > 0) {
            extraDamage += this._triggerEvaporation(enemy, baseDamage);
        }

        // ─── 电冰协同: 闪电链 ───
        if (element === 'flux' && enemy.frozen > 0) {
            extraDamage += this._triggerShatter(enemy, baseDamage);
        }

        // ─── 毒火协同: 剧毒燃烧 ───
        if (element === 'plasma' && enemy.poisoned > 0) {
            extraDamage += this._triggerToxicBurn(enemy, baseDamage);
        }

        // ═══ 新协同效果 ═══

        // ─── 虚空毒素: 瞬间爆发 ───
        if (element === 'void' && enemy.poisoned > 0) {
            extraDamage += this._triggerVoidPoison(enemy, baseDamage);
        }

        // ─── 虚空冰霜: 永久冻结 ───
        if (element === 'void' && enemy.frozen > 0) {
            extraDamage += this._triggerVoidFreeze(enemy, baseDamage);
        }

        // ─── 电毒素: 传染链 ───
        if (element === 'flux' && enemy.poisoned > 0) {
            extraDamage += this._triggerPoisonChain(enemy, baseDamage);
        }

        // ─── 冰毒素: 冻结毒爆 ───
        if (element === 'cryo' && enemy.poisoned > 0) {
            extraDamage += this._triggerCryoPoison(enemy, baseDamage);
        }

        // 奥术师协同加成：所有协同伤害额外 +synergyBonus%
        if (extraDamage > 0 && this.game.player.synergyBonus) {
            extraDamage *= (1 + this.game.player.synergyBonus);
        }

        return extraDamage;
    }

    /**
     * 蒸发爆炸 - 冻结敌人被火击中后爆炸
     */
    _triggerEvaporation(enemy, baseDamage) {
        const area = (this.game.player && this.game.player.area) || 1;
        const radius = 135 * area;
        const explosionDamage = baseDamage * 1.5;
        const radiusSq = radius * radius;

        // 范围伤害
        for (const e of this.game.enemies) {
            if (e === enemy || !e.active) continue;
            const dx = e.x - enemy.x;
            const dy = e.y - enemy.y;
            if (dx * dx + dy * dy < radiusSq) {
                e.takeDamage(explosionDamage);
            }
        }

        // 视觉效果
        if (this.game.particles) {
            this.game.particles.emit(enemy.x, enemy.y, {
                count: 30, speed: 200, life: 0.5, color: '#ff8844', size: 6
            });
        }

        // 屏幕闪烁
        this.game.radiationPulse = {
            x: enemy.x, y: enemy.y, r: radius, a: 0.6, color: '#ff6600'
        };

        // 提示文字
        this.game.spawnDamageNumber(enemy.x, enemy.y - 50, '💥 蒸发!', '#ff6600');

        // 消除冻结状态
        enemy.frozen = 0;

        return explosionDamage;
    }

    /**
     * 闪电链 - 电击冻结敌人后弹射
     */
    _triggerShatter(enemy, baseDamage) {
        const chainDamage = baseDamage * 0.8;
        const area = (this.game.player && this.game.player.area) || 1;
        const chainRange = 210 * area;
        const maxChains = 3;

        let chains = 0;
        let lastX = enemy.x;
        let lastY = enemy.y;
        const hitEnemies = new Set([enemy]);

        while (chains < maxChains) {
            let nearest = null;
            let minDistSq = chainRange * chainRange;

            for (const e of this.game.enemies) {
                if (!e.active || hitEnemies.has(e)) continue;
                const dx = e.x - lastX;
                const dy = e.y - lastY;
                const dSq = dx * dx + dy * dy;
                if (dSq < minDistSq) {
                    minDistSq = dSq;
                    nearest = e;
                }
            }

            if (!nearest) break;

            nearest.takeDamage(chainDamage);
            hitEnemies.add(nearest);

            // 闪电连线视觉效果（简化）
            if (this.game.particles) {
                this.game.particles.emit(nearest.x, nearest.y, {
                    count: 8, speed: 100, life: 0.3, color: '#44ddff', size: 3
                });
            }

            lastX = nearest.x;
            lastY = nearest.y;
            chains++;
        }

        // 提示文字
        if (chains > 0) {
            this.game.spawnDamageNumber(enemy.x, enemy.y - 50, `⚡ 闪电链 x${chains + 1}!`, '#44ddff');
            this.game.triggerScreenPulse('#44ddff', 0.4);
        }

        // 消除冻结
        enemy.frozen = 0;

        return chainDamage * chains;
    }

    /**
     * 剧毒燃烧 - 中毒敌人被点燃
     */
    _triggerToxicBurn(enemy, baseDamage) {
        // 基于中毒层数的额外伤害
        const stacks = enemy.poisonStacks || 0;
        const burnDamage = baseDamage * 0.5 + stacks * 5;

        // 应用持续燃烧
        enemy.burning = Math.max(enemy.burning || 0, 3); // 3秒燃烧
        enemy.burnDamage = Math.max(enemy.burnDamage || 0, burnDamage / 3); // 每秒伤害

        // 视觉效果
        if (this.game.particles) {
            this.game.particles.emit(enemy.x, enemy.y, {
                count: 15, speed: 80, life: 0.4, color: '#88ff00', size: 4
            });
        }

        // 提示文字
        this.game.spawnDamageNumber(enemy.x, enemy.y - 50, '🔥 剧毒燃烧!', '#88ff00');
        this.game.triggerScreenPulse('#88ff00', 0.3);

        return burnDamage;
    }

    /**
     * 虚空毒素 - 瞬间爆发所有毒素伤害
     */
    _triggerVoidPoison(enemy, baseDamage) {
        const stacks = enemy.poisonStacks || 0;
        const burstDamage = stacks * 8; // 每层毒素 8 点瞬间伤害

        enemy.takeDamage(burstDamage);
        enemy.poisoned = 0;
        enemy.poisonStacks = 0;

        // 视觉效果
        if (this.game.particles) {
            this.game.particles.emit(enemy.x, enemy.y, {
                count: 20, speed: 150, life: 0.4, color: '#aa44ff', size: 5
            });
        }

        this.game.spawnDamageNumber(enemy.x, enemy.y - 50, '💫 毒素爆发!', '#aa44ff');
        this.game.radiationPulse = { x: enemy.x, y: enemy.y, r: 80, a: 0.5, color: '#aa44ff' };
        this.game.triggerScreenPulse('#aa44ff', 0.5);
        return burstDamage;
    }

    /**
     * 虚空冰霜 - 延长冻结并造成伤害
     */
    _triggerVoidFreeze(enemy, baseDamage) {
        // 延长冻结时间
        enemy.frozen += 2;
        // 造成基于冻结时间的伤害
        const freezeDamage = baseDamage * 1.5;

        // 视觉效果
        if (this.game.particles) {
            this.game.particles.emit(enemy.x, enemy.y, {
                count: 15, speed: 60, life: 0.5, color: '#8844ff', size: 4
            });
        }

        this.game.spawnDamageNumber(enemy.x, enemy.y - 50, '❄️ 永冻!', '#8844ff');
        this.game.triggerScreenPulse('#8844ff', 0.3);
        return freezeDamage;
    }

    /**
     * 电毒素 - 闪电链传递毒素
     */
    _triggerPoisonChain(enemy, baseDamage) {
        const area = (this.game.player && this.game.player.area) || 1;
        const chainRange = 180 * area;
        const chainDamage = baseDamage * 0.6;
        const stacks = enemy.poisonStacks || 1;
        let chains = 0;

        for (const e of this.game.enemies) {
            if (e === enemy || !e.active) continue;
            const dx = e.x - enemy.x;
            const dy = e.y - enemy.y;
            if (dx * dx + dy * dy < chainRange * chainRange) {
                e.takeDamage(chainDamage);
                // 传递毒素
                e.poisoned = Math.max(e.poisoned || 0, 2);
                e.poisonStacks = (e.poisonStacks || 0) + stacks;
                chains++;

                if (this.game.particles) {
                    this.game.particles.emit(e.x, e.y, { count: 5, speed: 80, life: 0.3, color: '#44ff88', size: 3 });
                }
                if (chains >= 4) break;
            }
        }

        if (chains > 0) {
            this.game.spawnDamageNumber(enemy.x, enemy.y - 50, `⚡ 毒链 x${chains}!`, '#44ff88');
            this.game.triggerScreenPulse('#44ff88', 0.3);
        }
        return chainDamage * chains;
    }

    /**
     * 冰毒素 - 冻结毒素爆炸
     */
    _triggerCryoPoison(enemy, baseDamage) {
        const area = (this.game.player && this.game.player.area) || 1;
        const radius = 125 * area;
        const stacks = enemy.poisonStacks || 0;
        const explosionDamage = baseDamage + stacks * 3;
        const radiusSq = radius * radius;

        for (const e of this.game.enemies) {
            if (e === enemy || !e.active) continue;
            const dx = e.x - enemy.x;
            const dy = e.y - enemy.y;
            if (dx * dx + dy * dy < radiusSq) {
                e.takeDamage(explosionDamage * 0.5);
                e.frozen = 1.5; // 冻结周围敌人
            }
        }

        if (this.game.particles) {
            this.game.particles.emit(enemy.x, enemy.y, { count: 25, speed: 120, life: 0.5, color: '#88ddff', size: 5 });
        }

        this.game.radiationPulse = { x: enemy.x, y: enemy.y, r: radius, a: 0.6, color: '#66ccff' };
        this.game.spawnDamageNumber(enemy.x, enemy.y - 50, '💎 冻结毒爆!', '#66ccff');

        return explosionDamage;
    }

    /**
     * 更新敌人燃烧状态
     */
    updateEnemyBurn(enemy, dt) {
        if (!enemy.burning || enemy.burning <= 0) return;

        enemy.burning -= dt;
        enemy.burnTickTimer = (enemy.burnTickTimer || 0) + dt;

        if (enemy.burnTickTimer >= 0.5 && enemy.burnDamage) {
            enemy.burnTickTimer = 0;
            const dmg = enemy.burnDamage * 0.5;
            enemy.takeDamage(dmg);

            if (this.game) {
                this.game.spawnDamageNumber(enemy.x, enemy.y - enemy.radius, Math.ceil(dmg), '#ffaa00');
            }
        }

        // 燃烧视觉效果
        if (this.game && this.game.particles && Math.random() < 0.2) {
            this.game.particles.emit(enemy.x + (Math.random() - 0.5) * 20, enemy.y - enemy.radius, {
                count: 1, speed: 30, life: 0.3, color: '#ff6600', size: 3
            });
        }
    }
}

// 元素类型定义
const ELEMENTS = {
    flux: { name: '流光', color: '#00ffcc', synergies: ['cryo'] },
    void: { name: '虚空', color: '#aa44ff', synergies: [] },
    plasma: { name: '等离子', color: '#ff6600', synergies: ['cryo', 'toxic'] },
    cryo: { name: '冰霜', color: '#66ccff', synergies: ['plasma', 'flux'] },
    toxic: { name: '毒素', color: '#88ff00', synergies: ['plasma'] },
};

module.exports = { SynergySystem, ELEMENTS };
