import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../games/emberfall/flux/entry.js',import.meta.url));
const gradient={addColorStop(){}};
const context=new Proxy({}, {get:(o,k)=>o[k]??(k==='measureText'?()=>({width:100}):k.startsWith('create')?()=>gradient:()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas=()=>({width:390,height:844,getContext:()=>context});
globalThis.wx={getStorageSync:()=>'',setStorageSync(){},getSystemInfoSync:()=>({screenWidth:390,screenHeight:844,pixelRatio:1,safeArea:{top:0,bottom:844}}),createCanvas:canvas,createOffscreenCanvas:canvas,createImage:()=>({}),onTouchStart(){},onTouchMove(){},onTouchEnd(){},onTouchCancel(){}};
const Game=require('./src/Game');
function game(){const g=new Game(canvas());g.startWithCharacter('tracer',[]);g._tutorialStep=-1;return g;}

test('normal and boss contact damage and thorns remain equal at 30, 60 and 144 fps',()=>{
 for(const boss of [false,true])for(const fps of [30,60,144]){
  const g=game(),p=g.player;p.hp=p.maxHp=1000;p.bonusArmor=3;p.thornDamage=.25;
  let reflected=0;
  const enemy={x:p.x,y:p.y,radius:10,damage:12,active:true,hp:1000,maxHp:1000,takeDamage(n){reflected+=n;}};
  g.enemies=boss?[]:[enemy];g.bosses=boss?[enemy]:[];g.bullets=[];g.enemyBullets=[];
  g._getNearbyEnemies=()=>boss?[]:[enemy];
  for(let i=0;i<fps*2;i++)g._checkCollisions(1/fps);
  const expected=12*(boss?1.5:1)*2*(1-p.armor);
  assert.ok(Math.abs(1000-p.hp-expected)<1e-8,`${boss?'boss':'enemy'} at ${fps} fps`);
  assert.ok(Math.abs(reflected-expected*.25)<1e-8,'fractional thorns do not round up each frame');
 }
});

test('vampiric contact healing preserves fractional time-scaled damage',()=>{
 for(const fps of [30,60,144]){
  const g=game(),p=g.player;p.hp=p.maxHp=1000;
  const e={x:p.x,y:p.y,radius:10,damage:4,active:true,hp:10,maxHp:100,vampiricAffix:true};
  g.enemies=[e];g._getNearbyEnemies=()=>[e];
  for(let i=0;i<fps;i++)g._checkCollisions(1/fps);
  assert.ok(Math.abs(e.hp-11.2)<1e-8);
 }
});

test('single impacts retain their minimum and invalid or post-death hits do nothing',()=>{
 const g=game(),p=g.player;
 const before=p.hp;assert.equal(p.takeDamage(.2),true);assert.equal(p.hp,before-1);
 for(const n of [0,-1,NaN,Infinity])assert.equal(p.takeDamage(n),false);
 p.hp=0;assert.equal(p.takeDamage(10),false);
});

test('a lethal contact frame and repeated finish callbacks settle only once, then a new run can settle',()=>{
 const g=game(),p=g.player;p.hp=.01;
 const e={x:p.x,y:p.y,radius:10,damage:12,active:true,hp:10,maxHp:10};
 g.enemies=[e,e,e];g._getNearbyEnemies=()=>g.enemies;
 const initialRuns=g.meta.data.totalRuns,initialChips=g.meta.data.chips;
 g._checkCollisions(1/60);
 assert.equal(g.meta.data.totalRuns,initialRuns+1);
 const chips=g.meta.data.chips;assert.ok(chips>initialChips);
 g.endGame();g.victoryEnd();assert.equal(g.meta.data.totalRuns,initialRuns+1);assert.equal(g.meta.data.chips,chips);
 g.startWithCharacter('tracer',[]);g.endGame();assert.equal(g.meta.data.totalRuns,initialRuns+2);
});

test('a lethal collision stops the frame before later events can heal a settled player',()=>{
 const g=game(),p=g.player;p.hp=.01;p.weapons=[];
 g.spawnTimer=g.bossTimer=999;g._lastStandUsed=true;
 const e=g._createEnemy(p.x,p.y,'Bat');e.damage=120;e.frozen=10;g.enemies=[e];
 let lateEvents=0;g.eventSystem.update=()=>{lateEvents++;p.hp=p.maxHp;};
 g.update(1/60);
 assert.equal(g._runSettled,true);assert.equal(p.hp,0);assert.equal(lateEvents,0);
});

test('continuing from victory starts an active endless segment that can settle normally',()=>{
 const g=game();g.victoryEnd();const runs=g.meta.data.totalRuns;
 g.enterEndlessMode();assert.equal(g._runSettled,false);assert.equal(g.isRunning,true);
 let updates=0;g.player.update=()=>updates++;g.spawnTimer=g.bossTimer=999;g.update(1/60);
 assert.equal(updates,1);g.endGame();g.endGame();assert.equal(g.meta.data.totalRuns,runs+1);
});

test('a chapter reward stops the frame before enemies or the player continue updating',()=>{
 const g=game();g.stageSystem.stageTime=239.99;
 let updates=0;g.player.update=()=>updates++;g.update(1/60);
 assert.equal(g.stageSystem.state,'reward');assert.equal(g.isRunning,false);assert.equal(updates,0);
});

test('upgrade damage and mitigation previews match the stats actually applied, including caps and curses',()=>{
 for(const curse of [false,true])for(const armor of [0,3,8]){
  const g=game(),p=g.player;p.bonusMight=.6;p.bonusArmor=armor;g.curseArmorBreak=curse;
  const us=g.upgradeSystem;us._weightedPick=pool=>pool;
  const options=us.generateOptions().options,w=p.weapons[0],oldDamage=w.damage;
  const upgrade=options.find(o=>o.type==='weapon_up'&&o.id===w.id);
  us.applyOption(upgrade);assert.match(upgrade.desc,new RegExp(`伤害: ${oldDamage}→${w.damage}$`));
  const oldArmor=Math.round(p.armor*100),plate=options.find(o=>o.id==='armor');
  us.applyOption(plate);assert.equal(plate.desc,`护甲 +1 · 减伤 ${oldArmor}% → ${Math.round(p.armor*100)}%`);
 }
});

test('poison application, chained death transfers and pooled reuse all respect 50 stacks',()=>{
 const g=game();g.player.plagueSpread=true;
 const a=g._createEnemy(0,0,'Bat'),b=g._createEnemy(1,0,'Bat'),c=g._createEnemy(2,0,'Bat');g.enemies=[a,b,c];
 a.poisoned=b.poisoned=c.poisoned=3;a.poisonStacks=1e12;b.poisonStacks=40;c.poisonStacks=40;
 assert.equal(a.poisonStacks,50);a.die();b.die();assert.equal(c.poisonStacks,50);
 c.poisonStacks+=8;assert.equal(c.poisonStacks,50);c.poisonStacks=-2;assert.equal(c.poisonStacks,0);
 c.reset(g,0,0,'Bat');assert.equal(c.poisonStacks,0);
});

test('synergy bursts defend against oversized poison input and dead enemies cannot die or pay twice',()=>{
 const g=game();let hit=0;const target={x:0,y:0,poisonStacks:1e12,takeDamage(n){hit+=n;}};
 assert.equal(g.synergy._triggerVoidPoison(target,10),400);assert.equal(hit,400);
 const e=g._createEnemy(0,0,'Bat');let deaths=0;g.onEnemyKilled=()=>deaths++;g.enemies=[e];
 e.die();e.die();e.takeDamage(1e6);assert.equal(deaths,1);
});
