// 鈹€鈹€鈹€ 瑙掕壊鍜屾鍣ㄦ覆鏌撳櫒 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
const { now: perfNow } = require('./platform');
const Art = require('./Art');
const Facets = require('./FacetedArt');
const { fastSin, fastCos } = require('./MathLUT');

// 棰勮＄畻甯歌佸氳竟褰㈤《鐐癸紙閬垮厤姣忓抚閲嶅嶄笁瑙掑嚱鏁帮級
// 6边形: angle = (i/6)*PI*2
const _H6A_COS = [], _H6A_SIN = [];
// 6边形: angle = (i/6)*PI*2 - PI/6 (旋转30度)
const _H6B_COS = [], _H6B_SIN = [];
// 8边形: angle = (i/8)*PI*2
const _H8_COS = [], _H8_SIN = [];
for (let _i = 0; _i < 8; _i++) {
    if (_i < 6) {
        const _aA = (_i / 6) * Math.PI * 2;
        _H6A_COS.push(fastCos(_aA)); _H6A_SIN.push(fastSin(_aA));
        const _aB = _aA - Math.PI / 6;
        _H6B_COS.push(fastCos(_aB)); _H6B_SIN.push(fastSin(_aB));
    }
    const _aC = (_i / 8) * Math.PI * 2;
    _H8_COS.push(fastCos(_aC)); _H8_SIN.push(fastSin(_aC));
}

// 鈺愨晲鈺 瑙掕壊绮剧伒鍥惧姞杞 鈺愨晲鈺
const _charSprites = {};
const _CHAR_SPRITE_MAP = {
    tracer: 'assets/characters/tracer.png',
    walker: 'assets/characters/walker.png',
    gunner: 'assets/characters/gunner.png',
    cryomancer: 'assets/characters/cryomancer.png',
    biohazard: 'assets/characters/biohazard.png',
    berserker: 'assets/characters/berserker.png',
    arcane: 'assets/characters/arcane.png',
    engineer: 'assets/characters/engineer.png',
    assassin: 'assets/characters/assassin.png',
};

function loadCharacterSprites() { return Art.preload(); }

/** 通用精灵绘制：支持左右翻转 + 行走动画 */
/** 当 theme 非 null 时（有皮肤特效），跳过精灵图使用代码绘制以支持皮肤颜色 */
// 模块级标记：由 Player.draw() 在绘制前设置
let _playerMoving = false;
function setPlayerMoving(moving) { _playerMoving = moving; }

function _drawSprite(ctx, charId, x, y, size, angle, alpha, theme) {
    if (Art.drawHero(ctx,charId,x,y,size,angle||0,_playerMoving,perfNow()/1000,alpha??1)) return true;
    if (theme) return false; // 有皮肤特效时使用代码绘制
    const img = _charSprites[charId];
    if (!img || !img.width) return false;
    ctx.save();
    ctx.translate(x, y);

    // 鈹鈹 宸﹀彸缈昏浆锛堝熀浜庤掑害鍒ゆ柇鏈濆悜锛夆攢鈹
    // facingRight: cos(angle) >= 0 说明面朝右
    const cosAngle = Math.cos(angle || 0);
    const facingRight = cosAngle >= 0;
    if (!facingRight) {
        ctx.scale(-1, 1); // 水平镜像
    }

    // 鈹鈹 琛岃蛋鍔ㄧ敾锛氬井灏忎笂涓嬪脊璺筹紙浠呭湪绉诲姩鏃讹級鈹鈹
    if (_playerMoving) {
        const now = perfNow();
        const bobAmount = 1.5; // 弹跳幅度（像素）
        const bobSpeed = 12;   // 弹跳频率
        const bob = fastSin(now / 1000 * bobSpeed) * bobAmount;
        ctx.translate(0, bob);
    }

    if (alpha !== undefined && alpha !== null) ctx.globalAlpha = alpha;
    const drawSize = size * 2.6; // 绮剧伒鍥剧粯鍒跺ぇ灏忥紙鐣ュぇ浜庣版挒鍗婂緞锛
    ctx.drawImage(img, -drawSize, -drawSize, drawSize * 2, drawSize * 2);
    ctx.restore();
    return true;
}
// 閳烘劏鏅查埡?閻溾晛顔嶇憴鎺曞婄紒妯哄煑 閳烘劏鏅查埡?
function drawTracer(ctx, x, y, size, time, angle = -Math.PI / 2, theme = null) {
    if (_drawSprite(ctx, 'tracer', x, y, size, angle, null, theme)) return;
        const s = size;
    const t = theme || { main: '#00ffcc', glow: '#00ffcc', core: '#00ffcc', accent: '#00ddaa' };
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);

    // 鍏夋祦鐚庢墜 - 鍦嗘鼎鐨勪富浣?
    ctx.shadowBlur = 0;
    ctx.shadowColor = t.glow;

    // 涓讳綋鍦?
    ctx.fillStyle = '#0a2020';
    ctx.strokeStyle = t.main;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 内圈发光
    ctx.fillStyle = t.core;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 方向指示条纹
    ctx.strokeStyle = t.main;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.6);
    ctx.lineTo(0, -s * 1.1);
    ctx.stroke();

    // 两侧光翼
    const wingPulse = fastSin(time * 8) * 0.15;
    ctx.globalAlpha = 0.6 + wingPulse;
    ctx.strokeStyle = t.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 0.2);
    ctx.lineTo(-s * 1.0, -s * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.5, -s * 0.2);
    ctx.lineTo(s * 1.0, -s * 0.5);
    ctx.stroke();

    ctx.restore();
}

