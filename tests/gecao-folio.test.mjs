import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createFolio,optionCopy,chooseUpgrade} from '../games/emberfall/flux/folio.mjs';
import {LORE,entry,registerLore,text,TRAITS} from '../games/emberfall/flux/lore.mjs';
import {themeColor,themedContext} from '../games/emberfall/flux/theme.mjs';
const require=createRequire(new URL('../games/emberfall/flux/entry.js',import.meta.url));
const gradient={addColorStop(){}},draws=[];
const context=new Proxy({globalAlpha:1,measureText:value=>({width:String(value).length*7}),fillText:value=>draws.push(value),createRadialGradient:()=>({...gradient}),createLinearGradient:()=>({...gradient})},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const storage=new Map();
globalThis.wx={getStorageSync:k=>storage.get(k)||'',setStorageSync:(k,v)=>storage.set(k,v),createCanvas:()=>({getContext:()=>context}),createOffscreenCanvas:()=>({getContext:()=>context}),createImage:()=>({}),getSystemInfoSync:()=>({screenWidth:1000,screenHeight:620,pixelRatio:1,safeArea:{top:0,bottom:620}}),onTouchStart(){},onTouchMove(){},onTouchEnd(){},onTouchCancel(){}};
function catalogs(){
 const get=(mod,key)=>require('./src/'+mod)[key];
 return {weapons:get('WeaponData','weapons'),passives:get('WeaponData','passives'),evolution:get('Evolution','EVOLUTION_RECIPES'),skills:get('SkillSystem','SKILL_DEFS'),characters:get('Character','CHARACTERS'),meta:get('MetaSystem','META_UPGRADES'),talents:require('./src/TalentTree'),skins:get('Skins','SKINS'),pets:get('Pet','PET_TYPES'),auras:get('Auras','AURA_TYPES'),relics:Object.fromEntries(get('Relic','RELIC_DEFS').map(row=>[row.id,row])),achievements:get('AchievementSystem','ACHIEVEMENT_DEFS'),builds:require('./src/BuildPreset'),bosses:require('./src/BossData'),enemies:get('Enemy','TYPES'),stages:get('StageSystem','STAGE_CONFIGS'),speed:require('./src/scenes/SpeedRunScene'),events:Object.fromEntries(get('EventSystem','EVENT_DEFS').map(row=>[row.id,row])),curses:get('CurseSystem','CURSE_DEFS')};
}
function environment(){
 storage.clear();const nodes=new Map();let root;
 class Element{
  constructor(){this.dataset={};this.events={};this.hidden=false;this.scrollTop=0;this.classList={toggle(){}};this.children=[];}
  setAttribute(){}contains(){return false;}querySelector(){return null;}getContext(){return context;}before(node){root=node;}
  addEventListener(name,fn){this.events[name]=fn;}
  set innerHTML(value){this.html=value;this.buttons=[...value.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(([,attrs,label])=>{const b=new Element();b.dataset.action=attrs.match(/data-action="(\d+)"/)[1];b.label=label.replace(/&[^;]+;/g,'');b.disabled=/\bdisabled\b/.test(attrs);return b;});}
  querySelectorAll(selector){return selector==='[data-action]'?this.buttons:[];}
 }
 globalThis.document={activeElement:null,createElement:()=>new Element(),getElementById(id){if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);}};
 const canvas={width:1000,height:620,parentElement:new Element(),getContext:()=>context};globalThis.browserCanvas=canvas;
 delete require.cache[require.resolve('./entry.js')];const runtime=require('./entry.js');
 runtime.catalogs=catalogs();runtime.art={drawHero(){return true;},drawPortrait(){return true;},drawMonster(){return true;},drawBoss(){return true;}};
 const folio=createFolio(runtime,{api:{shareAppMessage(){}}},{togglePause(){runtime.game.isPaused=!runtime.game.isPaused;}});
 const sync=()=>folio.sync();
 const click=label=>{const button=root.buttons.find(b=>b.label.includes(label));assert.ok(button,`button ${label}`);assert.equal(button.disabled,false,`enabled ${label}`);button.events.click();sync();return button;};
 return {...runtime,folio,sync,click,get root(){return root;}};
}

test('new vocabulary covers every catalog and leaves all gameplay definitions intact',()=>{
 const c=catalogs(),before=JSON.stringify(c);registerLore(c);registerLore(c);
 for(const kind of ['weapons','passives','evolution','skills','relics','pets','auras','enemies','events'])for(const id of Object.keys(c[kind]))assert.ok(LORE[kind][id],`${kind}.${id}`);
 assert.equal(Object.keys(LORE.talents).length,48);assert.equal(Object.keys(LORE.skins).length,36);assert.equal(Object.keys(LORE.achievements).length,c.achievements.length);
 for(const [kind,rows] of Object.entries(LORE))for(const copy of Object.values(rows))assert.doesNotMatch(copy.name+copy.desc,/芯片|赛博|等离子|纳米|无人机|量子|FluxMusou|Cryomancer|Biohazard/,kind);
 assert.equal(JSON.stringify(c),before);assert.match(TRAITS.berserker,/20 个百分点/);assert.match(TRAITS.tracer,/2.5%/);
 assert.match(entry('skills','arcane').desc,/50 个百分点/);assert.match(text('数据强化 · 200 HP · 芯片'),/厚壳黑潮 · 200 生命 · 余烬/);
});

test('all old scenes have web panels and all growth/catalog tabs render',()=>{
 const e=environment();
 for(const name of ['compendium','shop','achievements','leaderboard','daily','speedRun','gameOver','buildSelect']){
  e.sm.switchTo(name);e.sm.currentScene.draw=()=>{throw Error('legacy canvas used');};assert.equal(e.sync(),true,name);
  assert.ok(e.root.html.includes('folio-header'));assert.equal(e.canvas.parentElement.hidden,true);
  assert.doesNotMatch(e.root.html,/芯片|赛博|等离子|纳米|无人机|量子|FluxMusou|系统断线/);
  const tabs=name==='compendium'?['武器','觉醒','护符','遗物','敌影','首领','林间际遇']:name==='shop'?['誓途','灯色','旅伴','足下灯纹']:[];
  for(const tab of tabs){e.click(tab);assert.doesNotMatch(e.root.html,/undefined|NaN|芯片|赛博|等离子|纳米|无人机|量子/);}
 }
 e.sm.switchTo('title');assert.equal(e.folio.sync(true),false);assert.equal(e.canvas.parentElement.hidden,false);
});

test('web purchases and talent prerequisites use the original costs and guard stale clicks',()=>{
 const e=environment();e.game.meta.data.chips=200;e.sm.switchTo('shop');e.sync();
 const stale=e.click('铭刻 · 50');assert.equal(e.game.meta.data.chips,150);assert.equal(e.game.meta.getLevel('meta_hp'),1);
 stale.events.click();assert.equal(e.game.meta.data.chips,150);
 e.click('誓途');e.click('40 余烬');assert.equal(e.game.meta.data.chips,110);assert.equal(e.game.meta.data.talentNodes.pow_1,true);
 assert.ok(e.root.html.includes('前誓：磨刃'));assert.equal(e.game.meta.data.talentNodes.pow_3,undefined);
});

test('web upgrade and chest choices invoke each original reward exactly once',()=>{
 const e=environment();e.game.startWithCharacter('tracer',[]);e.game._tutorialStep=-1;
 let applied=0;const option={type:'weapon_up',id:'flux_bolt',name:'流光弹',desc:'LV.1→2 伤害:16→20'};
 e.sm.switchTo('upgrade',{options:[option],previews:[],game:e.game});
 const scene=e.sm.currentScene,original=scene.onSelect;scene.onSelect=o=>{applied++;original(o);};e.sync();
 const stale=e.click('选择 1');assert.equal(applied,1);assert.equal(e.game.player.weapons[0].level,2);assert.equal(e.sm.currentSceneName,'playing');
 stale.events.click();assert.equal(applied,1);assert.equal(chooseUpgrade(scene,option),false);
 e.sm.switchTo('upgrade',{options:[{type:'chest_gold',id:'gold',name:'金币',desc:'+236 芯片',_value:236}],previews:[],chestMode:true,game:e.game});e.sync();
 assert.match(e.root.html,/余烬中的馈赠/);const before=e.game.meta.data.chips;e.click('选择 1');assert.equal(e.game.meta.data.chips,before+236);
 assert.match(optionCopy({type:'passive',id:'armor',desc:'护甲 3 → 4 (伤害-4)'},e.catalogs).desc,/3 → 4/);
});

test('stage/boss rewards, pause, equipment and final results all use the web panels',()=>{
 const e=environment();e.game.startWithCharacter('tracer',[]);e.game._tutorialStep=-1;e.sm.switchTo('playing');
 e.game.isPaused=true;e.sync();assert.match(e.root.html,/在火光旁/);e.click('随身行装');assert.match(e.root.html,/引路烛/);e.click('锋芒记录');e.click('行旅设置');
 e.game.isPaused=false;e.game.stageSystem.stageTime=239.99;e.game.time=240;e.game.stageSystem.update(.02);e.sync();assert.match(e.root.html,/拾一簇新火/);
 const stage=e.game.stageSystem.currentStage;e.click('收下赐福');assert.equal(e.game.stageSystem.currentStage,stage+1);
 e.game.startBossRush('tracer');e.sm.switchTo('playing');e.game._tutorialStep=-1;const rush=e.game.bossRushMode;
 rush.state='reward';rush.rewardOptions=[{name:'紧急修复',desc:'HP 全回',apply:p=>{p.hp=p.maxHp;}}];e.game.player.hp=10;e.sync();e.click('收下赐福');assert.equal(e.game.player.hp,e.game.player.maxHp);assert.equal(rush.state,'prep');
 rush.state='complete';e.game.isRunning=false;e.sync();assert.match(e.root.html,/十道敌影/);e.click('返回营地');assert.equal(e.game.bossRushMode,null);assert.equal(e.sm.currentSceneName,'title');
});

test('the themed battle HUD, boss entrance and skill controls draw without changing stats',()=>{
 const e=environment();e.game.startWithCharacter('engineer',[]);e.game._tutorialStep=-1;e.sm.switchTo('playing');e.game.update(.016);
 const stats=[e.game.player.maxHp,e.game.player.might,e.game.player.speed,e.game.skillSystem.maxCooldown];
 e.game._bossEntrance={timer:1,name:'古铜统帅'};assert.doesNotThrow(()=>e.game.draw());
 assert.deepEqual([e.game.player.maxHp,e.game.player.might,e.game.player.speed,e.game.skillSystem.maxCooldown],stats);
 assert.ok(e.game.dashBtnRect);assert.ok(e.game.skillSystem.btnRect);
 const ctx=themedContext(context);draws.length=0;ctx.fillText('纳米修复 · 25 HP',0,0);assert.match(draws[0],/回春苔 · 25 生命/);
 assert.notEqual(themeColor('#00ffcc'),'#00ffcc');assert.equal(themeColor('#e59d51'),'#e59d51');
});
