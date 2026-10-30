// ─── 速通模式场景 ──────────────────────────
// 显示本地记录、选择角色、启动"击杀500计时"模式
const UI = require('../UIRenderer');

const STORAGE_KEY = 'flux_speedrun_records';
const KILL_TARGET  = 500;
const MAX_RECORDS  = 10;

function loadRecords() {
    try {
        const raw = wx.getStorageSync(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
}

function saveRecord(timeMs, charId) {
    const records = loadRecords();
    const _d = new Date();
    const _date = _d.getFullYear() + '/' + (_d.getMonth() + 1) + '/' + _d.getDate();
    records.push({ time: timeMs, charId, date: _date });
    records.sort((a, b) => a.time - b.time);
    records.splice(MAX_RECORDS); // 只保留最快10条
    try { wx.setStorageSync(STORAGE_KEY, JSON.stringify(records)); } catch (e) {}
    return records;
}

function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const msec = Math.floor((ms % 1000) / 10);
    return `${m}:${String(sec).padStart(2, '0')}.${String(msec).padStart(2, '0')}`;
}

class SpeedRunScene {
    constructor() {
        this.records = [];
        this.startBtn = null;
        this.backBtn = null;
    }

    enter() {
        this.records = loadRecords();
    }

    draw(ctx, w, h) {
        UI.drawOverlay(ctx, w, h, 1.0);

        const topOffset = (this.game && this.game.safeAreaTop) || 0;
        const margin = Math.max(30, w * 0.06);

        // 标题
        UI.drawCenteredText(ctx, '⚡ 速通模式', w / 2, 35 + topOffset, {
            fontSize: 18, color: '#ff6600', shadow: '#ff6600',
        });
        UI.drawCenteredText(ctx, `目标: 击杀 ${KILL_TARGET} 敌人`, w / 2, 55 + topOffset, {
            fontSize: 11, color: '#aaa', fontStyle: 'normal',
        });

        let cy = 78 + topOffset;

        // 最佳记录
        UI.drawCenteredText(ctx, '🏅 最快记录', w / 2, cy, { fontSize: 14, color: '#ffcc00' });
        cy += 22;

        if (this.records.length === 0) {
            UI.drawCenteredText(ctx, '暂无记录', w / 2, cy, {
                fontSize: 12, color: '#666', fontStyle: 'normal',
            });
            cy += 20;
        } else {
            ctx.save();
            ctx.textAlign = 'center';
            const medals = ['🥇', '🥈', '🥉'];
            this.records.forEach((r, i) => {
                const medal = i < 3 ? medals[i] : `${i + 1}.`;
                ctx.fillStyle = i === 0 ? '#ffcc00' : (i < 3 ? '#aaa' : '#666');
                ctx.font = i === 0 ? 'bold 13px sans-serif' : '12px sans-serif';
                ctx.fillText(
                    `${medal}  ${formatTime(r.time)}  ${r.charId || '?'}  ${r.date || ''}`,
                    w / 2, cy
                );
                cy += 18;
            });
            ctx.textAlign = 'left';
            ctx.restore();
        }

        cy += 12;
        UI.drawCenteredText(ctx, '选择任意角色后自动进入速通模式', w / 2, cy, {
            fontSize: 10, color: '#555', fontStyle: 'normal',
        });

        // 按钮
        const btnY = h - 80;
        this.startBtn = UI.drawButton(ctx, '开始速通', w / 2, btnY, {
            fontSize: 14, color: '#ff6600',
            bgColor: 'rgba(255,102,0,0.08)',
            borderColor: '#ff660066',
        });
        this.backBtn = UI.drawButton(ctx, '返回', w / 2, btnY + 40, {
            fontSize: 12, color: '#aaa',
            bgColor: 'rgba(255,255,255,0.12)',
            borderColor: 'rgba(255,255,255,0.35)',
        });
    }

    onTouchStart(x, y) {
        if (this.startBtn && UI.hitTest(x, y, this.startBtn)) {
            if (this.onStart) this.onStart();
            else this.manager.switchTo('charSelect', { speedRunMode: true });
            return;
        }
        if (this.backBtn && UI.hitTest(x, y, this.backBtn)) {
            if (this.onBack) this.onBack();
            else this.manager.switchTo('title');
        }
    }
}

module.exports = { SpeedRunScene, loadRecords, saveRecord, formatTime, KILL_TARGET };
