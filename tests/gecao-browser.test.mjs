import test from 'node:test';
import assert from 'node:assert/strict';
import {createBrowserPlatform,mountFlux} from '../games/emberfall/flux/browser.mjs';

function environment(){
 const nodes=new Map(),stored=new Map(),events={},windowEvents={};let nextFrame;
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
 const canvas=new Node();const context=new Proxy({}, {get:()=>()=>{},set:()=>true});
 const input={active:false,vector:{x:0,y:0},getVector(){return this.vector;},_end(){this.active=false;this.vector={x:0,y:0};}};
 const game={input,isRunning:true,isPaused:false,_tutorialStep:-1,time:0,player:{level:1,kills:0},draw(){},update(dt){this.updates=(this.updates||0)+1;this.cooldown=(this.cooldown||5)-dt;},_handleTouchInput(){},lastTime:null};
 const sm={currentSceneName:'playing',currentScene:{},draw(){}};
 const sound={pauseBGM(){},resumeBGM(){},stopBGM(){}};
 const platform=createBrowserPlatform(canvas);
 mountFlux({game,sm,SFX:sound,canvas,ctx:context,info:{},dpr:1,CHARACTERS:{}},platform);
 return {game,nodes,stored,events,windowEvents,canvas,platform,frame:time=>nextFrame(time)};
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
