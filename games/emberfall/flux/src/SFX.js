// ─── 微信小游戏音效系统（带程序化音效生成） ──────────────────────────
// 支持外部 mp3 文件，缺失时自动使用程序化生成的音效

const audioPool = {};
const audioAvailable = {}; // 记录哪些音频文件可用
let masterVolume = 1.0;
let sfxVolume = 0.8;
let bgmVolume = 0.5;
let isMuted = false;
let bgmContext = null;
let currentBgm = null;
let webAudioCtx = null;
let useProcedural = true; // 默认使用程序化音效，避免文件缺失错误

// 音效配置
const SFX_CONFIG = {
    shoot: { file: 'shoot', volume: 0.3, proc: 'shoot' },
    hit: { file: 'hit', volume: 0.4, proc: 'hit' },
    kill: { file: 'kill', volume: 0.5, proc: 'kill' },
    gem: { file: 'gem', volume: 0.3, proc: 'gem' },
    levelup: { file: 'levelup', volume: 0.7, proc: 'levelup' },
    boss: { file: 'boss', volume: 0.8, proc: 'boss' },
    player_hit: { file: 'player_hit', volume: 0.6, proc: 'hit' },
    event: { file: 'event', volume: 0.5, proc: 'event' },
    freeze: { file: 'freeze', volume: 0.4, proc: 'freeze' },
    poison: { file: 'poison', volume: 0.4, proc: 'poison' },
    explosion: { file: 'explosion', volume: 0.6, proc: 'explosion' },
    upgrade: { file: 'upgrade', volume: 0.5, proc: 'upgrade' },
    evolve: { file: 'evolve', volume: 0.7, proc: 'evolve' },
    button: { file: 'button', volume: 0.3, proc: 'button' },
    curse: { file: 'curse', volume: 0.5, proc: 'curse' },
    victory: { file: 'victory', volume: 0.8, proc: 'victory' },
    defeat: { file: 'defeat', volume: 0.8, proc: 'defeat' },
    synergy: { file: 'synergy', volume: 0.6, proc: 'synergy' },
    combo: { file: 'combo', volume: 0.5, proc: 'combo' },
    boss_phase: { file: 'boss_phase', volume: 0.6, proc: 'boss_phase' },
    turret: { file: 'turret', volume: 0.2, proc: 'turret' },
};

// 武器音效映射
const WEAPON_SFX = {
    flux_bolt: 'shoot',
    chain_spark: 'shoot',
    pulse_ring: 'shoot',
    radiation_field: 'event',
    soul_drain: 'event',
    shadow_clone: 'event',
    plasma_arc: 'shoot',
    napalm: 'explosion',
    rocket_swarm: 'explosion',
    ice_shard: 'freeze',
    glacial_nova: 'freeze',
    frozen_orb: 'freeze',
    toxin_spray: 'poison',
    acid_pool: 'poison',
    venom_sting: 'poison',
};

// ─── 初始化 Web Audio Context ───

function _initWebAudio() {
    if (webAudioCtx) return webAudioCtx;
    try {
        // 微信小游戏使用 wx.createWebAudioContext
        if (typeof wx !== 'undefined' && wx.createWebAudioContext) {
            webAudioCtx = wx.createWebAudioContext();
        } else if (typeof AudioContext !== 'undefined') {
            webAudioCtx = new AudioContext();
        } else if (typeof webkitAudioContext !== 'undefined') {
            webAudioCtx = new webkitAudioContext();
        }
        useProcedural = !!webAudioCtx;
        return webAudioCtx;
    } catch (e) {
        console.warn('Web Audio not available');
        return null;
    }
}

// ─── 检查音频文件夹是否存在 ───
// 简化版：微信小游戏项目内音频文件难以检测，直接使用程序化音效

function _checkAudioFolder() {
    // 始终返回 false，使用程序化音效
    // 如需使用外部音频，请手动改为 true 并确保 audio/ 目录存在
    return false;
}

// ─── 程序化音效生成器 ───

