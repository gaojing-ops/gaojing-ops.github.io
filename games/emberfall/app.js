import { createGame, DEITIES } from './game.js';

const $ = (id) => document.getElementById(id);
const characters = {
  warden: { name: '守灯人', hp: 100, title: '余烬之力', icon: 'flame', description: '均衡的火焰射手。适合第一次远征，让每一颗余烬燃起希望。', attributes: [70, 64, 80] },
  ranger: { name: '逐风者', hp: 80, title: '疾风之息', icon: 'arrow', description: '轻盈而敏捷的弓手。用速度穿过包围，让利箭找到黑暗中的破绽。', attributes: [48, 96, 78] },
  sentinel: { name: '铁卫', hp: 140, title: '不动之誓', icon: 'shield', description: '厚重而坚韧的战士。以更强的生存能力抵住黑潮，为反击争取时间。', attributes: [96, 42, 72] },
};
const iconNames = new Set(['flame','arrow','shield','heart','sound','mute','expand','pause','play','cross','clock','skull','rune','bolt','orbit','wind','magnet','book','trophy']);
const icon = (name, extra = '') => `<svg ${extra} aria-hidden="true"><use href="#i-${iconNames.has(name) ? name : 'rune'}"/></svg>`;
const esc = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, Number(v) || 0));
const formatTime = (t) => `${String(Math.floor(Math.max(0,t) / 60)).padStart(2,'0')}:${String(Math.floor(Math.max(0,t) % 60)).padStart(2,'0')}`;
const STORE_KEY = 'gaojing-emberfall-v1';

let game = null;
let state = 'ready';
let selectedCharacter = 'warden';
let soundEnabled = false;
let lastStats = null;
let choices = [];
let choiceEpoch = 0;
let choiceReadyAt = 0;
let toastTimeout = 0;
let pausedByModal = false;
let modalOpener = null;
let storageAvailable = true;
let buildSignature = '';
let endHandled = false;
let recordData = { runs: 0, wins: 0, bestKills: 0, bestTime: 0, bestScore: 0, history: [] };
const dialog = $('info-dialog');
const arena = $('arena');
const canvas = $('game-canvas');
const joystick = $('joystick');
const knob = $('joystick-knob');
let joystickPointer = null;
let joystickCenter = { x: 0, y: 0 };

try {
  const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
  if (saved && typeof saved === 'object') {
    for (const key of ['runs','wins','bestKills','bestTime','bestScore']) recordData[key] = clamp(saved[key],0,1e9);
    recordData.history = Array.isArray(saved.history) ? saved.history.slice(0,10).filter(r => r && typeof r === 'object').map(r => ({
      victory: r.victory === true,
      time: clamp(r.time,0,86400), kills: clamp(r.kills,0,1e8), level: clamp(r.level,1,10000), score: clamp(r.score,0,1e9),
      character: characters[r.character] ? r.character : 'warden', date: typeof r.date === 'string' ? r.date.slice(0,40) : '',
    })) : [];
    soundEnabled = saved.sound === true;
  }
} catch { storageAvailable = false; }

function persistRecords() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({...recordData, sound:soundEnabled})); }
  catch { storageAvailable = false; }
}

function updateBest() {
  $('best-record').textContent = recordData.runs ? `${recordData.bestKills} 击败 · ${recordData.wins} 次通关` : '等待第一位守夜者';
}

function toast(message) {
  clearTimeout(toastTimeout);
  $('toast').textContent = message;
  $('toast').hidden = false;
  toastTimeout = setTimeout(() => { $('toast').hidden = true; }, 3100);
}

function clearJoystick() {
  const capturedPointer = joystickPointer;
  joystickPointer = null;
  if (capturedPointer !== null) {
    try { joystick.releasePointerCapture(capturedPointer); } catch { /* Capture may already have ended. */ }
  }
  knob.style.transform = '';
  game?.setMovement(0,0);
}

