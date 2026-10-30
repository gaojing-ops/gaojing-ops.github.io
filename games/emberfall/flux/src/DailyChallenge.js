// ─── 每日挑战（微信小游戏版） ──────────────────────────
// UI 部分已移至 DailyScene.js，此文件仅保留数据逻辑
// localStorage → wx.setStorageSync

const DAILY_KEY = 'flux_musou_daily';
const { CURSE_DEFS } = require('./CurseSystem');

/**
 * 基于日期生成每日种子
 */
function getDailySeed() {
	const d = new Date();
	return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * 简单伪随机（基于种子字符串）
 */
function seededRandom(seed) {
	let h = 0;
	for (let i = 0; i < seed.length; i++) {
		h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
	}
	return function () {
		h = (h * 1103515245 + 12345) & 0x7fffffff;
		return (h % 10000) / 10000;
	};
}

function getDailyConfig() {
	const seed = getDailySeed();
	const rand = seededRandom(seed);

	// 所有可用角色（包括 Cryo/Toxic 扩展）
	const charIds = ['tracer', 'walker', 'gunner', 'cryomancer', 'biohazard'];
	const charId = charIds[Math.floor(rand() * charIds.length)];

	// 所有地图风格（包括 Cryo/Toxic 扩展）
	const mapStyles = ['CyberGrid', 'VoidNebula', 'Matrix', 'CryoRealm', 'ToxicSwamp'];
	const mapStyle = mapStyles[Math.floor(rand() * mapStyles.length)];

	// 固定 1-2 个已解锁诅咒
	const basicCurses = CURSE_DEFS.filter(c => c.unlocked !== false || c.unlockCheck({ totalRuns: 999, bestTime: 999, bestKills: 999 }));
	const curseCount = Math.floor(rand() * 2) + 1;
	const curses = [];
	const pool = [...basicCurses];
	for (let i = 0; i < curseCount && pool.length > 0; i++) {
		const idx = Math.floor(rand() * pool.length);
		curses.push({ id: pool[idx].id });
		pool.splice(idx, 1);
	}

	return { seed, charId, mapStyle, curses };
}

function saveDailyScore(time, kills, level) {
	const seed = getDailySeed();
	try {
		const raw = wx.getStorageSync(DAILY_KEY);
		const data = raw ? JSON.parse(raw) : {};
		if (!data[seed]) data[seed] = [];
		data[seed].push({
			time: _fmtTime(time),
			kills,
			level,
			ts: Date.now(),
			isCurrentPlayer: true,
		});
		data[seed].sort((a, b) => b.kills - a.kills);
		data[seed] = data[seed].slice(0, 10);
		// 清理超过 30 天的旧记录
		const keys = Object.keys(data);
		if (keys.length > 30) {
			keys.sort();
			for (let i = 0; i < keys.length - 30; i++) {
				delete data[keys[i]];
			}
		}
		wx.setStorageSync(DAILY_KEY, JSON.stringify(data));
	} catch (e) {
		console.error('保存每日分数失败:', e);
	}
}

function getDailyLeaderboard(seed) {
	try {
		const raw = wx.getStorageSync(DAILY_KEY);
		const data = raw ? JSON.parse(raw) : {};
		return data[seed] || [];
	} catch (e) {
		return [];
	}
}

function _fmtTime(t) {
	const m = Math.floor(t / 60);
	const s = Math.floor(t % 60);
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

module.exports = { getDailyConfig, saveDailyScore, getDailyLeaderboard };