const PROCEDURAL_SFX = {
    // 发射音效 - 短促的高频音
    shoot: (ctx, vol) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(vol * 0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
    },

    // 命中音效 - 中频短音
    hit: (ctx, vol) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(vol * 0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
    },

    // 击杀音效 - 下降音
    kill: (ctx, vol) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(vol * 0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    },

    // 收集经验 - 上升音
    gem: (ctx, vol) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.05); // E5
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.1); // G5
        gain.gain.setValueAtTime(vol * 0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    },

    // 升级 - 和弦
    levelup: (ctx, vol) => {
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
            gain.gain.linearRampToValueAtTime(vol * 0.15, ctx.currentTime + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.08);
            osc.stop(ctx.currentTime + i * 0.08 + 0.3);
        });
    },

    // Boss出现 - 深沉警告
    boss: (ctx, vol) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, ctx.currentTime);
        osc.frequency.setValueAtTime(100, ctx.currentTime + 0.2);
        osc.frequency.setValueAtTime(80, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(vol * 0.3, ctx.currentTime);
        gain.gain.setValueAtTime(vol * 0.3, ctx.currentTime + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
    },

    // 事件触发 - 铃声
    event: (ctx, vol) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(vol * 0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    },

    // 冰冻 - 晶体音
    freeze: (ctx, vol) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1200, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1800, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(vol * 0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.15);
        osc2.stop(ctx.currentTime + 0.15);
    },

    // 中毒 - 气泡音
    poison: (ctx, vol) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(vol * 0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    },

    // 爆炸 - 噪音
    explosion: (ctx, vol) => {
        // 复用预生成的噪音缓冲区
        if (!PROCEDURAL_SFX._explosionBuffer || PROCEDURAL_SFX._explosionBufferRate !== ctx.sampleRate) {
            const bufferSize = ctx.sampleRate * 0.3;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            PROCEDURAL_SFX._explosionBuffer = buffer;
            PROCEDURAL_SFX._explosionBufferRate = ctx.sampleRate;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = PROCEDURAL_SFX._explosionBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol * 0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(ctx.currentTime);
        noise.stop(ctx.currentTime + 0.3);
    },

    // 升级选择
    upgrade: (ctx, vol) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(554, ctx.currentTime + 0.05);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(vol * 0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    },

    // 武器进化 - 华丽音效
    evolve: (ctx, vol) => {
        const notes = [392, 494, 587, 784, 988, 1175]; // G4 到 D6
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.06);
            gain.gain.linearRampToValueAtTime(vol * 0.2, ctx.currentTime + i * 0.06 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.06);
            osc.stop(ctx.currentTime + i * 0.06 + 0.2);
        });
    },

    // 按钮点击
    button: (ctx, vol) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 660;
        gain.gain.setValueAtTime(vol * 0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
    },

    // 诅咒激活 - 不祥音
    curse: (ctx, vol) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(vol * 0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    },

    // 胜利 - 凯旋曲
    victory: (ctx, vol) => {
        const melody = [523, 659, 784, 1047, 784, 1047]; // C E G C G C
        melody.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
            gain.gain.linearRampToValueAtTime(vol * 0.25, ctx.currentTime + i * 0.15 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.4);
        });
    },

    // 失败 - 下降音
    defeat: (ctx, vol) => {
        const notes = [392, 330, 294, 262]; // G F E D
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.2);
            gain.gain.linearRampToValueAtTime(vol * 0.3, ctx.currentTime + i * 0.2 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.2);
            osc.stop(ctx.currentTime + i * 0.2 + 0.4);
        });
    },

    // 协同触发 - 双音共鸣
    synergy: (ctx, vol) => {
        [660, 990].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(vol * 0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.03);
            osc.stop(ctx.currentTime + 0.25);
        });
    },

    // 连击 - 上升动力音
    combo: (ctx, vol) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(330, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(vol * 0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
    },

    // Boss 转段阶段
    boss_phase: (ctx, vol) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.2);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(vol * 0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
    },

    // 炮台射击
    turret: (ctx, vol) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(vol * 0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
    },
};

// ─── 播放音效 ───

function _getAudio(name) {
    // 如果已知该音频不可用，直接返回 null
    if (audioAvailable[name] === false) return null;

    // 如果没有音频文件夹，直接返回 null（使用程序化音效）
    if (!_checkAudioFolder()) return null;

    if (!audioPool[name]) {
        try {
            const audio = wx.createInnerAudioContext();
            audio.src = `audio/${name}.mp3`;

            // 监听错误，标记为不可用
            audio.onError((err) => {
                audioAvailable[name] = false;
                // 清理失败的音频对象
                try {
                    if (audioPool[name] === audio) {
                        audioPool[name] = null;
                    }
                    audio.destroy();
                } catch (e) { }
            });

            audioPool[name] = audio;
        } catch (e) {
            audioAvailable[name] = false;
            return null;
        }
    }
    return audioPool[name];
}

