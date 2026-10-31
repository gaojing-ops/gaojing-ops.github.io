import test from 'node:test';
import assert from 'node:assert/strict';
import {createBrowserPlatform,mountFlux} from '../games/emberfall/flux/browser.mjs';

function environment(width=0){
 const nodes=new Map(),stored=new Map(),events={},windowEvents={},timers=new Map();let nextFrame,now=0,timerId=0;
 class Node{
  constructor(){this.events={};this.children=[];this.hidden=false;}
  addEventListener(name,fn){(this.events[name]??=[]).push(fn);}
  append(child){this.children.push(child);} replaceChildren(){this.children=[];} setAttribute(){} focus(){}
  getBoundingClientRect(){return {left:20,top:10,width:195,height:422};}
  setPointerCapture(){} releasePointerCapture(){}
 }
 globalThis.document={hidden:false,getElementById(id){if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);},createElement:()=>new Node(),addEventListener(name,fn){events[name]=fn;}};
 globalThis.window={devicePixelRatio:1,addEventListener(name,fn){windowEvents[name]=fn;}};
 globalThis.Image=class{constructor(){this.attrs=new Map();}getAttribute(k){return this.attrs.get(k);}setAttribute(k,v){this.attrs.set(k,v);}};
 globalThis.localStorage={getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)};
 globalThis.requestAnimationFrame=fn=>(nextFrame=fn,1);globalThis.cancelAnimationFrame=()=>{};
 Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now}});
 globalThis.setTimeout=(fn,delay)=>(timers.set(++timerId,{fn,delay}),timerId);globalThis.clearTimeout=id=>timers.delete(id);
 const canvas=new Node();const shell={clientWidth:width};canvas.closest=()=>shell;const context=new Proxy({}, {get:()=>()=>{},set:()=>true});
 const input={active:false,vector:{x:0,y:0},getVector(){return this.vector;},_end(){this.active=false;this.vector={x:0,y:0};}};
 const game={resize(w,h){this.width=w;this.height=h;},input,isRunning:true,isPaused:false,_tutorialStep:-1,time:0,player:{level:1,kills:0},draw(){},update(dt){this.updates=(this.updates||0)+1;this.cooldown=(this.cooldown||5)-dt;},_handleTouchInput(){},lastTime:null};
 const sm={currentSceneName:'playing',currentScene:{},draw(){}};
 const sound={pauseBGM(){},resumeBGM(){},stopBGM(){}};
 const platform=createBrowserPlatform(canvas);
 mountFlux({game,sm,SFX:sound,canvas,ctx:context,info:platform.api.getSystemInfoSync(),dpr:1,CHARACTERS:{}},platform);
 return {game,sm,nodes,stored,events,windowEvents,canvas,platform,shell,timers,setTime(time){now=time;},frame(time){now=time;nextFrame(time);},timer(time){now=time;const [id,task]=timers.entries().next().value||[];assert.ok(task,'a background tick is scheduled');timers.delete(id);task.fn();}};
}

test('web pause, blur, hidden tabs and tutorial freeze time and cooldowns',()=>{
 const e=environment();e.frame(1000);e.frame(1100);assert.equal(e.game.time,.1);
 e.nodes.get('pause-web').events.click[0]();const before=[e.game.time,e.game.cooldown,e.game.updates];
 e.frame(2100);e.frame(3100);assert.deepEqual([e.game.time,e.game.cooldown,e.game.updates],before);
 e.nodes.get('pause-web').events.click[0]();e.frame(4100);e.frame(4200);assert.equal(e.game.time,.2);
 e.windowEvents.blur();e.frame(5200);assert.equal(e.game.time,.2);assert.equal(e.game.isPaused,true);
 e.nodes.get('pause-web').events.click[0]();e.game._tutorialStep=0;e.frame(6200);assert.equal(e.game.time,.2);
 e.game._tutorialStep=-1;document.hidden=true;e.events.visibilitychange();e.frame(7200);assert.equal(e.game.time,.2);
 document.hidden=false;e.events.visibilitychange();e.frame(8200);assert.equal(e.game.isPaused,true);
});