function setUIState(next) {
  state = next;
  document.body.dataset.gameState = next;
  $('start-overlay').hidden = next !== 'ready';
  $('pause-overlay').hidden = next !== 'paused';
  $('upgrade-overlay').hidden = next !== 'upgrade';
  $('result-overlay').hidden = !['won','lost'].includes(next);
  $('run-hud').hidden = next === 'ready';
  $('xp-hud').hidden = next === 'ready';
  $('touch-controls').hidden = next !== 'playing';
  $('pause-button').disabled = !['playing','paused'].includes(next);
  $('pause-button').innerHTML = icon(next === 'paused' ? 'play' : 'pause');
  $('pause-button').setAttribute('aria-label',next === 'paused' ? '继续游戏' : '暂停游戏');
  $('pause-button').title = next === 'paused' ? '继续 · P' : '暂停 · P';
  $('phase-label').textContent = ({ready:'远征待命',playing:'长夜进行中',paused:'远征暂停',upgrade:'余烬共鸣',won:'黎明已至',lost:'远征结束'})[next] || '灰烬林地';
  $('side-title').textContent = next === 'ready' ? '选择守夜者' : '本次远征';
  $('side-mode').textContent = next === 'ready' ? 'YOUR HERO' : 'YOUR JOURNEY';
  $('hero-summary').hidden = next !== 'ready';
  $('build-section').hidden = next === 'ready';
  document.querySelectorAll('[data-character]').forEach(b => { b.disabled = next !== 'ready'; });
  if (next !== 'playing') clearJoystick();
  if (next === 'ready') {
    $('boss-hud').hidden = true;
    $('wave-label').textContent = '第 01 波';
  }
  if (next !== 'upgrade') choices = [];
  queueMicrotask(() => {
    if (state !== next || dialog.open) return;
    if (next === 'paused') $('resume-button').focus({preventScroll:true});
    if (next === 'won' || next === 'lost') $('replay-button').focus({preventScroll:true});
  });
}

function updateStats(stats) {
  lastStats = stats;
  $('hp-text').textContent = `${Math.ceil(stats.hp)} / ${Math.ceil(stats.maxHp)}`;
  $('hp-fill').style.width = `${clamp(stats.hp / Math.max(1,stats.maxHp) * 100,0,100)}%`;
  $('time-text').textContent = formatTime(stats.time);
  $('timer-goal').textContent = stats.time >= 180 ? '终局' : '/ 03:00';
  $('kills-text').textContent = String(stats.kills);
  $('wave-label').textContent = stats.boss ? '终局 · 噬光者' : `第 ${String(stats.wave || 1).padStart(2,'0')} 波`;
  $('level-text').textContent = `LV. ${stats.level}`;
  $('xp-fill').style.width = `${clamp(stats.xp / Math.max(1,stats.xpNext) * 100,0,100)}%`;
  const cooling = stats.dashCooldown > 0;
  $('dash-button').disabled = cooling || state !== 'playing';
  $('dash-text').textContent = cooling ? `${(Math.ceil(stats.dashCooldown*10)/10).toFixed(1)}s` : '闪避';
  $('boss-hud').hidden = !stats.boss || stats.state === 'ready' || stats.state === 'won' || stats.state === 'lost';
  if (stats.boss) {
    $('boss-name').textContent = stats.boss.name;
    $('boss-fill').style.width = `${clamp(stats.boss.hp / Math.max(1,stats.boss.maxHp)*100,0,100)}%`;
  }
  const build = Array.isArray(stats.build) ? stats.build : [];
  const signature = build.map(item => `${item.id}:${item.level}`).join('|');
  if (signature !== buildSignature) {
    buildSignature = signature;
    $('build-count').textContent = `${build.length} 项赐福`;
    $('build-list').innerHTML = build.length ? build.map(item => `<div class="build-item" style="--item-color:${esc(item.color)}" title="${esc(item.deity)} · ${esc(item.name)} · 等级 ${esc(item.level)} · 每层：${esc(item.description)}">${icon(item.icon)}<span><small>${esc(item.deity)}</small>${esc(item.name)}</span><b>${esc(item.level)}</b></div>`).join('') : `<div class="empty-build">${icon('rune')}<p>拾取余烬，迎接诸神的赐福</p></div>`;
  }
}

