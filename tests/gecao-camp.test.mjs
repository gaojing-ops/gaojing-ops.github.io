import test from 'node:test';
import assert from 'node:assert/strict';
import {createCamp} from '../games/emberfall/flux/camp.mjs';

function environment(){
 const registry=new Map(),gradient={addColorStop(){}};
 const context=new Proxy({}, {get:(o,k)=>o[k]??(k==='createRadialGradient'?()=>gradient:()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 class Element{
  constructor(){this.children=[];this.dataset={};this.attrs={};this.events={};this.classList={toggle:(name,on)=>{this[name]=on;}};}
  setAttribute(k,v){this.attrs[k]=v;}append(...nodes){this.children.push(...nodes);}replaceChildren(){this.children=[];}
  addEventListener(k,fn){this.events[k]=fn;}getContext(){return context;}getBoundingClientRect(){return {width:1000,height:560};}
  querySelector(selector){if(selector==='canvas'){if(!this.portrait)this.portrait=new Element();return this.portrait;}return node(selector.slice(1));}
  querySelectorAll(){return modes;}
  click(){this.events.click?.();}
 }
 function node(id){if(!registry.has(id))registry.set(id,new Element());return registry.get(id);}
 const modes=['normal','boss','speed'].map(mode=>{const n=new Element();n.dataset.runMode=mode;return n;});
 globalThis.document={getElementById:node,createElement:()=>new Element(),querySelectorAll:()=>[]};
 globalThis.window={devicePixelRatio:1,addEventListener(){},removeEventListener(){}};
 globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
 const game={meta:{data:{}},_tutorialStep:-1,_advanceTutorial(){this._tutorialStep++;if(this._tutorialStep===3)this._tutorialStep=-1;}};
 const stored=new Map(),starts=[];
 const curseScene={defs:[],enter(){this.defs=[{id:'open',name:'试炼',desc:'已解锁',unlocked:true,active:true},{id:'locked',name:'未解锁',desc:'不可使用',unlocked:false,active:true}];},onConfirm(data){starts.push(data);game.isRunning=true;game._tutorialStep=0;sm.currentSceneName='playing';}};
 const selectScene={onSelect(id){if(this.bossRushMode||this.speedRunMode){starts.push({charId:id,mode:this.bossRushMode?'boss':'speed'});game.isRunning=true;sm.currentSceneName='playing';}else{sm.currentScene=curseScene;sm.currentSceneName='curseSelect';curseScene.enter();}}};
 const sm={currentSceneName:'title',scenes:{curseSelect:curseScene,charSelect:selectScene},switchTo(name,data={}){this.currentSceneName=name;this.currentScene=name==='charSelect'?selectScene:curseScene;if(name==='charSelect'){selectScene.bossRushMode=!!data.bossRushMode;selectScene.speedRunMode=!!data.speedRunMode;}}};
 const hero=(name,hp)=>({name,desc:name,passive:'原特性',stats:{maxHp:hp,speed:200,might:1}});
 const runtime={game,sm,CHARACTERS:{tracer:hero('守灯人',80),walker:hero('铁卫',150)},art:{drawPortrait(){}}};
 const camp=createCamp(runtime,{api:{setStorageSync:(k,v)=>stored.set(k,v)}});
 return {camp,game,sm,node,modes,starts,stored};
}

test('homepage selection starts the chosen hero through the original callbacks and excludes locked curses',()=>{
 const e=environment();assert.equal(e.camp.sync(),true);
 const cards=e.node('camp-heroes').children;cards[1].click();assert.equal(cards[1].attrs['aria-pressed'],'true');assert.equal(cards[0].attrs['aria-pressed'],'false');
 assert.match(e.node('camp-hero-stats').textContent,/生命 150/);
 e.node('camp-start').click();assert.equal(e.starts.length,1);assert.equal(e.starts[0].charId,'walker');
 assert.deepEqual(e.starts[0].curses.map(c=>c.id),['open']);assert.deepEqual(JSON.parse(e.stored.get('flux_last_curses')),['open']);
 assert.equal(e.game._tutorialStep,-1);assert.equal(e.camp.sync(),false);assert.equal(e.node('play-view').hidden,false);
});

test('homepage mode choices preserve the original boss and speed mode flags',()=>{
 for(const [index,mode] of [[1,'boss'],[2,'speed']]){
  const e=environment();e.camp.sync();e.modes[index].click();e.node('camp-start').click();
  assert.equal(e.starts[0].mode,mode);assert.equal(e.starts[0].charId,'tracer');assert.equal(e.starts[0].curses,undefined);e.camp.destroy();
 }
});
