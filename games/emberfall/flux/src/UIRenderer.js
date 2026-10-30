// ─── Canvas UI 渲染器 ──────────────────────────
// 提供通用的 Canvas UI 组件：按钮、卡片、面板、文本等

/**
 * 绘制圆角矩形
 */
function drawSafeRoundRect(ctx, x, y, w, h, r) {
	if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h) || !Number.isFinite(r)) {
		return;
	}
	if (w <= 0 || h <= 0) return;
	const radius = Math.max(0, Math.min(r, w / 2, h / 2));

	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + w - radius, y);
	ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
	ctx.lineTo(x + w, y + h - radius);
	ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
	ctx.lineTo(x + radius, y + h);
	ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
}

/**
 * 绘制按钮
 * @returns {{x,y,w,h}} 命中区域
 */
function drawButton(ctx, text, cx, cy, opts = {}) {
	const fontSize = opts.fontSize || 16;
	const fontFamily = opts.fontFamily || 'sans-serif';
	const color = opts.color || '#00ffcc';
	const bgColor = opts.bgColor || 'rgba(0,255,204,0.08)';
	const borderColor = opts.borderColor || color + '66';
	const paddingX = opts.paddingX || 28;
	const paddingY = opts.paddingY || 10;

	ctx.font = `bold ${fontSize}px ${fontFamily}`;
	const metrics = ctx.measureText(text);
	const tw = metrics.width;
	const w = tw + paddingX * 2;
	const h = fontSize + paddingY * 2;
	const x = cx - w / 2;
	const y = cy - h / 2;

	// 背景
	drawSafeRoundRect(ctx, x, y, w, h, 6);
	ctx.fillStyle = bgColor;
	ctx.fill();
	ctx.strokeStyle = borderColor;
	ctx.lineWidth = 1;
	ctx.stroke();

	// 文字
	ctx.fillStyle = color;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(text, cx, cy);
	ctx.textAlign = 'left';
	ctx.textBaseline = 'alphabetic';

	return { x, y, w, h };
}

/**
 * 绘制卡片
 * @returns {{x,y,w,h}} 命中区域
 */
function drawCard(ctx, x, y, w, h, opts = {}) {
	const borderColor = opts.borderColor || 'rgba(255,255,255,0.1)';
	const bgColor = opts.bgColor || 'rgba(255,255,255,0.03)';
	const active = opts.active || false;
	const glow = opts.glow || null;

	ctx.save();
	if (glow) {
		// 用加粗边框替代 shadowBlur 实现发光效果（性能优化）
		ctx.strokeStyle = glow;
		ctx.lineWidth = 3;
	}
	drawSafeRoundRect(ctx, x, y, w, h, 10);
	ctx.fillStyle = active ? (glow ? glow + '18' : 'rgba(255,255,255,0.06)') : bgColor;
	ctx.fill();
	ctx.strokeStyle = active ? (glow || '#ffffff') : borderColor;
	ctx.lineWidth = active ? 1.5 : 1;
	ctx.stroke();
	ctx.restore();

	return { x, y, w, h };
}

/**
 * 绘制进度条
 */
function drawBar(ctx, x, y, w, h, pct, opts = {}) {
	const bgColor = opts.bgColor || 'rgba(255,255,255,0.15)';
	const fillColor = opts.fillColor || '#00ffcc';
	const borderRadius = opts.borderRadius || 0;

	if (borderRadius > 0) {
		drawSafeRoundRect(ctx, x, y, w, h, borderRadius);
		ctx.fillStyle = bgColor;
		ctx.fill();
		ctx.save();
		ctx.beginPath();
		drawSafeRoundRect(ctx, x, y, w, h, borderRadius);
		ctx.clip();
		ctx.fillStyle = fillColor;
		ctx.fillRect(x, y, w * Math.max(0, Math.min(1, pct)), h);
		ctx.restore();
	} else {
		ctx.fillStyle = bgColor;
		ctx.fillRect(x, y, w, h);
		ctx.fillStyle = fillColor;
		ctx.fillRect(x, y, w * Math.max(0, Math.min(1, pct)), h);
	}
}

/**
 * 绘制居中文本
 */
function drawCenteredText(ctx, text, cx, y, opts = {}) {
	const fontSize = opts.fontSize || 14;
	const color = opts.color || '#ffffff';
	const fontStyle = opts.fontStyle || 'bold';
	const fontFamily = opts.fontFamily || 'sans-serif';

	ctx.save();
	ctx.font = `${fontStyle} ${fontSize}px ${fontFamily}`;
	ctx.fillStyle = color;
	ctx.textAlign = 'center';
	if (opts.shadow) {
		// 移除 shadowBlur，改用双重文字实现阴影效果
		ctx.fillStyle = opts.shadow;
		ctx.fillText(text, cx + 1, y + 1);
		ctx.fillStyle = color;
	}
	ctx.fillText(text, cx, y);
	ctx.textAlign = 'left';
	ctx.restore();
}

/**
 * 绘制多行文本
 */
function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, opts = {}) {
	const fontSize = opts.fontSize || 12;
	const color = opts.color || '#888';
	ctx.font = `${fontSize}px sans-serif`;
	ctx.fillStyle = color;

	const words = text.split('');
	let line = '';
	let cy = y;

	for (const char of words) {
		const testLine = line + char;
		if (ctx.measureText(testLine).width > maxWidth && line.length > 0) {
			ctx.fillText(line, x, cy);
			line = char;
			cy += lineHeight;
		} else {
			line = testLine;
		}
	}
	ctx.fillText(line, x, cy);
	return cy + lineHeight;
}

/**
 * 绘制全屏半透明遮罩
 */
function drawOverlay(ctx, w, h, alpha = 0.85) {
	ctx.fillStyle = `rgba(10,8,20,${alpha})`;
	ctx.fillRect(0, 0, w, h);
}

/**
 * 命中测试
 */
function hitTest(x, y, rect) {
	return x >= rect.x && x <= rect.x + rect.w &&
		y >= rect.y && y <= rect.y + rect.h;
}

module.exports = {
	drawSafeRoundRect,
	drawRoundRect: drawSafeRoundRect, // 别名
	drawButton,
	drawCard,
	drawBar,
	drawCenteredText,
	drawWrappedText,
	drawOverlay,
	hitTest,
};