function showUpgrade(options, level) {
  choices = options;
  const epoch = ++choiceEpoch;
  choiceReadyAt = performance.now() + 180;
  $('upgrade-level').textContent = String(level);
  const rarities = { common:['基础','#b8c8a3'], rare:['稀有','#8fc5c2'], epic:['史诗','#c9abd7'] };
  $('upgrade-choices').replaceChildren();
  options.forEach((option,index) => {
    const [rarity,color] = rarities[option.rarity] || rarities.common;
    const button = document.createElement('button');
    button.className = 'upgrade-card';
    button.style.setProperty('--card-color',option.color || color);
    button.innerHTML = `<span class="upgrade-rarity">${rarity}赐福</span><span class="upgrade-icon">${icon(option.icon)}</span><span class="upgrade-deity">${esc(option.deity)}</span><strong>${esc(option.name)}</strong><p>${esc(option.description)}</p><span class="upgrade-number">${index+1}</span>`;
    button.addEventListener('click', () => selectUpgrade(index,epoch));
    $('upgrade-choices').append(button);
  });
  queueMicrotask(() => { if (state === 'upgrade' && choiceEpoch === epoch && !dialog.open) $('upgrade-choices').querySelector('button')?.focus({preventScroll:true}); });
}

function selectUpgrade(index,epoch=choiceEpoch) {
  if (state !== 'upgrade' || epoch !== choiceEpoch || performance.now() < choiceReadyAt || dialog.open) return;
  const choice = choices[index];
  if (!choice) return;
  choices = [];
  choiceEpoch++;
  game.chooseUpgrade(choice.id);
  if (state === 'playing') canvas.focus({preventScroll:true});
}

function endRun(result) {
  if (endHandled) return;
  endHandled = true;
  const won = !!result.victory;
  $('result-icon').setAttribute('href',won ? '#i-trophy' : '#i-flame');
  $('result-eyebrow').textContent = won ? 'DAWN FINALLY BREAKS' : 'THE EMBERS REMAIN';
  $('result-title').textContent = won ? '长夜尽头，终见黎明。' : '长夜漫漫，火种不灭。';
  $('result-description').textContent = won ? '你击败了噬光者，为林地留住了最后的光。' : '换一种构筑，再试一次。下一束火光仍属于你。';
  $('result-time').textContent = formatTime(result.time);
  $('result-kills').textContent = String(result.kills);
  $('result-level').textContent = String(result.level);
  $('result-score').textContent = String(Math.round(result.score || 0));
  recordData.runs++;
  recordData.wins += won ? 1 : 0;
  recordData.bestKills = Math.max(recordData.bestKills,result.kills || 0);
  recordData.bestTime = Math.max(recordData.bestTime,result.time || 0);
  recordData.bestScore = Math.max(recordData.bestScore,result.score || 0);
  recordData.history.unshift({...result, date:new Date().toISOString()});
  recordData.history = recordData.history.slice(0,10);
  persistRecords();
  updateBest();
  if (!storageAvailable) toast('本次战绩已结算；当前浏览器未允许保存本地战绩。');
}

function createEngine() {
  buildSignature = '__initial__';
  game = createGame(canvas, {onState:setUIState,onStats:updateStats,onUpgrade:showUpgrade,onEnd:endRun,onToast:toast});
  setUIState(game.getSnapshot().state);
}

function startRun() {
  clearTimeout(toastTimeout);
  $('toast').hidden = true;
  endHandled = false;
  choiceEpoch++;
  game.setSound(soundEnabled);
  game.start(selectedCharacter);
  canvas.focus({preventScroll:true});
}

function returnToCamp() {
  clearJoystick();
  clearTimeout(toastTimeout);
  $('toast').hidden = true;
  choices = [];
  choiceEpoch++;
  game.destroy();
  game = null;
  endHandled = false;
  createEngine();
  selectCharacter(selectedCharacter);
  $('start-button').focus({preventScroll:true});
}

function selectCharacter(id) {
  if (state !== 'ready' || !characters[id]) return;
  selectedCharacter = id;
  const c = characters[id];
  document.querySelectorAll('[data-character]').forEach(button => {
    const selected = button.dataset.character === id;
    button.classList.toggle('selected',selected);
    button.setAttribute('aria-pressed',String(selected));
  });
  $('hero-description').textContent = c.description;
  $('hero-summary').querySelector('span').innerHTML = `${icon(c.icon)}${c.title}`;
  ['hp','speed','power'].forEach((key,index) => $(`attr-${key}`).style.width = `${c.attributes[index]}%`);
  $('hp-text').textContent = `${c.hp} / ${c.hp}`;
}

