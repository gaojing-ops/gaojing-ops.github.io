const { fastSin, fastCos } = require('./MathLUT');
const Art = require('./Art');
// ─── 地图管理器（背景渲染） ──────────────────────────

class MapManager {
    constructor() {
        this.style = 'CyberGrid';
        this.images = {};
        this.loaded = false;
        this.time = 0;

        // 渐变缓存
        this._cachedW = 0;
        this._cachedH = 0;
        this._bgGradient = null;
        this._vignetteGradient = null;
        this._cachedStyle = null;

        // 柔和的背景粒子
        this.bgParticles = Array.from({ length: 80 }, () => ({
            x: Math.random() * 2000,
            y: Math.random() * 2000,
            size: 1 + Math.random() * 3,
            alpha: 0.1 + Math.random() * 0.3,
            speed: 0.2 + Math.random() * 0.5,
            drift: Math.random() * Math.PI * 2
        }));

        // 远景光晕
        this.glowSpots = Array.from({ length: 6 }, () => ({
            x: Math.random() * 1500,
            y: Math.random() * 1500,
            radius: 100 + Math.random() * 200,
            alpha: 0.03 + Math.random() * 0.05,
            pulse: Math.random() * Math.PI * 2
        }));

        // 地图配置
        this.mapConfigs = {
            CyberGrid: {
                bgColorTop: '#0a0a14',
                bgColorBottom: '#0f0f1a',
                accentColor: '#00ffcc',
                glowColor: 'rgba(0,255,204,0.02)',
                bgImage: 'assets/maps/cybergrid.jpg',
            },
            VoidNebula: {
                bgColorTop: '#0a0015',
                bgColorBottom: '#150020',
                accentColor: '#aa44ff',
                glowColor: 'rgba(170,68,255,0.03)',
                bgImage: 'assets/maps/voidnebula.jpg',
            },
            Matrix: {
                bgColorTop: '#000800',
                bgColorBottom: '#001a00',
                accentColor: '#00ff44',
                glowColor: 'rgba(0,255,68,0.02)',
                bgImage: 'assets/maps/matrix.jpg',
            },
            CryoRealm: {
                bgColorTop: '#051015',
                bgColorBottom: '#0a1a25',
                accentColor: '#44ccff',
                glowColor: 'rgba(68,204,255,0.02)',
                bgImage: 'assets/maps/cryorealm.jpg',
            },
            ToxicSwamp: {
                bgColorTop: '#0a1005',
                bgColorBottom: '#101a08',
                accentColor: '#88ff00',
                glowColor: 'rgba(136,255,0,0.02)',
                bgImage: 'assets/maps/toxicswamp.jpg',
            }
        };
    }

    async preloadImages() { await Art.preload(); this.loaded = true; }

    setStyle(s) {
        this.style = s;
    }

    draw(ctx, camX, camY, w, h, dt) {
        const config = this.mapConfigs[this.style] || this.mapConfigs.CyberGrid;
        this.time += dt || 0.016;

        const bgImg = this.images[this.style];

        if (Art.drawMap(ctx,this.style,camX,camY,w,h)) {
            // The atlas supplies all five chapter materials.
        } else if (bgImg && bgImg.width > 0) {
            // ═══ 贴图平铺模式 ═══
            this._drawTiledBackground(ctx, bgImg, camX, camY, w, h);
        } else {
            // ═══ 回退：代码渐变绘制 ═══
            if (w !== this._cachedW || h !== this._cachedH || this.style !== this._cachedStyle) {
                this._cachedW = w;
                this._cachedH = h;
                this._cachedStyle = this.style;
                this._bgGradient = ctx.createLinearGradient(0, 0, 0, h);
                this._bgGradient.addColorStop(0, config.bgColorTop);
                this._bgGradient.addColorStop(1, config.bgColorBottom);
            }
            ctx.fillStyle = this._bgGradient;
            ctx.fillRect(0, 0, w, h);
        }

        // 2. 远景光晕（视差很小）
        this._drawGlowSpots(ctx, camX, camY, w, h, config);

        // 3. 柔和粒子
        this._drawBgParticles(ctx, camX, camY, w, h, config);

        // 4. 角落渐变阴影（增加暗角深度感）
        this._drawVignette(ctx, w, h);
    }

    /**
     * 平铺绘制背景贴图，随相机滚动
     */
    _drawTiledBackground(ctx, img, camX, camY, w, h) {
        const tw = img.width;
        const th = img.height;
        if (tw <= 0 || th <= 0) return;

        // 视差系数：背景滚动速度是相机的0.3倍，有层次感
        const parallax = 0.3;
        const offsetX = (camX * parallax) % tw;
        const offsetY = (camY * parallax) % th;

        // 计算起始贴图位置（向左上扩展一个贴图确保无缝）
        const startX = -((offsetX % tw) + tw) % tw;
        const startY = -((offsetY % th) + th) % th;

        for (let y = startY; y < h; y += th) {
            for (let x = startX; x < w; x += tw) {
                ctx.drawImage(img, x, y, tw, th);
            }
        }
    }

    /**
     * 根据游戏时间自动切换地图风格
     * 每4分钟切换一次，循环所有风格
     * @param {number} gameTime 游戏经过时间(秒)
     */
    updateStyleByTime(gameTime) {
        const STYLES = ['CyberGrid', 'VoidNebula', 'Matrix', 'CryoRealm', 'ToxicSwamp'];
        const INTERVAL = 240; // 4分钟
        const idx = Math.floor(gameTime / INTERVAL) % STYLES.length;
        const newStyle = STYLES[idx];
        if (newStyle !== this.style) {
            this.setStyle(newStyle);
        }
    }

    _drawGlowSpots(ctx, cx, cy, w, h, config) {
        for (const g of this.glowSpots) {
            const parallax = 0.1;
            let sx = ((g.x - cx * parallax) % 1500 + 1500) % 1500;
            let sy = ((g.y - cy * parallax) % 1500 + 1500) % 1500;

            // 脉动效果
            const pulse = fastSin(this.time * 0.5 + g.pulse) * 0.3 + 1;
            const r = g.radius * pulse;

            // 绘制柔和光晕
            const glowGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
            glowGrad.addColorStop(0, config.glowColor);
            glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawBgParticles(ctx, cx, cy, w, h, config) {
        for (const p of this.bgParticles) {
            let sx = ((p.x - cx * 0.3) % 2000 + 2000) % 2000;
            let sy = ((p.y - cy * 0.3) % 2000 + 2000) % 2000;

            // 微微闪烁
            const flicker = fastSin(this.time * p.speed * 2 + p.drift) * 0.2 + 0.8;

            ctx.globalAlpha = p.alpha * flicker;
            ctx.fillStyle = config.accentColor;
            ctx.beginPath();
            ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    _drawVignette(ctx, w, h) {
        // 缓存暗角渐变
        if (!this._vignetteGradient || w !== this._vignetteW || h !== this._vignetteH) {
            this._cachedW = w;
            this._cachedH = h;
            this._vignetteGradient = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.9);
            this._vignetteW = w; this._vignetteH = h;
        this._vignetteGradient.addColorStop(0, 'rgba(0,0,0,0)');
            this._vignetteGradient.addColorStop(1, 'rgba(0,0,0,0.4)');
        }
        ctx.fillStyle = this._vignetteGradient;
        ctx.fillRect(0, 0, w, h);
    }

    /** 获取当前地图配置 */
    getConfig() {
        return this.mapConfigs[this.style] || this.mapConfigs.CyberGrid;
    }
}

module.exports = MapManager;
