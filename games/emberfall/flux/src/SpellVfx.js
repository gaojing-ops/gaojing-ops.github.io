// Presentation geometry only: no combat RNG, collision objects or damage writes.
const TAU = Math.PI * 2;
const THEMES = {
    ember: ['#e7a25b', '#fff0bd', '#8d5539'],
    wind: ['#b7d3b1', '#f3edc9', '#557c70'],
    storm: ['#e5c979', '#fff6d7', '#8b7651'],
    moon: ['#9ed8df', '#efffff', '#507987'],
    grove: ['#b4cb7e', '#eef0b6', '#577953'],
    night: ['#baa2db', '#f0dfff', '#6b5687'],
    forge: ['#dba274', '#ffe2b0', '#876b52'],
    dawn: ['#edd497', '#fff9d9', '#9e8355'],
};
const glowCache = new Map();
// A canvas-local presentation budget: never stored on combat actors or weapons.
const frameBudgets = new WeakMap();
function beginFrame(c, detail = true) {
    let budget = frameBudgets.get(c);
    if (!budget) { budget = {}; frameBudgets.set(c, budget); }
    budget.projectiles = detail ? 48 : 0;
    budget.domains = detail ? 8 : 0;
}
function friendlyProjectileAlpha(bullet, player) {
    if (!player) return 1;
    const reach = 28 + Math.min(24, Math.max(0, bullet.radius || 0)) * 1.2;
    const dx = bullet.x - player.x, dy = bullet.y - (player.y - 18);
    if (Math.abs(dx) >= reach + 28 || Math.abs(dy) >= reach + 28) return 1;
    const ramp = Math.max(0, Math.min(1, (Math.hypot(dx, dy) - reach) / 28));
    return .32 + .68 * ramp;
}
function glow(c, x, y, r, color, alpha) {
    if (typeof wx === 'undefined' || !wx.createCanvas) return;
    let sprite = glowCache.get(color);
    if (!sprite) {
        sprite = wx.createCanvas(); sprite.width = sprite.height = 96;
        const sc = sprite.getContext('2d'), gradient = sc.createRadialGradient(48, 48, 0, 48, 48, 48);
        gradient.addColorStop(0, '#fff6dcbb'); gradient.addColorStop(.16, color + '88');
        gradient.addColorStop(.48, color + '33'); gradient.addColorStop(1, color + '00');
        sc.fillStyle = gradient; sc.fillRect(0, 0, 96, 96); glowCache.set(color, sprite);
    }
    c.save(); c.globalAlpha *= alpha; c.globalCompositeOperation = 'lighter'; c.drawImage(sprite, x - r, y - r, r * 2, r * 2); c.restore();
}
function flame(c, x, y, size, angle, time, theme, alpha = .6, bloom = true) {
    c.save(); c.translate(x, y); c.rotate(angle); c.globalAlpha *= alpha;
    const flicker = Math.sin(time * 11 + x * .1) * size * .15;
    if(bloom)glow(c, 0, -size * .6, size * 1.5, theme[0], .45);
    c.fillStyle = theme[0]; c.beginPath(); c.moveTo(-size * .38, 2);
    c.quadraticCurveTo(-size * .65, -size * .5, -size * .12, -size * .9);
    c.lineTo(size * .1, -size * 1.5 - flicker); c.quadraticCurveTo(size * .15, -size * .6, size * .43, -size * .35); c.quadraticCurveTo(size * .55, size * .1, 0, size * .28); c.closePath(); c.fill();
    c.fillStyle = theme[1]; c.beginPath(); c.moveTo(-size * .15, 0); c.lineTo(size * .05, -size * .75); c.lineTo(size * .22, 0); c.closePath(); c.fill(); c.restore();
}
function palette(color) {
    if (!/^#[\da-f]{6}$/i.test(color || '')) return THEMES.dawn;
    const n = parseInt(color.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255;
    return b > r * 1.1 && b > g * 1.25 ? THEMES.night : g > r * 1.1 && g > b * 1.4 ? THEMES.grove : b > r * 1.2 ? THEMES.moon : r > g * 1.3 ? THEMES.ember : THEMES.dawn;
}
function stroke(c, points, color, width = 1, alpha = 1, close = false) {
    if (!points.length) return;
    c.save(); c.globalAlpha *= alpha; c.strokeStyle = color; c.lineWidth = width;
    c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    if (close) c.closePath(); c.stroke(); c.restore();
}
function arc(c, x, y, r, a, b, color, width = 1, alpha = 1) {
    if (r <= 0) return;
    c.save(); c.globalAlpha *= alpha; c.strokeStyle = color; c.lineWidth = width;
    c.beginPath(); c.arc(x, y, r, a, b); c.stroke(); c.restore();
}
function shard(c, x, y, size, angle, color, alpha = .7) {
    c.save(); c.translate(x, y); c.rotate(angle); c.globalAlpha *= alpha;
    c.fillStyle = color; c.beginPath(); c.moveTo(0, -size); c.lineTo(size * .32, 0); c.lineTo(0, size * .5); c.lineTo(-size * .32, 0); c.closePath(); c.fill(); c.restore();
}
function seal(c, x, y, r, time, theme, count = 8) {
    const [main, light, dark] = theme;
    arc(c, x, y, r, time * .16, time * .16 + TAU * .82, dark, 4, .26);
    arc(c, x, y, r, time * .16, time * .16 + TAU * .82, main, 1, .7);
    arc(c, x, y, r * .82, -time * .22, -time * .22 + Math.PI * 1.4, main, 1, .28);
    for (let i = 0; i < count; i++) {
        const a = i * TAU / count + time * .12, cs = Math.cos(a), sn = Math.sin(a);
        const tx = x + cs * r, ty = y + sn * r;
        stroke(c, [[tx - cs * 4 - sn * 3, ty - sn * 4 + cs * 3], [tx + cs * 5, ty + sn * 5], [tx + cs * 4 + sn * 3, ty + sn * 4 - cs * 3]], light, 1, .65);
    }
}
function lightning(c, x, y, tx, ty, theme, phase, strength = 1, bloom = true) {
    const dx = tx - x, dy = ty - y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    const points = [[x, y]];
    for (let i = 1; i < 6; i++) {
        const u = i / 6, off = Math.sin(i * 7.1 + Math.floor(phase * 18) * 2.3) * Math.min(13, len * .08);
        points.push([x + dx * u + nx * off, y + dy * u + ny * off]);
    }
    points.push([tx, ty]);
    stroke(c, points, theme[0], 5, .14 * strength);
    stroke(c, points, theme[0], 2, .9 * strength);
    stroke(c, points, theme[1], .75, .9 * strength);
    if(bloom)glow(c, tx, ty, 20, theme[0], .35 * strength);
}
function motes(c, x, y, r, time, theme, count, mode) {
    for (let i = 0; i < count; i++) {
        const a = i * 2.39996 + time * .35, u = (time * .65 + i * .173) % 1;
        const d = r * (.45 + u * .5), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d - u * 10;
        if (mode === 'grove') {
            stroke(c, [[px - 3, py + 4], [px + Math.sin(a) * 3, py - 4], [px + 4, py - 1]], theme[0], 1, (1 - u) * .65);
        } else shard(c, px, py, 2 + (i % 3), a + time, theme[i % 2], (1 - u) * .65);
    }
}
function targetMarks(c, fx, q, theme, quality, mode) {
    const points = fx.points || [], count = Math.min(points.length, quality ? 12 : 5);
    for (let i = 0; i < count; i++) {
        const p = points[i], rise = 16 * Math.sin(Math.min(1, q * 2) * Math.PI * .5);
        if (mode === 'grove') {
            stroke(c, [[p.x - 12, p.y + 7], [p.x - 6, p.y - rise], [p.x + 1, p.y - 4], [p.x + 9, p.y - rise - 7]], theme[0], 2, 1 - q);
            shard(c, p.x + 7, p.y - rise - 4, 5, .6, theme[1], (1 - q) * .7);
        } else {
            for (const side of [-1, 1]) {
                stroke(c, [[p.x + side * 13, p.y + 6], [p.x + side * 16, p.y - rise - 6], [p.x + side * 6, p.y - rise - 16]], theme[0], 2, 1 - q);
                shard(c, p.x + side * 9, p.y - rise - 5, 7, side * .18, theme[1], (1 - q) * .65);
            }
        }
    }
}
function drawInvocation(c, fx, game) {
    const p = game.player, x = fx.follow ? p.x : fx.x, y = fx.follow ? p.y : fx.y;
    const theme = THEMES[fx.deity] || THEMES.dawn, [main, light, dark] = theme;
    const t = fx.age, q = Math.max(0, Math.min(1, t / fx.life)), r = Math.max(1, fx.radius || 60);
    const quality = game.qualityLevel >= .5, n = quality ? 8 : 4;
    const fade = Math.min(1, (1 - q) * 7), burst = Math.max(0, 1 - t * 2.8);
    const inner = Math.min(76, r * .5), kind = fx.kind;
    c.save(); c.globalAlpha *= fade; c.lineCap = 'round'; c.lineJoin = 'round';
    if(quality)glow(c, x, y + 8, 28, main, .22 + burst * .25);
    // Layered engraved casting seal, expanding echo and rising elemental debris.
    seal(c, x, y, inner * (.9 + Math.sin(t * 5) * .025), t, theme, n);
    if (burst > 0) {
        const ring = Math.min(r, inner * (1 + t * 3));
        arc(c, x, y, ring, 0, TAU, main, 5, burst * .1);
        arc(c, x, y, ring, 0, TAU, light, 1, burst * .7);
    }
    motes(c, x, y, inner, t, theme, n, fx.deity);
    if (kind === 'storm') {
        let prev = {x, y};
        for (const point of (fx.points || []).slice(0, 8)) {
            lightning(c, prev.x, prev.y, point.x, point.y, theme, t, .5 + .5 * Math.abs(Math.sin(t * 28)), quality);
            drawImpact(c, {kind: 'storm', x: point.x, y: point.y, age: t, life: fx.life, color: main}, quality);
            prev = point;
        }
    } else if (kind === 'assassin') {
        if (fx.from) {
            const dx = x - fx.from.x, dy = y - fx.from.y;
            const bend = Math.min(35, Math.hypot(dx, dy) * .1);
            const points = [[fx.from.x, fx.from.y], [fx.from.x + dx * .35 - bend, fx.from.y + dy * .35], [x - dx * .18, y - dy * .18 + bend], [x, y]];
            stroke(c, points, dark, 13, .25 * (1 - q)); stroke(c, points, main, 2, .8 * (1 - q));
            seal(c, fx.from.x, fx.from.y, 22 * (1 - q), -t, theme, 4);
        }
        for (let i = 0; i < 3; i++) {
            const a = -.9 + i * .7 + q * 1.5, length = Math.min(r, 150);
            arc(c, x, y, length * (.5 + i * .16), a, a + 1.7, dark, 8, .18 * (1 - q));
            arc(c, x, y, length * (.5 + i * .16), a, a + 1.7, light, 1.5, 1 - q);
        }
    } else if (kind === 'walker') {
        for (let i = 0; i < 6; i++) {
            const a = i * TAU / 6 + t * .12, tx = x + Math.cos(a) * r, ty = y - 10 + Math.sin(a) * r * .8;
            stroke(c, [[tx - 7, ty - 10], [tx + 7, ty - 10], [tx + 8, ty + 1], [tx, ty + 10], [tx - 8, ty + 1]], main, 2, .7, true);
            stroke(c, [[tx, ty - 5], [tx, ty + 4]], light, 1, .65);
            if(quality)glow(c, tx, ty - 6, 12, main, .45);
        }
    } else if (kind === 'gunner') {
        const a = p.facingAngle || 0;
        c.save(); c.translate(x, y); c.rotate(a);
        for (let i = 0; i < 3; i++) {
            const d = 34 + i * 23 + (t * 16 % 23);
            stroke(c, [[d - 11, -7], [d, 0], [d - 11, 7]], light, 1.8, .7 - i * .16);
        }
        arc(c, 0, 0, 40, -.7, .7, main, 2, .55); c.restore();
    } else if (kind === 'arcane') {
        const points = [];
        for (let i = 0; i < 5; i++) {
            const a = i * TAU / 5 + t * .4; points.push([x + Math.cos(a) * r, y + Math.sin(a) * r * .8]);
            shard(c, points[i][0], points[i][1], 7, a + Math.PI / 2, light, .85);
            if(quality)glow(c, points[i][0], points[i][1], 13, main, .4);
        }
        stroke(c, [points[0], points[2], points[4], points[1], points[3], points[0]], main, 1, .5);
        arc(c, x, y, r * .38, t, t + Math.PI * 1.6, light, 2, .7);
    } else if (kind === 'engineer') {
        const turrets = (p.turrets || []).filter(o => o.active).slice(0, 6);
        for (const turret of turrets) {
            seal(c, turret.x, turret.y, 27, -t, theme, 4);
            const h = 35 * (1 - q);
            stroke(c, [[turret.x - 13, turret.y - h], [turret.x - 13, turret.y + 5], [turret.x + 13, turret.y + 5], [turret.x + 13, turret.y - h]], light, 1.5, 1 - q);
            motes(c, turret.x, turret.y, 26, t, THEMES.ember, 4, 'ember');
        }
    } else if (kind === 'berserker' || kind === 'tracer') {
        for (let i = 0; i < (kind === 'berserker' ? (quality ? 3 : 2) : (quality ? 6 : 3)); i++) {
            const a = i * TAU / (kind === 'berserker' ? (quality ? 3 : 2) : (quality ? 6 : 3)) + t * (kind === 'berserker' ? 2.5 : -2);
            arc(c, x, y, r * .8, a, a + .65, main, 4, .45);
            arc(c, x, y, r * .8, a, a + .65, light, 1, .8);
            flame(c, x + Math.cos(a) * r * .8, y + Math.sin(a) * r * .8, kind === 'berserker' ? 14 : 9, a + Math.PI / 2, t, theme, .65, quality);
        }
        if (kind === 'tracer') for (const point of (p.trail || []).slice(-8)) {
            shard(c, point.x, point.y - 8, 4, p.facingAngle || 0, main, .3);
        }
    } else {
        const wave = r * Math.min(1, .12 + q * 2.3);
        arc(c, x, y, wave, 0, TAU, main, 2, .55 * (1 - q));
        arc(c, x, y, wave * .93, -.4, TAU - .6, light, 1, .35 * (1 - q));
        const mode = kind === 'biohazard' || fx.deity === 'grove' ? 'grove' : fx.deity === 'moon' ? 'moon' : fx.deity;
        for (let i = 0; i < n; i++) {
            const a = i * TAU / n + t * .12, d = Math.min(wave * .75, 190), tx = x + Math.cos(a) * d, ty = y + Math.sin(a) * d;
            if (mode === 'moon') {
                const len = 10 + 10 * Math.sin(Math.min(1, q * 3) * Math.PI);
                for (let j = 0; j < 3; j++) { const b = a + j * TAU / 3; stroke(c, [[tx - Math.cos(b) * len, ty - Math.sin(b) * len], [tx + Math.cos(b) * len, ty + Math.sin(b) * len]], light, 1, .7 * (1 - q)); }
                if(quality)glow(c, tx, ty, 19, main, .4 * (1 - q));
                shard(c, tx, ty, 12 * (1 - q) + 3, a, light, .5 * (1 - q));
            } else if (mode === 'grove') {
                stroke(c, [[x + Math.cos(a) * d * .7, y + Math.sin(a) * d * .7], [tx - Math.sin(a) * 7, ty + Math.cos(a) * 7], [tx + Math.cos(a) * 9, ty + Math.sin(a) * 9]], main, 2, .7 * (1 - q));
                shard(c, tx, ty, 9, a - .4, main, .65 * (1 - q));
                if(quality)glow(c, tx, ty, 13, main, .35 * (1 - q));
            } else if (mode === 'dawn') {
                stroke(c, [[x + Math.cos(a) * inner, y + Math.sin(a) * inner], [tx, ty]], main, 3, .2 * (1 - q));
                shard(c, tx, ty - (1 - q) * 14, 8, a, light, .7 * (1 - q));
                if(quality)glow(c, tx, ty - (1 - q) * 14, 24, main, .55 * (1 - q));
            } else if (mode === 'wind') {
                const dx = Math.cos(a), dy = Math.sin(a);
                stroke(c, [[tx - dx * 12, ty - dy * 12], [tx, ty], [tx + dx * 9, ty + dy * 9]], light, 1, .75 * (1 - q));
                for (const side of [-1, 1]) stroke(c, [[tx - dx * 6 - dy * side * 6, ty - dy * 6 + dx * side * 6], [tx + dx * 3, ty + dy * 3]], main, 1.5, .7 * (1 - q));
            } else if (mode === 'forge') {
                stroke(c, [[tx - 8, ty - 10], [tx + 8, ty - 10], [tx + 7, ty + 2], [tx, ty + 10], [tx - 7, ty + 2]], main, 2, .8 * (1 - q), true);
                stroke(c, [[tx - 3, ty - 4], [tx + 3, ty - 4], [tx, ty + 4]], light, 1, .75 * (1 - q));
                if(quality)glow(c, tx, ty, 18, main, .5 * (1 - q));
            } else if (mode === 'night') {
                arc(c, tx, ty, 9, t + a, t + a + Math.PI * 1.4, main, 2, .65 * (1 - q));
                stroke(c, [[tx - 3, ty], [tx + 3, ty]], light, 1, .6 * (1 - q));
                if(quality)glow(c, tx, ty, 16, main, .45 * (1 - q));
            } else if (mode === 'storm') {
                lightning(c, tx - Math.cos(a) * 12, ty - Math.sin(a) * 12, tx + Math.cos(a) * 12, ty + Math.sin(a) * 12, theme, t + i, (1 - q) * .7, quality);
            } else {
                const len = 8 + 11 * (1 - q);
                stroke(c, [[tx, ty], [tx - Math.sin(a) * len * .35, ty - Math.cos(a) * len], [tx + Math.sin(a) * 4, ty - Math.cos(a) * len * 1.4]], main, 2, .7 * (1 - q));
                if (mode === 'ember') flame(c, tx, ty, 13, a + Math.PI / 2, t, theme, .7 * (1 - q), quality);
            }
        }
        if (['cryomancer', 'biohazard', 'moon'].includes(kind)) targetMarks(c, fx, q, theme, quality, mode);
    }
    c.restore();
}
function drawDomain(c, x, y, r, time, color, kind, detail = true) {
    const theme = palette(color), core = Math.min(r * .6, 80), n = detail ? 6 : 3;
    c.save(); c.lineCap = 'round';
    seal(c, x, y, core, time * .5, theme, n);
    if (detail) for (let i = 0; i < n; i++) {
        const a = i * TAU / n + time * (kind === 'gravity' ? -.3 : .12), d = core * (.8 + Math.sin(time * 1.6 + i) * .12);
        const tx = x + Math.cos(a) * d, ty = y + Math.sin(a) * d;
        if (kind === 'fire') flame(c, tx, ty, 10, 0, time + i, theme, .55);
        else if (kind === 'gravity') arc(c, x, y, d, a, a + .8, theme[1], 1, .5);
        else if (kind === 'grove') stroke(c, [[tx - 5, ty + 6], [tx - 2, ty - 6], [tx + 3, ty - 2], [tx + 6, ty - 9]], theme[0], 1.5, .6);
        else if (kind === 'holy') stroke(c, [[tx, ty - 7], [tx, ty + 7], [tx - 4, ty], [tx + 4, ty]], theme[1], 1, .6);
        else stroke(c, [[tx - 4, ty], [tx, ty - 6], [tx + 4, ty]], theme[1], 1, .5);
    }
    c.restore();
}
function drawProjectileDetail(c, size, color, shape, time = 0, evolved = false) {
    const budget = frameBudgets.get(c);
    if (budget) {
        const key = ['zero_domain', 'orbital_beam', 'singularity'].includes(shape) ? 'domains' : 'projectiles';
        if (budget[key] <= 0) return;
        budget[key]--;
    }
    const theme = palette(color), s = Math.min(14, Math.max(1, size * .55));
    c.save();
    if (shape !== 'cloud') glow(c, 0, 0, Math.min(18, s * 1.3), theme[0], .32);
    if (['bolt', 'rocket', 'sting', 'needle', 'arrow'].includes(shape)) {
        for (const side of [-1, 1]) stroke(c, [[-s * 1.7, side * s * .32], [-s * .7, side * s * .2], [s * .8, 0]], theme[0], 1, .4);
        stroke(c, [[-s, 0], [s * .8, 0]], theme[1], 1, .8);
    } else if (['crystal', 'circle', 'spark', 'orb'].includes(shape)) {
        arc(c, 0, 0, s * .9, time, time + Math.PI * 1.3, theme[0], 1, .65);
        stroke(c, [[-s * .4, -s * .8], [0, -s * 1.2], [s * .4, -s * .8]], theme[1], 1, .7);
    } else if (shape === 'cloud') {
        for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + time * .2; stroke(c, [[Math.cos(a) * s, Math.sin(a) * s], [Math.cos(a + .5) * s * 1.25, Math.sin(a + .5) * s * 1.25]], theme[0], 1, .45); }
    } else if (['crescent', 'slash', 'boomerang', 'saw'].includes(shape)) {
        arc(c, 0, 0, s * 1.3, time * .3, time * .3 + Math.PI * .8, theme[1], 1, .55);
    } else if (['zero_domain', 'orbital_beam', 'singularity'].includes(shape)) {
        const r = Math.min(size * .7, 100);
        seal(c, 0, 0, r, time, theme, evolved ? 8 : 4);
        if (shape === 'orbital_beam') {
            const height = Math.min(size, 180);
            for (const side of [-1, 1]) stroke(c, [[side * 7, -height], [side * 3, -20], [side * 3, 20], [side * 7, height]], theme[1], 1.5, .6);
        } else if (shape === 'singularity') {
            for (let i = 0; i < 3; i++) {
                const points = [];
                for (let j = 0; j < 12; j++) { const a = time * .4 + i * TAU / 3 + j * .16, d = r * (1 - j / 14); points.push([Math.cos(a) * d, Math.sin(a) * d]); }
                stroke(c, points, theme[0], 1.5, .55);
            }
        }
    }
    c.restore();
}
function drawImpact(c, fx, detail = true) {
    const q = Math.min(1, fx.age / fx.life), theme = palette(fx.color), r = 4 + q * 16, fade = (1 - q) * .8;
    c.save();
    if(detail)glow(c, fx.x, fx.y, 10 + q * 10, theme[0], (1 - q) * .45);
    arc(c, fx.x, fx.y, r, q, q + Math.PI * 1.5, theme[0], 1.2, fade);
    const count = fx.kind === 'frost' || fx.kind === 'evolved' ? 6 : fx.kind === 'grove' ? 3 : 4;
    for (let i = 0; i < count; i++) {
        const a = i * 2.39996 + fx.x * .01, d = r * .8;
        if (fx.kind === 'grove') {
            const px = fx.x + Math.cos(a) * d, py = fx.y - q * 16 + Math.sin(a) * d * .4;
            shard(c, px, py, 3, a, theme[0], fade);
        } else if (fx.kind === 'frost') {
            const a = i * TAU / count;
            stroke(c, [[fx.x + Math.cos(a) * 3, fx.y + Math.sin(a) * 3], [fx.x + Math.cos(a) * (r + 5), fx.y + Math.sin(a) * (r + 5)]], theme[1], 1, fade);
        } else stroke(c, [[fx.x + Math.cos(a) * d, fx.y + Math.sin(a) * d], [fx.x + Math.cos(a) * (d + 5 * (1 - q)), fx.y + Math.sin(a) * (d + 5 * (1 - q))]], theme[i % 2], 1.5, fade);
    }
    c.restore();
}
function drawCloneWake(c, x, y, angle, time, shooting) {
    const theme = THEMES.night;
    arc(c, x, y + 9, 16, angle - .9, angle + .4, theme[0], 2, .45);
    if (shooting) {
        for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + time; stroke(c, [[x + Math.cos(a) * 6, y - 10 + Math.sin(a) * 6], [x + Math.cos(a) * 11, y - 10 + Math.sin(a) * 11]], theme[1], 1, .7); }
    }
}
module.exports = { THEMES, beginFrame, friendlyProjectileAlpha, drawInvocation, drawDomain, drawProjectileDetail, drawImpact, drawCloneWake };
