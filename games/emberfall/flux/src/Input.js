// ─── 微信小游戏输入系统 ──────────────────────────
// 虚拟摇杆，使用 canvas 绑定或 wx 全局绑定

class Input {
	constructor(canvas) {
		this.canvas = canvas;
		this.active = false;
		this.origin = { x: 0, y: 0 };
		this.current = { x: 0, y: 0 };
		this.vector = { x: 0, y: 0 };

		// 外部场景可以注册 touch 拦截
		this._touchInterceptor = null;

		// 游戏层 touchEnd 回调（技能按钮等）
		this._endCallback = null;

		// 拦截器状态标记 (用于 Safety Valve)
		this.hasInterceptor = false;

		// 尝试绑定到 canvas (真机上可能更稳定)
		if (canvas && canvas.onTouchStart) {
			this._bindCanvasEvents(canvas);
		} else {
			this._bindGlobalEvents();
		}
	}

	_bindCanvasEvents(canvas) {
		canvas.onTouchStart(this._handleStart.bind(this));
		canvas.onTouchMove(this._handleMove.bind(this));
		canvas.onTouchEnd(this._handleEnd.bind(this));
		if (canvas.onTouchCancel) canvas.onTouchCancel(this._handleEnd.bind(this));
	}

	_bindGlobalEvents() {
		wx.onTouchStart(this._handleStart.bind(this));
		wx.onTouchMove(this._handleMove.bind(this));
		wx.onTouchEnd(this._handleEnd.bind(this));
		if (wx.onTouchCancel) wx.onTouchCancel(this._handleEnd.bind(this));
	}

	_handleStart(e) {
		const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
		if (!t) return;

		if (this._touchInterceptor) {
			this._touchInterceptor('start', t.clientX, t.clientY);
			return;
		}
		this._start(t.clientX, t.clientY);
	}

	_handleMove(e) {
		const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
		if (!t) return;
		if (this._touchInterceptor) {
			this._touchInterceptor('move', t.clientX, t.clientY);
			return;
		}
		this._move(t.clientX, t.clientY);
	}

	_handleEnd(e) {
		const t = e.changedTouches && e.changedTouches[0];
		if (this._touchInterceptor) {
			const x = t ? t.clientX : 0;
			const y = t ? t.clientY : 0;
			this._touchInterceptor('end', x, y);
			return;
		}
		const ex = t ? t.clientX : 0;
		const ey = t ? t.clientY : 0;
		if (this._endCallback) this._endCallback(ex, ey);
		this._end();
	}

	setInterceptor(fn) {
		this._touchInterceptor = fn;
		this.hasInterceptor = true;
	}

	clearInterceptor() {
		this._touchInterceptor = null;
		this.hasInterceptor = false;
	}

	_start(x, y) {
		this.active = true;
		this.origin = { x, y };
		this.current = { x, y };
		this.vector = { x: 0, y: 0 };
	}

	_move(x, y) {
		if (!this.active) return;
		this.current = { x, y };
		const dx = x - this.origin.x;
		const dy = y - this.origin.y;
		const d = Math.sqrt(dx * dx + dy * dy);
		const max = 50;
		const deadzone = 8;
		if (d < deadzone) { this.vector = { x: 0, y: 0 }; return; }
		const c = Math.min(d, max);
		this.vector = { x: (dx / d) * (c / max), y: (dy / d) * (c / max) };
	}

	_end() {
		this.active = false;
		this.vector = { x: 0, y: 0 };
	}

	getVector() {
		// Safety check for NaN
		if (isNaN(this.vector.x) || isNaN(this.vector.y)) {
			return { x: 0, y: 0 };
		}
		return this.vector;
	}
}

module.exports = Input;
