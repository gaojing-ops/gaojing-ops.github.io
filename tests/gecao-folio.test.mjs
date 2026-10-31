import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createFolio,optionCopy,chooseUpgrade} from '../games/emberfall/flux/folio.mjs';
import {LORE,entry,registerLore,text,TRAITS} from '../games/emberfall/flux/lore.mjs';
import {themeColor,themedContext,combatUILayout} from '../games/emberfall/flux/theme.mjs';
const require=createRequire(new URL('../games/emberfall/flux/entry.js',import.meta.url));
const gradient={addColorStop(){}},draws=[];
const context=new Proxy({globalAlpha:1,measureText:value=>({width:String(value).length*7}),fillText:value=>draws.push(value),createRadialGradient:()=>({...gradient}),createLinearGradient:()=>({...gradient})},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const storage=new Map();
globalThis.wx={getStorageSync:k=>storage.get(k)||'',setStorageSync:(k,v)=>storage.set(k,v),createCanvas:()=>({getContext:()=>context}),createOffscreenCanvas:()=>({getContext:()=>context}),createImage:()=>({}),getSystemInfoSync:()=>({screenWidth:1000,screenHeight:620,pixelRatio:1,safeArea:{top:0,bottom:620}}),onTouchStart(){},onTouchMove(){},onTouchEnd(){},onTouchCancel(){}};
function catalogs(){
 const get=(mod,key)=>require('./src/'+mod)[key];
 return {pantheon:require('./src/Pantheon'),weaponType:get('Weapons','Weapon'),petType:get('Pet','Pet'),weapons:get('WeaponData','weapons'),passives:get('WeaponData','passives'),evolution:get('Evolution','EVOLUTION_RECIPES'),unions:get('Evolution','UNION_RECIPES'),progression:require('./src/Progression'),skills:get('SkillSystem','SKILL_DEFS'),characters:get('Character','CHARACTERS'),meta:get('MetaSystem','META_UPGRADES'),talents:require('./src/TalentTree'),skins:get('Skins','SKINS'),pets:get('Pet','PET_TYPES'),auras:get('Auras','AURA_TYPES'),relics:Object.fromEntries(get('Relic','RELIC_DEFS').map(row=>[row.id,row])),achievements:get('AchievementSystem','ACHIEVEMENT_DEFS'),builds:require('./src/BuildPreset'),bosses:require('./src/BossData'),enemies:get('Enemy','TYPES'),stages:get('StageSystem','STAGE_CONFIGS'),speed:require('./src/scenes/SpeedRunScene'),events:Object.fromEntries(get('EventSystem','EVENT_DEFS').map(row=>[row.id,row])),curses:get('CurseSystem','CURSE_DEFS')};
}
function environment(fullArt=false){
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
 runtime.catalogs=catalogs();runtime.art=fullArt?{...require('./src/Art')}:{drawHero(){return true;},drawPortrait(){return true;},drawMonster(){return true;},drawBoss(){return true;}};
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
 for(const boss of c.bosses)assert.equal(text(boss.name),boss.name,'achievement titles cannot rewrite a boss name');
 assert.equal(text('林间强敌：熔心破坏者'),'林间强敌：熔心破坏者');
 assert.equal(text('MAGNET!'),'余烬归拢');
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

test('codex, pause and real fusion choices explain live materials, boss deaths and the consumed weapon',()=>{
 const e=environment(),g=e.game;g.startWithCharacter('tracer',[]);g._tutorialStep=-1;g.player.weapons=[];
 for(const id of ['plasma_arc','pulse_ring']){const w=new e.catalogs.weaponType(g,id);w.level=6;g.player.weapons.push(w);}
 g.bossWave=8;g.bossKills=0;g.isPaused=true;e.sm.switchTo('playing');e.sync();e.click('流派之途');
 assert.match(e.root.html,/黎明天罚/);assert.match(e.root.html,/击败首领 0 \/ 5/);assert.match(e.root.html,/吸收「回声焰环」|吸收「.*」/);
 g.bossKills=5;e.click('流派之途');assert.match(e.root.html,/已就绪/);
 g.isPaused=false;g.upgradeSystem._weightedPick=pool=>pool;
 const option=g.upgradeSystem.generateOptions().options.find(o=>o.isUnion&&o.weaponId==='plasma_arc');assert.ok(option);
 e.sm.switchTo('upgrade',{options:[option],previews:[],game:g});e.sync();assert.match(e.root.html,/神兵融合/);assert.match(e.root.html,/空出一格武器位/);assert.doesNotMatch(e.root.html,/union_plasma_arc|pulse_ring/);
 e.click('选择 1');assert.equal(g.player.weapons.length,1);assert.equal(g.player.weapons[0].id,'fusion_orbital_cannon');
 g.isPaused=true;e.sm.switchTo('playing');e.sync();e.click('流派之途');
 assert.match(e.root.html,/材料已炼成/);assert.match(e.root.html,/已完成融合/);assert.doesNotMatch(e.root.html,/0\/6 级|将吸收/);
 e.sm.switchTo('compendium');e.sync();e.click('流派与融合');assert.match(e.root.html,/七种触发方式/);assert.match(e.root.html,/已成型/);
 const hint=optionCopy({type:'weapon_new',id:'napalm'},e.catalogs,g).detail;assert.match(hint,/选择后形成 2 件赤焰共鸣/);
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

test('speed trial victory shows its own goal, real statistics and records without the normal-mode endless action',()=>{
 const e=environment();e.game.startWithCharacter('engineer',[]);e.game._tutorialStep=-1;e.sm.switchTo('playing');
 e.game.isSpeedRunMode=true;e.game.time=65;e.game.player.kills=518;e.game.player.totalXp=1234;e.game.player.totalHealed=25;
 e.game._speedRunWinPending={timer:0,elapsedMs:64400};e.game.update(.016);e.sync();
 assert.match(e.root.html,/疾行已成/);assert.match(e.root.html,/击败 500 名敌人/);assert.match(e.root.html,/1,234/);assert.match(e.root.html,/>25</);
 assert.doesNotMatch(e.root.html,/继续无尽守夜|你把火光带过了整片长夜/);
 e.click('查阅疾行纪录');assert.equal(e.sm.currentSceneName,'speedRun');
});

test('combat HUD panels and control labels remain separate and inside phone, desktop and short fullscreen canvases',()=>{
 const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 for(const [w,h] of [[320,320],[390,320],[390,372],[320,844],[390,844],[768,560],[1280,720],[1280,320]]){
  const l=combatUILayout(w,h),controls=[l.dash,l.skill].map(({cx,cy,r})=>({x:cx-43,y:cy-r,w:86,h:r*2+28}));
  const boxes=[l.health,l.mode,l.pause,...controls];
  for(const b of boxes){assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=w&&b.y+b.h<=h,`${w}x${h}: on canvas`);}
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.equal(overlaps(boxes[i],boxes[j]),false,`${w}x${h}: HUD/control overlap ${i},${j}`);
  if(l.short){assert.ok(l.mode.y+l.mode.h<h/2,'short HUD leaves the player at screen center visible');assert.ok(l.health.h<=90);}
 }
});

test('readable combat controls keep their real hit targets, cooldowns and paused low-health display',()=>{
 const e=environment(true),g=e.game;g.resize(390,844);g.startWithCharacter('walker',[]);g._tutorialStep=-1;e.sm.switchTo('playing');
 g.player.hp=25;g.player.xp=10;g.player.maxXp=200;g.update(.016);
 const values=()=>JSON.stringify([g.player.hp,g.player.xp,g.player.level,g.skillSystem.cooldown,g.player.dashCooldown]);
 const before=values();g.draw();assert.equal(values(),before,'drawing does not alter health, experience or cooldowns');
 const skill=g.skillSystem.btnRect;assert.equal(skill.w,64);assert.equal(g.skillSystem.onTouchEnd(skill.x+skill.w/2,skill.y+skill.h/2),true);assert.ok(g.skillSystem.cooldown>0);
 const dash=g.dashBtnRect;assert.equal(dash.w,64);assert.equal(g._handleTouchInput(dash.cx,dash.cy,g.input),true);assert.ok(g.player.dashCooldown>0);
 g.isPaused=true;e.sync();assert.match(e.root.html,/folio-health-track is-low/);assert.match(e.root.html,/25 \/ 150/);
});

test('deployed entry, every web module and both stylesheets share one release version',()=>{
 const page=new URL('../games/emberfall/index.html',import.meta.url),html=readFileSync(page,'utf8');
 const map=JSON.parse(html.match(/<script type="importmap" id="emberfall-imports">([\s\S]*?)<\/script>/)[1]).imports;
 const version=html.match(/src="\.\/flux\/bundle\.mjs\?v=([a-f0-9]+)"/)[1];
 assert.equal(Object.keys(map).length,5);
 for(const [source,target] of Object.entries(map)){
  const sourceURL=new URL(source,page),targetURL=new URL(target,page);
  assert.equal(sourceURL.pathname,targetURL.pathname);assert.equal(targetURL.searchParams.get('v'),version);assert.ok(readFileSync(sourceURL).length>0);
 }
 for(const name of ['./flux.css','flux/folio.css'])assert.ok(html.includes(`href="${name}?v=${version}"`));
 assert.ok(html.indexOf('type="importmap"')<html.indexOf('type="module"'));
});

test('the complete native art path renders skill areas and clones without altering their state',()=>{
 const e=environment(true);e.game.startWithCharacter('engineer',[]);e.game._tutorialStep=-1;e.sm.switchTo('playing');
 const w=e.game.player.weapons[0];w._firePools=[{x:20,y:30,radius:40}];w._acidPools=[{x:-10,y:20,radius:30,isHolyWater:true}];w._clones=[{angle:1,dist:30}];w._orbList=[{x:40,y:50,radius:8}];
 const fields=()=>JSON.stringify([w._firePools,w._acidPools,w._clones,w._orbList]);const before=fields(),random=Math.random;
 Math.random=()=>{throw Error('native effects consumed combat randomness');};
 try{assert.doesNotThrow(()=>{w.drawEffects(context);w.drawGroundEffects(context);e.game.particles.draw(context);});}finally{Math.random=random;}
 assert.equal(fields(),before);assert.doesNotThrow(()=>e.game.draw());
});

test('pause settings, empty damage records and real result data keep valid native artwork',()=>{
 const e=environment();e.game.startWithCharacter('tracer',[]);e.game._tutorialStep=-1;e.sm.switchTo('playing');e.game.isPaused=true;e.sync();
 e.click('锋芒记录');assert.match(e.root.html,/尚未留下伤敌的记录/);
 e.click('行旅设置');
 assert.match(e.root.html,/data-icon="bell"/);assert.match(e.root.html,/data-icon="eye"/);
 for(const [,attrs] of e.root.html.matchAll(/<article\s+([^>]+)>/g))assert.doesNotMatch(attrs,/<|&lt;canvas/,'canvas markup cannot become a card class');
 e.click('光影：');assert.equal(e.game.qualityLevel,0);assert.equal(e.game.autoQuality,false);
 assert.equal(JSON.parse(storage.get('flux_settings')).autoQuality,false);
 e.game.isPaused=false;e.game.spawnTimer=e.game.bossTimer=999;for(let i=0;i<120;i++)e.game.update(1/60);
 assert.equal(e.game.qualityLevel,0,'manual quality is not raised after fixed-step updates');e.game.isPaused=true;e.sync();
 e.click('光影：');assert.equal(e.game.qualityLevel,1);e.click('自动光影：');assert.equal(e.game.autoQuality,true);
 assert.equal(JSON.parse(storage.get('flux_settings')).autoQuality,true);
 e.game.isPaused=false;e.game.time=143;e.game.endGame();e.sync();
 assert.match(e.root.html,/folio-loadout/);assert.match(e.root.html,/data-icon="flux_bolt"/);assert.match(e.root.html,/引路烛/);
 assert.doesNotMatch(e.root.html,/undefined|NaN|芯片|金币|LV\./);
 e.click('前往余烬之庭');assert.equal(e.sm.currentSceneName,'shop');e.click('返回营地');assert.equal(e.sm.currentSceneName,'title');
 e.game.startWithCharacter('tracer',[]);e.game.victoryEnd();e.sync();e.click('继续无尽守夜');assert.equal(e.game.endlessMode,true);assert.equal(e.sm.currentSceneName,'playing');
});

test('cosmetic ownership, companion selection and insufficient balances retain source purchase rules',()=>{
 const e=environment();e.game.meta.data.chips=3000;e.sm.switchTo('shop');e.sync();e.click('灯色');
 e.click('800 余烬');assert.equal(e.game.meta.data.chips,2200);assert.equal(e.game.meta.getSelectedSkin('tracer'),e.catalogs.skins.tracer.find(s=>s.cost===800).id);
 assert.match(e.root.html,/folio-card is-selected/);e.click('旅伴');e.click('寻访旅伴');assert.equal(e.game.meta.data.chips,1200);
 e.click('邀请同行');assert.equal(e.game.meta.data.equippedPets.length,1);assert.match(e.root.html,/folio-card is-selected/);
 e.click('留在营地');assert.equal(e.game.meta.data.equippedPets.length,0);
 e.click('足下灯纹');assert.ok(e.root.buttons.find(b=>b.label.includes('2,000 余烬')).disabled);
 const before=JSON.stringify(e.game.meta.data);e.sync();assert.equal(JSON.stringify(e.game.meta.data),before);
});

test('stone notifications wrap long text without mutating timers, rewards or random state',()=>{
 const e=environment(true),g=e.game;
 g.achievements.currentToast={text:'🏆 连杀大师',sub:'达成 20 连杀 (+10 芯片)',timer:2.5};
 g.eventSystem.eventBanner={text:'数据暴雨 — 大量经验宝石从天而降，拾取后获得经验。'.repeat(4),timer:2};
 g.eventEnhancer.activeEvents=[{type:'bloodMoon',timer:60}];g.eventEnhancer.reaperCount=2;
 const fields=()=>JSON.stringify([g.achievements.currentToast,g.eventSystem.eventBanner,g.eventEnhancer.activeEvents,g.eventEnhancer.reaperCount,g.meta.data.chips]),before=fields(),random=Math.random;
 Math.random=()=>{throw Error('notification consumed combat RNG');};draws.length=0;
 try{for(const w of [390,1000]){g.achievements.draw(context,w,844);g.eventSystem.draw(context,w,844);g.eventEnhancer.draw(context,w,844);}}finally{Math.random=random;}
 assert.equal(fields(),before);assert.doesNotMatch(draws.join(''),/芯片|数据暴雨|🏆|HP|XP/);assert.ok(draws.some(line=>line.includes('血月临林')));
});

test('boss receipt stays outside the battle center and its full values remain available in pause on narrow screens',()=>{
 const e=environment(true),g=e.game;g.startWithCharacter('tracer',[]);g._tutorialStep=-1;e.sm.switchTo('playing');
 g._showBossDamageBreakdown({flux_bolt:100,burn:50,synergy:50},'熔心破坏者');
 const before=JSON.stringify(g._lastBossDamageRecord),timer=g._bossDamageDisplay.timer;
 draws.length=0;g.resize(1000,620);g._drawBossDamagePanel();assert.ok(draws.some(t=>t.includes('完整记录：暂停')));assert.equal(g._bossDamageDisplay.timer,timer,'drawing cannot advance combat timers');
 draws.length=0;g.resize(390,728);g._drawBossDamagePanel();assert.equal(draws.length,0,'narrow battle never receives an obstructive boss report');
 g.isPaused=true;e.sync();e.click('锋芒记录');assert.match(e.root.html,/最近首领 · 熔心破坏者/);assert.match(e.root.html,/50.0%/);assert.match(e.root.html,/余焰灼伤/);assert.match(e.root.html,/五灵协鸣/);assert.equal(JSON.stringify(g._lastBossDamageRecord),before);
});

test('new runs retain readable event and blood-moon panels when their source systems are replaced',()=>{
 const e=environment(true),g=e.game;
 for(let run=0;run<2;run++){
  g.startWithCharacter('walker',[]);g._tutorialStep=-1;g.resize(390,728);e.sm.switchTo('playing');
  g.eventEnhancer.activeEvents=[{type:'bloodMoon',timer:45}];g._weaponSurge={timer:20};
  g.eventSystem.eventBanner={text:'不沾尘誓 — 坚持 15 秒不受伤，成功后恢复全部生命。',timer:2};
  const before=JSON.stringify([g.eventEnhancer.activeEvents,g._weaponSurge,g.eventSystem.eventBanner,g.player.hp]);
  draws.length=0;g.draw();assert.ok(draws.some(v=>v.includes('血月临林')));assert.ok(draws.some(v=>v.includes('焰盛')));assert.ok(draws.some(v=>v.includes('不沾尘誓')));
  assert.equal(JSON.stringify([g.eventEnhancer.activeEvents,g._weaponSurge,g.eventSystem.eventBanner,g.player.hp]),before);
 }
});

test('all nine real active skills render through native combat art without changing their effects',()=>{
 const e=environment(true);
 for(const id of Object.keys(e.catalogs.characters)){
  e.game.startWithCharacter(id,[]);e.game._tutorialStep=-1;e.sm.switchTo('playing');
  const p=e.game.player,target=e.game._createEnemy(p.x+70,p.y,'Bat');target.hp=1000;target.maxHp=1000;e.game.enemies=[target];
  assert.equal(e.game.skillSystem.tryUse(),true,id);assert.ok(e.game.skillSystem.cooldown>0,id);
  const snapshot=()=>JSON.stringify([p.hp,p.maxHp,p.bonusArmor,p.bonusMight,p.bonusSpeed,p.bonusCdr,p.thornDamage,p.x,p.y,e.game.playerInvincible,e.game.skillSystem.cooldown,target.hp,target.frozen,target.poisoned,target.poisonStacks,p.turrets]);
  const before=snapshot();assert.doesNotThrow(()=>e.game.draw(),id);assert.equal(snapshot(),before,id);
 }
});


test('divine codex, fourth upgrade, paused oath and result all show actual run blessings',()=>{
 const e=environment(true);e.game.selectedPatron='wind';e.game.startWithCharacter('tracer',[]);e.game._tutorialStep=-1;
 e.sm.switchTo('compendium');e.sync();e.click('余烬诸神');assert.match(e.root.html,/烛照/);assert.match(e.root.html,/八|玄瞳/);assert.match(e.root.html,/god-art/);
 e.sm.switchTo('playing');e.game.player.level=3;const options=e.game.upgradeSystem.generateOptions().options;
 assert.equal(options.length,4);const boon=options.find(o=>o.type==='blessing');e.sm.switchTo('upgrade',{options,previews:[],game:e.game});e.sync();assert.match(e.root.html,/神明赐福/);e.click('选择 4');assert.equal(e.game.pantheon.ranks[boon.id],1);
 e.game.isPaused=true;e.sync();e.click('祈誓与神赐');assert.match(e.root.html,/乘岚/);assert.match(e.root.html,new RegExp(boon.name));
 e.game.isPaused=false;e.game.endGame();e.sync();assert.match(e.root.html,/乘岚/);assert.match(e.root.html,new RegExp(boon.name));
});

test('divine offers show capped actual values and paused records expose real stats and damage sources',()=>{
 const e=environment(true),g=e.game;g.selectedPatron='ember';g.startWithCharacter('tracer',[]);g._tutorialStep=-1;
 g.player.bonusArmor=8;g.player.bonusCdr=.8;
 const option={type:'blessing',id:'boon_mail',name:'月下霜衣',desc:'护甲 +1',deity:'moon',rank:1};
 e.sm.switchTo('upgrade',{options:[option],previews:[],game:g});e.sync();assert.match(e.root.html,/实际减伤 60% → 60%/);assert.match(e.root.html,/已达上限/);
 e.sm.switchTo('playing');g.player.level=60;g.enemies=[g._createEnemy(g.player.x+10,g.player.y,'Bat')];g.enemies[0].hp=1000;
 g.pantheon.grant({type:'blessing',id:'boon_breath',rank:1});g.pantheon.update(5);g.isPaused=true;e.sync();e.click('当前属性');assert.match(e.root.html,/武器冷却缩减/);assert.match(e.root.html,/70%/);
 e.click('祈誓与神赐');assert.match(e.root.html,/已触发 1 次/);assert.match(e.root.html,/实际伤害/);assert.match(e.root.html,/神息「破晓」/);
 e.click('锋芒记录');assert.match(e.root.html,/余火吐息 · 烛照/);assert.doesNotMatch(e.root.html,/>boon_breath</);
});