function _play(name, volumeMult = 1) {
    if (isMuted) return;

    const config = SFX_CONFIG[name] || { file: name, volume: 0.5, proc: 'hit' };

    // 只有在音频文件可用时才尝试播放
    if (audioAvailable[config.file] !== false) {
        const audio = _getAudio(config.file);
        if (audio && audioAvailable[config.file] !== false) {
            try {
                audio.stop();
                audio.seek(0);
                audio.volume = masterVolume * sfxVolume * (config.volume || 0.5) * volumeMult;
                audio.play();
                return;
            } catch (e) {
                // 外部音频失败，使用程序化音效
            }
        }
    }

    // 使用程序化音效
    if (useProcedural && webAudioCtx && PROCEDURAL_SFX[config.proc]) {
        try {
            const vol = masterVolume * sfxVolume * (config.volume || 0.5) * volumeMult;
            PROCEDURAL_SFX[config.proc](webAudioCtx, vol);
        } catch (e) {
            // 静默失败
        }
    }
}

// ─── 公共 API ───

function initAudio() {
    _initWebAudio();

    // 预加载常用音效（静默处理错误）
    ['shoot', 'hit', 'kill', 'gem', 'levelup'].forEach(name => {
        try {
            _getAudio(name);
        } catch (e) { }
    });
}

function setMasterVolume(v) {
    masterVolume = Math.max(0, Math.min(1, v));
    if (bgmContext) bgmContext.volume = masterVolume * bgmVolume;
}

function setSfxVolume(v) {
    sfxVolume = Math.max(0, Math.min(1, v));
}

function setBgmVolume(v) {
    bgmVolume = Math.max(0, Math.min(1, v));
    if (bgmContext) bgmContext.volume = masterVolume * bgmVolume;
}

function toggleMute() {
    isMuted = !isMuted;
    if (bgmContext) bgmContext.muted = isMuted;
    return isMuted;
}

function setMuted(val) {
    isMuted = !!val;
    if (bgmContext) bgmContext.muted = isMuted;
}

function playBGM(name = 'bgm') {
    // 如果已知 BGM 不可用，直接跳过
    if (audioAvailable[name] === false) return;

    // 如果没有音频文件夹，直接跳过（不播放BGM）
    if (!_checkAudioFolder()) return;

    try {
        if (bgmContext) {
            bgmContext.stop();
            bgmContext.destroy();
            bgmContext = null;
        }

        bgmContext = wx.createInnerAudioContext();
        bgmContext.src = `audio/${name}.mp3`;
        bgmContext.loop = true;
        bgmContext.volume = masterVolume * bgmVolume;
        bgmContext.muted = isMuted;

        // 监听错误，标记为不可用
        bgmContext.onError((err) => {
            audioAvailable[name] = false;
            if (bgmContext) {
                try { bgmContext.destroy(); } catch (e) { }
                bgmContext = null;
            }
        });

        bgmContext.play();
        currentBgm = name;
    } catch (e) {
        // 没有BGM文件时静默跳过
        audioAvailable[name] = false;
        bgmContext = null;
    }
}

function stopBGM() {
    if (bgmContext) {
        try { bgmContext.stop(); } catch (e) { }
    }
}

function pauseBGM() {
    if (bgmContext) {
        try { bgmContext.pause(); } catch (e) { }
    }
}

function resumeBGM() {
    if (bgmContext && !isMuted) {
        try { bgmContext.play(); } catch (e) { }
    }
}

// ─── 音效函数 ───

