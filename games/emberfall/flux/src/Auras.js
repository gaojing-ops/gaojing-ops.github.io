const { fastSin, fastCos } = require('./MathLUT');

const AURA_TYPES = {
    cyber_ring: {
        id: 'cyber_ring', name: '赛博光环',
        desc: '环绕地面的数字脉冲', cost: 2000, color: '#00ffcc',
        draw: (ctx, p, time) => {
            const r = 30 + fastSin(time * 3) * 5;
            ctx.strokeStyle = `rgba(0, 255, 204, 0.4)`;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 10]);
            ctx.beginPath();
            ctx.arc(p.x, p.y + p.radius, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.strokeStyle = `rgba(0, 255, 204, ${0.2 + 0.2 * fastSin(time * 5)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(p.x, p.y + p.radius, r - 8, 0, Math.PI * 2);
            ctx.stroke();
        }
    },
    crimson_aegis: {
        id: 'crimson_aegis', name: '猩红庇护',
        desc: '沸腾的血色护盾残影', cost: 5000, color: '#ff2244',
        draw: (ctx, p, time) => {
            const r = 35;
            const gradient = ctx.createRadialGradient(p.x, p.y, r * 0.5, p.x, p.y, r);
            gradient.addColorStop(0, 'rgba(255, 34, 68, 0)');
            gradient.addColorStop(0.8, `rgba(255, 34, 68, ${0.15 + 0.1 * fastSin(time * 4)})`);
            gradient.addColorStop(1, 'rgba(255, 34, 68, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    },
    aurora_trail: {
        id: 'aurora_trail', name: '极光足迹',
        desc: '移动时留下绚丽的星尘', cost: 12000, color: '#88aaff',
        draw: (ctx, p, time) => {
            // 这部分主要靠底部的 updateAuras 放粒子，此处简单画个高光
            ctx.fillStyle = `rgba(136, 170, 255, ${0.1 + 0.05 * fastSin(time * 2)})`;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y + p.radius + 5, 20, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    },
    void_phantom: {
        id: 'void_phantom', name: '虚空残影',
        desc: '身后跟随着时空破裂的虚影', cost: 25000, color: '#8822ff',
        draw: (ctx, p, time) => {
            if (!p._history) return;
            ctx.save();
            for (let i = 0; i < p._history.length; i += 2) {
                const pos = p._history[i];
                const alpha = (i / p._history.length) * 0.15;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#8822ff';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    },
    crown_of_kings: {
        id: 'crown_of_kings', name: '真王冕冠',
        desc: '尊贵非凡的金色立体阵列', cost: 50000, color: '#ffcc00',
        draw: (ctx, p, time) => {
            ctx.save();
            ctx.translate(p.x, p.y + p.radius);
            ctx.scale(1, 0.4); // 压扁变透视圆环
            ctx.rotate(time * 1.5);
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 2;

            // 外圈六芒星
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = i * Math.PI / 3;
                const r = 45;
                const px = fastCos(angle) * r;
                const py = fastSin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();

            // 内圈转动
            ctx.rotate(-time * 3);
            ctx.strokeStyle = 'rgba(255, 204, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(0, 0, 25, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();

            // 头顶王冠光标
            ctx.fillStyle = `rgba(255, 204, 0, ${0.5 + 0.3 * fastSin(time * 3)})`;
            ctx.textAlign = 'center';
            ctx.font = '16px sans-serif';
            ctx.fillText('👑', p.x, p.y - p.radius - 20 - fastSin(time * 4) * 5);
        }
    }
};

function updateAuras(p, dt, game) {
    if (!p.game || !p.game.meta) return;
    const equipped = p.game.meta.data.selectedAura;
    if (!equipped) return;

    // Tracker for historical positions (Void Phantom)
    if (equipped === 'void_phantom') {
        if (!p._history) p._history = [];
        p._history.unshift({ x: p.x, y: p.y });
        if (p._history.length > 20) p._history.pop();
    }

    // Particle emission for Aurora Trail
    if (equipped === 'aurora_trail') {
        // 放点星尘
        if (p.vx !== 0 || p.vy !== 0) { // 只有移动时
            if (Math.random() < 0.3 && game && game.particles) {
                game.particles.emit(
                    p.x + (Math.random() - 0.5) * 15,
                    p.y + p.radius + (Math.random() - 0.5) * 10,
                    { count: 1, speed: 10, life: 0.8, color: '#88aaff', size: 2 }
                );
            }
        }
    }
}

function drawAuras(ctx, p, time) {
    if (!p.game || !p.game.meta) return;
    const equipped = p.game.meta.data.selectedAura;
    if (!equipped) return;

    const def = AURA_TYPES[equipped];
    if (def && def.draw) {
        ctx.save();
        def.draw(ctx, p, time);
        ctx.restore();
    }
}

module.exports = { AURA_TYPES, updateAuras, drawAuras };
