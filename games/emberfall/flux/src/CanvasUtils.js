// ─── 共用 Canvas 工具函数 ──────────────────────────
// [BUG-R3-12] 从 StageSystem.js / BossRushMode.js 提取，避免重复定义

/**
 * 安全圆角矩形路径（兼容不支持 ctx.roundRect 的旧 Canvas 环境）
 * 只构建路径，不填充/描边
 */
function safeRoundRect(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.lineTo(x + w - r, y);
	ctx.quadraticCurveTo(x + w, y, x + w, y + r);
	ctx.lineTo(x + w, y + h - r);
	ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
	ctx.lineTo(x + r, y + h);
	ctx.quadraticCurveTo(x, y + h, x, y + h - r);
	ctx.lineTo(x, y + r);
	ctx.quadraticCurveTo(x, y, x + r, y);
	ctx.closePath();
}

module.exports = { safeRoundRect };
