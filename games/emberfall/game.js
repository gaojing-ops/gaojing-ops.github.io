/* 长夜余烬 — a dependency-free canvas survival game. */
const TAU = Math.PI * 2;
const WORLD = { w: 2400, h: 1800 };
const COLORS = { amber:'#f6c979', cyan:'#80d5c1', red:'#e57979', purple:'#b4a2ea' };
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const rand = (a,b) => a + Math.random()*(b-a);
const CHARACTERS = {
  warden: { name:'守灯人', color:COLORS.amber, hp:100, damage:21, speed:215, interval:.47, armor:0 },
  ranger: { name:'逐风者', color:COLORS.cyan, hp:80, damage:15, speed:240, interval:.34, armor:0 },
  sentinel: { name:'铁卫', color:'#b7b8d9', hp:140, damage:27, speed:185, interval:.60, armor:3 }
};
const UPGRADES = [
  {id:'power',name:'燃心',description:'主武器伤害提高 25%。',rarity:'common',color:COLORS.amber,icon:'flame',max:5},
  {id:'haste',name:'急雨',description:'自动攻击间隔缩短 15%。',rarity:'common',color:COLORS.cyan,icon:'bolt',max:5},
  {id:'multishot',name:'分光',description:'每次攻击额外发射 1 枚弹道。',rarity:'rare',color:COLORS.amber,icon:'arrow',max:3},
  {id:'pierce',name:'破雾',description:'弹道额外穿透 1 个敌人。',rarity:'common',color:COLORS.cyan,icon:'arrow',max:3},
  {id:'orbit',name:'环火',description:'召唤环绕的火刃，持续灼伤近身敌人。',rarity:'rare',color:COLORS.amber,icon:'orbit',max:3},
  {id:'lightning',name:'引雷',description:'定期释放连锁闪电；升级增加伤害与目标。',rarity:'epic',color:COLORS.purple,icon:'bolt',max:3},
  {id:'nova',name:'霜环',description:'定期爆发冰霜冲击，伤害并减速周围敌人。',rarity:'rare',color:COLORS.cyan,icon:'orbit',max:3},
  {id:'fire',name:'余烬',description:'主武器附加灼烧，每秒造成额外伤害。',rarity:'rare',color:'#ec9b6c',icon:'flame',max:3},
  {id:'speed',name:'轻身',description:'移动速度提高 12%。',rarity:'common',color:COLORS.cyan,icon:'wind',max:3},
  {id:'vitality',name:'长明',description:'生命上限 +25，立即恢复 25 点生命。',rarity:'common',color:COLORS.red,icon:'heart',max:4},
  {id:'magnet',name:'引星',description:'经验拾取范围扩大 40。',rarity:'common',color:COLORS.cyan,icon:'magnet',max:3},
  {id:'armor',name:'石肤',description:'每次受击减少 2 点伤害。',rarity:'common',color:'#b8b5a9',icon:'shield',max:3},
  {id:'regen',name:'回春',description:'每秒自动恢复 0.8 点生命。',rarity:'rare',color:COLORS.cyan,icon:'heart',max:3},
  {id:'critical',name:'明烛',description:'暴击率提高 14%；暴击造成双倍伤害。',rarity:'rare',color:COLORS.amber,icon:'flame',max:3},
  {id:'dash',name:'踏影',description:'闪避冷却缩短 20%。',rarity:'common',color:COLORS.purple,icon:'wind',max:2},
  {id:'heal',name:'灯下小憩',description:'立即恢复 50% 最大生命。',rarity:'common',color:COLORS.red,icon:'heart',max:99}
];