function updateSoundButton() {
  const label = soundEnabled ? '关闭音效' : '开启音效';
  $('sound-button').innerHTML = icon(soundEnabled ? 'sound' : 'mute');
  $('sound-button').title = label;
  $('sound-button').setAttribute('aria-label',label);
  $('sound-button').setAttribute('aria-pressed',String(soundEnabled));
}

function renderHelp() {
  return `<p class="guide-intro">你只需要移动与冲刺。守夜者会自动攻击附近的敌人，拾取他们留下的余烬，让每次升级成为新的可能。</p><div class="guide-steps"><div class="guide-card"><span>01 / MOVE</span><h3>保持移动，找准空隙</h3><p>用 WASD 或方向键移动。手机使用左下方摇杆。持续走位，避开密集怪群。</p></div><div class="guide-card"><span>02 / COLLECT</span><h3>拾取余烬，三选一强化</h3><p>靠近发光晶石即可收集经验。升级时战斗暂停，从三位神明的随机赐福中选择一项；不同神明侧重不同加成，可混合构筑。</p></div><div class="guide-card"><span>03 / DASH</span><h3>冲刺突围</h3><p>按空格或手机冲刺按钮，向移动方向冲刺。人物脚下的闪避条显示剩余冷却秒数，回满并显示“闪避就绪”后可再次使用。</p></div><div class="guide-card"><span>04 / SURVIVE</span><h3>击败噬光者，迎接黎明</h3><p>敌人会随时间变强。生存到 3 分钟后最终首领出现，击败它才算本次远征胜利。</p></div></div><div class="guide-controls"><span><kbd>WASD</kbd> / <kbd>↑↓←→</kbd> 移动</span><span><kbd>SPACE</kbd> 冲刺</span><span><kbd>P</kbd> / <kbd>ESC</kbd> 暂停</span><span><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> 选择强化</span></div><p class="codex-note">离开当前页面时，战斗会自动暂停。返回后点击“继续远征”。升级时必须完成选择；返回营地会结束当前远征。</p>`;
}

function renderCodex() {
  const patrons = Object.values(DEITIES).map(god => `<div class="codex-item deity-codex" style="--deity-color:${esc(god.color)}">${icon(god.icon)}<div><h3>${esc(god.name)} · ${esc(god.title)}</h3><p>${esc(god.description)}</p></div></div>`).join('');
  const items = [
    ['flame','灼日神火','炎神赐福：每层主武器伤害 +18%，灼烧每秒 +4 伤害，持续 2.6 秒。'],
    ['wind','流风神行','风神赐福：每层移速 +8%，闪避冷却缩短 15%。'],
    ['bolt','雷霆裁决','雷神赐福：每层暴击率 +10 个百分点，暴击伤害倍率 +0.25。'],
    ['rune','寒月之触','霜神赐福：命中减速 57%，每层延长 0.6 秒，并增加 1 点护甲。'],
    ['heart','森息复苏','森神赐福：每层生命上限 +20、恢复 20 生命，每秒恢复 +0.5。'],
    ['flame','燃心 / 余烬','提高伤害，或让攻击留下持续灼烧。适合直接增强火力。'],
    ['arrow','分光 / 破雾','增加射弹数量，或让射弹穿透更多敌人。应对密集怪群。'],
    ['orbit','环火','召唤围绕自身的火焰，对靠近的敌人造成伤害。'],
    ['bolt','引雷','唤来连锁闪电，让雷电在敌人之间跳跃。'],
    ['rune','霜环','周期释放霜环，伤害并减缓周围的敌人。'],
    ['wind','急雨 / 轻身 / 踏影','提升攻击频率、移动能力，或缩短冲刺等待。'],
    ['shield','石肤 / 长明','减少受到的伤害、增加生命上限，让战线更持久。'],
    ['heart','回春 / 灯下小憩','持续恢复生命，或获得一次及时治疗。'],
    ['magnet','引星','扩大余烬拾取范围，更快形成自己的构筑。'],
    ['rune','明烛','提高暴击能力，让关键一击更有力量。'],
  ];
  return `<p class="guide-intro">五位神明，各有所长。升级时接受一项赐福，可混合不同神明的力量；所有加成仅在本次远征生效。</p><div class="codex-grid deity-grid">${patrons}</div><h3 class="codex-subtitle">赐福与强化</h3><div class="codex-grid">${items.map(([i,name,description]) => `<div class="codex-item">${icon(i)}<div><h3>${name}</h3><p>${description}</p></div></div>`).join('')}</div><p class="codex-note">升级选项随机出现，可重复强化至上限。每分钟留意更强的敌人，三分钟时准备迎战最终首领。</p>`;
}

