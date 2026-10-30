// ─── 平台适配层 ──────────────────────────
// 封装微信小游戏和浏览器的 API 差异

/**
 * performance.now() 兼容封装
 * 微信小游戏不一定支持全局 performance 对象
 */
const _perfNow = (function () {
	if (typeof performance !== 'undefined' && performance.now) {
		return () => performance.now();
	}
	if (typeof wx !== 'undefined' && wx.getPerformance) {
		const perf = wx.getPerformance();
		return () => perf.now();
	}
	const start = Date.now();
	return () => Date.now() - start;
})();

function now() {
	return _perfNow();
}

/**
 * 存储适配
 */
function getStorage(key) {
	if (typeof wx === 'undefined') return null;
	try {
		const raw = wx.getStorageSync(key);
		return raw || null;
	} catch (e) {
		return null;
	}
}

function setStorage(key, value) {
	if (typeof wx === 'undefined') return;
	try {
		wx.setStorageSync(key, value);
	} catch (e) {
		console.error('存储失败:', e);
	}
}

/**
 * 获取系统信息
 */
function getSystemInfo() {
	if (typeof wx === 'undefined') return { screenWidth: 390, screenHeight: 844, pixelRatio: 2, platform: 'browser', safeArea: { top: 0 } };
	const info = wx.getSystemInfoSync();
	return {
		screenWidth: info.screenWidth,
		screenHeight: info.screenHeight,
		pixelRatio: info.pixelRatio,
		platform: info.platform,
		safeArea: info.safeArea,
	};
}

/**
 * 创建离屏 Canvas（用于 Icons 等预渲染）
 */
function createOffscreenCanvas(w, h) {
	if (typeof wx === 'undefined') {
		if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
		const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
	}
	if (wx.createOffscreenCanvas) {
		return wx.createOffscreenCanvas({ type: '2d', width: w, height: h });
	}
	const c = wx.createCanvas();
	c.width = w;
	c.height = h;
	return c;
}

/**
 * 触觉反馈（微信振动 API）
 * type: 'light' | 'medium' | 'heavy'
 */
function vibrate(type) {
	// 依据用户需求全局关闭设备振动
	return;
}

/**
 * 保持屏幕常亮（自动走位时防止熄屏暂停）
 */
function setKeepScreenOn(on) {
	if (typeof wx === 'undefined') return;
	try {
		wx.setKeepScreenOn({ keepScreenOn: !!on });
	} catch (e) { /* 静默降级 */ }
}

module.exports = {
	now,
	vibrate,
	getStorage,
	setStorage,
	getSystemInfo,
	createOffscreenCanvas,
	setKeepScreenOn,
};