function drawWalker(ctx, x, y, size, time, angle = -Math.PI / 2, theme = null) {
    if (_drawSprite(ctx, 'walker', x, y, size, null, null, theme)) return;
        const s = size;
    const t = theme || { main: '#aa44ff', glow: '#aa44ff', core: '#ff88ff', accent: '#8822cc' };
    ctx.save();
    ctx.translate(x, y);

    // 閾忔氨鈹栫悰宀冣偓?- 閹顒佽癁閻ㄥ嫭纭堕悶?
    const hover = fastSin(time * 3) * 3;
    ctx.translate(0, hover);

    ctx.shadowBlur = 0;
    ctx.shadowColor = t.glow;

    // 外层光环
    ctx.strokeStyle = t.main;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5 + fastSin(time * 4) * 0.2;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 主体
    ctx.fillStyle = '#1a0a25';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = t.main;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 鐜粫纰庣墖
    for (let i = 0; i < 3; i++) {
        const a = time * 2 + (i * Math.PI * 2 / 3);
        const fx = fastCos(a) * s * 1.2;
        const fy = fastSin(a) * s * 1.2;
        ctx.fillStyle = t.glow;
        ctx.beginPath();
        ctx.arc(fx, fy, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // 鏍稿績鐪?
    ctx.fillStyle = t.core;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawGunner(ctx, x, y, size, time, angle = -Math.PI / 2, theme = null) {
    if (_drawSprite(ctx, 'gunner', x, y, size, angle, null, theme)) return;
        const s = size;
    const t = theme || { main: '#ff6600', glow: '#ff8833', core: '#ffcc00', accent: '#cc4400' };
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);

    // 闁插秷顥婇悙顔藉 - 缁嬫娊鍣搁惃鍕顥婇悽?
    ctx.shadowBlur = 0;
    ctx.shadowColor = t.glow;

    // 装甲主体
    ctx.fillStyle = '#1a1008';
    ctx.strokeStyle = t.main;
    ctx.lineWidth = 3;

    // 閸忣叀绔熻ぐ銏ｎ棅閻?
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        const r = s * 0.85;
        const px = fastCos(a) * r;
        const py = fastSin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 鐐鎸囩ず
    ctx.strokeStyle = t.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.3);
    ctx.lineTo(0, -s * 1.2);
    ctx.stroke();

    // 核心能量
    const pulse = 0.6 + fastSin(time * 6) * 0.3;
    ctx.fillStyle = t.core;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.restore();
}

function drawCryomancer(ctx, x, y, size, time, angle = -Math.PI / 2, theme = null) {
    if (_drawSprite(ctx, 'cryomancer', x, y, size, null, null, theme)) return;
        const s = size;
    const t = theme || { main: '#44ccff', glow: '#66ddff', core: '#ffffff', accent: '#2299cc' };
    ctx.save();
    ctx.translate(x, y);

    // 闂囨粌鐦ㄩ張顖氾紜 - 閺呮儼骞戦惃鍕鍟洪弲?
    ctx.shadowBlur = 0;
    ctx.shadowColor = t.glow;

    // 冰晶主体
    ctx.fillStyle = '#0a1a25';
    ctx.strokeStyle = t.main;
    ctx.lineWidth = 2;

    // 菱形晶体
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.7, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 内部光芒
    ctx.fillStyle = t.glow;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.5);
    ctx.lineTo(s * 0.35, 0);
    ctx.lineTo(0, s * 0.5);
    ctx.lineTo(-s * 0.35, 0);
    ctx.closePath();
    ctx.fill();

    // 鐜粫鍐板睉
    for (let i = 0; i < 4; i++) {
        const a = time * 1.5 + (i * Math.PI / 2);
        const r = s * 1.3;
        ctx.save();
        ctx.translate(fastCos(a) * r, fastSin(a) * r);
        ctx.rotate(a);
        ctx.fillStyle = t.core;
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(3, 0);
        ctx.lineTo(0, 4);
        ctx.lineTo(-3, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    ctx.restore();
}

function drawBiohazard(ctx, x, y, size, time, angle = -Math.PI / 2, theme = null) {
    if (_drawSprite(ctx, 'biohazard', x, y, size, null, null, theme)) return;
        const s = size;
    const t = theme || { main: '#88ff00', glow: '#aaff44', core: '#ccff88', accent: '#66cc00' };
    ctx.save();
    ctx.translate(x, y);

    // 鍓ф瘨浣胯€?- 鏈夋満鐨勮蒋浣?
    ctx.shadowBlur = 0;
    ctx.shadowColor = t.glow;

    // 脉动鐨勪富浣?
    const pulse = 1 + fastSin(time * 4) * 0.08;
    ctx.fillStyle = '#0a1505';
    ctx.strokeStyle = t.main;
    ctx.lineWidth = 2;

    // 涓嶈鍒欏渾
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const r = s * pulse * (0.75 + fastSin(a * 3 + time * 3) * 0.1);
        const px = fastCos(a) * r;
        const py = fastSin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 内部气泡
    for (let i = 0; i < 3; i++) {
        const a = time * 2 + i * Math.PI * 2 / 3;
        const r = s * 0.45;
        ctx.fillStyle = t.core;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(fastCos(a) * r, fastSin(a) * r, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // 涓績鐪?
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = t.accent;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawBerserker(ctx, x, y, size, time, angle = -Math.PI / 2, theme = null) {
    if (_drawSprite(ctx, 'berserker', x, y, size, null, null, theme)) return;
        const s = size;
    const t = theme || { main: '#ff2244', glow: '#ff4466', core: '#ff6688', accent: '#cc1133' };
    ctx.save();
    ctx.translate(x, y);

    // 鐙傛垬澹?- 婵€鐑堢殑灏栧埡
    ctx.shadowBlur = 0;
    ctx.shadowColor = t.glow;

    // 脉动
    const rage = 1 + fastSin(time * 8) * 0.1;

    // 尖刺主体
    ctx.fillStyle = '#1a0808';
    ctx.strokeStyle = t.main;
    ctx.lineWidth = 2;

    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = s * rage * (i % 2 === 0 ? 1.0 : 0.55);
        const px = fastCos(a) * r;
        const py = fastSin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 鏍稿績鐏劙
    ctx.fillStyle = t.core;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawArcane(ctx, x, y, size, time, angle = -Math.PI / 2, theme = null) {
    if (_drawSprite(ctx, 'arcane', x, y, size, null, null, theme)) return;
        const s = size;
    const t = theme || { main: '#cc44ff', glow: '#dd66ff', core: '#ee88ff', accent: '#aa22cc' };
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time * 0.5);

    // 奥术师 - 旋转的法阵
    ctx.shadowBlur = 0;
    ctx.shadowColor = t.glow;

    // 外圈
    ctx.strokeStyle = t.main;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.9, 0, Math.PI * 2);
    ctx.stroke();

    // 内圈
    ctx.strokeStyle = t.accent;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // 涓績鏅朵綋
    ctx.fillStyle = t.glow;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.35);
    ctx.lineTo(s * 0.25, 0);
    ctx.lineTo(0, s * 0.35);
    ctx.lineTo(-s * 0.25, 0);
    ctx.closePath();
    ctx.fill();

    // 符文点
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const r = s * 0.7;
        ctx.fillStyle = t.core;
        ctx.beginPath();
        ctx.arc(fastCos(a) * r, fastSin(a) * r, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function drawEngineer(ctx, x, y, size, time, angle = -Math.PI / 2, theme = null) {
    if (_drawSprite(ctx, 'engineer', x, y, size, null, null, theme)) return;
        const s = size;
    const t = theme || { main: '#ffcc00', glow: '#ffdd44', core: '#ffee88', accent: '#ccaa00' };
    ctx.save();
    ctx.translate(x, y);

    // 瀹搞儳鈻肩敮?- 缁夋垶濡ч崗顓＄珶瑜?
    ctx.shadowBlur = 0;
    ctx.shadowColor = t.glow;

    // 澶栨
    ctx.fillStyle = '#12100a';
    ctx.strokeStyle = t.main;
    ctx.lineWidth = 2;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        const px = fastCos(a) * s * 0.85;
        const py = fastSin(a) * s * 0.85;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 内部齿轮
    ctx.save();
    ctx.rotate(time * 0.8);
    ctx.strokeStyle = t.glow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(fastCos(a) * s * 0.3, fastSin(a) * s * 0.3);
        ctx.lineTo(fastCos(a) * s * 0.55, fastSin(a) * s * 0.55);
        ctx.stroke();
    }
    ctx.restore();

    // 涓績
    ctx.fillStyle = t.main;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawAssassin(ctx, x, y, size, time, angle = -Math.PI / 2, theme = null) {
    if (_drawSprite(ctx, 'assassin', x, y, size, angle, 0.7 + fastSin(time * 5) * 0.2, theme)) return;
    const s = size;
    const t = theme || { main: '#8800ff', glow: '#aa22ff', core: '#cc44ff', accent: '#6600cc' };
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);

    // 閸掑搫顓 - 濞兼粏顢戦惃鍕濂栫?
    ctx.shadowBlur = 0;
    ctx.shadowColor = t.glow;

    // 韬綋娓愰殣
    const fade = 0.7 + fastSin(time * 5) * 0.2;
    ctx.globalAlpha = fade;

    // 尖锐外形
    ctx.fillStyle = '#0a0510';
    ctx.strokeStyle = t.main;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, -s * 1.1);
    ctx.lineTo(s * 0.5, s * 0.3);
    ctx.lineTo(0, s * 0.8);
    ctx.lineTo(-s * 0.5, s * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 眼睛
    ctx.globalAlpha = 1;
    ctx.fillStyle = t.core;
    ctx.beginPath();
    ctx.arc(-s * 0.15, -s * 0.25, 4, 0, Math.PI * 2);
    ctx.arc(s * 0.15, -s * 0.25, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// 鈺愨晲鈺 鏁屼汉缁樺埗 鈺愨晲鈺
function drawBat(ctx, x, y, size, flashTimer, time) {
    const s = size;
    ctx.save();
    ctx.translate(x, y);

    ctx.shadowBlur = 0;
    ctx.shadowColor = '#ff3366';

    // 韬綋
    ctx.fillStyle = flashTimer > 0 ? '#fff' : '#1a0510';
    ctx.strokeStyle = '#ff3366';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 翅膀
    const wingA = fastSin(time * 20) * 0.4;
    ctx.fillStyle = 'rgba(255, 51, 102, 0.4)';
    ctx.beginPath();
    // 左翅
    ctx.moveTo(-s * 0.3, 0);
    ctx.quadraticCurveTo(-s * 0.8, -s * 0.3 + wingA * s, -s * 0.9, s * 0.1);
    ctx.quadraticCurveTo(-s * 0.5, s * 0.1, -s * 0.3, 0);
    ctx.fill();
    // 右翅
    ctx.beginPath();
    ctx.moveTo(s * 0.3, 0);
    ctx.quadraticCurveTo(s * 0.8, -s * 0.3 - wingA * s, s * 0.9, s * 0.1);
    ctx.quadraticCurveTo(s * 0.5, s * 0.1, s * 0.3, 0);
    ctx.fill();

    // 鐪?
    ctx.fillStyle = '#ff3366';
    ctx.beginPath();
    ctx.arc(0, -s * 0.1, s * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawSkeleton(ctx, x, y, size, flashTimer, time) {
    const s = size;
    ctx.save();
    ctx.translate(x, y);

    const jx = (Math.random() - 0.5) * 1.5;
    ctx.translate(jx, 0);

    ctx.shadowBlur = 0;
    ctx.shadowColor = '#ff0000';

    ctx.strokeStyle = flashTimer > 0 ? '#fff' : '#555';
    ctx.lineWidth = 2;
    ctx.fillStyle = flashTimer > 0 ? '#fff' : '#222';

    // 澶?
    ctx.beginPath();
    ctx.arc(0, -s * 0.6, s * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 韬綋
    ctx.fillRect(-s * 0.25, -s * 0.25, s * 0.5, s * 0.6);
    ctx.strokeRect(-s * 0.25, -s * 0.25, s * 0.5, s * 0.6);

    // 鐪?
    const eyeAlpha = 0.5 + fastSin(time * 10) * 0.5;
    ctx.fillStyle = `rgba(255, 0, 0, ${eyeAlpha})`;
    ctx.beginPath();
    ctx.arc(-s * 0.12, -s * 0.65, 4, 0, Math.PI * 2);
    ctx.arc(s * 0.12, -s * 0.65, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawGhost(ctx, x, y, size, flashTimer, time) {
    const s = size;
    ctx.save();
    ctx.translate(x, y);

    const alpha = 0.4 + 0.3 * fastSin(time * 4);
    ctx.globalAlpha = flashTimer > 0 ? 1 : alpha;
    ctx.shadowBlur = 0;
    ctx.shadowColor = '#00ff44';

    ctx.fillStyle = flashTimer > 0 ? '#ffffff' : 'rgba(0, 255, 68, 0.25)';
    ctx.strokeStyle = '#00ff44';
    ctx.lineWidth = 1.5;

    // 幽灵形状
    ctx.beginPath();
    ctx.arc(0, -s * 0.2, s * 0.4, Math.PI, 0);
    ctx.lineTo(s * 0.4, s * 0.35);
    ctx.lineTo(s * 0.15, s * 0.2);
    ctx.lineTo(0, s * 0.4);
    ctx.lineTo(-s * 0.15, s * 0.2);
    ctx.lineTo(-s * 0.4, s * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 鐪?
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#00ff44';
    ctx.beginPath();
    ctx.arc(-s * 0.15, -s * 0.25, 4, 0, Math.PI * 2);
    ctx.arc(s * 0.15, -s * 0.25, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawGem(ctx, x, y, size) {
    Facets.drawGem(ctx,x,y,size);
}

function drawBullet(ctx, x, y, size, color = '#ffcc00', shape = 'circle', angle = 0, glowIntensity = 10, evolved = false, phase = 0, detail = true) {
    Facets.drawProjectile(ctx,x,y,size,color,shape,angle,evolved,phase,detail);
}

function drawDamageNumber(ctx, x, y, text, alpha, color = '#fff', scale = 1, glow = false, bounce = false, bouncePhase = -1) {
    // Beam ticks can be fractional. Keep their display compact without touching damage.
    if (typeof text === 'number' || /^[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(String(text))) {
        const value = Number(text), magnitude = Math.abs(value), sign = value < 0 ? '-' : String(text).startsWith('+') ? '+' : '';
        if (Number.isFinite(value)) {
            const trim = n => n.toFixed(1).replace(/\.0$/, '');
            text = sign + (magnitude >= 1e8 ? trim(magnitude / 1e8) + '亿' : magnitude >= 1e4 ? trim(magnitude / 1e4) + '万' : magnitude > 0 && magnitude < .1 ? '<0.1' : trim(magnitude));
        }
    }
    ctx.save();
    ctx.globalAlpha = alpha;

    // 寮硅烦鍔ㄧ敾锛堟毚鍑讳笓鐢級锛氬厛寮逛笂鍐嶈惤鍥?
    let yOffset = 0;
    if (bounce && bouncePhase >= 0 && bouncePhase < 1) {
        yOffset = -fastSin(bouncePhase * Math.PI) * 45;
    }
    ctx.translate(x, y + yOffset);

    // 缩放动画
    if (scale !== 1) {
        // 鏆村嚮缂╂斁锛氬厛鏀惧ぇ鍐嶇缉灏?
        const animScale = bounce && bouncePhase >= 0 && bouncePhase < 1 ? scale * (1 + fastSin(bouncePhase * Math.PI) * 0.4) : scale;
        ctx.scale(animScale, animScale);
    }

    // 鍙戝厜鏁堟灉锛堟毚鍑绘垨鐗规畩浼ゅ锛?
    if (glow) {
        ctx.shadowBlur = 0;
        ctx.shadowColor = color;
        // 金色描边（暴击标志）
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.strokeText(text, 0, 0);
        // 外层光晕
        ctx.globalAlpha = alpha * 0.4;
        ctx.fillStyle = color;
        ctx.fillText(text, 0, 0);
        ctx.globalAlpha = alpha;
    } else {
        ctx.shadowBlur = 0;
        ctx.shadowColor = color;
    }

    ctx.font = glow ? 'bold 16px sans-serif' : 'bold 14px sans-serif';
    ctx.fillStyle = glow ? '#fff' : color;
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#06120c';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, 0, 0);
    ctx.fillText(text, 0, 0);
    ctx.restore();
}

function drawDataWorm(ctx, x, y, size, flashTimer, time) {
    const s = size;
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 0;
    ctx.shadowColor = '#ff8800';
    ctx.strokeStyle = flashTimer > 0 ? '#fff' : '#ff8800';
    ctx.fillStyle = flashTimer > 0 ? 'rgba(255,255,255,0.4)' : 'rgba(255,136,0,0.15)';
    ctx.lineWidth = 2;

    // 鑺傛
    for (let i = 0; i < 4; i++) {
        const ox = fastSin(time * 5 + i * 1.2) * s * 0.12;
        const oy = i * s * 0.28 - s * 0.35;
        const r = s * (0.25 - i * 0.025);
        ctx.beginPath();
        ctx.arc(ox, oy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    // 鐪?
    ctx.fillStyle = '#ff4400';
    ctx.beginPath();
    ctx.arc(-s * 0.07, -s * 0.4, s * 0.05, 0, Math.PI * 2);
    ctx.arc(s * 0.07, -s * 0.4, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawSwarmDrone(ctx, x, y, size, flashTimer, time) {
    const s = size;
    ctx.save();
    ctx.translate(x, y);

    // 残影
    for (let i = 1; i <= 2; i++) {
        ctx.globalAlpha = 0.2 / i;
        ctx.fillStyle = '#00ffcc';
        ctx.beginPath();
        ctx.moveTo(s * (1 - i * 0.1), 0);
        ctx.lineTo(-s * (0.8 + i * 0.1), -s * 0.4);
        ctx.lineTo(-s * (0.8 + i * 0.1), s * 0.4);
        ctx.closePath();
        ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = flashTimer > 0 ? '#fff' : '#00ffcc';
    ctx.shadowBlur = 0;
    ctx.shadowColor = '#00ffcc';
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(-s * 0.7, -s * 0.4);
    ctx.lineTo(-s * 0.7, s * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

function drawLootGoblin(ctx, x, y, size, flashTimer, time) {
    const s = size;
    ctx.save();
    ctx.translate(x, y);

    // 金光闪闪的外发光
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffcc00';

    // 韬韬锛堝湴绮惧舰鐘讹級
    ctx.fillStyle = flashTimer > 0 ? '#fff' : '#668822';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.2, s * 0.8, s, 0, 0, Math.PI * 2);
    ctx.fill();

    // 宸ㄥぇ鐨勯噾甯佽嬪瓙鎷栧湪韬鍚庯紙鍙嶆柟鍚戞憞鎽嗭級
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#aa6622';
    const sackSway = fastSin(time * 15) * s * 0.3;
    ctx.beginPath();
    ctx.ellipse(-s * 0.8 + sackSway, s * 0.4, s * 1.2, s * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // 钱袋上的金币掉落标志
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', -s * 0.8 + sackSway, s * 0.6);

    // 疯狂的眼睛
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(s * 0.3, -s * 0.2, s * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawPickup(ctx, x, y, type, alpha) {
    Facets.drawPickup(ctx,x,y,type,alpha);
}

function drawFrostWisp(ctx, x, y, size, flashTimer, time) {
    const s = size;
    ctx.save();
    ctx.translate(x, y);

    ctx.shadowBlur = 0;
    ctx.shadowColor = '#44ccff';

    const flicker = fastSin(time * 8) * 0.2;
    ctx.fillStyle = flashTimer > 0 ? '#fff' : `rgba(68, 204, 255, ${0.5 + flicker})`;

    // 冰焰
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.7);
    ctx.bezierCurveTo(s * 0.4, -s * 0.3, s * 0.3, s * 0.2, 0, s * 0.4);
    ctx.bezierCurveTo(-s * 0.3, s * 0.2, -s * 0.4, -s * 0.3, 0, -s * 0.7);
    ctx.fill();

    // 核心
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawSlimeGlob(ctx, x, y, size, flashTimer, time) {
    const s = size;
    ctx.save();
    ctx.translate(x, y);

    ctx.shadowBlur = 0;
    ctx.shadowColor = '#88ff00';

    const wobble = fastSin(time * 5);
    ctx.fillStyle = flashTimer > 0 ? '#fff' : 'rgba(100, 200, 0, 0.5)';
    ctx.strokeStyle = '#88ff00';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, -s * 0.5);
    ctx.bezierCurveTo(s * (0.6 + wobble * 0.1), -s * 0.3, s * 0.5, s * 0.2, 0, s * 0.6);
    ctx.bezierCurveTo(-s * 0.5, s * 0.2, -s * (0.6 + wobble * 0.1), -s * 0.3, 0, -s * 0.5);
    ctx.fill();
    ctx.stroke();

    // 鐪?
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-s * 0.15, -s * 0.1, s * 0.08, 0, Math.PI * 2);
    ctx.arc(s * 0.15, -s * 0.1, s * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawCyberSpider(ctx, x, y, size, flashTimer, time) {
    const s = size;
    ctx.save();
    ctx.translate(x, y);

    ctx.shadowBlur = 0;
    ctx.shadowColor = '#ff00ff';

    ctx.fillStyle = flashTimer > 0 ? '#fff' : '#150020';
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 2;

    ctx.save();
    ctx.translate(0, s * 0.15);
    ctx.scale(0.8, 1); // 0.4/0.5 ratio
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
    ctx.restore();
    ctx.fillStyle = flashTimer > 0 ? '#fff' : '#0a0518';
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    // 澶?
    ctx.beginPath();
    ctx.arc(0, -s * 0.35, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 鑵?
    const legWave = fastSin(time * 12) * 0.2;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.2, s * 0.1);
        ctx.lineTo(-s * (0.9 + i * 0.1), s * (0.2 + legWave * (i % 2 === 0 ? 1 : -1)));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s * 0.2, s * 0.1);
        ctx.lineTo(s * (0.9 + i * 0.1), s * (0.2 - legWave * (i % 2 === 0 ? 1 : -1)));
        ctx.stroke();
    }

    // 鐪?
    ctx.fillStyle = '#ff00ff';
    ctx.beginPath();
    ctx.arc(-s * 0.1, -s * 0.4, s * 0.06, 0, Math.PI * 2);
    ctx.arc(s * 0.1, -s * 0.4, s * 0.06, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawGlitchEntity(ctx, x, y, size, flashTimer, time) {
    const s = size;
    ctx.save();
    ctx.translate(x, y);

    const glitchX = Math.random() < 0.1 ? (Math.random() - 0.5) * 8 : 0;
    ctx.translate(glitchX, 0);

    ctx.shadowBlur = 0;
    ctx.shadowColor = '#00ffff';

    ctx.fillStyle = flashTimer > 0 ? '#fff' : '#001a1a';
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;

    // 故障方块
    ctx.fillRect(-s * 0.4, -s * 0.8, s * 0.8, s * 1.6);
    ctx.strokeRect(-s * 0.4, -s * 0.8, s * 0.8, s * 1.6);

    // 鏁呴殰绾?
    for (let i = 0; i < 3; i++) {
        const ly = (Math.random() - 0.5) * s * 1.5;
        ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
        ctx.fillRect(-s * 0.4, ly, s * 0.8, 2);
    }

    // 鐪?
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(-s * 0.2, -s * 0.25, s * 0.12, s * 0.08);
    ctx.fillRect(s * 0.08, -s * 0.25, s * 0.12, s * 0.08);

    ctx.restore();
}

// 鈺愨晲鈺 Boss 缁樺埗 鈺愨晲鈺
function drawFrostTitan(ctx, x, y, size, flashTimer, time) {
    const s = size;
    ctx.save();
    ctx.translate(x, y);

    ctx.shadowBlur = 0;
    ctx.shadowColor = '#44ccff';

    ctx.fillStyle = flashTimer > 0 ? '#fff' : 'rgba(68, 204, 255, 0.25)';
    ctx.strokeStyle = '#44ccff';
    ctx.lineWidth = 3;

    // 晶体巨人
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.7, -s * 0.2);
    ctx.lineTo(s * 0.5, s * 0.7);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.5, s * 0.7);
    ctx.lineTo(-s * 0.7, -s * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 核心
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawPlagueSource(ctx, x, y, size, flashTimer, time) {
    const s = size;
    ctx.save();
    ctx.translate(x, y);

    ctx.shadowBlur = 0;
    ctx.shadowColor = '#88ff00';

    const pulse = 1 + fastSin(time * 3) * 0.08;
    ctx.fillStyle = flashTimer > 0 ? '#fff' : 'rgba(100, 200, 0, 0.2)';
    ctx.strokeStyle = '#88ff00';
    ctx.lineWidth = 3;

    // 鏈夋満浣?
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const r = s * pulse * (0.7 + fastSin(a * 3 + time * 4) * 0.15);
        const px = fastCos(a) * r;
        const py = fastSin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 鐪?
    ctx.fillStyle = '#0a1505';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#88ff00';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// 鈺愨晲鈺 鐘舵佹晥鏋滃彲瑙嗗寲 鈺愨晲鈺
function drawFrozenEffect(ctx, x, y, size, time) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.4 + fastSin(time * 5) * 0.1;

    ctx.strokeStyle = '#44ccff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(fastCos(a) * size * 1.2, fastSin(a) * size * 1.2);
        ctx.stroke();
    }

    ctx.restore();
}

function drawPoisonedEffect(ctx, x, y, size, time) {
    ctx.save();
    ctx.translate(x, y);

    for (let i = 0; i < 3; i++) {
        const a = time * 3 + i * Math.PI * 2 / 3;
        const r = size * 0.7;
        ctx.fillStyle = 'rgba(100, 200, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(fastCos(a) * r, fastSin(a) * r - size * 0.2, size * 0.12, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#88ff00';
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// 鈺愨晲鈺?鏂板鏁屼汉缁樺埗 鈺愨晲鈺?
function drawFireFly(ctx, x, y, size, flashTimer, time) {
    ctx.save();
    ctx.translate(x, y);
    const pulse = 0.6 + fastSin(time * 15) * 0.4;
    ctx.shadowBlur = 0;
    ctx.shadowColor = '#ffdd44';
    ctx.globalAlpha = flashTimer > 0 ? 1 : pulse;
    ctx.fillStyle = flashTimer > 0 ? '#fff' : '#ffdd44';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
    // 光芒
    ctx.strokeStyle = '#ffee88';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
        const a = time * 10 + i * Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(fastCos(a) * size * 0.7, fastSin(a) * size * 0.7);
        ctx.stroke();
    }
    ctx.restore();
}

function drawCrawler(ctx, x, y, size, flashTimer, time) {
    const s = size;
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 0;
    ctx.shadowColor = '#44ff00';
    ctx.fillStyle = flashTimer > 0 ? '#fff' : '#1a2a0a';
    ctx.strokeStyle = '#44ff00';
    ctx.lineWidth = 1.5;
    // 妞渾韬綋
    ctx.save();
    ctx.scale(1.43, 1); // 0.5/0.35 ratio
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2);
    ctx.restore();
    // Need to re-set styles after restore
    ctx.fillStyle = flashTimer > 0 ? '#fff' : '#1a2a0a';
    ctx.strokeStyle = '#44ff00';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
    // 腿（4对）
    for (let i = 0; i < 4; i++) {
        const legPhase = fastSin(time * 12 + i * 1.5) * 0.2;
        const lx = -s * 0.35 + i * s * 0.22;
        ctx.strokeStyle = '#44ff00';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lx, -s * 0.3);
        ctx.lineTo(lx - s * 0.15, -s * 0.55 + legPhase * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(lx, s * 0.3);
        ctx.lineTo(lx - s * 0.15, s * 0.55 - legPhase * s);
        ctx.stroke();
    }
    // 鐪?
    ctx.fillStyle = '#88ff00';
    ctx.beginPath();
    ctx.arc(s * 0.25, -s * 0.08, 2.5, 0, Math.PI * 2);
    ctx.arc(s * 0.25, s * 0.08, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawWarpMite(ctx, x, y, size, flashTimer, time) {
    const s = size;
    ctx.save();
    ctx.translate(x, y);
    const phase = fastSin(time * 6) * 0.3;
    ctx.globalAlpha = flashTimer > 0 ? 1 : (0.5 + phase);
    ctx.shadowBlur = 0;
    ctx.shadowColor = '#aa44ff';
    ctx.fillStyle = flashTimer > 0 ? '#fff' : '#2a0a3a';
    ctx.strokeStyle = '#aa44ff';
    ctx.lineWidth = 1.5;
    // 菱形
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.5);
    ctx.lineTo(s * 0.35, 0);
    ctx.lineTo(0, s * 0.5);
    ctx.lineTo(-s * 0.35, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 涓績鍏夌偣
    ctx.fillStyle = '#cc88ff';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawSpiralCaster(ctx, x, y, size, flashTimer, time) {
    const s = size;
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 0;
    ctx.shadowColor = '#ff44aa';
    // 外圈旋转
    ctx.save();
    ctx.rotate(time * 1.5);
    ctx.strokeStyle = flashTimer > 0 ? '#fff' : '#ff44aa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    // 符文标记
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.fillStyle = '#ff88cc';
        ctx.beginPath();
        ctx.arc(fastCos(a) * s * 0.7, fastSin(a) * s * 0.7, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
    // 内核
    ctx.fillStyle = flashTimer > 0 ? '#fff' : '#2a0a1a';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff44aa';
    ctx.stroke();
    // 核心
    ctx.fillStyle = '#ff44aa';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawIronGolem(ctx, x, y, size, flashTimer, time) {
    const s = size;
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowBlur = 0;
    ctx.shadowColor = '#8888aa';
    // 大六边形装甲
    ctx.fillStyle = flashTimer > 0 ? '#fff' : '#1a1a2a';
    ctx.strokeStyle = '#8888cc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        const px = fastCos(a) * s * 0.9;
        const py = fastSin(a) * s * 0.9;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 内六边形
    ctx.strokeStyle = '#6666aa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const px = fastCos(a) * s * 0.5;
        const py = fastSin(a) * s * 0.5;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    // 核心脉动
    const pulse = 0.5 + fastSin(time * 3) * 0.3;
    ctx.fillStyle = `rgba(136, 136, 255, ${pulse})`;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

module.exports = {
    drawBat, drawSwarmDrone, drawGem, drawBullet, drawDataWorm,
    drawPlayer: drawTracer, drawTracer, drawWalker, drawGunner,
    drawCryomancer, drawBiohazard,
    drawBerserker, drawArcane, drawEngineer, drawAssassin,
    drawSkeleton, drawDamageNumber, drawGhost, drawPickup,
    drawFrostWisp, drawSlimeGlob, drawCyberSpider, drawGlitchEntity,
    drawFrostTitan, drawPlagueSource,
    drawFrozenEffect, drawPoisonedEffect,
    drawFireFly, drawCrawler, drawWarpMite, drawSpiralCaster, drawIronGolem, drawLootGoblin,
    loadCharacterSprites,
    setPlayerMoving
};