function renderRecords() {
  const summary = `<div class="record-summary"><div><strong>${Math.round(recordData.runs)}</strong><span>远征次数</span></div><div><strong>${Math.round(recordData.wins)}</strong><span>迎来黎明</span></div><div><strong>${Math.round(recordData.bestKills)}</strong><span>最多击败</span></div></div>`;
  const history = recordData.history.length ? `<table class="record-list"><thead><tr><th>守夜者</th><th>结局</th><th>生存</th><th>击败</th><th>得分</th></tr></thead><tbody>${recordData.history.map(r => `<tr><td>${characters[r.character]?.name || '守灯人'}</td><td${r.victory ? ' class="win-tag"' : ''}>${r.victory ? '黎明' : '余烬'}</td><td>${formatTime(r.time)}</td><td>${Math.round(r.kills)}</td><td>${Math.round(r.score || 0)}</td></tr>`).join('')}</tbody></table>` : `<div class="record-empty">${icon('trophy')}<h3>第一场远征，等你写下。</h3><p>踏入长夜，你的故事从这里开始。</p></div>`;
  return `${summary}${history}<p class="records-note">展示最近 10 次完成的远征。${storageAvailable ? '战绩仅保存在当前浏览器；清除网站数据后会重置。' : '当前浏览器未允许持久保存；关闭页面后战绩可能丢失。'}</p>`;
}

function openModal(kind,opener) {
  if (dialog.open) return;
  modalOpener = opener || document.activeElement;
  pausedByModal = state === 'playing';
  if (pausedByModal) game.pause();
  clearJoystick();
  const types = {
    help:{title:'守夜者指南',eyebrow:'HOW TO SURVIVE',body:renderHelp},
    codex:{title:'余烬图鉴',eyebrow:'FIELD NOTES',body:renderCodex},
    records:{title:'远征手记',eyebrow:'YOUR JOURNEYS',body:renderRecords},
  };
  const content = types[kind] || types.help;
  $('dialog-title').textContent = content.title;
  $('dialog-eyebrow').textContent = content.eyebrow;
  $('dialog-body').innerHTML = content.body();
  const parent = document.fullscreenElement === arena ? arena : document.body;
  if (dialog.parentElement !== parent) parent.append(dialog);
  dialog.showModal();
  $('dialog-close').focus({preventScroll:true});
}

function closeModal() { if (dialog.open) dialog.close(); }
dialog.addEventListener('close',() => {
  const canResume = pausedByModal && state === 'paused' && document.visibilityState === 'visible';
  pausedByModal = false;
  if (canResume) { game.resume(); canvas.focus({preventScroll:true}); }
  else modalOpener?.focus?.({preventScroll:true});
});
dialog.addEventListener('click',e => {
  if (e.target !== dialog) return;
  const r = dialog.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeModal();
});
$('dialog-close').addEventListener('click',closeModal);
document.querySelectorAll('[data-modal]').forEach(button => button.addEventListener('click',() => openModal(button.dataset.modal,button)));
document.querySelectorAll('[data-character]').forEach(button => button.addEventListener('click',() => selectCharacter(button.dataset.character)));
$('start-button').addEventListener('click',startRun);
$('replay-button').addEventListener('click',startRun);
$('resume-button').addEventListener('click',() => { game.resume(); canvas.focus({preventScroll:true}); });
$('pause-camp-button').addEventListener('click',returnToCamp);
$('result-camp-button').addEventListener('click',returnToCamp);
$('pause-button').addEventListener('click',() => { if (state === 'playing') game.pause(); else if (state === 'paused') { game.resume(); canvas.focus({preventScroll:true}); } });
$('sound-button').addEventListener('click',() => { soundEnabled = !soundEnabled; game.setSound(soundEnabled); updateSoundButton(); persistRecords(); });
$('fullscreen-button').addEventListener('click',async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (arena.requestFullscreen) await arena.requestFullscreen();
    else toast('此浏览器暂不支持全屏；可横屏获得更大视野。');
  } catch { toast('全屏暂不可用；可继续在当前窗口游玩。'); }
});
document.addEventListener('fullscreenchange',() => {
  const active = document.fullscreenElement === arena;
  $('fullscreen-button').setAttribute('aria-label',active ? '退出全屏' : '全屏游戏');
  $('fullscreen-button').title = active ? '退出全屏' : '全屏游戏';
  clearJoystick();
});

