// Read the same recipes and counters as the actual reward actions.
const { EVOLUTION_RECIPES, UNION_RECIPES, getEvolutionProgress } = require('./Evolution');
const { weapons } = require('./WeaponData');
const { SYNERGY_RULES } = require('./SynergySystem');
const RESONANCES = {
    flux: ['武器冷却缩减 +15 个百分点', '武器冷却缩减 +25 个百分点'],
    cryo: ['冻结时长 +15%', '冻结时长 +30%'],
    toxic: ['荆毒伤害 +15%', '荆毒伤害 +25%，中毒敌人死亡时传染'],
    plasma: ['攻击范围 +12%', '攻击范围 +20%'],
    void: ['伤害加成 +10 个百分点', '每次击败恢复至多 2 生命'],
};
function progression(game) {
    const p = game.player || { weapons: [], passives: [] };
    const carried = p.weapons || [], counts = {};
    for (const w of carried) if (w.def?.element) counts[w.def.element] = (counts[w.def.element] || 0) + 1;
    const routes = [];
    for (const [isUnion, recipes] of [[false, EVOLUTION_RECIPES], [true, UNION_RECIPES]]) {
        for (const [id, recipe] of Object.entries(recipes)) {
            const primary = carried.find(w => w.id === id);
            const secondary = isUnion ? carried.find(w => w.id === recipe.requireWeapon) : null;
            const passive = !isUnion && (p.passives || []).some(item => item.id === recipe.requirePassive);
            const complete = isUnion ? carried.some(w => w.id === recipe.resultId) : !!primary?.evolved;
            const level = primary?.level || 0, max = weapons[id].maxLevel;
            const secondaryMax = isUnion ? weapons[recipe.requireWeapon].maxLevel : 0;
            const progress = getEvolutionProgress(id, isUnion, p, game);
            const materials = level >= max && (isUnion ? (secondary?.level || 0) >= secondaryMax : passive);
            routes.push({ id, isUnion, recipe, complete, level, max, passive, secondaryLevel: secondary?.level || 0,
                secondaryMax, relevant: !!primary || !!secondary, progress,
                ready: !complete && materials && progress.unlocked });
        }
    }
    return { routes, resonances: Object.entries(RESONANCES).map(([element, bonuses]) => ({
        element, count: counts[element] || 0, tier: Math.min(3, (counts[element] || 0) >= 2 ? counts[element] : 0), bonuses,
    })), reactions: SYNERGY_RULES.map(rule => ({ ...rule, available: rule.elements.every(el => counts[el] > 0) })) };
}
module.exports = { progression, RESONANCES };
