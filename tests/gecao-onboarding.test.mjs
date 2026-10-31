import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../games/emberfall/flux/entry.js',import.meta.url));
const gradient={addColorStop(){}};
const ctx=new Proxy({}, {get:(o,k)=>o[k]??(k==='measureText'?()=>({width:100}):k.startsWith('create')?()=>gradient:()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas=()=>({width:1000,height:620,getContext:()=>ctx});
globalThis.wx={getStorageSync:()=>'',setStorageSync(){},getSystemInfoSync:()=>({screenWidth:1000,screenHeight:620,pixelRatio:1,safeArea:{top:0,bottom:620}}),createCanvas:canvas,createOffscreenCanvas:canvas,createImage:()=>({}),onTouchStart(){},onTouchMove(){},onTouchEnd(){},onTouchCancel(){}};
const Game=require('./src/Game');
const {Weapon,WEAPON_DEFS}=require('./src/Weapons');
function start(){const g=new Game(canvas());g.selectedPatron='ember';g.startWithCharacter('tracer',[]);g._tutorialStep=-1;return g;}
function seeded(fn){const old=Math.random;let seed=91;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);try{return fn();}finally{Math.random=old;}}

test('opening offers retain a real carried-weapon choice without granting it or duplicating options',()=>seeded(()=>{
 const g=start(),p=g.player,us=g.upgradeSystem;
 for(const level of [2,3,6,9,12])for(const dice of [false,true]){
  p.level=level;p.relicFlags={quantumDice:dice};
  for(let i=0;i<50;i++){
   const before=p.weapons.map(w=>[w.id,w.level]);const options=us.generateOptions().options;
   assert.ok(options.some(o=>o.type==='weapon_up'&&o.id===p.weapons[0].id));
   assert.equal(new Set(options.map(o=>o.id)).size,options.length);
   assert.equal(options.length,dice?5:(level%3===0?4:3));
   assert.deepEqual(p.weapons.map(w=>[w.id,w.level]),before,'an offer is not an automatic upgrade');
  }
 }
 p.level=2;const opt=us.generateOptions().options.find(o=>o.type==='weapon_up');us.applyOption(opt);assert.equal(p.weapons[0].level,2);
}));

test('opening guarantee respects banishment, maximum level and paid rerolls',()=>seeded(()=>{
 const g=start(),p=g.player,us=g.upgradeSystem;p.level=3;us.rerollCount=2;
 const starter=p.weapons[0];us.banishList=[starter.id];
 for(let i=0;i<20;i++)assert.ok(us.generateOptions().options.every(o=>o.id!==starter.id));
 assert.ok(us.reroll());assert.equal(us.rerollCount,1);
 p.weapons.push(new Weapon(g,'ice_shard'));
 assert.ok(us.reroll().options.some(o=>o.type==='weapon_up'&&o.id==='ice_shard'));assert.equal(us.rerollCount,0);assert.equal(us.reroll(),null);
 us.banishList=[];starter.level=WEAPON_DEFS[starter.id].maxLevel;
 assert.ok(us.generateOptions().options.every(o=>o.type!=='weapon_up'||o.id!==starter.id));
}));

test('biome weights cannot bypass staged enemy unlocks or the four-heavy limit',()=>seeded(()=>{
 const g=start();
 for(const style of ['CyberGrid','ToxicSwamp','CryoRealm','VoidNebula','Matrix'])for(const time of [0,30,60,119,121,239,241,359,361,479,481]){
  g.mapManager.style=style;g.time=time;const seen=new Set();
  for(let i=0;i<200;i++){g.enemies=[];g._spawnEnemy();for(const e of g.enemies){seen.add(e.type);if(time<=90)assert.equal(e.isElite,false);}}
  if(time<=45)assert.ok([...seen].every(t=>['Bat','Skeleton','Ghost','CyberSpider','FireFly'].includes(t)));
  if(time<=120)assert.ok(!['Turret','LaserDrone','Bomber','ShieldBearer','Charger'].some(t=>seen.has(t)));
  if(time<=240)assert.ok(!['Charger','Healer','ShieldPriest','Assassin','IronGolem','FrostTitan','RoyalSlime','PlagueSource'].some(t=>seen.has(t)));
  if(time<=360)assert.ok(!['IronGolem','FrostTitan','MortarDrone','ChainGunner'].some(t=>seen.has(t)));
  if(time<=480)assert.ok(!seen.has('RoyalSlime')&&!seen.has('PlagueSource'));
 }
 g.time=900;g.mapManager.style='Matrix';
 for(let i=0;i<200;i++){
  g.enemies=Array.from({length:4},()=>({active:true,type:'IronGolem'}));g._spawnEnemy();
  assert.ok(g.enemies.slice(4).every(e=>!['IronGolem','FrostTitan','RoyalSlime','PlagueSource'].includes(e.type)));
 }
}));

test('helper dodges approaching projectiles and ground fuses, including exact blast centers',()=>{
 const g=start(),p=g.player;p.x=p.y=0;g.stageSystem=null;g.enemies=[];g.bosses=[];g.gems=[];g.pickups=[];
 function vector(bullets,warnings=[]){g.enemyBullets=bullets;g.mortarWarnings=warnings;g._aiVector=null;g._aiTimer=0;g._aiWanderAngle=Math.PI;const old=Math.random;Math.random=()=>.5;try{g._updateAutoPlayAI(.13);}finally{Math.random=old;}return g.input.vector;}
 assert.ok(vector([{active:true,x:-60,y:0,vx:200,vy:0}]).y<-.9,'approaching bullet produces perpendicular escape');
 assert.ok(vector([{active:true,x:-60,y:0,vx:-200,vy:0}]).x<-.9,'departing bullet does not attract avoidance');
 const escape=vector([],[{active:true,x:0,y:0,radius:100,timer:.85}]);assert.ok(escape.x>.9&&Number.isFinite(escape.y));
 assert.ok(vector([],[{active:false,x:0,y:0,radius:100}]).x<-.9);
});

test('random events cannot inject early heavy vanguards, double speed or triple density',()=>seeded(()=>{
 const {EVENT_DEFS}=require('./src/EventSystem'),originals=EVENT_DEFS.map(e=>e.action),chosen=[];
 try{
  for(const e of EVENT_DEFS)e.action=()=>chosen.push(e.id);
  const g=start();
  for(const time of [30,140,300,400,600]){
   g.time=time;chosen.length=0;for(let i=0;i<1000;i++)g.eventSystem._triggerRandomEvent();
   if(time<90)assert.ok(chosen.every(id=>EVENT_DEFS.find(e=>e.id===id).category==='positive'));
   if(time<240)assert.ok(!chosen.some(id=>['time_rift','density_surge'].includes(id)));
   if(time<360)assert.ok(!chosen.includes('elite_challenge'));
   if(time<480)assert.ok(!chosen.some(id=>id==='boss_vanguard'||EVENT_DEFS.find(e=>e.id===id).category==='negative'));
   if(time===600)assert.equal(new Set(chosen).size,EVENT_DEFS.length,'all late events remain available');
  }
 }finally{EVENT_DEFS.forEach((e,i)=>e.action=originals[i]);}
}));

test('bomber and explosive affixes warn, preserve their full damage, and hit only once after the fuse',()=>{
 for(const affix of [false,true]){
  const g=start(),p=g.player;p.weapons=[];p.hp=p.maxHp=1000;g.spawnTimer=g.bossTimer=999;g._lastStandUsed=true;
  const e=g._createEnemy(p.x,p.y,'Bomber');g.enemies=[e];if(affix)e.applyEliteAffixes(['explosive']);
  const damage=e.damage+(affix?e.explosionDamage:0);e.die();e.die();
  assert.equal(p.hp,1000);assert.equal(g.mortarWarnings.length,1);
  assert.equal(g.mortarWarnings[0].damage,damage);assert.equal(g.mortarWarnings[0].radius,100);
  g.gems=[];g.pickups=[]; // test the fuse without opening an unrelated elite-XP upgrade modal
  e.x+=1000;e.damage=9999; // recycled corpse cannot move or strengthen the queued blast
  g.update(.4);g.update(.4);assert.equal(p.hp,1000);g.update(.06);assert.equal(p.hp,1000-damage);
  g.update(.1);assert.equal(p.hp,1000-damage);assert.equal(g.mortarWarnings.length,0);
 }
});

test('escaping a death blast avoids damage and restarting clears all pending fuses',()=>{
 const g=start(),p=g.player;p.weapons=[];g.spawnTimer=g.bossTimer=999;
 const e=g._createEnemy(p.x,p.y,'Bomber');e.die();p.x+=120;const hp=p.hp;g.update(.86);assert.equal(p.hp,hp);
 g._createEnemy(p.x,p.y,'Bomber').die();assert.equal(g.mortarWarnings.length,1);
 g.startWithCharacter('tracer',[]);assert.deepEqual(g.mortarWarnings,[]);
});