test('reward and result statuses never call a stopped journey camp or offer a stale continue label',()=>{
 const e=environment();e.game.isRunning=false;e.game.isPaused=true;e.game.stageSystem={state:'reward'};e.frame(1000);
 assert.equal(e.nodes.get('status').textContent,'章节已完成，请选择赐福');
 assert.equal(e.nodes.get('pause-web').textContent,'暂停');assert.equal(e.nodes.get('pause-web').disabled,true);
 e.game.stageSystem=null;e.game.bossRushMode={state:'reward'};e.frame(1100);
 assert.equal(e.nodes.get('status').textContent,'首领已退，请选择赐福');
 e.game.bossRushMode.state='failed';e.frame(1200);assert.equal(e.nodes.get('status').textContent,'首领连战已结算');
});

test('both helpers keep an unfocused window running and release stale keyboard movement',()=>{
 const e=environment();e.game.autoPlay=true;e.game.autoUpgrade=true;
 e.frame(1000);e.frame(1100);
 e.windowEvents.keydown({key:'d',target:{closest(){return null;}},preventDefault(){}});e.frame(1200);assert.deepEqual(e.game.input.getVector(),{x:1,y:0});
 e.windowEvents.blur();assert.equal(e.game.isPaused,false);assert.deepEqual(e.game.input.getVector(),{x:0,y:0});
 e.frame(1300);assert.ok(Math.abs(e.game.time-.2)<1e-9,'unfocused RAF yields to the timer');e.timer(1300);assert.ok(Math.abs(e.game.time-.3)<1e-9);
 e.setTime(1350);e.windowEvents.focus();assert.equal(e.timers.size,0);assert.ok(Math.abs(e.game.time-.35)<1e-9);e.frame(1350);assert.ok(Math.abs(e.game.time-.35)<1e-9);
});

test('both helpers advance hidden combat without animation frames and do not double-count on return',()=>{
 const e=environment();e.game.autoPlay=e.game.autoUpgrade=true;e.frame(1000);e.frame(1100);
 e.windowEvents.blur();document.hidden=true;e.events.visibilitychange();assert.equal(e.game.isPaused,false);assert.equal(e.timers.size,1);
 e.timer(2100);assert.ok(Math.abs(e.game.time-1.1)<1e-9);assert.ok(Math.abs(e.game.cooldown-3.9)<1e-9);
 const before=e.game.time;e.frame(2100);assert.equal(e.game.time,before,'hidden RAF never advances a second clock');
 e.setTime(2500);document.hidden=false;e.events.visibilitychange();assert.equal(e.timers.size,1,'an unfocused visible window still uses the timer');e.windowEvents.focus();assert.equal(e.timers.size,0);assert.ok(Math.abs(e.game.time-1.5)<1e-9,'the final partial hidden interval is included');
 e.frame(2500);assert.ok(Math.abs(e.game.time-1.5)<1e-9);e.frame(2600);assert.ok(Math.abs(e.game.time-1.6)<1e-9);
});

test('one helper alone still pauses, and manual pause remains authoritative with both on',()=>{
 for(const [autoPlay,autoUpgrade] of [[false,false],[true,false],[false,true],[true,true]]){
  const e=environment();Object.assign(e.game,{autoPlay,autoUpgrade});e.frame(1000);e.frame(1100);
  if(autoPlay&&autoUpgrade)e.nodes.get('pause-web').events.click[0]();
  document.hidden=true;e.events.visibilitychange();assert.equal(e.game.isPaused,true);assert.equal(e.timers.size,0);
  e.frame(3000);assert.equal(e.game.time,.1);
  document.hidden=false;e.events.visibilitychange();e.frame(4000);assert.equal(e.game.isPaused,true);assert.equal(e.game.time,.1);
 }
});

