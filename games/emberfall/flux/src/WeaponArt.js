// Friendly spell geometry follows live damage objects. Drawing never consumes combat RNG.
const F = require('./FacetedArt');
const V = require('./SpellVfx');
function visible(g, x, y, r) {
    const c = g.camera || {x: 0, y: 0};
    return x + r >= c.x && x - r <= c.x + g.width && y + r >= c.y && y - r <= c.y + g.height;
}
function area(c, w, x, y, r, color, kind = 'frost') {
    const g = w.game;
    if (!visible(g, x, y, r)) return;
    const count = g._friendlyAreaFills || 0;
    g._friendlyAreaFills = count + 1;
    F.drawArea(c, x, y, r, color, g.time, count < 3 ? (g.qualityLevel < .5 ? .035 : .075) : 0, g.qualityLevel >= .5);
    if (count < (g.qualityLevel >= .5 ? 6 : 2)) V.drawDomain(c, x, y, r, g.time, color, kind, g.qualityLevel >= .5);
}
function drawWeaponGround(c, w) {
    const g = w.game, p = g.player;
    if (!p) return;
    for (const pool of w._firePools) area(c, w, pool.x, pool.y, pool.radius, '#ff6600', 'fire');
    for (const pool of w._acidPools) area(c, w, pool.x, pool.y, pool.radius, pool.isHolyWater ? '#88ddff' : '#88ff00', pool.isHolyWater ? 'holy' : 'grove');
    for (const zone of w._gravityZones) area(c, w, zone.x, zone.y, zone.radius, '#aa44ff', 'gravity');
    if (w.id === 'radiation_field') area(c, w, p.x, p.y, Math.min((75 + w.level * 8) * p.area * (w.evolved ? 1.35 : 1), 240), '#aa44ff');
    if (w.id === 'fusion_meat_grinder') area(c, w, p.x, p.y, 145 * p.area, '#ff2288');
    if (w.id === 'fusion_cryo_toxic') area(c, w, p.x, p.y, 220 * p.area, '#66ccff');
}
function drawWeaponAir(c, w) {
    const g = w.game, p = g.player;
    if (!p) return;
    for (const clone of w._clones) {
        const x = p.x + Math.cos(clone.angle) * clone.dist, y = p.y + Math.sin(clone.angle) * clone.dist;
        if (visible(g, x, y, 30)) {
            F.drawHero(c, p.characterId, x, y, 13, clone.angle, true, g.time, .28);
            if (g.qualityLevel >= .5) V.drawCloneWake(c, x, y, clone.angle, g.time, clone.shootTimer > .38);
        }
    }
    for (const orb of w._orbList) if (visible(g, orb.x, orb.y, orb.radius)) F.drawProjectile(c, orb.x, orb.y, orb.radius, '#88ddff', 'crystal', g.time * .4, w.evolved && g.qualityLevel >= .5, g.time * 3, g.qualityLevel >= .5);
    for (const bot of w._nanoSwarm) if (visible(g, bot.x, bot.y, bot.hitRadius)) {
        F.drawProjectile(c, bot.x, bot.y, 5, '#88ff00', 'sting', bot.angle + Math.PI / 2);
        if (g.qualityLevel >= .5) { c.save(); c.globalAlpha *= .25; c.strokeStyle = '#b0cb84'; c.beginPath(); c.arc(bot.x, bot.y, bot.hitRadius, 0, Math.PI * 2); c.stroke(); c.restore(); }
    }
}
module.exports = { drawWeaponGround, drawWeaponAir };
