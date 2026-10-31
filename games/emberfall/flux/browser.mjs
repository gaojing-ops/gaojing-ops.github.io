import {createCamp} from './camp.mjs';
import {createFolio,chooseUpgrade} from './folio.mjs';
import {themeCanvas} from './theme.mjs';
import {registerLore,text} from './lore.mjs';
const WIDTH=390,HEIGHT=844;
const PREFIX='gaojing-emberfall-flux-v1:';
const ASSET_BASE=new URL('./',import.meta.url);
export function createBrowserPlatform(canvas){
 themeCanvas(canvas);
 const listeners={start:[],move:[],end:[],cancel:[]},memory=new Map();
 const offscreen=(width=1,height=1)=>{const c=document.createElement('canvas');themeCanvas(c);c.width=width;c.height=height;return c;};
 const getDimensions=()=>{
  const shell=canvas.closest?.('#game-shell'),width=shell?.clientWidth||0;
  const full=document.fullscreenElement===shell,w=Math.min(1280,width);
  const header=document.querySelector?.('.site-header')?.getBoundingClientRect?.().height||(width<=620?120:78);
  const toolbar=document.querySelector?.('.game-toolbar')?.getBoundingClientRect?.().height||56;
  const available=window.innerHeight?window.innerHeight-(full?toolbar:header+toolbar+24):0;
  if(width<=620){
   const height=width>0&&available>0?Math.max(full?320:460,Math.min(HEIGHT,Math.floor(available*WIDTH/width))):HEIGHT;
   return {width:WIDTH,height};
  }
  const h=full?Math.max(320,Math.min(900,Math.round(((window.innerHeight||720)-58)*w/width))):Math.max(560,Math.min(720,Math.round(w*.62)));
  return {width:w,height:!full&&available>0?Math.min(h,Math.max(320,Math.floor(available*w/width))):h};
 };
 const api={
  getSystemInfoSync:()=>{const {width,height}=getDimensions();return {screenWidth:width,screenHeight:height,pixelRatio:Math.min(window.devicePixelRatio||1,2),platform:'browser',safeArea:{top:0,bottom:height,left:0,right:width}};},
  getPerformance:()=>performance,createCanvas:()=>offscreen(),createOffscreenCanvas:({width,height})=>offscreen(width,height),createImage(){const image=new Image();Object.defineProperty(image,'src',{get:()=>image.getAttribute('src')||'',set:value=>image.setAttribute('src',new URL(value,ASSET_BASE).href)});return image;},
  getStorageSync(key){if(memory.has(key))return memory.get(key);try{return localStorage.getItem(PREFIX+key)||'';}catch{return '';}},
  setStorageSync(key,value){memory.set(key,String(value));try{localStorage.setItem(PREFIX+key,String(value));}catch{document.getElementById('storage-note').hidden=false;}},
  onTouchStart:fn=>listeners.start.push(fn),onTouchMove:fn=>listeners.move.push(fn),onTouchEnd:fn=>listeners.end.push(fn),onTouchCancel:fn=>listeners.cancel.push(fn),
  setKeepScreenOn(){},
  shareAppMessage({title}){if(navigator.share)navigator.share({title,url:location.href}).catch(()=>{});else if(navigator.clipboard)navigator.clipboard.writeText(location.href).then(()=>{document.getElementById('status').textContent='游戏链接已复制。';}).catch(()=>{});},
 };
 const AudioContext=window.AudioContext||window.webkitAudioContext;
 if(AudioContext)api.createWebAudioContext=()=>new AudioContext();
 // Friend/cloud APIs are intentionally absent: the original scene displays its local-only fallback.
 return {api,listeners,canvas,getDimensions};
}