test('throttled background ticks use bounded normal steps and retain elapsed time',()=>{
 const e=environment();e.game.autoPlay=e.game.autoUpgrade=true;const original=e.game.update.bind(e.game),steps=[];e.game.update=dt=>{steps.push(dt);original(dt);};e.frame(1000);e.frame(1100);
 document.hidden=true;e.events.visibilitychange();const before=steps.length;e.timer(6100);
 assert.equal(steps.length-before,120);assert.ok(steps.slice(before).every(dt=>dt>0&&dt<=1/60));
 e.timer(6100);e.timer(6100);assert.ok(Math.abs(e.game.time-5.1)<1e-9,'the unprocessed interval is retained');
 document.hidden=false;e.events.visibilitychange();e.frame(6100);assert.ok(Math.abs(e.game.time-5.1)<1e-9);
});

test('long background suspension caps catch-up backlog, mutes batch SFX, and unfocused visible windows still draw',()=>{
 let draws=0;
 const e=environment();e.game.autoPlay=e.game.autoUpgrade=true;
 e.game.draw=()=>{draws++;};
 e.frame(1000);e.frame(1100);
 const prevDraws=draws;e.windowEvents.blur();e.timer(1300);e.frame(1300);
 assert.ok(draws>prevDraws,'visible unfocused window continues drawing while background timer advances');
 document.hidden=true;e.events.visibilitychange();
 e.setTime(3600000);document.hidden=false;e.windowEvents.focus();e.events.visibilitychange();
 const afterReturn=e.game.time;e.frame(3600016);
 assert.ok(e.game.time-afterReturn<.05,'returning to foreground clears remaining backlog instead of fast-forwarding');
});

test('background simulation stops at results, manual pause, and page disposal',()=>{
 const e=environment();e.game.autoPlay=e.game.autoUpgrade=true;e.frame(1000);e.frame(1100);
 const update=e.game.update.bind(e.game);e.game.update=dt=>{update(dt);if(e.game.time>=.2){e.game.isRunning=false;e.sm.currentSceneName='gameOver';}};
 document.hidden=true;e.events.visibilitychange();e.timer(2100);assert.ok(e.game.time<.22);assert.equal(e.timers.size,0);
 const ended=e.game.time;document.hidden=false;e.events.visibilitychange();e.frame(2200);assert.equal(e.game.time,ended);
 const p=environment();p.game.autoPlay=p.game.autoUpgrade=true;p.frame(1000);p.frame(1100);document.hidden=true;p.events.visibilitychange();const stale=p.timers.values().next().value.fn;
 p.windowEvents.pagehide();assert.equal(p.timers.size,0);stale();assert.equal(p.game.time,.1);
});

test('browser saves use a separate prefix and retain data when storage is unavailable',()=>{
 const e=environment();e.stored.set('gaojing-emberfall-v1','old trial');
 e.platform.api.setStorageSync('flux_musou_meta','new progression');
 assert.equal(e.stored.get('gaojing-emberfall-v1'),'old trial');
 assert.equal(e.stored.get('gaojing-emberfall-flux-v1:flux_musou_meta'),'new progression');
 localStorage.setItem=()=>{throw Error('blocked');};e.platform.api.setStorageSync('flux_settings','memory');
 assert.equal(e.platform.api.getStorageSync('flux_settings'),'memory');assert.equal(e.nodes.get('storage-note').hidden,false);
 assert.equal(e.platform.api.getOpenDataContext,undefined);
});

test('pointer coordinates scale to the original canvas and cancellation clears movement',()=>{
 const e=environment();let touch,cancelledAction=false;e.platform.listeners.cancel.push(()=>{cancelledAction=true;});e.platform.listeners.start.push(event=>{touch=event.touches[0];e.game.input.active=true;});
 e.canvas.events.pointerdown[0]({button:0,pointerId:7,clientX:117.5,clientY:221,preventDefault(){}});
 assert.equal(touch.clientX,195);assert.equal(touch.clientY,422);
 e.canvas.events.pointercancel[0]({pointerId:7,clientX:117.5,clientY:221});
 assert.equal(cancelledAction,false);assert.equal(e.game.input.active,false);assert.deepEqual(e.game.input.vector,{x:0,y:0});
});