function interruptRun() {
  clearJoystick();
  if (state === 'playing') game.pause();
  if (dialog.open) pausedByModal = false;
}
document.addEventListener('visibilitychange',() => { if (document.hidden) interruptRun(); });
window.addEventListener('blur',interruptRun);

document.addEventListener('keydown',event => {
  if (dialog.open || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
  if (event.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) return;
  const key = event.key.toLowerCase();
  if (state === 'upgrade' && ['1','2','3'].includes(key)) {
    event.preventDefault();
    if (!event.repeat) selectUpgrade(Number(key)-1);
    return;
  }
  if (key === 'p' || key === 'escape') {
    if (['playing','paused','upgrade'].includes(state)) event.preventDefault();
    if (event.repeat) return;
    if (state === 'playing') game.pause();
    else if (state === 'paused') { game.resume(); canvas.focus({preventScroll:true}); }
  }
  if (event.key === 'Tab') {
    const overlay = state === 'upgrade' ? $('upgrade-overlay') : state === 'paused' ? $('pause-overlay') : ['won','lost'].includes(state) ? $('result-overlay') : null;
    if (!overlay) return;
    const focusables = [...overlay.querySelectorAll('button:not(:disabled)')];
    if (!focusables.length) return;
    const first=focusables[0],last=focusables[focusables.length-1];
    if (event.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) { event.preventDefault(); last.focus({preventScroll:true}); }
    else if (!event.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) { event.preventDefault(); first.focus({preventScroll:true}); }
  }
});

function updateJoystick(event) {
  if (event.pointerId !== joystickPointer || state !== 'playing') return;
  const dx = event.clientX - joystickCenter.x;
  const dy = event.clientY - joystickCenter.y;
  const distance = Math.hypot(dx,dy);
  const maxDistance = 32;
  const scale = distance > maxDistance ? maxDistance / distance : 1;
  knob.style.transform = `translate(${dx*scale}px,${dy*scale}px)`;
  const deadzone = 5;
  if (distance <= deadzone) game.setMovement(0,0);
  else game.setMovement(dx*scale/maxDistance,dy*scale/maxDistance);
}
joystick.addEventListener('pointerdown',event => {
  if (state !== 'playing' || joystickPointer !== null) return;
  event.preventDefault();
  const rect = joystick.getBoundingClientRect();
  joystickCenter={x:rect.left+rect.width/2,y:rect.top+rect.height/2};
  joystickPointer=event.pointerId;
  joystick.setPointerCapture(event.pointerId);
  updateJoystick(event);
});
joystick.addEventListener('pointermove',event => { if (event.pointerId === joystickPointer) { event.preventDefault(); updateJoystick(event); } });
for (const name of ['pointerup','pointercancel','lostpointercapture']) joystick.addEventListener(name,event => { if (event.pointerId === joystickPointer) clearJoystick(); });
$('dash-button').addEventListener('pointerdown',event => { event.preventDefault(); if (state === 'playing') game.dash(); });
$('dash-button').addEventListener('click',event => { if (event.detail === 0 && state === 'playing') game.dash(); });

updateSoundButton();
updateBest();
createEngine();
selectCharacter(selectedCharacter);
