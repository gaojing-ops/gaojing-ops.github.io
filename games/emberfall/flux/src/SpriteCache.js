// ─── 精灵缓存 ──────────────────────────
// 预渲染敌人/宝石精灵到离屏 Canvas，运行时用 drawImage 替代实时绘制
// 微信小游戏使用 wx.createCanvas() 创建离屏画布

const { drawBat, drawSwarmDrone, drawGem, drawBullet, drawDataWorm,
	drawSkeleton, drawGhost, drawPickup,
	drawFrostWisp, drawSlimeGlob, drawCyberSpider, drawGlitchEntity,
	drawFrostTitan, drawPlagueSource,
	drawFireFly, drawCrawler, drawWarpMite, drawSpiralCaster, drawIronGolem
} = require('./Renderer');

class SpriteCache {
	constructor() {
		this._cache = new Map();   // key → { normal: canvas, flash: canvas }
		this._bulletCache = new Map(); // 子弹精灵缓存
	}

	/**
	 * 初始化所有敌人精灵
	 * 每种敌人预渲染 normal 和 flash(白色) 两个状态
	 */
	init() {
		// 敌人绘制函数映射（函数引用 → 名称）
		const drawFuncs = {
			'drawBat': { fn: drawBat, radius: 10 },
			'drawSwarmDrone': { fn: drawSwarmDrone, radius: 6 },
			'drawSkeleton': { fn: drawSkeleton, radius: 12 },
			'drawGhost': { fn: drawGhost, radius: 11 },
			'drawDataWorm': { fn: drawDataWorm, radius: 14 },
			'drawFrostWisp': { fn: drawFrostWisp, radius: 11 },
			'drawSlimeGlob': { fn: drawSlimeGlob, radius: 13 },
			'drawCyberSpider': { fn: drawCyberSpider, radius: 10 },
			'drawGlitchEntity': { fn: drawGlitchEntity, radius: 14 },
			'drawFrostTitan': { fn: drawFrostTitan, radius: 20 },
			'drawPlagueSource': { fn: drawPlagueSource, radius: 22 },
			'drawFireFly': { fn: drawFireFly, radius: 4 },
			'drawCrawler': { fn: drawCrawler, radius: 7 },
			'drawWarpMite': { fn: drawWarpMite, radius: 6 },
			'drawSpiralCaster': { fn: drawSpiralCaster, radius: 12 },
			'drawIronGolem': { fn: drawIronGolem, radius: 22 },
		};

		// 预渲染每种敌人（normal + flash 两张精灵）
		for (const [name, { fn, radius }] of Object.entries(drawFuncs)) {
			const size = radius * 1.3; // Enemy.draw 中使用 radius * 1.3
			const padding = Math.ceil(size * 2.5); // 留够边距
			const w = padding * 2;
			const h = padding * 2;

			// Normal 状态 (flashTimer = 0, time = 0)
			const normalCanvas = this._createCanvas(w, h);
			const normalCtx = normalCanvas.getContext('2d');
			fn(normalCtx, padding, padding, size, 0, 0);

			// Flash 状态 (flashTimer = 0.1, time = 0)
			const flashCanvas = this._createCanvas(w, h);
			const flashCtx = flashCanvas.getContext('2d');
			fn(flashCtx, padding, padding, size, 0.1, 0);

			this._cache.set(fn, {
				normal: normalCanvas,
				flash: flashCanvas,
				size: padding, // 中心偏移
				radius: radius,
			});
		}

		// 预渲染宝石
		const gemCanvas = this._createCanvas(20, 20);
		const gemCtx = gemCanvas.getContext('2d');
		drawGem(gemCtx, 10, 10, 6);
		this._gemSprite = gemCanvas;
	}

	/**
	 * 获取敌人精灵
	 * @param {Function} drawFn 敌人的 _draw 函数引用
	 * @param {boolean} isFlash 是否闪白
	 * @returns {{ canvas, size }} 或 null（无缓存时回退实时绘制）
	 */
	getEnemySprite(drawFn, isFlash) {
		const entry = this._cache.get(drawFn);
		if (!entry) return null;
		return {
			canvas: isFlash ? entry.flash : entry.normal,
			offset: entry.size,
			cachedRadius: entry.radius,
		};
	}

	/** 获取宝石精灵 */
	getGemSprite() {
		return this._gemSprite;
	}

	/**
	 * 创建离屏 Canvas（兼容微信/浏览器）
	 */
	_createCanvas(w, h) {
		if (typeof wx !== 'undefined' && wx.createOffscreenCanvas) {
			return wx.createOffscreenCanvas({ type: '2d', width: w, height: h });
		}
		if (typeof wx !== 'undefined' && wx.createCanvas) {
			const c = wx.createCanvas();
			c.width = w;
			c.height = h;
			return c;
		}
		// 浏览器环境回退
		if (typeof OffscreenCanvas !== 'undefined') {
			return new OffscreenCanvas(w, h);
		}
		const c = document.createElement('canvas');
		c.width = w;
		c.height = h;
		return c;
	}
}

// 全局单例
const spriteCache = new SpriteCache();

module.exports = spriteCache;
