// ─── 对象池 ──────────────────────────
// 通用对象池，复用已失活对象避免频繁 new/GC

class ObjectPool {
	/**
	 * @param {Function} factory  创建新对象的工厂函数
	 * @param {Function} reset    重置对象状态的函数
	 * @param {number} prealloc   预分配数量
	 */
	constructor(factory, reset, prealloc = 0) {
		this._factory = factory;
		this._reset = reset;
		this._pool = [];
		// 预分配
		for (let i = 0; i < prealloc; i++) {
			this._pool.push(factory());
		}
	}

	/** 获取一个对象（从池中取或新建） */
	get() {
		if (this._pool.length > 0) {
			const obj = this._pool.pop();
			obj._pooled = false;
			return obj;
		}
		return this._factory();
	}

	/** 归还对象到池中 */
	release(obj) {
		if (obj._pooled) return; // 防止双重释放
		obj._pooled = true;
		this._reset(obj);
		this._pool.push(obj);
	}

	/** 批量归还 */
	releaseAll(list) {
		for (let i = 0; i < list.length; i++) {
			const obj = list[i];
			if (obj._pooled) continue;
			obj._pooled = true;
			this._reset(obj);
			this._pool.push(obj);
		}
	}

	/** 池中空闲数量 */
	get available() { return this._pool.length; }
}

module.exports = ObjectPool;