export function mountFlux(runtime,platform){
 const {game,sm,SFX,canvas,ctx,info,dpr,CHARACTERS}=runtime;
 if(runtime.catalogs){runtime.catalogs.curses=runtime.CURSE_DEFS;registerLore(runtime.catalogs);}
 const status=document.getElementById('status'),controls=document.getElementById('scene-controls');
 let viewW=info.screenWidth||WIDTH,viewH=info.screenHeight||HEIGHT,backgroundTimer=null,pendingTime=0,unfocused=false,soundSuppressed=false;
 const MAX_CATCHUP_SECONDS=30,MAX_STEPS_PER_TICK=120,MAX_STEP_MS=8;
 const keys=new Set();let primary=null,last=null,raf=0,disposed=false,signature='',suspended=false,campVisible=false;
 let keyboardVector={x:0,y:0};const originalVector=game.input.getVector.bind(game.input);
 game.input.getVector=()=>keys.size?keyboardVector:originalVector();
 const position=event=>{const r=canvas.getBoundingClientRect();return {clientX:(event.clientX-r.left)*viewW/r.width,clientY:(event.clientY-r.top)*viewH/r.height,identifier:event.pointerId};};
 const dispatch=(kind,touch)=>{const event={touches:kind==='end'||kind==='cancel'?[]:[touch],changedTouches:[touch]};for(const fn of platform.listeners[kind])fn(event);};
 function clearMovement(){keys.clear();keyboardVector={x:0,y:0};game.input._end();game.lastTouchState=false;if(primary!==null){try{canvas.releasePointerCapture(primary);}catch{}primary=null;}}
 function resize(){
  const {width,height}=platform.getDimensions();if(width===viewW&&height===viewH)return;
  clearMovement();viewW=width;viewH=height;canvas.width=width*dpr;canvas.height=height*dpr;
  info.screenWidth=width;info.screenHeight=height;game.resize?.(width,height);
  if(game.player&&game.camera){game.camera.x=game.player.x-width/2;game.camera.y=game.player.y-height/2;}
  last=null;game.lastTime=null;
 }
 window.addEventListener('resize',resize);document.addEventListener('fullscreenchange',resize);
 const camp=createCamp(runtime,platform,()=>{clearMovement();game.lastTime=null;last=null;signature='';syncControls();if(game.isRunning){canvas.focus({preventScroll:true});document.getElementById('game-shell')?.scrollIntoView?.({block:'start',behavior:'instant'});}});
 const folio=createFolio(runtime,platform,{togglePause,afterAction(){clearMovement();game.lastTime=null;last=null;signature='';syncControls();}});
 const idleEnabled=()=>!!(game.autoPlay&&game.autoUpgrade);
 const inBackground=()=>document.hidden||unfocused;
 const mayAdvance=()=>!suspended&&game.isRunning&&!game.isPaused&&game._tutorialStep<0&&sm.currentSceneName==='playing';
 function setSoundSuppressed(on){if(soundSuppressed===on)return;soundSuppressed=on;if(!SFX?.setMuted)return;if(on){SFX._savedMute=!!SFX.isMuted;if(!SFX.isMuted)SFX.setMuted(true);}else if(SFX._savedMute===false){SFX.setMuted(false);SFX._savedMute=undefined;}}
 function stopBackground(){if(backgroundTimer!==null)clearTimeout(backgroundTimer);backgroundTimer=null;setSoundSuppressed(false);}
 function pause(){clearMovement();stopBackground();pendingTime=0;if(game.isRunning){game.isPaused=true;SFX.pauseBGM();}game.lastTime=null;last=null;}
 function togglePause(){if(!game.isRunning)return;if(game.isPaused){game.isPaused=false;SFX.resumeBGM();game.lastTime=null;last=null;}else pause();syncControls();}
 function actionAt(x,y){if(game.isRunning){game._handleTouchInput(x,y,game.input);game.lastTouchState=game.input.active;} }
 canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;event.preventDefault();canvas.focus({preventScroll:true});const touch=position(event);
  if(primary!==null){
   // Keep the movement pointer while another finger presses dash or the active skill.
   if(game.isRunning&&!game.isPaused){const d=game.dashBtnRect,s=game.skillSystem;if(d&&Math.hypot(touch.clientX-d.cx,touch.clientY-d.cy)<=d.r+20){const v=game.input.getVector();game.player.dash(Math.hypot(v.x,v.y)>.1?Math.atan2(v.y,v.x):game.player.facingAngle);}else s?.onTouchEnd(touch.clientX,touch.clientY);}
   return;
  }
  primary=event.pointerId;canvas.setPointerCapture(primary);dispatch('start',touch);if(sm.currentSceneName==='playing')actionAt(touch.clientX,touch.clientY);
 });
 canvas.addEventListener('pointermove',event=>{if(event.pointerId===primary){event.preventDefault();dispatch('move',position(event));}});
 canvas.addEventListener('pointerup',event=>{if(event.pointerId!==primary)return;dispatch('end',position(event));try{canvas.releasePointerCapture(primary);}catch{}primary=null;game.lastTouchState=false;syncControls();});
 function cancel(event){if(event.pointerId!==primary)return;primary=null;game.input._end();game.lastTouchState=false;if(sm.currentScene)sm.currentScene.touchStartedHere=false;}
 canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);
 const canPlay=()=>game.isRunning&&!game.isPaused&&sm.currentSceneName==='playing'&&!suspended&&!inBackground();
 function keydown(event){
  if(event.ctrlKey||event.altKey||event.metaKey||event.isComposing||event.target.closest?.('input,select,textarea,[contenteditable="true"],dialog'))return;
  const key=event.key.toLowerCase();
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)&&canPlay()){event.preventDefault();keys.add(key);return;}
  if((key==='p'||key==='escape')&&!event.repeat&&game.isRunning){event.preventDefault();togglePause();return;}
  if((key===' '||key==='e')&&canPlay()&&!event.target.closest?.('button,a')){event.preventDefault();if(!event.repeat){if(key==='e')game.skillSystem?.tryUse();else game.player.dash(Math.hypot(keyboardVector.x,keyboardVector.y)>.1?Math.atan2(keyboardVector.y,keyboardVector.x):game.player.facingAngle);}}
  if(/^[1-5]$/.test(key)&&sm.currentSceneName==='upgrade'&&!event.repeat){event.preventDefault();const option=sm.currentScene.options[Number(key)-1];if(option)chooseUpgrade(sm.currentScene,option);}
 }
 window.addEventListener('keydown',keydown);window.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
 function returnToForeground(){
  const wasIdling=backgroundTimer!==null;stopBackground();suspended=false;
  if(wasIdling)try{advance(performance.now(),true);}catch(error){runtimeError(error);}
  pendingTime=0;last=null;game.lastTime=null;
 }
 window.addEventListener('blur',()=>{unfocused=true;clearMovement();if(idleEnabled()&&mayAdvance())startBackground();else pause();});
 window.addEventListener('focus',()=>{unfocused=false;if(!document.hidden)returnToForeground();});
 document.addEventListener('visibilitychange',()=>{
  clearMovement();
  if(document.hidden){
   if(idleEnabled()&&mayAdvance()){suspended=false;if(last===null)last=performance.now();startBackground();}
   else{suspended=true;pause();}
  }else{
   if(unfocused&&idleEnabled()&&mayAdvance())startBackground();
   else returnToForeground();
  }
 });
 document.getElementById('pause-web').addEventListener('click',togglePause);
 document.getElementById('fullscreen-web').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.getElementById('game-shell').requestFullscreen();}catch{status.textContent='当前浏览器未提供全屏，可直接在页面中游玩。';}});
 document.getElementById('help-web').addEventListener('click',()=>{pause();document.getElementById('help-dialog').showModal();});
 document.getElementById('help-close').addEventListener('click',()=>document.getElementById('help-dialog').close());
 document.getElementById('sound-web').addEventListener('click',()=>{setSoundSuppressed(false);SFX.initAudio();SFX.toggleMute();document.getElementById('sound-web').textContent=SFX.isMuted?'音效：关':'音效：开';});
 function syncControls(){
  const muted=soundSuppressed?!!SFX._savedMute:!!SFX.isMuted;
  const pauseButton=document.getElementById('pause-web');pauseButton.disabled=!game.isRunning;pauseButton.textContent=game.isRunning&&game.isPaused?'继续':'暂停';document.getElementById('sound-web').textContent=muted?'音效：关':'音效：开';
  campVisible=camp.sync();folio.sync(campVisible);
  if(controls.children.length)controls.replaceChildren();
 }
 function renderScene(){
  syncControls();
  if(!campVisible&&!folio.visible){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,viewW,viewH);ctx.save();
  try{if(game.isRunning||game.stageSystem?.state==='reward'||game.bossRushMode&&sm.currentSceneName==='playing')game.draw();else sm.draw(ctx,viewW,viewH);}finally{ctx.restore();}}
  const minutes=String(Math.floor(game.time/60)).padStart(2,'0'),seconds=String(Math.floor(game.time%60)).padStart(2,'0');
  if(game.isRunning){
   const mode=game.bossRushMode?`首领连战 · 第 ${game.bossRushMode.currentWave+1} 波`:game.isSpeedRunMode?'疾行试炼':game.endlessMode?'无尽守夜':'长夜远征';
   status.textContent=`${game.isPaused?'已暂停':mode} · ${minutes}:${seconds}${game.bossRushMode||game.isSpeedRunMode||game.endlessMode?'':' / 20:00'} · 第 ${game.player.level} 阶 · 击败 ${game.player.kills}`;
  }
  else if(sm.currentSceneName==='playing'&&game.stageSystem?.state==='reward')status.textContent='章节已完成，请选择赐福';
  else if(sm.currentSceneName==='playing'&&game.bossRushMode?.state==='reward')status.textContent='首领已退，请选择赐福';
  else if(sm.currentSceneName==='playing'&&['complete','failed'].includes(game.bossRushMode?.state))status.textContent='首领连战已结算';
  else status.textContent=text(({title:'远征待命 · 灰烬林地',charSelect:'远征待命 · 选择守夜者',curseSelect:'选择已解锁诅咒，或直接开始挑战',upgrade:'战斗已暂停，请选择强化',gameOver:'本次远征已结算'})[sm.currentSceneName]||'营地');
  const chapterIndex=campVisible?0:game.stageSystem?.currentStage||0;
  const chapter=runtime.catalogs?.stages?.[chapterIndex];
  const chapterName=document.querySelector?.('.chapter-mark strong');if(chapterName&&chapter)chapterName.textContent=chapter.name;
  const chapterNumber=document.querySelector?.('.chapter-mark > span');if(chapterNumber)chapterNumber.textContent=`CHAPTER ${String(chapterIndex+1).padStart(2,'0')}`;
  syncControls();document.getElementById('loading').hidden=true;
 }
 function step(dt){
    const x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
    const y=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));const length=Math.hypot(x,y)||1;
    keyboardVector={x:x/length,y:y/length};game.time+=dt;game.frameDt=dt;game.update(dt);
 }
 function advance(timestamp,catchUp=false){
  const elapsed=last!==null?Math.max(0,(timestamp-last)/1000):0;last=timestamp;
  if(!mayAdvance()){pendingTime=0;return;}
  if(!catchUp&&pendingTime<=0){step(Math.min(.1,elapsed));return;}
  // Background timers can be throttled. Use normal-sized simulation steps,
  // retain unprocessed time within a sane cap, and yield between bounded batches.
  pendingTime=Math.min(MAX_CATCHUP_SECONDS,pendingTime+elapsed);
  const deadline=catchUp?Infinity:performance.now()+MAX_STEP_MS;
  setSoundSuppressed(true);
  try{
   for(let count=0;pendingTime>1e-9&&count<MAX_STEPS_PER_TICK&&mayAdvance();count++){
    const dt=Math.min(1/60,pendingTime);pendingTime-=dt;step(dt);
    if(count>0&&performance.now()>=deadline)break;
   }
  }finally{if(!inBackground())setSoundSuppressed(false);}
  if(!mayAdvance())pendingTime=0;
 }
 function runtimeError(error){
  pause();console.error('Emberfall browser runtime:',error);status.textContent='游戏遇到错误：'+error.message;document.getElementById('loading').textContent='游戏启动失败，请刷新重试。';
 }
 function startBackground(){
  if(disposed||!inBackground()||backgroundTimer!==null||!idleEnabled()||!mayAdvance())return;
  if(last===null)last=performance.now();
  backgroundTimer=setTimeout(()=>{
   backgroundTimer=null;if(disposed||!inBackground())return;
   if(!idleEnabled()){pause();return;}
   try{advance(performance.now(),true);}catch(error){runtimeError(error);}
   startBackground();
  },100);
 }
 function frame(timestamp){
  if(disposed)return;
  if(document.hidden){raf=requestAnimationFrame(frame);return;}
  try{
   if(!(unfocused&&idleEnabled()))advance(timestamp);
   renderScene();
  }catch(error){runtimeError(error);}
  raf=requestAnimationFrame(frame);
 }
 canvas.focus({preventScroll:true});syncControls();document.getElementById('loading').hidden=true;raf=requestAnimationFrame(frame);
 window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);stopBackground();pendingTime=0;clearMovement();camp.destroy();SFX.stopBGM();});
 window.addEventListener('pageshow',event=>{if(event.persisted){disposed=false;last=null;pause();raf=requestAnimationFrame(frame);}});
}