export function createGame(canvas, hooks = {}) {
  const ctx = canvas.getContext('2d', {alpha:false});
  if (!ctx) throw new Error('此浏览器不支持 Canvas 2D。');
  let alive=true, firstFrame=true, raf=0, last=0, view={w:1000,h:600,scale:1,dpr:1};
  let state='ready', character='warden', p, time=0, kills=0, wave=1, level=1, xp=0, xpNext=6;
  let enemies=[], shots=[], hostile=[], gems=[], particles=[], texts=[], effects=[], warnings=[];
  let build={}, choices=[], fireTimer=0, spawnTimer=.65, lightningTimer=2.4, novaTimer=4;
  let statsTimer=0, shake=0, bossSpawned=false, elite60=false, elite120=false, nextId=1;
  let camera={x:WORLD.w/2,y:WORLD.h/2}, ambient=0;
  let keys=new Set(), stick={x:0,y:0}, lastMove={x:0,y:-1};
  let sound=false, audio=null, audioBus=null, audioCount=0;
  const props=[], fireflies=[];
  const terrain=document.createElement('canvas'); terrain.width=WORLD.w; terrain.height=WORLD.h;
  const ground=terrain.getContext('2d');
  const safeHook = (name,...args) => { try { hooks[name]?.(...args); } catch(e) { console.error('Game UI hook:',name,e); } };
  function seeded(seed) { return () => { seed|=0; seed=(seed+0x6D2B79F5)|0; let t=Math.imul(seed^(seed>>>15),1|seed); t^=t+Math.imul(t^(t>>>7),61|t); return ((t^(t>>>14))>>>0)/4294967296; }; }
  const random=seeded(84217);
  const rr=(a,b)=>a+random()*(b-a);
  function makeTerrain() {
    ground.fillStyle='#142420';ground.fillRect(0,0,WORLD.w,WORLD.h);
    for(let i=0;i<100;i++) {
      let x=rr(0,WORLD.w),y=rr(0,WORLD.h),r=rr(70,240);
      const g=ground.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,i%3?'#1b2f27':'#24372b');g.addColorStop(1,'#14242000');
      ground.fillStyle=g;ground.fillRect(x-r,y-r,r*2,r*2);
    }
    // A ruined circular courtyard, deliberately imperfect and weathered.
    const cx=WORLD.w/2,cy=WORLD.h/2;
    for(let ring=0;ring<5;ring++) {
      const r=82+ring*64,segments=8+ring*7;
      for(let k=0;k<segments;k++) {
        const a=k/segments*TAU+.03,b=(k+1)/segments*TAU-.03;
        if(random()<.13) continue;
        ground.beginPath();ground.arc(cx,cy,r+27,a,b);ground.arc(cx,cy,r-27,b,a,true);ground.closePath();
        ground.fillStyle=['#263630','#283931','#2b3932','#23332c'][Math.floor(random()*4)];ground.fill();
        ground.strokeStyle='#344239';ground.lineWidth=1;ground.stroke();
      }
    }
    ground.strokeStyle='#41645150';ground.lineWidth=2;ground.beginPath();ground.arc(cx,cy,374,0,TAU);ground.stroke();
    for(let i=0;i<16;i++) {
      const a=i/16*TAU;let x=cx+Math.cos(a)*374,y=cy+Math.sin(a)*374;
      ground.save();ground.translate(x,y);ground.rotate(a);ground.strokeStyle='#77957a55';
      ground.beginPath();ground.moveTo(-9,0);ground.lineTo(7,0);ground.lineTo(3,5);ground.moveTo(0,-6);ground.lineTo(0,6);ground.stroke();ground.restore();
    }
    for(let i=0;i<11500;i++) {
      const x=rr(30,WORLD.w-30),y=rr(30,WORLD.h-30);
      if(Math.hypot(x-cx,y-cy)<330&&random()>.15) continue;
      ground.strokeStyle=['#45634238','#72936024','#111f1d88','#425e423d'][Math.floor(random()*4)];
      ground.lineWidth=rr(.5,1.8);ground.beginPath();ground.moveTo(x,y);ground.lineTo(x+rr(-3,3),y-rr(2,9));ground.stroke();
    }
    for(let i=0;i<140;i++) {
      const x=rr(80,WORLD.w-80),y=rr(80,WORLD.h-80);
      if(Math.hypot(x-cx,y-cy)<125) continue;
      props.push({x,y,type:i%7===0?'pillar':i%3===0?'rock':'tree',s:rr(.65,1.35),v:rr(0,TAU)});
    }
    // Four braziers surround the starting sanctuary.
    for(const [x,y] of [[-190,-135],[190,-135],[-190,135],[190,135]]) props.push({x:cx+x,y:cy+y,type:'brazier',s:1,v:0});
    for(let i=0;i<55;i++)fireflies.push({x:rr(40,WORLD.w-40),y:rr(40,WORLD.h-40),v:rr(0,TAU),s:rr(.5,1.7)});
    ground.strokeStyle='#35473a';ground.lineWidth=16;ground.strokeRect(24,24,WORLD.w-48,WORLD.h-48);
  }
  makeTerrain();
  function resetPlayer() {
    const c=CHARACTERS[character];
    p={x:WORLD.w/2,y:WORLD.h/2,r:13,hp:c.hp,maxHp:c.hp,damage:c.damage,speed:c.speed,interval:c.interval,armor:c.armor,pickup:75,crit:.05,pierce:0,multishot:1,regen:0,inv:0,dashTimer:0,dashCooldown:0,dashMax:3,dashX:0,dashY:-1,face:-Math.PI/2,walk:0};
  }
  resetPlayer();
  function resize() {
    const rect=canvas.getBoundingClientRect();
    view.w=Math.max(1,rect.width||1000);view.h=Math.max(1,rect.height||600);
    view.dpr=Math.min(window.devicePixelRatio||1,2);view.scale=clamp(view.w/1020,.67,1.25);
    canvas.width=Math.round(view.w*view.dpr);canvas.height=Math.round(view.h*view.dpr);
    ctx.imageSmoothingEnabled=true;
  }
  resize();
  const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;
  ro?.observe(canvas);window.addEventListener('resize',resize);
  function clearInput() {keys.clear();stick.x=stick.y=0;}
  function setState(next) {state=next;if(next!=='playing')clearInput();safeHook('onState',next);emitStats();}
  function soundInit() {
    if(!sound)return;
    try {
      if(!audio){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;audio=new A();audioBus=audio.createGain();audioBus.gain.value=.13;audioBus.connect(audio.destination);}
      if(audio.state==='suspended')audio.resume().catch(()=>{});
    }catch{}
  }
  function tone(freq,duration=.08,type='sine',volume=.35,slide=0) {
    if(!sound||!audio||audio.state!=='running'||audioCount>14)return;
    try{const o=audio.createOscillator(),g=audio.createGain();audioCount++;o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audioBus);o.start();o.stop(audio.currentTime+duration);o.onended=()=>{audioCount--;o.disconnect();g.disconnect();};}catch{}
  }
  function emitStats() {safeHook('onStats',getSnapshot());}
  function getSnapshot() {
    const boss=enemies.find(e=>e.type==='boss'&&e.hp>0);
    return {state,time,kills,level,hp:Math.max(0,p.hp),maxHp:p.maxHp,xp,xpNext,wave,dashCooldown:p.dashCooldown,dashMax:p.dashMax,character,build:Object.entries(build).filter(([id,n])=>n>0&&id!=='heal').map(([id,n])=>{const u=UPGRADES.find(x=>x.id===id);return {id,name:u?.name||id,level:n,color:u?.color||COLORS.amber,icon:u?.icon||'flame'};}),boss:boss?{name:'噬光者 · 长夜之主',hp:boss.hp,maxHp:boss.maxHp}:null};
  }
  function start(id='warden') {
    character=CHARACTERS[id]?id:'warden';time=0;kills=0;level=1;wave=1;xp=0;xpNext=6;
    enemies=[];shots=[];hostile=[];gems=[];particles=[];texts=[];effects=[];warnings=[];
    build={};choices=[];bossSpawned=false;elite60=false;elite120=false;nextId=1;
    fireTimer=.1;spawnTimer=.4;lightningTimer=2.4;novaTimer=4;statsTimer=0;shake=0;
    clearInput();lastMove={x:0,y:-1};resetPlayer();camera={x:p.x,y:p.y};soundInit();
    setState('playing');safeHook('onToast','长夜降临 · 守住灯火');tone(440,.16,'sine',.25,220);
    for(let i=0;i<4;i++){const a=i/4*TAU+.4,e=spawnEnemy('shade',a);if(e){e.x=p.x+Math.cos(a)*220;e.y=p.y+Math.sin(a)*220;}}
  }
  function pause(){if(state==='playing')setState('paused');}
  function resume(){if(state==='paused'){soundInit();setState('playing');}}
  function setMovement(x,y){if(state!=='playing'){stick.x=stick.y=0;return;}const l=Math.hypot(x,y);stick.x=l>1?x/l:x;stick.y=l>1?y/l:y;}
  function dash() {
    if(state!=='playing'||p.dashCooldown>0)return false;
    soundInit();let dx=stick.x,dy=stick.y;
    if(Math.hypot(dx,dy)<.1){dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);dy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);}
    const l=Math.hypot(dx,dy);p.dashX=l>.1?dx/l:lastMove.x;p.dashY=l>.1?dy/l:lastMove.y;
    p.dashTimer=.19;p.inv=Math.max(p.inv,.25);p.dashCooldown=p.dashMax;
    addRing(p.x,p.y,55,CHARACTERS[character].color,.3);tone(180,.13,'triangle',.3,-120);return true;
  }
  function handleKeyDown(e){
    if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
    if(e.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))return;
    if(state!=='playing')return;
    const key=e.key.toLowerCase();
    // Space activates a focused control; it only dashes from the play surface.
    if(key===' '&&e.target?.closest?.('button,a[href],[role="button"]'))return;
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(key)){
      e.preventDefault();keys.add(key);if(key===' '&&!e.repeat)dash();
    }
  }
  function handleKeyUp(e){keys.delete(e.key.toLowerCase());}
  function handleBlur(){clearInput();pause();}
  window.addEventListener('keydown',handleKeyDown);window.addEventListener('keyup',handleKeyUp);window.addEventListener('blur',handleBlur);
  function spawnEnemy(type,angle) {
    if(enemies.length>=145&&type!=='boss'&&type!=='elite')return;
    let a=angle??rand(0,TAU),radius=Math.hypot(view.w/view.scale,view.h/view.scale)*.48+50;
    let x=clamp(p.x+Math.cos(a)*radius,55,WORLD.w-55),y=clamp(p.y+Math.sin(a)*radius,55,WORLD.h-55);
    if(Math.hypot(x-p.x,y-p.y)<200){x=clamp(p.x-Math.cos(a)*radius,55,WORLD.w-55);y=clamp(p.y-Math.sin(a)*radius,55,WORLD.h-55);}
    const t=time/180;
    const spec={shade:[20+26*t,63+16*t,13,11,1],spider:[14+19*t,101+17*t,10,8,1],brute:[66+60*t,45+10*t,21,17,3],moth:[25+25*t,67,13,10,2],elite:[370+240*t,57,29,21,16],boss:[2350,48,48,26,40]}[type]||[25,60,13,10,1];
    const e={id:nextId++,type,x,y,hp:spec[0],maxHp:spec[0],speed:spec[1],r:spec[2],damage:spec[3],xp:spec[4],phase:rand(0,TAU),hit:0,burn:0,burnTick:0,slow:0,orbCd:0,attack:rand(1.8,3.8),face:0};
    enemies.push(e);return e;
  }
  function addParticles(x,y,color,count=8,speed=65) {for(let i=0;i<count&&particles.length<400;i++){const a=rand(0,TAU),s=rand(speed*.2,speed);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-10,life:rand(.25,.65),max:.65,r:rand(1,3),color});}}
  function addRing(x,y,r,color,life=.45){effects.push({type:'ring',x,y,r,color,life,max:life});if(effects.length>45)effects.shift();}
  function floating(x,y,text,color=COLORS.amber,size=14){if(texts.length<60)texts.push({x,y,text:String(text),color,life:.7,max:.7,size});}
  function hurtEnemy(e,amount,critical=false,source='shot') {
    if(state!=='playing'||e.hp<=0)return;
    e.hp-=amount;e.hit=.12;
    if(source!=='burn')floating(e.x+rand(-5,5),e.y-e.r-4,Math.round(amount),critical?COLORS.amber:'#d8e3ce',critical?18:12);
    if(source==='shot'&&build.fire){e.burn=2.6;e.burnTick=Math.min(e.burnTick,.3);}
    if(e.hp<=0) {
      kills++;addParticles(e.x,e.y,e.type==='boss'?COLORS.purple:e.type==='spider'?'#cba57b':'#72a38c',e.type==='boss'?45:e.type==='elite'?22:8,90);
      if(e.type==='boss'){end(true);return;}
      const value=e.xp;gems.push({x:e.x,y:e.y,value,r:value>3?6:4,phase:rand(0,TAU),pull:false,heal:false});
      if(e.type==='elite'){gems.push({x:e.x+12,y:e.y+8,value:0,r:7,phase:0,pull:false,heal:true});safeHook('onToast','精英已击败 · 拾取生命灯火');tone(660,.13,'triangle',.3,220);}
      else if(Math.random()<.025&&p.hp<p.maxHp*.8)gems.push({x:e.x+9,y:e.y,value:0,r:6,phase:0,pull:false,heal:true});
      if(gems.length>260){const oldest=gems.shift();if(oldest&&!oldest.heal)xp+=oldest.value;}
    }
  }
  function hurtPlayer(amount,dx=0,dy=0) {
    if(p.inv>0||state!=='playing')return;
    const damage=Math.max(2,amount-p.armor);p.hp-=damage;p.inv=.72;shake=5;
    floating(p.x,p.y-32,'−'+Math.round(damage),COLORS.red,17);addParticles(p.x,p.y,COLORS.red,9,100);tone(115,.16,'sawtooth',.25,-55);
    p.x=clamp(p.x+dx*9,35,WORLD.w-35);p.y=clamp(p.y+dy*9,35,WORLD.h-35);
    if(p.hp<=0){p.hp=0;end(false);}
  }
  function end(victory) {
    if(state==='won'||state==='lost')return;
    setState(victory?'won':'lost');safeHook('onEnd',{victory,time,kills,level,score:Math.round(kills*12+time*5+level*40+(victory?3000:0)),character});
    if(victory){addRing(p.x,p.y,350,COLORS.amber,1.2);tone(440,.35,'sine',.3,440);}else tone(180,.6,'triangle',.35,-110);
  }
  function checkLevel() {
    if(state!=='playing'||xp<xpNext)return;
    xp-=xpNext;level++;xpNext=Math.floor(6+level*3.2);p.hp=Math.min(p.maxHp,p.hp+Math.max(4,p.maxHp*.045));
    const eligible=UPGRADES.filter(u=>(build[u.id]||0)<u.max&&(u.id!=='heal'||p.hp<p.maxHp*.72));
    // A fully developed build must never open an empty, inescapable picker.
    if(!eligible.length)eligible.push(UPGRADES.find(u=>u.id==='heal'));
    // New abilities are gently favored early; every pick still changes the run.
    const weighted=eligible.map(u=>({u,key:Math.random()+(level<5&&['orbit','lightning','nova'].includes(u.id)?.18:0)})).sort((a,b)=>b.key-a.key);
    choices=weighted.slice(0,3).map(({u})=>({...u,description:(build[u.id]&&u.id!=='heal'?`Lv.${build[u.id]} → ${build[u.id]+1} · `:'')+u.description}));
    addRing(p.x,p.y,150,COLORS.amber,.7);tone(660,.22,'sine',.25,440);setState('upgrade');safeHook('onUpgrade',choices,level);
  }
  function chooseUpgrade(id) {
    if(state!=='upgrade'||!choices.some(c=>c.id===id))return false;
    const chosen=choices.find(c=>c.id===id);build[id]=(build[id]||0)+1;
    switch(id){
      case'power':p.damage*=1.25;break;case'haste':p.interval*=.85;break;
      case'multishot':p.multishot++;break;case'pierce':p.pierce++;break;
      case'speed':p.speed*=1.12;break;case'vitality':p.maxHp+=25;p.hp=Math.min(p.maxHp,p.hp+25);break;
      case'magnet':p.pickup+=40;break;case'armor':p.armor+=2;break;case'regen':p.regen+=.8;break;
      case'critical':p.crit+=.14;break;case'dash':p.dashMax*=.8;p.dashCooldown=Math.min(p.dashCooldown,p.dashMax);break;
      case'heal':p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.5);break;
    }
    choices=[];soundInit();tone(523,.12,'sine',.24,260);setState('playing');safeHook('onToast',chosen.name+' · 力量已觉醒');checkLevel();return true;
  }
  function autoAttack() {
    let target=null,best=440;
    for(const e of enemies){if(e.hp<=0)continue;const d=dist(e,p);if(d<best){best=d;target=e;}}
    if(!target)return false;
    const a=Math.atan2(target.y-p.y,target.x-p.x);p.face=a;
    for(let i=0;i<p.multishot;i++) {
      const angle=a+(i-(p.multishot-1)/2)*.15,crit=Math.random()<p.crit;
      if(shots.length<170)shots.push({x:p.x+Math.cos(angle)*14,y:p.y-5+Math.sin(angle)*14,vx:Math.cos(angle)*540,vy:Math.sin(angle)*540,r:character==='sentinel'?5:4,damage:p.damage*(crit?2:1),crit,pierce:p.pierce,hit:new Set(),life:1.3,angle});
    }
    if(Math.random()<.6)tone(character==='ranger'?480:320,.05,'triangle',.13,-160);return true;
  }
  function castLightning() {
    let source=p,targets=[],remaining=enemies.filter(e=>e.hp>0);
    for(let i=0;i<2+build.lightning;i++){
      let best=null,range=i===0?420:230;
      for(const e of remaining){const d=dist(source,e);if(d<range){range=d;best=e;}}
      if(!best)break;targets.push({x1:source.x,y1:source.y-9,x2:best.x,y2:best.y-5});hurtEnemy(best,24+build.lightning*13,false,'lightning');remaining=remaining.filter(e=>e!==best);source=best;
    }
    if(targets.length){effects.push({type:'lightning',lines:targets,life:.23,max:.23});tone(160,.12,'sawtooth',.12,700);}
  }
  function castNova(){const radius=110+build.nova*28;addRing(p.x,p.y,radius,COLORS.cyan,.65);for(const e of enemies)if(e.hp>0&&dist(p,e)<radius+e.r){hurtEnemy(e,25+build.nova*15,false,'nova');e.slow=2.3;}tone(300,.2,'sine',.16,-220);}
  function bossAttack(e) {
    const phase=e.hp<e.maxHp*.5?2:1;
    if(Math.random()<.55){
      warnings.push({x:p.x,y:p.y,r:78,life:1.12,max:1.12,damage:23});
      if(phase===2){for(let i=0;i<2;i++){const a=rand(0,TAU);warnings.push({x:p.x+Math.cos(a)*100,y:p.y+Math.sin(a)*100,r:62,life:1.35,max:1.35,damage:20});}}
    }else{
      for(let i=0;i<10+phase*2;i++){const a=i/(10+phase*2)*TAU+e.phase;hostile.push({x:e.x,y:e.y,vx:Math.cos(a)*155,vy:Math.sin(a)*155,r:6,life:6,damage:15,color:COLORS.purple});}
      addRing(e.x,e.y,78,COLORS.purple,.5);
    }
    e.attack=phase===2?1.9:2.7;
  }
  function update(dt) {
    time+=dt;wave=Math.min(10,1+Math.floor(time/20));p.inv=Math.max(0,p.inv-dt);p.dashCooldown=Math.max(0,p.dashCooldown-dt);
    p.hp=Math.min(p.maxHp,p.hp+p.regen*dt);shake=Math.max(0,shake-dt*20);
    let dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+stick.x;
    let dy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+stick.y;
    let move=Math.hypot(dx,dy);
    if(move>1){dx/=move;dy/=move;move=1;}if(move>.1)lastMove={x:dx/move,y:dy/move};
    if(p.dashTimer>0){p.dashTimer-=dt;p.x+=p.dashX*p.speed*3.5*dt;p.y+=p.dashY*p.speed*3.5*dt;addParticles(p.x,p.y,CHARACTERS[character].color,2,15);}
    else{p.x+=dx*p.speed*dt;p.y+=dy*p.speed*dt;}
    p.x=clamp(p.x,40,WORLD.w-40);p.y=clamp(p.y,40,WORLD.h-40);p.walk+=move*dt*13;
    camera.x+=(p.x-camera.x)*Math.min(1,dt*8);camera.y+=(p.y-camera.y)*Math.min(1,dt*8);
    fireTimer-=dt;if(fireTimer<=0){if(autoAttack())fireTimer+=p.interval;else fireTimer=.09;}
    spawnTimer-=dt;if(spawnTimer<=0){
      const amount=1+(time>55?1:0)+(time>115?1:0);
      for(let i=0;i<amount;i++){let roll=Math.random(),type=time>35&&roll<.16?'brute':time>60&&roll<.3?'moth':roll<.58?'spider':'shade';spawnEnemy(type);}
      spawnTimer= Math.max(.35,1.15-time*.0035)*(bossSpawned?1.65:1);
    }
    if(!elite60&&time>=60){elite60=true;spawnEnemy('elite');safeHook('onToast','精英来袭 · 荒林守卫');}
    if(!elite120&&time>=120){elite120=true;spawnEnemy('elite');safeHook('onToast','精英来袭 · 灰烬行者');}
    if(!bossSpawned&&time>=180){bossSpawned=true;spawnEnemy('boss');safeHook('onToast','长夜之主已现身 · 击败它，迎接黎明');shake=5;tone(80,.6,'sawtooth',.3,-30);}
    if(build.lightning){lightningTimer-=dt;if(lightningTimer<=0){castLightning();lightningTimer=4.5;}}
    if(build.nova){novaTimer-=dt;if(novaTimer<=0){castNova();novaTimer=5.8;}}
    if(state!=='playing')return;
    // Enemy movement and contact. A gentle separation keeps crowds readable.
    for(const e of enemies){
      if(e.hp<=0)continue;e.hit=Math.max(0,e.hit-dt);e.slow=Math.max(0,e.slow-dt);e.orbCd=Math.max(0,e.orbCd-dt);e.phase+=dt*3;
      if(e.burn>0){e.burn-=dt;e.burnTick-=dt;if(e.burnTick<=0){hurtEnemy(e,4+build.fire*4,false,'burn');e.burnTick=.5;}if(e.hp<=0)continue;}
      let ex=p.x-e.x,ey=p.y-e.y,d=Math.hypot(ex,ey)||1;e.face=Math.atan2(ey,ex);
      const speed=e.speed*(e.slow>0?.43:1),keep=e.type==='moth'?180:0;
      if(d>keep){e.x+=ex/d*speed*dt;e.y+=ey/d*speed*dt;}else if(e.type==='moth'&&d<140){e.x-=ex/d*speed*dt*.4;e.y-=ey/d*speed*dt*.4;}
      if(e.type==='moth'){e.attack-=dt;if(e.attack<=0){hostile.push({x:e.x,y:e.y,vx:ex/d*175,vy:ey/d*175,r:4,life:4,damage:10,color:COLORS.cyan});e.attack=3.5;}}
      if(e.type==='boss'){e.attack-=dt;if(e.attack<=0)bossAttack(e);}
      if(d<p.r+e.r&&p.dashTimer<=0){hurtPlayer(e.damage,ex/d,ey/d);e.x-=ex/d*15;e.y-=ey/d*15;}
      if(build.orbit&&e.orbCd<=0){const n=build.orbit+1,r=51+build.orbit*5;for(let i=0;i<n;i++){const a=time*2.8+i/n*TAU,ox=p.x+Math.cos(a)*r,oy=p.y+Math.sin(a)*r;if(Math.hypot(ox-e.x,oy-e.y)<e.r+12){hurtEnemy(e,18+build.orbit*9,false,'orbit');e.orbCd=.38;break;}}}
      if(state==='lost'||state==='won')break;
    }
    if(state==='lost'||state==='won')return;
    // Light separation runs on nearby pairs only, capped by the enemy limit.
    for(let i=0;i<enemies.length;i++){const a=enemies[i];if(a.hp<=0)continue;for(let j=i+1;j<enemies.length;j++){const b=enemies[j];if(b.hp<=0)continue;const dx=a.x-b.x,dy=a.y-b.y,range=(a.r+b.r)*.75;if(Math.abs(dx)>range||Math.abs(dy)>range)continue;let d=Math.hypot(dx,dy)||.1;if(d<range){let push=(range-d)*.5;let nx=dx/d,ny=dy/d;if(d===.1){nx=1;ny=0;}a.x+=nx*push;a.y+=ny*push;b.x-=nx*push;b.y-=ny*push;}}}
    for(const s of shots){
      s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
      if(s.life<=0)continue;
      for(const e of enemies){if(e.hp<=0||s.hit.has(e.id))continue;if(Math.hypot(s.x-e.x,s.y-e.y)<e.r+s.r+2){s.hit.add(e.id);hurtEnemy(e,s.damage,s.crit);addParticles(s.x,s.y,CHARACTERS[character].color,3,35);if(s.pierce--<=0){s.life=0;break;}}}
      if(state!=='playing')return;
    }
    for(const s of hostile){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(Math.hypot(s.x-p.x,s.y-p.y)<p.r+s.r&&p.dashTimer<=0){hurtPlayer(s.damage);s.life=0;}}
    if(state!=='playing')return;
    for(const w of warnings){w.life-=dt;if(w.life<=0){addRing(w.x,w.y,w.r,COLORS.purple,.4);addParticles(w.x,w.y,COLORS.purple,18,150);if(Math.hypot(w.x-p.x,w.y-p.y)<w.r+p.r)hurtPlayer(w.damage);}}
    if(state!=='playing')return;
    warnings=warnings.filter(w=>w.life>0);
    for(const g of gems){
      let d=dist(g,p);if(d<p.pickup)g.pull=true;
      if(g.pull){const speed=260+Math.max(0,200-d)*3;g.x+=(p.x-g.x)/(d||1)*Math.min(speed*dt,d);g.y+=(p.y-g.y)/(d||1)*Math.min(speed*dt,d);}
      if(d<18){g.dead=true;if(g.heal){const heal=p.maxHp*.2;p.hp=Math.min(p.maxHp,p.hp+heal);floating(p.x,p.y-32,'+'+Math.round(heal),COLORS.cyan,17);tone(520,.15,'sine',.18,260);}else{xp+=g.value;if(Math.random()<.22)tone(760+level*20,.045,'sine',.1,140);}}
    }
    enemies=enemies.filter(e=>e.hp>0);shots=shots.filter(s=>s.life>0);hostile=hostile.filter(s=>s.life>0).slice(-200);gems=gems.filter(g=>!g.dead);
    if(state==='playing')checkLevel();
    statsTimer-=dt;if(statsTimer<=0){emitStats();statsTimer=.1;}
  }
  function updateCosmetics(dt) {
    ambient+=dt;
    for(const s of particles){s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=15*dt;s.life-=dt;}
    for(const t of texts){t.life-=dt;t.y-=24*dt;}
    for(const f of effects)f.life-=dt;
    particles=particles.filter(s=>s.life>0);texts=texts.filter(t=>t.life>0);effects=effects.filter(e=>e.life>0);
  }
  function glow(x,y,r,color,alpha=.3){ctx.save();ctx.globalAlpha=alpha;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,color+'00');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();}
  function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();}
  function poly(points,color,stroke){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
  function drawProp(o) {
    const {x,y,s,type}=o;ctx.save();ctx.translate(x,y);ctx.scale(s,s);
    if(type==='tree'){
      ellipse(6,6,37,15,'#08151070');
      ctx.strokeStyle='#28352b';ctx.lineWidth=9;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,3);ctx.lineTo(-2,-38);ctx.lineTo(5,-70);ctx.moveTo(-1,-25);ctx.lineTo(-19,-47);ctx.lineTo(-24,-61);ctx.moveTo(0,-35);ctx.lineTo(21,-53);ctx.stroke();
      poly([[-25,-48],[-11,-85],[1,-73],[10,-103],[27,-69],[39,-49],[20,-40],[-2,-50]],'#19372d');
      poly([[-23,-49],[-9,-72],[3,-59],[15,-87],[26,-64],[34,-50],[15,-46]],'#244838');
      ctx.strokeStyle='#3c5a3d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,-42);ctx.lineTo(-10,-55);ctx.moveTo(8,-59);ctx.lineTo(16,-70);ctx.stroke();
    }else if(type==='rock'){
      ellipse(3,4,21,9,'#07120e88');poly([[-18,0],[-14,-14],[2,-21],[20,-9],[16,5],[-3,8]],'#39463c','#4a5747');poly([[-14,-14],[2,-21],[20,-9],[0,-6]],'#4e5e4c');ctx.strokeStyle='#293a30';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(2,5);ctx.stroke();
      ellipse(-8,-12,6,2,'#627b4a70');
    }else if(type==='pillar'){
      ellipse(7,7,23,9,'#06141088');poly([[-14,2],[-14,-46],[1,-51],[15,-45],[15,4],[0,9]],'#384a3e','#526252');poly([[-14,-46],[1,-51],[15,-45],[0,-39]],'#657362');poly([[0,-39],[15,-45],[15,4],[0,9]],'#293e33');ctx.strokeStyle='#67876c';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-8,-30);ctx.lineTo(-3,-27);ctx.lineTo(-8,-19);ctx.lineTo(-3,-13);ctx.stroke();
    }else{
      ellipse(0,3,21,8,'#07120e99');poly([[-15,-5],[-11,-13],[10,-13],[15,-5],[8,4],[-8,4]],'#536252');poly([[-5,-5],[-5,-27],[5,-27],[5,-5]],'#495444');ellipse(0,-28,16,7,'#686b51');ellipse(0,-28,12,4,'#bb7546');
      glow(0,-34,55,COLORS.amber,.14);const flick=Math.sin(ambient*8+x)*3;
      poly([[-8,-29],[-10,-41],[-3,-49],[0,-60-flick],[7,-45],[9,-34],[5,-28]],'#e59d51');poly([[-4,-30],[-4,-43],[1,-49-flick],[5,-37],[3,-29]],'#ffe3a0');
      for(let i=0;i<3;i++){const t=(ambient*.5+i*.37)%1;ellipse(Math.sin(t*5+i)*9,-40-t*35,1.3,1.3,'#efca87'+Math.round((1-t)*180).toString(16).padStart(2,'0'));}
    }
    ctx.restore();
  }
  function drawPlayer(x=p.x,y=p.y,demo=false) {
    const c=CHARACTERS[character].color,walk=demo?Math.sin(ambient*2)*.1:Math.sin(p.walk),blink=p.inv>0&&Math.floor(ambient*18)%2===0;
    ctx.save();ctx.translate(x,y);if(blink)ctx.globalAlpha=.55;
    ellipse(0,7,18,7,'#05120bc0');
    // A grounded cloak silhouette with two feet, hood and a hand-held light.
    const bounce=Math.abs(walk)*1.4;ctx.translate(0,-bounce);
    ctx.fillStyle='#26392e';ctx.fillRect(-8,0+walk*2,6,9);ctx.fillRect(3,-walk*2,6,9);
    poly([[-12,-21],[-15,-2],[-21,7],[-8,5],[0,9],[11,5],[18,7],[12,-20]],character==='ranger'?'#3a6e5d':character==='sentinel'?'#4d5062':'#907448','#baa16b');
    poly([[-12,-21],[-8,-5],[0,4],[7,-7],[10,-22],[0,-27]],character==='ranger'?'#588976':character==='sentinel'?'#707086':'#baa06b');
    if(character==='sentinel'){poly([[-14,-19],[-5,-23],[-4,-13],[-14,-11]],'#9596a4');poly([[4,-23],[14,-19],[14,-11],[4,-13]],'#9596a4');}
    poly([[-10,-27],[-6,-38],[4,-41],[12,-30],[9,-18],[-8,-18]],character==='ranger'?'#355a4d':character==='sentinel'?'#3b3b4b':'#56492f','#c0a474');
    poly([[-6,-29],[5,-30],[7,-23],[-4,-23]],'#15221d');
    ctx.strokeStyle=c;ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(-3,-26);ctx.lineTo(0,-26);ctx.moveTo(3,-26);ctx.lineTo(6,-26);ctx.stroke();
    ctx.strokeStyle='#63523a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(12,-12);ctx.lineTo(21,-28);ctx.lineTo(19,-42);ctx.stroke();
    if(character==='ranger'){ctx.strokeStyle=c;ctx.lineWidth=2;ctx.beginPath();ctx.arc(19,-24,16,-1.3,1.3);ctx.stroke();ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(23,-39);ctx.lineTo(23,-9);ctx.stroke();}
    else if(character==='sentinel'){poly([[-20,-18],[-9,-21],[-8,-5],[-15,1],[-22,-7]],'#72768c','#b2b9c5');ctx.strokeStyle='#b9c2d4';ctx.beginPath();ctx.moveTo(-15,-16);ctx.lineTo(-15,-5);ctx.stroke();poly([[16,-39],[19,-57],[22,-39],[19,-35]],'#cbd4d2');}
    else{ctx.strokeStyle='#c9a968';ctx.lineWidth=1.5;ctx.strokeRect(15,-36,11,14);ctx.fillStyle='#e8b96a';ctx.fillRect(18,-33,5,8);glow(20,-29,32,COLORS.amber,.22);}
    ctx.restore();
    if(p.dashTimer>0&&!demo){ctx.strokeStyle=c+'88';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-p.dashX*40,y-p.dashY*40);ctx.lineTo(x-p.dashX*16,y-p.dashY*16);ctx.stroke();}
  }
  function drawEnemy(e,demo=false) {
    const bob=Math.sin(e.phase)*2;ctx.save();ctx.translate(e.x,e.y);
    ellipse(0,6,e.r*1.1,e.r*.4,'#040e0ba0');if(e.hit>0)ctx.filter='brightness(1.9)';
    if(e.type==='shade'){
      poly([[-13,4],[-11,-12],[-7,-23],[3,-26],[12,-17],[14,-2],[10,8],[3,4],[-2,9],[-8,4]],'#403e52','#68627a');
      poly([[-8,-12],[-5,-21],[3,-23],[8,-14],[6,-3],[-5,-3]],'#252b34');
      ctx.fillStyle='#c4a7c4';ctx.fillRect(-5,-13,3,2);ctx.fillRect(3,-13,3,2);ctx.strokeStyle='#797087';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-11,-10);ctx.lineTo(-19,-3+bob);ctx.moveTo(11,-10);ctx.lineTo(18,-2-bob);ctx.stroke();
    }else if(e.type==='spider'){
      ctx.strokeStyle='#87765a';ctx.lineWidth=2;for(let i=0;i<4;i++){const yy=-10+i*5,wig=Math.sin(e.phase*3+i)*3;ctx.beginPath();ctx.moveTo(-5,yy);ctx.lineTo(-15,yy-4+wig);ctx.lineTo(-21,yy+4+wig);ctx.moveTo(5,yy);ctx.lineTo(15,yy-4-wig);ctx.lineTo(21,yy+4-wig);ctx.stroke();}
      ellipse(0,-4,11,9,'#565943');ellipse(0,-10,7,6,'#837959');ctx.fillStyle='#e6bc6f';ctx.fillRect(-4,-13,3,2);ctx.fillRect(2,-13,3,2);ellipse(0,0,5,4,'#3c4637');
    }else if(e.type==='brute'){
      poly([[-15,7],[-19,-7],[-15,-28],[-5,-37],[13,-32],[23,-17],[19,5],[7,9]],'#4d6051','#7a8b6c');
      poly([[-15,-28],[-5,-37],[13,-32],[15,-16],[-3,-12]],'#6e7e61');poly([[-14,-6],[-25,-12],[-27,2],[-18,5]],'#56674f');poly([[17,-10],[27,-5],[25,8],[16,6]],'#485b4c');
      ctx.strokeStyle='#b9c584';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-7,-23);ctx.lineTo(-2,-22);ctx.moveTo(5,-23);ctx.lineTo(10,-25);ctx.stroke();ctx.strokeStyle='#33483b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-2,-12);ctx.lineTo(3,-5);ctx.lineTo(-2,4);ctx.stroke();
    }else if(e.type==='moth'){
      const flap=Math.sin(e.phase*4)*5;poly([[-3,-12],[-23,-26-flap],[-27,-8],[-13,-4],[-24,9],[-8,6]],'#4a7977','#72a49a');poly([[3,-12],[23,-26+flap],[27,-8],[13,-4],[24,9],[8,6]],'#4a7977','#72a49a');ellipse(0,-6+bob,5,13,'#aec0a3');ellipse(0,-16+bob,5,4,'#d2cda7');
    }else{
      const boss=e.type==='boss',s=boss?1.65:1;ctx.scale(s,s);
      poly([[-20,8],[-26,-12],[-18,-39],[0,-50],[20,-39],[28,-11],[19,9],[8,3],[0,13],[-10,4]],boss?'#423b54':'#4f5750',boss?'#8d729c':'#84927c');
      poly([[-16,-36],[-11,-51],[1,-57],[13,-51],[18,-34],[10,-22],[-10,-23]],boss?'#7f6a88':'#7c8671');
      ctx.strokeStyle=boss?'#c5a1c3':'#a5b397';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-10,-45);ctx.lineTo(-22,-59);ctx.lineTo(-20,-77);ctx.moveTo(-22,-59);ctx.lineTo(-31,-67);ctx.moveTo(11,-45);ctx.lineTo(23,-59);ctx.lineTo(20,-77);ctx.moveTo(23,-59);ctx.lineTo(32,-67);ctx.stroke();
      poly([[-10,-43],[10,-43],[5,-29],[-5,-29]],'#1a2527');ctx.fillStyle=boss?'#e9b3e7':'#d1d6a7';ctx.fillRect(-8,-41,5,3);ctx.fillRect(3,-41,5,3);
      poly([[-24,-27],[-37,-16],[-34,2],[-28,-5],[-19,-13]],boss?'#59435f':'#5e6c58');poly([[24,-27],[37,-16],[34,2],[28,-5],[19,-13]],boss?'#59435f':'#5e6c58');
      const pulse=.7+Math.sin(ambient*3)*.25;ellipse(0,-8,4,7,boss?`rgba(227,164,229,${pulse})`:'#b9cc8b');
    }
    ctx.restore();
    if(e.burn>0){for(let i=0;i<3;i++)ellipse(e.x+Math.sin(ambient*9+i*2)*e.r*.8,e.y-e.r-(ambient*23+i*7)%22,2,3,'#eab365');}
    if((e.hp<e.maxHp||e.type==='elite')&&e.type!=='boss'&&!demo){const w=Math.max(20,e.r*2);ctx.fillStyle='#0b1713';ctx.fillRect(e.x-w/2,e.y-e.r-18,w,3);ctx.fillStyle=e.type==='elite'?COLORS.amber:'#9b9686';ctx.fillRect(e.x-w/2,e.y-e.r-18,w*Math.max(0,e.hp/e.maxHp),3);}
  }
  function visible(o,margin=100){return Math.abs(o.x-camera.x)<view.w/view.scale/2+margin&&Math.abs(o.y-camera.y)<view.h/view.scale/2+margin;}
  function render() {
    ctx.setTransform(view.dpr,0,0,view.dpr,0,0);ctx.fillStyle='#0c1815';ctx.fillRect(0,0,view.w,view.h);
    let sx=shake?rand(-shake,shake):0,sy=shake?rand(-shake,shake):0;
    ctx.save();ctx.translate(view.w/2+sx,view.h/2+sy);ctx.scale(view.scale,view.scale);ctx.translate(-camera.x,-camera.y);
    ctx.drawImage(terrain,0,0);
    const demo=state==='ready';
    // Muted light pools make geometry legible without expensive per-enemy glows.
    glow(p.x,p.y-10,250,CHARACTERS[character].color,.075);
    for(const w of warnings){const prog=1-w.life/w.max;ctx.fillStyle=`rgba(184,91,139,${.12+prog*.16})`;ctx.beginPath();ctx.arc(w.x,w.y,w.r,0,TAU);ctx.fill();ctx.strokeStyle='#d28fae';ctx.lineWidth=2;ctx.beginPath();ctx.arc(w.x,w.y,w.r*prog,0,TAU);ctx.stroke();ctx.setLineDash([6,6]);ctx.beginPath();ctx.arc(w.x,w.y,w.r,0,TAU);ctx.stroke();ctx.setLineDash([]);}
    for(const g of gems){if(!visible(g))continue;const bob=Math.sin(ambient*4+g.phase)*2;ctx.save();ctx.translate(g.x,g.y+bob);ctx.fillStyle=g.heal?'#e59b8c':g.value>3?'#edc983':'#7ac4ab';ctx.beginPath();ctx.moveTo(0,-g.r);ctx.lineTo(g.r*.7,0);ctx.lineTo(0,g.r);ctx.lineTo(-g.r*.7,0);ctx.closePath();ctx.fill();ctx.strokeStyle=g.heal?'#ffddbc':'#b0e8c9';ctx.lineWidth=.7;ctx.stroke();ctx.restore();}
    let drawables=props.filter(o=>visible(o)).map(o=>({y:o.y,fn:()=>drawProp(o)}));
    if(demo){
      for(let i=0;i<7;i++){const a=i/7*TAU+.3,r=200+(i%3)*36,e={x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r,r:13,type:i%3===0?'spider':'shade',phase:ambient*2+i,hit:0,hp:20,maxHp:20,burn:0};drawables.push({y:e.y,fn:()=>drawEnemy(e,true)});}
    }else for(const e of enemies)if(e.hp>0&&visible(e))drawables.push({y:e.y,fn:()=>drawEnemy(e)});
    drawables.push({y:p.y,fn:()=>drawPlayer(p.x,p.y,demo)});drawables.sort((a,b)=>a.y-b.y);for(const d of drawables)d.fn();
    if(build.orbit){const n=build.orbit+1,r=51+build.orbit*5;for(let i=0;i<n;i++){const a=time*2.8+i/n*TAU,x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r;ctx.strokeStyle='#efbd6870';ctx.lineWidth=4;ctx.beginPath();ctx.arc(p.x,p.y,r,a-.35,a);ctx.stroke();ctx.save();ctx.translate(x,y);ctx.rotate(a);poly([[-3,-11],[5,0],[1,13],[-4,3]],'#f4d58f');ctx.restore();}}
    for(const s of shots){const c=CHARACTERS[character].color;ctx.strokeStyle=c+'55';ctx.lineWidth=s.r*1.6;ctx.beginPath();ctx.moveTo(s.x-s.vx*.025,s.y-s.vy*.025);ctx.lineTo(s.x,s.y);ctx.stroke();ellipse(s.x,s.y,s.r,s.r,c);ellipse(s.x,s.y,s.r*.45,s.r*.45,'#fff3d0');}
    for(const s of hostile){ellipse(s.x,s.y,s.r+3,s.r+3,s.color+'44');ellipse(s.x,s.y,s.r,s.r,s.color);}
    for(const f of effects){
      if(f.type==='ring'){const t=1-f.life/f.max;ctx.strokeStyle=f.color;ctx.lineWidth=3*(1-t)+.5;ctx.globalAlpha=(1-t)*.8;ctx.beginPath();ctx.arc(f.x,f.y,Math.max(1,f.r*t),0,TAU);ctx.stroke();ctx.globalAlpha=1;}
      else if(f.type==='lightning'){ctx.strokeStyle='#dccffc';ctx.lineWidth=2;ctx.globalAlpha=Math.min(1,f.life*8);for(const l of f.lines){ctx.beginPath();ctx.moveTo(l.x1,l.y1);for(let j=1;j<7;j++){const t=j/7;ctx.lineTo(l.x1+(l.x2-l.x1)*t+Math.sin(j*7+ambient*50)*9,l.y1+(l.y2-l.y1)*t+Math.cos(j*9)*9);}ctx.lineTo(l.x2,l.y2);ctx.stroke();}ctx.globalAlpha=1;}
    }
    for(const f of fireflies){if(!visible(f,10))continue;const a=(Math.sin(ambient*1.6+f.v)+1)*.25;ctx.globalAlpha=a;ellipse(f.x+Math.sin(ambient*.3+f.v)*12,f.y+Math.cos(ambient*.4+f.v)*6,f.s,f.s,'#b6c789');}ctx.globalAlpha=1;
    for(const s of particles){ctx.globalAlpha=clamp(s.life/s.max,0,1);ellipse(s.x,s.y,s.r,s.r,s.color);}ctx.globalAlpha=1;
    ctx.textAlign='center';ctx.textBaseline='middle';for(const t of texts){ctx.globalAlpha=clamp(t.life*2.6,0,1);ctx.fillStyle=t.color;ctx.font=`600 ${t.size}px system-ui,sans-serif`;ctx.fillText(t.text,t.x,t.y);}ctx.globalAlpha=1;
    // Directional off-screen boss hint prevents a lost final encounter.
    const boss=enemies.find(e=>e.type==='boss'&&e.hp>0);
    if(boss&&!visible(boss,-45)){const a=Math.atan2(boss.y-p.y,boss.x-p.x),r=Math.min(view.w,view.h)/view.scale*.36,x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r;ctx.save();ctx.translate(x,y);ctx.rotate(a);poly([[12,0],[-5,-7],[-2,0],[-5,7]],COLORS.purple);ctx.restore();}
    ctx.restore();
    // Quiet vignette sits below all DOM game controls.
    const v=ctx.createRadialGradient(view.w*.5,view.h*.45,Math.min(view.w,view.h)*.2,view.w*.5,view.h*.5,Math.max(view.w,view.h)*.7);v.addColorStop(0,'#06110d00');v.addColorStop(1,'#06110d99');ctx.fillStyle=v;ctx.fillRect(0,0,view.w,view.h);
    if(p.hp/p.maxHp<.25&&state==='playing'){ctx.strokeStyle=`rgba(204,92,84,${.18+Math.sin(ambient*5)*.08})`;ctx.lineWidth=12;ctx.strokeRect(0,0,view.w,view.h);}
  }
  function frame(ts) {
    if(!alive)return;
    if(firstFrame){firstFrame=false;emitStats();}
    const dt=Math.min(.04,Math.max(0,(ts-(last||ts))/1000));last=ts;
    if(state==='playing')update(dt);
    if(state==='ready'||state==='playing'||state==='won'||state==='lost')updateCosmetics(dt);
    render();raf=requestAnimationFrame(frame);
  }
  function destroy(){alive=false;cancelAnimationFrame(raf);ro?.disconnect();window.removeEventListener('resize',resize);window.removeEventListener('keydown',handleKeyDown);window.removeEventListener('keyup',handleKeyUp);window.removeEventListener('blur',handleBlur);clearInput();if(audio){audio.close().catch(()=>{});audio=null;}}
  raf=requestAnimationFrame(frame);
  return {start,pause,resume,restart:()=>start(character),chooseUpgrade,dash,setSound(enabled){sound=!!enabled;if(sound)soundInit();},setMovement,getSnapshot,destroy};
}
