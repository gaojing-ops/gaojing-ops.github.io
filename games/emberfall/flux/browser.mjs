import {createCamp} from './camp.mjs';
const WIDTH=390,HEIGHT=844;
const PREFIX='gaojing-emberfall-flux-v1:';
const ASSET_BASE=new URL('./',import.meta.url);
export function createBrowserPlatform(canvas){
 const listeners={start:[],move:[],end:[],cancel:[]},memory=new Map();
 const offscreen=(width=1,height=1)=>{const c=document.createElement('canvas');c.width=width;c.height=height;return c;};
 const api={
  getSystemInfoSync:()=>({screenWidth:WIDTH,screenHeight:HEIGHT,pixelRatio:Math.min(window.devicePixelRatio||1,2),platform:'browser',safeArea:{top:0,bottom:HEIGHT,left:0,right:WIDTH}}),
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
 return {api,listeners,canvas};
}

export function mountFlux(runtime,platform){
 const {game,sm,SFX,canvas,ctx,info,dpr,CHARACTERS}=runtime;
 const status=document.getElementById('status'),controls=document.getElementById('scene-controls');
 const keys=new Set();let primary=null,last=0,raf=0,disposed=false,signature='',suspended=false,campVisible=false;
 let keyboardVector={x:0,y:0};const originalVector=game.input.getVector.bind(game.input);
 game.input.getVector=()=>keys.size?keyboardVector:originalVector();
 const position=event=>{const r=canvas.getBoundingClientRect();return {clientX:(event.clientX-r.left)*WIDTH/r.width,clientY:(event.clientY-r.top)*HEIGHT/r.height,identifier:event.pointerId};};
 const dispatch=(kind,touch)=>{const event={touches:kind==='end'||kind==='cancel'?[]:[touch],changedTouches:[touch]};for(const fn of platform.listeners[kind])fn(event);};
 function clearMovement(){keys.clear();keyboardVector={x:0,y:0};game.input._end();game.lastTouchState=false;if(primary!==null){try{canvas.releasePointerCapture(primary);}catch{}primary=null;}}
 const camp=createCamp(runtime,platform,()=>{clearMovement();game.lastTime=null;last=0;signature='';syncControls();if(game.isRunning)canvas.focus({preventScroll:true});});
 function pause(){clearMovement();if(game.isRunning){game.isPaused=true;SFX.pauseBGM();}game.lastTime=null;last=0;}
 function togglePause(){if(!game.isRunning)return;if(game.isPaused){game.isPaused=false;SFX.resumeBGM();game.lastTime=null;last=0;}else pause();syncControls();}
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
 const canPlay=()=>game.isRunning&&!game.isPaused&&sm.currentSceneName==='playing'&&!suspended;
 function keydown(event){
  if(event.ctrlKey||event.altKey||event.metaKey||event.isComposing||event.target.closest?.('input,select,textarea,[contenteditable="true"],dialog'))return;
  const key=event.key.toLowerCase();
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)&&canPlay()){event.preventDefault();keys.add(key);return;}
  if((key==='p'||key==='escape')&&!event.repeat&&game.isRunning){event.preventDefault();togglePause();return;}
  if((key===' '||key==='e')&&canPlay()&&!event.target.closest?.('button,a')){event.preventDefault();if(!event.repeat){if(key==='e')game.skillSystem?.tryUse();else game.player.dash(Math.hypot(keyboardVector.x,keyboardVector.y)>.1?Math.atan2(keyboardVector.y,keyboardVector.x):game.player.facingAngle);}}
  if(/^[1-5]$/.test(key)&&sm.currentSceneName==='upgrade'&&!event.repeat){event.preventDefault();const option=sm.currentScene.options[Number(key)-1];if(option)sm.currentScene.onSelect(option);}
 }
 window.addEventListener('keydown',keydown);window.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
 window.addEventListener('blur',pause);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){suspended=true;pause();}else{suspended=false;last=0;game.lastTime=null;}});
 document.getElementById('pause-web').addEventListener('click',togglePause);
 document.getElementById('fullscreen-web').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.getElementById('game-shell').requestFullscreen();}catch{status.textContent='当前浏览器未提供全屏，可直接在页面中游玩。';}});
 document.getElementById('help-web').addEventListener('click',()=>{pause();document.getElementById('help-dialog').showModal();});
 document.getElementById('help-close').addEventListener('click',()=>document.getElementById('help-dialog').close());
 document.getElementById('sound-web').addEventListener('click',()=>{SFX.initAudio();SFX.toggleMute();document.getElementById('sound-web').textContent=SFX.isMuted?'音效：关':'音效：开';});
 function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>{fn();game.lastTime=null;last=0;signature='';syncControls();});controls.append(b);return b;}
 function sceneClick(rect){if(!rect)return;const x=rect.x+rect.w/2,y=rect.y+rect.h/2;sm.currentScene.onTouchStart?.(x,y);sm.currentScene.onTouchEnd?.(x,y);}
 function syncControls(){
  const scene=sm.currentScene,name=sm.currentSceneName;
  const stageReward=game.stageSystem?.state==='reward',bossReward=game.bossRushMode?.state==='reward';
  const next=JSON.stringify([name,game.isPaused,game.autoPlay,game.autoUpgrade,game._tutorialStep,scene?.selectedCharId,scene?.options?.map(o=>[o.id,o.name,o.desc]),game.stageSystem?.currentStage,stageReward,bossReward]);
  const pauseButton=document.getElementById('pause-web');pauseButton.disabled=!game.isRunning;pauseButton.textContent=game.isPaused?'继续':'暂停';
  campVisible=camp.sync();if(campVisible){controls.replaceChildren();signature='';return;}
  if(next===signature)return;signature=next;controls.replaceChildren();
  if(name==='playing'&&game._tutorialStep>=0){button(game._tutorialStep<2?'继续引导':'开始战斗',()=>game._advanceTutorial());return;}
  if(stageReward){for(const [i,reward] of game.stageSystem.rewardOptions.entries())button(reward.name+' · '+reward.desc,()=>game.stageSystem.applyReward(i));return;}
  if(bossReward){for(const [i,reward] of game.bossRushMode.rewardOptions.entries())button(reward.name||`奖励 ${i+1}`,()=>game.bossRushMode.selectReward?.(i));return;}
  if(name==='title'){
   for(const [label,target] of [['开始远征','charSelect'],['武器图鉴','compendium'],['芯片与天赋','shop'],['成就','achievements'],['每日挑战','daily'],['本机战绩','leaderboard']])button(label,()=>sm.switchTo(target));
   button('首领连战',()=>sm.switchTo('charSelect',{bossRushMode:true}));button('速通模式',()=>sm.switchTo('speedRun'));
  }else if(name==='charSelect'){
   const select=document.createElement('select');select.setAttribute('aria-label','选择角色');
   for(const [id,c] of Object.entries(CHARACTERS)){const option=document.createElement('option');option.value=id;option.textContent=c.name+' · '+c.desc;select.append(option);}
   select.value=scene.selectedCharId||'tracer';select.addEventListener('change',()=>{scene.selectedCharId=select.value;signature='';});controls.append(select);
   button('确认角色',()=>{scene.selectedCharId=select.value;scene.onSelect(select.value,null);});
   button('返回营地',()=>sm.switchTo('title'));
  }else if(name==='curseSelect'){
   button('开始挑战',()=>sceneClick(scene.confirmBtn));button('返回选角',()=>sm.switchTo('charSelect'));
  }else if(name==='upgrade'){
   for(const [i,option] of scene.options.entries())button(`${i+1} · ${option.name} · ${option.desc}`,()=>scene.onSelect(option));
   if(scene.rerollCount>0)button('重新抽取',()=>scene.onReroll());if(scene.skipCount>0)button('跳过升级',()=>scene.onSkip());
  }else if(name==='playing'&&game.isPaused){
   button('继续远征',togglePause);button('装备与进化',()=>{game.pauseShowEquip=true;game.pauseShowStats=false;});button('伤害统计',()=>{game.pauseShowStats=true;game.pauseShowEquip=false;});
   button('自动走位：'+(game.autoPlay?'开':'关'),()=>{game.autoPlay=!game.autoPlay;clearMovement();game._aiTimer=0;game._aiVector=null;});button('自动升级：'+(game.autoUpgrade?'开':'关'),()=>{game.autoUpgrade=!game.autoUpgrade;});button('放弃挑战',()=>game.endGame());
  }else if(name==='gameOver'){
   button('再赴长夜',()=>scene.onRestart());button('芯片商店',()=>scene.onShop());button('返回营地',()=>scene.onTitle());
  }else if(name!=='playing'){button('返回营地',()=>sm.switchTo('title'));}
 }
 function frame(timestamp){
  if(disposed)return;
  try{
   const dt=last?Math.max(0,Math.min(.1,(timestamp-last)/1000)):0;last=timestamp;
   if(!suspended&&!document.hidden&&game.isRunning&&!game.isPaused&&game._tutorialStep<0){
    const x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
    const y=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));const length=Math.hypot(x,y)||1;
    keyboardVector={x:x/length,y:y/length};game.time+=dt;game.frameDt=dt;game.update(dt);
   }
   if(!campVisible){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,WIDTH,HEIGHT);ctx.save();
   try{if(game.isRunning||game.stageSystem?.state==='reward'||game.bossRushMode&&sm.currentSceneName==='playing')game.draw();else sm.draw(ctx,WIDTH,HEIGHT);}finally{ctx.restore();}}
   const minutes=String(Math.floor(game.time/60)).padStart(2,'0'),seconds=String(Math.floor(game.time%60)).padStart(2,'0');
   if(game.isRunning)status.textContent=`${game.isPaused?'已暂停':'远征中'} · ${minutes}:${seconds} / 20:00 · Lv.${game.player.level} · 击败 ${game.player.kills}`;
   else status.textContent=({title:'远征待命 · 灰烬林地',charSelect:'远征待命 · 选择守夜者',curseSelect:'选择已解锁诅咒，或直接开始挑战',upgrade:'战斗已暂停，请选择强化',gameOver:'本次远征已结算'})[sm.currentSceneName]||'营地';
   syncControls();document.getElementById('loading').hidden=true;
  }catch(error){console.error('Emberfall browser runtime:',error);status.textContent='游戏遇到错误：'+error.message;document.getElementById('loading').textContent='游戏启动失败，请刷新重试。';}
  raf=requestAnimationFrame(frame);
 }
 canvas.focus({preventScroll:true});syncControls();raf=requestAnimationFrame(frame);
 window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);clearMovement();camp.destroy();SFX.stopBGM();});
 window.addEventListener('pageshow',event=>{if(event.persisted){disposed=false;last=0;pause();raf=requestAnimationFrame(frame);}});
}