test('imported map and portrait image paths resolve beneath the flux module directory',()=>{
 const e=environment(),image=e.platform.api.createImage();
 image.src='assets/maps/cybergrid.jpg';assert.ok(image.src.endsWith('/flux/assets/maps/cybergrid.jpg'));
 image.src='src/assets/characters/tracer.png';assert.ok(image.src.endsWith('/flux/src/assets/characters/tracer.png'));
});

test('a second pointer can dash along movement without stealing the first pointer',()=>{
 const e=environment();let starts=0,dashAngle;
 e.platform.listeners.start.push(()=>{starts++;e.game.input.active=true;e.game.input.vector={x:1,y:0};});
 e.game.dashBtnRect={cx:300,cy:700,r:30};e.game.player.facingAngle=2;e.game.player.dash=angle=>{dashAngle=angle;};
 e.canvas.events.pointerdown[0]({button:0,pointerId:1,clientX:50,clientY:50,preventDefault(){}});
 e.canvas.events.pointerdown[0]({button:0,pointerId:2,clientX:170,clientY:360,preventDefault(){}});
 assert.equal(starts,1);assert.equal(dashAngle,0);assert.equal(e.game.input.active,true);
 e.canvas.events.pointercancel[0]({pointerId:2});assert.equal(e.game.input.active,true);
 e.canvas.events.pointercancel[0]({pointerId:1});assert.equal(e.game.input.active,false);
});

test('desktop canvas and pointer coordinates follow the shell width, including resize',()=>{
 const e=environment(1100),info=e.platform.api.getSystemInfoSync();
 assert.equal(info.screenWidth,1100);assert.equal(info.screenHeight,682);
 let touch;e.platform.listeners.start.push(event=>{touch=event.touches[0];});
 e.canvas.events.pointerdown[0]({button:0,pointerId:1,clientX:117.5,clientY:221,preventDefault(){}});
 assert.equal(touch.clientX,550);assert.equal(touch.clientY,341);
 e.shell.clientWidth=390;e.windowEvents.resize();
 assert.equal(e.game.width,390);assert.equal(e.game.height,844);assert.equal(e.canvas.width,390);assert.equal(e.canvas.height,844);
 e.canvas.events.pointerdown[0]({button:0,pointerId:2,clientX:117.5,clientY:221,preventDefault(){}});
 assert.equal(touch.clientX,195);assert.equal(touch.clientY,422);
});

test('fullscreen keeps the logical aspect ratio aligned with the available viewport',()=>{
 const e=environment(1920);document.fullscreenElement=e.shell;window.innerHeight=1080;
 e.events.fullscreenchange();
 assert.equal(e.game.width,1280);assert.equal(e.game.height,681);
 assert.equal(e.platform.api.getSystemInfoSync().safeArea.bottom,681);
});

test('portrait and short desktop canvases fit the viewport while pointer input follows the resized logical area',()=>{
 const e=environment(390);window.innerHeight=844;e.windowEvents.resize();
 assert.equal(e.game.height,644);assert.equal(e.canvas.height,644);
 let touch;e.platform.listeners.start.push(event=>{touch=event.touches[0];});
 e.canvas.events.pointerdown[0]({button:0,pointerId:1,clientX:117.5,clientY:221,preventDefault(){}});
 assert.equal(touch.clientX,195);assert.equal(touch.clientY,322);
 e.shell.clientWidth=1000;window.innerHeight=500;e.windowEvents.resize();
 assert.equal(e.game.height,342);assert.equal(e.game.width,1000);
});

test('a narrow desktop sidebar also fits without the old 460-high phone minimum',()=>{
 const e=environment(574);window.innerHeight=720;e.windowEvents.resize();
 assert.equal(e.game.width,390);assert.equal(e.game.height,353);
 assert.ok(e.game.height*574/390<=720-120-56-24);
});