function sfxShoot() { _play('shoot'); }
function sfxHit() { _play('hit'); }
function sfxKill() { _play('kill'); }
function sfxGem() { _play('gem'); }
function sfxLevelUp() { _play('levelup'); }
function sfxBossAppear() { _play('boss'); }
function sfxBossDeath() { _play('explosion'); }
function sfxPlayerHit() { _play('player_hit'); }
function sfxEvent() { _play('event'); }
function sfxFreeze() { _play('freeze'); }
function sfxPoison() { _play('poison'); }
function sfxExplosion() { _play('explosion'); }
function sfxUpgrade() { _play('upgrade'); }
function sfxEvolve() { _play('evolve'); }
function sfxButton() { _play('button'); }
function sfxCurse() { _play('curse'); }
function sfxVictory() { _play('victory'); }
function sfxDefeat() { _play('defeat'); }
function sfxSynergy() { _play('synergy'); }
function sfxCombo() { _play('combo'); }

// 连锁收集递增音调（do-re-mi...）
const _GEM_CHAIN_NOTES = [523, 587, 659, 698, 784, 880, 988, 1047, 1175, 1319, 1397, 1568];
function sfxGemChain(step) {
    if (isMuted || !webAudioCtx) return;
    try {
        const idx = Math.min(step - 1, _GEM_CHAIN_NOTES.length - 1);
        const freq = _GEM_CHAIN_NOTES[idx];
        const osc = webAudioCtx.createOscillator();
        const gain = webAudioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, webAudioCtx.currentTime);
        const vol = masterVolume * sfxVolume * 0.12;
        gain.gain.setValueAtTime(vol, webAudioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, webAudioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(webAudioCtx.destination);
        osc.start(webAudioCtx.currentTime);
        osc.stop(webAudioCtx.currentTime + 0.1);
    } catch (e) { /* ignore */ }
}

function sfxStreak(count) {
    if (isMuted || !webAudioCtx) return;
    try {
        let baseFreq = 440;
        let notes = [];
        if (count >= 100) { baseFreq = 880; notes = [baseFreq, baseFreq * 1.2, baseFreq * 1.5, baseFreq * 2]; }
        else if (count >= 50) { baseFreq = 660; notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5]; }
        else if (count >= 30) { baseFreq = 554; notes = [baseFreq, baseFreq * 1.33]; }
        else if (count >= 10) { baseFreq = 493; notes = [baseFreq, baseFreq * 1.2]; }
        else if (count >= 5) { baseFreq = 440; notes = [baseFreq]; }
        else return;

        notes.forEach((freq, i) => {
            const osc = webAudioCtx.createOscillator();
            const gain = webAudioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, webAudioCtx.currentTime);
            const vol = masterVolume * sfxVolume * 0.2;
            gain.gain.setValueAtTime(0, webAudioCtx.currentTime + i * 0.1);
            gain.gain.linearRampToValueAtTime(vol, webAudioCtx.currentTime + i * 0.1 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, webAudioCtx.currentTime + i * 0.1 + 0.2);
            osc.connect(gain);
            gain.connect(webAudioCtx.destination);
            osc.start(webAudioCtx.currentTime + i * 0.1);
            osc.stop(webAudioCtx.currentTime + i * 0.1 + 0.2);
        });
    } catch (e) { /* ignore */ }
}

function sfxBossPhase() { _play('boss_phase'); }
function sfxTurretShoot() { _play('turret'); }

function sfxPlay(name, volumeMult = 1) {
    _play(name, volumeMult);
}

function sfxWeaponShoot(weaponId) {
    const sfx = WEAPON_SFX[weaponId] || 'shoot';
    _play(sfx, 0.7);
}

module.exports = {
    initAudio,
    setMasterVolume,
    setSfxVolume,
    setBgmVolume,
    toggleMute,
    setMuted,
    playBGM,
    stopBGM,
    pauseBGM,
    resumeBGM,
    sfxShoot,
    sfxHit,
    sfxKill,
    sfxGem,
    sfxLevelUp,
    sfxBossAppear,
    sfxBossDeath,
    sfxPlayerHit,
    sfxEvent,
    sfxFreeze,
    sfxPoison,
    sfxExplosion,
    sfxUpgrade,
    sfxEvolve,
    sfxButton,
    sfxCurse,
    sfxVictory,
    sfxDefeat,
    sfxGemChain,
    sfxStreak,
    sfxBossPhase,
    sfxTurretShoot,
    sfxPlay,
    sfxWeaponShoot,
    sfxSynergy,
    sfxCombo,
    get isMuted() { return isMuted; },
    get masterVolume() { return masterVolume; },
    get useProcedural() { return useProcedural; },
};
