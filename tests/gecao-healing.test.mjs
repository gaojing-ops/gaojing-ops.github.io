import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../games/emberfall/flux/entry.js',import.meta.url));
const gradient={addColorStop(){}};
let strokes=0;
const context=new Proxy({measureText:value=>({width:String(value).length*7}),stroke(){strokes++;},fill(){strokes++;},createRadialGradient:()=>gradient,createLinearGradient:()=>gradient},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas=()=>({width:1000,height:620,getContext:()=>context});
globalThis.wx={getStorageSync:()=>'',setStorageSync(){},getSystemInfoSync:()=>({screenWidth:1000,screenHeight:620,pixelRatio:1,safeArea:{top:0,bottom:620}}),createCanvas:canvas,createOffscreenCanvas:canvas,createImage:()=>({}),onTouchStart(){},onTouchMove(){},onTouchEnd(){},onTouchCancel(){}};
const Game=require('./src/Game');

const Pickup=require('./src/Pickup');
function start(){const g=new Game(canvas());g.startWithCharacter('biohazard',[]);g._tutorialStep=-1;g.player.hp=10;return g;}
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} = ${b}`);

test('healing caps and records only actual recovery and never revives or changes a settled result',()=>{
 const g=start(),p=g.player;p.hp=p.maxHp-2;const old=p.totalHealed;
 assert.equal(p.heal(30),2);assert.equal(p.totalHealed,old+2);assert.equal(p.heal(30),0);
 for(const n of [-1,0,NaN,Infinity])assert.equal(p.heal(n),0);
 p.hp=0;assert.equal(p.heal(30),0);assert.equal(p.hp,0);
 p.hp=10;g._runSettled=true;assert.equal(p.heal(30),0);assert.equal(p.hp,10);
});

test('curse and life-burning relic both block real level-up, pickup, trait, chest, upgrade and kill healing',()=>{
 for(const mode of ['curse','relic']){
  const g=start(),p=g.player;p.relicFlags={};if(mode==='curse')g.curseNoHeal=true;else p.relicFlags.overloadCore=true;
  const check=fn=>{const hp=p.hp,healed=p.totalHealed;fn();assert.equal(p.hp,hp,mode);assert.equal(p.totalHealed,healed,mode);};
  check(()=>p.levelUp());g.isRunning=true;
  check(()=>p.traitHandler.onPoisonedEnemyKilled({x:p.x,y:p.y}));
  check(()=>g._applyChestReward({type:'chest_heal'}));
  check(()=>g.upgradeSystem.applyOption({type:'heal'}));
  for(const type of ['potion','heal_shrine'])check(()=>new Pickup(g,p.x,p.y,type)._collect());
  p.voidLeech=5;check(()=>{const e=g._createEnemy(p.x+100,p.y,'Bat');e.die();});
  check(()=>p.heal(100));
 }
});

test('normal trait, upgrade and chest healing count only missing life without duplicate statistics',()=>{
 const g=start(),p=g.player;
 for(const fn of [()=>p.traitHandler.onPoisonedEnemyKilled({x:0,y:0}),()=>g.upgradeSystem.applyOption({type:'heal'}),()=>g._applyChestReward({type:'chest_heal'}),()=>new Pickup(g,p.x,p.y,'potion')._collect()]){
  p.hp=p.maxHp-1;const before=p.totalHealed;fn();assert.equal(p.hp,p.maxHp);approx(p.totalHealed-before,1);
 }
});

test('revival remains a separate charged mechanism under no-heal and subsequent healing stays blocked',()=>{
 const g=start(),p=g.player;p.hp=1;p.relicFlags={overloadCore:true,revivalNode:true};g._lastStandUsed=true;
 p.takeDamage(p.maxHp*10);assert.ok(p.hp>0);assert.equal(p.revivalUsed,true);assert.equal(g._runSettled,false);
 const hp=p.hp;assert.equal(p.heal(100),0);assert.equal(p.hp,hp);
});

test('life-burning damage really doubles at early and late stats while removing all normal healing',()=>{
 const {RELIC_DEFS}=require('./src/Relic');
 for(const bonus of [.2,8,20]){const g=start(),p=g.player;p.bonusMight=bonus;const before=p.might;p.relicFlags={};
  RELIC_DEFS.find(r=>r.id==='overload_core').apply(p);approx(p.might,before*2);assert.equal(p.canHeal,false);assert.equal(p.heal(100),0);
 }
});

test('automatic strengthening preserves a healing build rather than blindly taking life-burning',()=>{
 const g=start(),p=g.player;p.bonusRegen=1;g.autoUpgrade=true;
 const options=[{type:'relic',id:'overload_core',rarity:'legendary'},{type:'weapon_up',id:p.weapons[0].id}];
 let chosen;g.upgradeSystem.generateOptions=()=>({options,previews:[]});g.upgradeSystem.applyOption=o=>chosen=o;
 g.showUpgradeScreen();assert.equal(chosen.type,'weapon_up');
});

test('chapter and boss-rush recovery obey no-heal while maximum-life rewards still grow',()=>{
 const BossRushMode=require('./src/BossRushMode'),random=Math.random;Math.random=()=>.5;
 try{for(const mode of ['curse','relic']){
  const g=start(),p=g.player;if(mode==='curse')g.curseNoHeal=true;else p.relicFlags={overloadCore:true};
  const max=p.maxHp;g.stageSystem._generateRewards();const index=g.stageSystem.rewardOptions.findIndex(r=>r.id==='full_heal');assert.ok(index>=0);
  g.stageSystem.applyReward(index);assert.equal(p.maxHp,max+50);assert.equal(p.hp,10);
  g.bossRushMode=new BossRushMode(g);g.bossRushMode._generateRewards();const heal=g.bossRushMode.rewardOptions.findIndex(r=>r.id==='heal_full');assert.ok(heal>=0);
  g.bossRushMode.selectReward(heal);assert.equal(p.hp,10);assert.equal(p.totalHealed,0);
 }}finally{Math.random=random;}
});

test('soul-drain attacks still damage targets while forbidden healing stays zero',()=>{
 const {Weapon}=require('./src/Weapons');
 for(const blocked of [false,true]){const g=start(),p=g.player;p.hp=p.maxHp-1;p.relicFlags={overloadCore:blocked};
  const e=g._createEnemy(p.x+20,p.y,'Bat');e.hp=e.maxHp=10000;g.enemies=[e];const before=p.totalHealed;
  new Weapon(g,'soul_drain')._fireSoulDrain(p,[e]);assert.ok(e.hp<10000);
  assert.equal(p.hp,blocked?p.maxHp-1:p.maxHp);assert.equal(p.totalHealed-before,blocked?0:1);
 }
});
