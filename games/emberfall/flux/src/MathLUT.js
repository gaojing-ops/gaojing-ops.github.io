// ─── 数学查找表（Sin/Cos 预计算） ──────────────────────────
// 用查找表替代 Math.sin/cos 提升性能

const TABLE_SIZE = 720; // 0.5度精度
const SIN = new Float32Array(TABLE_SIZE);
const COS = new Float32Array(TABLE_SIZE);
const TWO_PI = Math.PI * 2;

for (let i = 0; i < TABLE_SIZE; i++) {
	const a = (i / TABLE_SIZE) * TWO_PI;
	SIN[i] = Math.sin(a);
	COS[i] = Math.cos(a);
}

/**
 * 快速 sin（误差 < 0.5度）
 * @param {number} rad 弧度
 * @returns {number}
 */
function fastSin(rad) {
	// 归一化到 [0, 2π)
	let idx = ((rad % TWO_PI + TWO_PI) % TWO_PI) / TWO_PI * TABLE_SIZE;
	return SIN[(idx | 0) % TABLE_SIZE]; // 防止 idx===TABLE_SIZE 越界
}

/**
 * 快速 cos（误差 < 0.5度）
 * @param {number} rad 弧度
 * @returns {number}
 */
function fastCos(rad) {
	let idx = ((rad % TWO_PI + TWO_PI) % TWO_PI) / TWO_PI * TABLE_SIZE;
	return COS[(idx | 0) % TABLE_SIZE];
}

module.exports = { fastSin, fastCos, SIN, COS, TABLE_SIZE };
